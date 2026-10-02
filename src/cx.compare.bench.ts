import { describe, expect, it } from "vitest";
import type { Argument } from "classnames";
import type { TestContext } from "vitest";
import classNames from "classnames";
import { clsx } from "clsx";
import { cx } from "@lynstack/class-recipe";

interface Case {
  readonly args: readonly Argument[];
  readonly expected: string;
}

const isActive = true;
const isDisabled = false;

const cases: Readonly<Record<string, Case>> = {
  strings: {
    args: ["btn", "btn-primary", isDisabled && "btn-disabled", "btn-lg", null],
    expected: "btn btn-primary btn-lg",
  },
  "an object": {
    args: [
      {
        btn: true,
        "btn-active": isActive,
        "btn-disabled": isDisabled,
        "btn-block": 1,
      },
    ],
    expected: "btn btn-active btn-block",
  },
  "an array": {
    args: [["btn", "btn-primary", isDisabled && "btn-disabled", "btn-lg"]],
    expected: "btn btn-primary btn-lg",
  },
  "nested arrays": {
    args: [["btn", ["btn-primary", ["btn-lg", [isDisabled, "btn-block"]]]]],
    expected: "btn btn-primary btn-lg btn-block",
  },
  "mixed values": {
    args: [
      "btn",
      { "btn-active": isActive, "btn-disabled": isDisabled },
      ["btn-block", { "btn-lg": true }],
      0,
      "",
      42,
    ],
    expected: "btn btn-active btn-block btn-lg 42",
  },
  "a component's classes": {
    args: [
      "relative inline-flex items-center justify-center rounded-md border",
      isDisabled && "opacity-50",
      "h-10 px-4",
      undefined,
      "bg-primary text-on-primary",
    ],
    expected:
      "relative inline-flex items-center justify-center rounded-md border h-10 px-4 bg-primary text-on-primary",
  },
};

function caseNamed(name: string): Case {
  const found = cases[name];
  if (found === undefined) {
    throw new Error(`No case is named ${name}.`);
  }
  return found;
}

/*
 * Module exports are read through getters in the test runner, so each
 * function is bound locally to keep that cost out of the measurement.
 */
const cxUnderTest = cx;
const clsxUnderTest = clsx;
const classNamesUnderTest = classNames;

describe("cx compared with other libraries", () => {
  it.for(Object.keys(cases))(
    "with %s",
    async (name: string, { bench }: TestContext) => {
      expect.hasAssertions();
      const { args, expected } = caseNamed(name);
      expect(cxUnderTest(...args)).toBe(expected);
      expect(clsxUnderTest(...args)).toBe(expected);
      expect(classNamesUnderTest(...args)).toBe(expected);

      let length = 0;
      await bench.compare(
        bench("class-recipe", () => {
          length += cxUnderTest(...args).length;
        }),
        bench("clsx", () => {
          length += clsxUnderTest(...args).length;
        }),
        bench("classnames", () => {
          length += classNamesUnderTest(...args).length;
        }),
      );

      expect(length).toBeGreaterThan(0);
    },
  );
});
