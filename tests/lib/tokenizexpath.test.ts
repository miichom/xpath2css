import { describe, expect, it } from "vitest";
import { tokenizeXPath } from "../../index.js";

describe("@miichom/lodestone:tokenizeXPath", () => {
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
