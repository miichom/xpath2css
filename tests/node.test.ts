import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
  preParseXPath,
  stepToCss,
  tokenizeXPath,
  xPathToCss,
} from "../index.js";

describe("@miichom/xpath2css:node", () => {
  describe("stepToCss", () => {
    it("should throw when called without a step", () => {
      expect(stepToCss).toThrow(Error);
    });

    it("should throw when provided an incomplete step", () => {
      // @ts-expect-error
      expect(() => stepToCss({ axis: "child" })).toThrow(Error);
    });

    it("should convert a basic child step with an id predicate", () => {
      const css = stepToCss({
        axis: "child",
        tag: "div",
        predicates: [{ type: "id", value: "foo" }],
      });
      expect(css).toBe("div#foo");
    });

    it("should apply descendant combinator for non-first steps", () => {
      const css = stepToCss(
        { axis: "descendant", tag: "span", predicates: [] },
        1
      );
      expect(css).toBe(" span");
    });

    it("should apply child combinator for non-first steps", () => {
      const css = stepToCss({ axis: "child", tag: "div", predicates: [] }, 1);
      expect(css).toBe(" > div");
    });

    it("should apply following-sibling combinator for non-first steps", () => {
      const css = stepToCss(
        { axis: "followingSibling", tag: "span", predicates: [] },
        1
      );
      expect(css).toBe(" + span");
    });

    it("should omit combinator for unknown axis types", () => {
      const css = stepToCss({ axis: "root", tag: "div", predicates: [] }, 1);
      expect(css).toBe("div");
    });
  });

  describe("tokenizeXPath", () => {
    it("should throw when called without an expression", () => {
      expect(tokenizeXPath).throw(Error);
    });

    it("should throw when provided a non-string expression", () => {
      // @ts-expect-error
      expect(() => tokenizeXPath(null)).throw(Error);
    });

    it("should tokenize a simple multi-step XPath expression", () => {
      const tokens = tokenizeXPath('//div[@id="foo"]/span[2]');

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

    it("should infer descendant axis for a leading // step", () => {
      const steps = tokenizeXPath("//div");
      expect(steps[0].axis).toBe("descendant");
    });

    it("should infer child axis for explicit / separators", () => {
      const steps = tokenizeXPath("/div/span");
      expect(steps[0].axis).toBe("child");
      expect(steps[1].axis).toBe("child");
    });

    it("should parse explicit child axis", () => {
      const steps = tokenizeXPath("/div/span");
      expect(steps[0].axis).toBe("child");
      expect(steps[1].axis).toBe("child");
    });

    it("should parse explicit descendant axis", () => {
      const steps = tokenizeXPath("//div//span");
      expect(steps[0].axis).toBe("descendant");
      expect(steps[1].axis).toBe("descendant");
    });

    it("should parse following-sibling axis", () => {
      const steps = tokenizeXPath("following-sibling::span");
      expect(steps[0].axis).toBe("followingSibling");
      expect(steps[0].tag).toBe("span");
    });
  });

  describe("xPathToCss", () => {
    it("should normalize concat-based class contains expressions", () => {
      const actual = preParseXPath('contains(concat(" ",@class," ")," foo ")');
      expect(actual).toBe('@class="foo"');
    });

    it("should normalize whitespace in id and class predicates", () => {
      expect(xPathToCss('//div[@id="foo bar"][1]')).toBe(
        "div#foo#bar:first-of-type"
      );

      expect(xPathToCss('//span[@class="a b c"][2]')).toBe(
        "span.a.b.c:nth-of-type(2)"
      );
    });

    it("should convert attrEquals predicates", () => {
      expect(xPathToCss('//a[@href="https://example.com"]')).toBe(
        'a[href="https://example.com"]'
      );
    });

    it("should convert last() to :last-of-type", () => {
      expect(xPathToCss("//li[last()]")).toBe("li:last-of-type");
    });

    it("should throw for unsupported predicate functions", () => {
      expect(() => xPathToCss('//div[starts-with(@id, "foo")]')).toThrow(
        /Unsupported predicate/
      );
    });

    it("should throw for invalid XPath with no steps", () => {
      expect(() => xPathToCss("//")).toThrow(/Invalid or unsupported XPath/);
    });

    it("should convert arbitrary attribute equals predicates", () => {
      expect(xPathToCss('//input[@type="text"]')).toBe('input[type="text"]');
    });

    it("should throw for unsupported predicates", () => {
      expect(() => xPathToCss('//div[unknown()="foo"]')).toThrow(
        /Unsupported predicate/
      );
    });

    it("should convert UL nth-of-type selectors", () => {
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

    it("should convert complex descendant, child, and predicate selectors", () => {
      const actual = xPathToCss(
        '//div[@id="foo"][2]/span[@class="bar"]//a[contains(@class, "baz")]//img[1]'
      );

      const expected =
        'div#foo:nth-of-type(2) > span.bar a[class*="baz"] img:first-of-type';

      expect(actual).toBe(expected);
    });

    it("should support namespaced elements", () => {
      expect(xPathToCss("//div/custom:element")).toBe("div > custom:element");
    });

    it("should support custom elements", () => {
      expect(xPathToCss("//div/custom-element")).toBe("div > custom-element");
    });

    it("should convert live XPath from unjs.io", async () => {
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
  });
});
