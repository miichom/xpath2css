/** biome-ignore-all lint/style/noNonNullAssertion: match.groups is guaranteed by the regex structure */
type Axis = "root" | "child" | "descendant" | "followingSibling";

type Predicate =
  | { type: "id" | "class"; value: string }
  | { type: "attrEquals" | "attrContains"; name: string; value: string }
  | { type: "nth"; index: number }
  | { type: "nthLast" };

type XPathStep = { axis: Axis; tag: string; predicates: Predicate[] };

/**
 *
 * @param {string | undefined} axis
 * @param {number} index
 * @returns {Axis}
 */
function resolveAxis(axis: string | undefined, index: number): Axis {
  if (!axis) return index === 0 ? "descendant" : "child";

  if (axis === "//") return "descendant";
  else if (axis === "/") return "child";
  else if (axis === "following-sibling::") return "followingSibling";

  return "child";
}

/**
 *
 * @param {string} xpath
 * @returns {string}
 */
function normalizeXPath(xpath: string): string {
  return xpath.replace(
    /contains\s*\(\s*concat\(["']\s+["']\s*,\s*@class\s*,\s*["']\s+["']\)\s*,\s*["']\s+([a-zA-Z0-9-_]+)\s+["']\)/gi,
    '@class="$1"',
  );
}

/**
 * 
 * @param step 
 * @param index 
 * @returns 
 */
function stepToCss(step: XPathStep, index: number): string {
  const nav =
    index === 0 || step.axis === "root"
      ? ""
      : step.axis === "descendant"
        ? " "
        : step.axis === "child"
          ? " > "
          : " + ";

  const tag = step.tag === "*" ? "" : step.tag;

  let attrs = "";
  let nth = "";

  for (const p of step.predicates) {
    switch (p.type) {
      case "id":
        attrs += `#${p.value.replace(/\s+/g, "#")}`;
        break;
      case "class":
        attrs += `.${p.value.replace(/\s+/g, ".")}`;
        break;
      case "attrEquals":
        attrs += `[${p.name}="${p.value}"]`;
        break;
      case "attrContains":
        attrs += `[${p.name}*="${p.value}"]`;
        break;
      case "nth":
        nth += p.index === 1 ? ":first-of-type" : `:nth-of-type(${p.index})`;
        break;
      case "nthLast":
        nth += ":last-of-type";
        break;
    }
  }

  return nav + tag + attrs + nth;
}

/**
 *
 * @param {string} xpath
 * @returns {XPathStep[]}
 */
function tokenizeXPath(xpath: string): XPathStep[] {
  xpath = normalizeXPath(xpath);

  const steps: XPathStep[] = [];
  for (const match of xpath.matchAll(
    /(?<axis>\/\/|\/)?(?<tag>[a-zA-Z][\w:-]*|\*)(?<predicates>(\[[^\]]+\])*)/g,
  )) {
    let { axis, tag, predicates } = match.groups!;

    if (tag.startsWith("following-sibling::")) {
      axis = "following-sibling::";
      tag = tag.slice("following-sibling::".length);
    }

    const preds: Predicate[] = [];
    for (const p of predicates.matchAll(/\[(?<content>[^\]]+)\]/g)) {
      const content = p.groups!.content.trim();

      if (content === "last()") {
        preds.push({ type: "nthLast" });
        continue;
      }

      const nthMatch = /^(\d+)$/.exec(content);
      if (nthMatch) {
        preds.push({ type: "nth", index: parseInt(nthMatch[1], 10) });
        continue;
      }

      const containsMatch =
        /^contains\(@(?<name>[a-zA-Z_][\w:-]*),\s*["'](?<value>[^"']+)["']\)$/.exec(
          content,
        );
      if (containsMatch?.groups) {
        preds.push({
          type: "attrContains",
          name: containsMatch.groups.name,
          value: containsMatch.groups.value,
        });
        continue;
      }

      const eqMatch =
        /^@(?<name>[a-zA-Z_][\w:-]*)=["'](?<value>[^"']+)["']$/.exec(content);
      if (eqMatch?.groups) {
        const { name, value } = eqMatch.groups;
        if (name === "id") preds.push({ type: "id", value });
        else if (name === "class") preds.push({ type: "class", value });
        else preds.push({ type: "attrEquals", name, value });
        continue;
      }

      throw new Error(`Unsupported predicate: ${content}`);
    }

    steps.push({
      axis: resolveAxis(axis, steps.length),
      tag,
      predicates: preds,
    });
  }

  if (steps.length === 0) {
    throw new Error(`Invalid or unsupported XPath: ${xpath}`);
  }

  return steps;
}

/**
 * 
 * @param xpath 
 * @returns 
 */
export function xPathToCss(xpath: string): string {
  return xpath
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => tokenizeXPath(part).map(stepToCss).join(""))
    .join(", ");
}
