// @ts-expect-error
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseHTML } from "linkedom";
import {
  preParseXPath,
  stepToCss,
  tokenizeXPath,
  xPathToCss,
} from "../index.ts";

// @ts-expect-error
Deno.test("@miichom/xpath2css:deno / stepToCss", async (t) => {
  await t.step("throws when called without a step", () => {
    // @ts-expect-error
    assertThrows(() => stepToCss(), Error);
  });

  await t.step("throws when provided an incomplete step", () => {
    // @ts-expect-error
    assertThrows(() => stepToCss({ axis: "child" }), Error);
  });

  await t.step("converts a basic child step with an id predicate", () => {
    const css = stepToCss({
      axis: "child",
      tag: "div",
      predicates: [{ type: "id", value: "foo" }],
    });
    assertEquals(css, "div#foo");
  });

  await t.step("applies descendant combinator for non-first steps", () => {
    const css = stepToCss(
      { axis: "descendant", tag: "span", predicates: [] },
      1
    );
    assertEquals(css, " span");
  });

  await t.step("applies child combinator for non-first steps", () => {
    const css = stepToCss({ axis: "child", tag: "div", predicates: [] }, 1);
    assertEquals(css, " > div");
  });

  await t.step(
    "applies following-sibling combinator for non-first steps",
    () => {
      const css = stepToCss(
        { axis: "followingSibling", tag: "span", predicates: [] },
        1
      );
      assertEquals(css, " + span");
    }
  );

  await t.step("omits combinator for unknown axis types", () => {
    const css = stepToCss({ axis: "root", tag: "div", predicates: [] }, 1);
    assertEquals(css, "div");
  });
});

// @ts-expect-error
Deno.test("@miichom/xpath2css:deno / tokenizeXPath", async (t) => {
  await t.step("throws when called without an expression", () => {
    // @ts-expect-error
    assertThrows(() => tokenizeXPath(), Error);
  });

  await t.step("throws when provided a non-string expression", () => {
    // @ts-expect-error
    assertThrows(() => tokenizeXPath(null), Error);
  });

  await t.step("tokenizes a simple multi-step XPath expression", () => {
    const tokens = tokenizeXPath(`//div[@id="foo"]/span[2]`);

    assertEquals(tokens.length, 2);

    assertEquals(tokens[0], {
      axis: "descendant",
      tag: "div",
      predicates: [{ type: "id", value: "foo" }],
    });

    assertEquals(tokens[1], {
      axis: "child",
      tag: "span",
      predicates: [{ index: 2, type: "nth" }],
    });
  });

  await t.step("infers descendant axis for a leading // step", () => {
    const steps = tokenizeXPath("//div");
    assertEquals(steps[0].axis, "descendant");
  });

  await t.step("infers child axis for explicit / separators", () => {
    const steps = tokenizeXPath("/div/span");
    assertEquals(steps[0].axis, "child");
    assertEquals(steps[1].axis, "child");
  });

  await t.step("parses explicit descendant axis", () => {
    const steps = tokenizeXPath("//div//span");
    assertEquals(steps[0].axis, "descendant");
    assertEquals(steps[1].axis, "descendant");
  });

  await t.step("parses following-sibling axis", () => {
    const steps = tokenizeXPath("following-sibling::span");
    assertEquals(steps[0].axis, "followingSibling");
    assertEquals(steps[0].tag, "span");
  });
});

// @ts-expect-error
Deno.test("@miichom/xpath2css:deno / xPathToCss", async (t) => {
  await t.step("normalizes concat-based class contains expressions", () => {
    const actual = preParseXPath('contains(concat(" ",@class," ")," foo ")');
    assertEquals(actual, '@class="foo"');
  });

  await t.step("normalizes whitespace in id and class predicates", () => {
    assertEquals(
      xPathToCss('//div[@id="foo bar"][1]'),
      "div#foo#bar:first-of-type"
    );

    assertEquals(
      xPathToCss('//span[@class="a b c"][2]'),
      "span.a.b.c:nth-of-type(2)"
    );
  });

  await t.step("converts attrEquals predicates", () => {
    assertEquals(
      xPathToCss('//a[@href="https://example.com"]'),
      'a[href="https://example.com"]'
    );
  });

  await t.step("converts last() to :last-of-type", () => {
    assertEquals(xPathToCss("//li[last()]"), "li:last-of-type");
  });

  await t.step("throws for unsupported predicate functions", () => {
    assertThrows(
      () => xPathToCss(`//div[starts-with(@id, "foo")]`),
      Error,
      "Unsupported predicate"
    );
  });

  await t.step("throws for invalid XPath with no steps", () => {
    assertThrows(() => xPathToCss("//"), Error);
  });

  await t.step("converts arbitrary attribute equals predicates", () => {
    assertEquals(xPathToCss('//input[@type="text"]'), 'input[type="text"]');
  });

  await t.step("throws for unsupported predicates", () => {
    assertThrows(
      () => xPathToCss('//div[unknown()="foo"]'),
      Error,
      "Unsupported predicate"
    );
  });

  await t.step("converts UL nth-of-type selectors", () => {
    assertEquals(
      xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[5]"),
      "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(5)"
    );

    assertEquals(
      xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[10]"),
      "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(10)"
    );

    assertEquals(
      xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[123]"),
      "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(123)"
    );
  });

  await t.step(
    "converts complex descendant, child, and predicate selectors",
    () => {
      const actual = xPathToCss(
        '//div[@id="foo"][2]/span[@class="bar"]//a[contains(@class, "baz")]//img[1]'
      );

      const expected =
        'div#foo:nth-of-type(2) > span.bar a[class*="baz"] img:first-of-type';

      assertEquals(actual, expected);
    }
  );

  await t.step("supports namespaced elements", () => {
    assertEquals(xPathToCss("//div/custom:element"), "div > custom:element");
  });

  await t.step("supports custom elements", () => {
    assertEquals(xPathToCss("//div/custom-element"), "div > custom-element");
  });

  await t.step("converts live XPath from unjs.io", async () => {
    const res = await fetch("https://unjs.io/");
    const { document } = parseHTML(await res.text());

    const css = xPathToCss(
      "/html/body/div[2]/div[3]/main/section[1]/div[1]/div[1]/h1"
    );

    const el = document.querySelector(css);

    assertEquals(
      el?.textContent.trim(),
      "Unleash JavaScript's Potential with the UnJS Ecosystem"
    );
  });
});
