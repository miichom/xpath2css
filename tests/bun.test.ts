// @ts-expect-error
import { expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import {
  preParseXPath,
  stepToCss,
  tokenizeXPath,
  xPathToCss,
} from "../index.ts";

// stepToCss
test("@miichom/xpath2css:bun / stepToCss / throws when called without a step", () => {
  // @ts-expect-error
  expect(() => stepToCss()).toThrow();
});

test("@miichom/xpath2css:bun / stepToCss / throws on incomplete step", () => {
  // @ts-expect-error
  expect(() => stepToCss({ axis: "child" })).toThrow();
});

test("@miichom/xpath2css:bun / stepToCss / converts basic id predicate", () => {
  const css = stepToCss({
    axis: "child",
    tag: "div",
    predicates: [{ type: "id", value: "foo" }],
  });
  expect(css).toBe("div#foo");
});

test("@miichom/xpath2css:bun / stepToCss / descendant combinator", () => {
  const css = stepToCss({ axis: "descendant", tag: "span", predicates: [] }, 1);
  expect(css).toBe(" span");
});

test("@miichom/xpath2css:bun / stepToCss / child combinator", () => {
  const css = stepToCss({ axis: "child", tag: "div", predicates: [] }, 1);
  expect(css).toBe(" > div");
});

test("@miichom/xpath2css:bun / stepToCss / following-sibling combinator", () => {
  const css = stepToCss(
    { axis: "followingSibling", tag: "span", predicates: [] },
    1
  );
  expect(css).toBe(" + span");
});

test("@miichom/xpath2css:bun / stepToCss / unknown axis", () => {
  const css = stepToCss({ axis: "root", tag: "div", predicates: [] }, 1);
  expect(css).toBe("div");
});

// tokenizeXPath
test("@miichom/xpath2css:bun / tokenizeXPath / throws without expression", () => {
  // @ts-expect-error
  expect(() => tokenizeXPath()).toThrow();
});

test("@miichom/xpath2css:bun / tokenizeXPath / throws on non-string", () => {
  // @ts-expect-error
  expect(() => tokenizeXPath(null)).toThrow();
});

test("@miichom/xpath2css:bun / tokenizeXPath / multi-step", () => {
  const tokens = tokenizeXPath(`//div[@id="foo"]/span[2]`);

  expect(tokens.length).toBe(2);

  expect(tokens[0]).toEqual({
    axis: "descendant",
    tag: "div",
    predicates: [{ type: "id", value: "foo" }],
  });

  expect(tokens[1]).toEqual({
    axis: "child",
    tag: "span",
    predicates: [{ index: 2, type: "nth" }],
  });
});

test("@miichom/xpath2css:bun / tokenizeXPath / leading //", () => {
  const steps = tokenizeXPath("//div");
  expect(steps[0].axis).toBe("descendant");
});

test("@miichom/xpath2css:bun / tokenizeXPath / explicit child axis", () => {
  const steps = tokenizeXPath("/div/span");
  expect(steps[0].axis).toBe("child");
  expect(steps[1].axis).toBe("child");
});

test("@miichom/xpath2css:bun / tokenizeXPath / explicit descendant axis", () => {
  const steps = tokenizeXPath("//div//span");
  expect(steps[0].axis).toBe("descendant");
  expect(steps[1].axis).toBe("descendant");
});

test("@miichom/xpath2css:bun / tokenizeXPath / following-sibling axis", () => {
  const steps = tokenizeXPath("following-sibling::span");
  expect(steps[0].axis).toBe("followingSibling");
  expect(steps[0].tag).toBe("span");
});

// xPathToCss
test("@miichom/xpath2css:bun / xPathToCss / normalize concat class contains", () => {
  const actual = preParseXPath('contains(concat(" ",@class," ")," foo ")');
  expect(actual).toBe('@class="foo"');
});

test("@miichom/xpath2css:bun / xPathToCss / normalize id & class whitespace", () => {
  expect(xPathToCss('//div[@id="foo bar"][1]')).toBe(
    "div#foo#bar:first-of-type"
  );

  expect(xPathToCss('//span[@class="a b c"][2]')).toBe(
    "span.a.b.c:nth-of-type(2)"
  );
});

test("@miichom/xpath2css:bun / xPathToCss / attrEquals", () => {
  expect(xPathToCss('//a[@href="https://example.com"]')).toBe(
    'a[href="https://example.com"]'
  );
});

test("@miichom/xpath2css:bun / xPathToCss / last()", () => {
  expect(xPathToCss("//li[last()]")).toBe("li:last-of-type");
});

test("@miichom/xpath2css:bun / xPathToCss / unsupported predicate fn", () => {
  expect(() => xPathToCss('//div[starts-with(@id, "foo")]')).toThrow();
});

test("@miichom/xpath2css:bun / xPathToCss / invalid XPath", () => {
  expect(() => xPathToCss("//")).toThrow();
});

test("@miichom/xpath2css:bun / xPathToCss / arbitrary attr equals", () => {
  expect(xPathToCss('//input[@type="text"]')).toBe('input[type="text"]');
});

test("@miichom/xpath2css:bun / xPathToCss / unsupported predicate", () => {
  expect(() => xPathToCss('//div[unknown()="foo"]')).toThrow();
});

test("@miichom/xpath2css:bun / xPathToCss / UL nth-of-type", () => {
  expect(xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[5]")).toBe(
    "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(5)"
  );

  expect(xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[10]")).toBe(
    "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(10)"
  );

  expect(xPathToCss("/HTML/BODY/DIV[@id='menu']/NAV/UL[123]")).toBe(
    "HTML > BODY > DIV#menu > NAV > UL:nth-of-type(123)"
  );
});

test("@miichom/xpath2css:bun / xPathToCss / complex selectors", () => {
  const actual = xPathToCss(
    '//div[@id="foo"][2]/span[@class="bar"]//a[contains(@class, "baz")]//img[1]'
  );

  const expected =
    'div#foo:nth-of-type(2) > span.bar a[class*="baz"] img:first-of-type';

  expect(actual).toBe(expected);
});

test("@miichom/xpath2css:bun / xPathToCss / namespaced elements", () => {
  expect(xPathToCss("//div/custom:element")).toBe("div > custom:element");
});

test("@miichom/xpath2css:bun / xPathToCss / custom elements", () => {
  expect(xPathToCss("//div/custom-element")).toBe("div > custom-element");
});

test("@miichom/xpath2css:bun / xPathToCss / live XPath from unjs.io", async () => {
  const res = await fetch("https://unjs.io/");
  const { document } = parseHTML(await res.text());

  const css = xPathToCss(
    "/html/body/div[2]/div[3]/main/section[1]/div[1]/div[1]/h1"
  );

  const el = document.querySelector(css);

  expect(el?.textContent.trim()).toBe(
    "Unleash JavaScript's Potential with the UnJS Ecosystem"
  );
});
