import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { preParseXPath, xPathToCss } from "../../index.js";

describe("@miichom/lodestone:xPathToCss", () => {
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
