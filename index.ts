/** biome-ignore-all lint/style/noNonNullAssertion: match.groups is guaranteed by the regex structure */
export type Axis = "root" | "child" | "descendant" | "followingSibling";
export type Predicate =
  | { type: "id" | "class"; value: string }
  | { type: "attrEquals" | "attrContains"; name: string; value: string }
  | { type: "nth"; index: number }
  | { type: "nthLast" };

export interface XPathStep {
  axis: Axis;
  tag: string | "*";
  predicates: Predicate[];
}

/**
 * Preprocess special XPath patterns into simpler forms.
 * @param {string} expr The raw XPath expression
 * @returns {string} The normalized XPath expression
 * @example
 * ```ts
 * const parsed = preParseXPath('contains(concat(" ",@class," ")," foo ")')
 * console.log(parsed) // => '@class="foo"'
 * ```
 */
export const preParseXPath = (expr: string): string => {
  return expr.replace(
    /contains\s*\(\s*concat\(["']\s+["']\s*,\s*@class\s*,\s*["']\s+["']\)\s*,\s*["']\s+([a-zA-Z0-9-_]+)\s+["']\)/gi,
    '@class="$1"'
  );
};

/**
 * Convert a single parsed XPath step into a CSS fragment
 * @param {XPathStep} step The parsed XPath step
 * @param {number} index The step index (used to determine combinator)
 * @returns {string} The CSS fragment for this step
 * @example
 * ```ts
 * const css = stepToCss({ axis: "child", tag: "div", predicates: [] }, 1);
 * console.log(css); // => " > div"
 * ```
 */
export const stepToCss = (step: XPathStep, index: number = 0): string => {
  const nav =
    index === 0
      ? ""
      : step.axis === "descendant"
        ? " "
        : step.axis === "child"
          ? " > "
          : step.axis === "followingSibling"
            ? " + "
            : "";

  const tag = step.tag === "*" ? "" : step.tag;

  let attrs = "",
    nth = "";
  for (const p of step.predicates) {
    switch (p.type) {
      case "id":
        attrs += `#${p.value!.replace(/\s+/g, "#")}`;
        break;
      case "class":
        attrs += `.${p.value!.replace(/\s+/g, ".")}`;
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
};

const StepRegex =
  /(?<axis>\/\/|\/|following-sibling::)?(?<tag>[a-zA-Z][\w:-]*|\*)(?<predicates>(\[[^\]]+\])*)/g;

/**
 * Tokenize a full XPath expression into structured steps.
 * @param {string} expr The XPath expression
 * @returns {XPathStep[]} Array of parsed XPath steps
 * @throws {xPath2CssError} If the XPath contains unsupported syntax
 * @example
 * ```ts
 * const steps = tokenizeXPath('//div[@id="foo"]/span[2]');
 * console.log(steps); // => [{ axis: "descendant", ...  }, ...]
 * ```
 */
export const tokenizeXPath = (expr: string): XPathStep[] => {
  const steps: XPathStep[] = [];

  expr = preParseXPath(expr.trim());
  for (const match of expr.matchAll(StepRegex)) {
    const { axis, tag, predicates } = match.groups!;
    const axisType: Axis =
      axis === "/"
        ? "child"
        : axis === "//"
          ? "descendant"
          : axis.startsWith("following-sibling")
            ? "followingSibling"
            : !axis
              ? steps.length === 0
                ? "descendant"
                : "child"
              : "child";

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
          content
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

    steps.push({ axis: axisType, tag, predicates: preds });
  }

  if (steps.length === 0) {
    throw new Error(`Invalid or unsupported XPath: ${expr}`);
  }

  return steps;
};

/**
 * Convert a full XPath expression (including unions) into a CSS selector
 * @param {string} expr The XPath expression
 * @returns {string} The CSS selector string
 * @example
 * ```ts
 * const selector = xPathToCss('//div[@id="foo"]/span[2]');
 * console.log(selector) // => "div#foo > span:nth-of-type(2)"
 * ```
 */
export const xPathToCss = (expr: string): string => {
  const parts = expr
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  const selectors: string[] = [];

  for (const part of parts) {
    const steps = tokenizeXPath(part);
    selectors.push(steps.map(stepToCss).join(""));
  }

  return selectors.join(", ");
};
