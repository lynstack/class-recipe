import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";
import { cx } from "@lynstack/class-recipe";

type Join = typeof cx;

interface Case {
  readonly run: (join: Join) => string;
  readonly expected: string;
}

const isActive = true;
const isDisabled = false;

const cases: Readonly<Record<string, Case>> = {
  strings: {
    run: (join) =>
      join("btn", "btn-primary", isDisabled && "btn-disabled", "btn-lg", null),
    expected: "btn btn-primary btn-lg",
  },
  "an object": {
    run: (join) =>
      join({
        btn: true,
        "btn-active": isActive,
        "btn-disabled": isDisabled,
        "btn-block": 1,
      }),
    expected: "btn btn-active btn-block",
  },
  "an array": {
    run: (join) =>
      join(["btn", "btn-primary", isDisabled && "btn-disabled", "btn-lg"]),
    expected: "btn btn-primary btn-lg",
  },
  "nested arrays": {
    run: (join) =>
      join(["btn", ["btn-primary", ["btn-lg", [isDisabled, "btn-block"]]]]),
    expected: "btn btn-primary btn-lg btn-block",
  },
  "mixed values": {
    run: (join) =>
      join(
        "btn",
        { "btn-active": isActive, "btn-disabled": isDisabled },
        ["btn-block", { "btn-lg": true }],
        0,
        "",
        42,
      ),
    expected: "btn btn-active btn-block btn-lg 42",
  },
  "a component's classes": {
    run: (join) =>
      join(
        "relative inline-flex items-center justify-center rounded-md border",
        isDisabled && "opacity-50",
        "h-10 px-4",
        undefined,
        "bg-primary text-on-primary",
      ),
    expected:
      "relative inline-flex items-center justify-center rounded-md border h-10 px-4 bg-primary text-on-primary",
  },
};

/*
 * Module exports are read through getters in the test runner, so the
 * function is bound locally to keep that cost out of the measurement.
 */
const cxUnderTest: Join = cx;

describe(cx, () => {
  it.for(Object.entries(cases))(
    "with %s",
    async (
      [name, { run, expected }]: readonly [string, Case],
      { bench }: TestContext,
    ) => {
      expect.hasAssertions();
      expect(run(cxUnderTest)).toBe(expected);

      let length = 0;
      await bench(name, () => {
        length += run(cxUnderTest).length;
      }).run();

      expect(length).toBeGreaterThan(0);
    },
  );
});
