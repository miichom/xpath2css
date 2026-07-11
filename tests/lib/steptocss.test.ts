import { describe, expect, it } from "vitest";
import { stepToCss } from "../../index.js";

describe("@miichom/lodestone:stepToCss", () => {
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
