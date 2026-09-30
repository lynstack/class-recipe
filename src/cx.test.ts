import { describe, expect, it } from "vitest";
import type { ClassArray } from "./cx.js";
import { cx } from "./cx.js";

describe(cx, () => {
  it("joins class names with single spaces", () => {
    expect(cx("inline-flex", "rounded-md")).toBe("inline-flex rounded-md");
  });

  it("returns an empty string without class names", () => {
    expect(cx()).toBe("");
    expect(cx(false, null, undefined, "", 0)).toBe("");
  });

  it("drops falsy values", () => {
    expect(cx("h-10", false, null, undefined, "", 0, true)).toBe("h-10");
  });

  it("converts non-zero numbers to strings", () => {
    expect(cx(1, "a", -2, 3.5)).toBe("1 a -2 3.5");
  });

  it("keeps the keys of an object whose values are truthy", () => {
    expect(
      cx({ "opacity-0": true, "cursor-progress": false, flex: 1, grid: "" }),
    ).toBe("opacity-0 flex");
  });

  it("flattens nested arrays", () => {
    expect(
      cx(["flex", ["grid", ["hidden", [false, { block: true }]]]], "inline"),
    ).toBe("flex grid hidden block inline");
  });

  it("skips empty arrays and objects", () => {
    expect(cx("flex", [], {}, [[], {}], "grid")).toBe("flex grid");
  });

  it("does not trim or deduplicate class names", () => {
    expect(cx("flex", "flex", " grid ")).toBe("flex flex  grid ");
  });

  const cases: readonly (readonly [inputs: ClassArray, expected: string])[] = [
    [[], ""],
    [["flex"], "flex"],
    [["flex", "grid", "hidden"], "flex grid hidden"],
    [
      ["flex", false, "grid", null, undefined, "hidden", 0, "", true],
      "flex grid hidden",
    ],
    [
      [
        {
          flex: true,
          grid: false,
          hidden: 1,
          block: 0,
          inline: null,
          table: "x",
        },
      ],
      "flex hidden table",
    ],
    [
      [["flex", ["grid", { hidden: true }], [[["block"]]]]],
      "flex grid hidden block",
    ],
    [[1, 0, -1, Number.NaN, 2.5], "1 -1 2.5"],
    [
      [
        "flex",
        { grid: true },
        ["hidden", { block: false, inline: true }],
        42,
        [],
        {},
      ],
      "flex grid hidden inline 42",
    ],
    [[{ "": true }], ""],
  ];

  it.for(cases)("joins %j into %j", ([inputs, expected]) => {
    expect(cx(...inputs)).toBe(expected);
  });
});
