import { createRecipe, makeCreateRecipe } from "./recipe.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ClassJoin } from "./join.js";

describe("variants", () => {
  it("adds compound classes when every condition matches", () => {
    const recipe = createRecipe({
      variants: {
        tone: { neutral: "bg-surface", danger: "bg-danger" },
        size: { sm: "p-2", md: "p-4", lg: "p-6" },
      },
      compoundVariants: [
        { variants: { tone: "danger", size: "lg" }, className: "font-bold" },
        { variants: { size: ["sm", "md"] }, className: "text-sm" },
        { variants: { tone: "danger" }, className: "ring-2" },
      ],
    });

    expect(recipe({ tone: "danger", size: "lg" })).toBe(
      "bg-danger p-6 font-bold ring-2",
    );
    expect(recipe({ tone: "danger", size: "sm" })).toBe(
      "bg-danger p-2 text-sm ring-2",
    );
    expect(recipe({ tone: "neutral", size: "md" })).toBe(
      "bg-surface p-4 text-sm",
    );
    expect(recipe({ tone: "neutral", size: "lg" })).toBe("bg-surface p-6");
  });

  it("matches compound conditions against default variants", () => {
    const recipe = createRecipe({
      variants: {
        tone: { neutral: "bg-surface", danger: "bg-danger" },
        size: { sm: "p-2", md: "p-4" },
      },
      compoundVariants: [
        { variants: { tone: "danger", size: "md" }, className: "font-bold" },
      ],
      defaultVariants: { size: "md" },
    });

    expect(recipe({ tone: "danger" })).toBe("bg-danger p-4 font-bold");
  });

  it("does not match a compound condition on an omitted variant", () => {
    const recipe = createRecipe({
      variants: { tone: { neutral: "bg-surface", danger: "bg-danger" } },
      compoundVariants: [{ variants: { tone: "danger" }, className: "ring-2" }],
    });

    // @ts-expect-error tone has no default, so it is required
    expect(recipe({})).toBe("");
  });

  it("accepts booleans for options named true and false", () => {
    const recipe = createRecipe({
      variants: {
        disabled: { true: "opacity-50", false: "cursor-pointer" },
        size: { sm: "p-2", md: "p-4" },
      },
      compoundVariants: [
        { variants: { disabled: true, size: "md" }, className: "grayscale" },
      ],
      defaultVariants: { disabled: false, size: "sm" },
    });

    expect(recipe()).toBe("cursor-pointer p-2");
    expect(recipe({ disabled: true, size: "md" })).toBe(
      "opacity-50 p-4 grayscale",
    );
    expect(recipe({ disabled: "true", size: "md" })).toBe(
      "opacity-50 p-4 grayscale",
    );
  });

  it("makes a boolean variant optional and defaults it to false", () => {
    const recipe = createRecipe({
      variants: {
        disabled: { true: "opacity-50", false: "cursor-pointer" },
        loading: { true: "cursor-wait" },
      },
    });

    expectTypeOf(recipe).parameter(0).toEqualTypeOf<
      | {
          readonly disabled?: "true" | "false" | boolean | undefined;
          readonly loading?: "true" | "false" | boolean | undefined;
          readonly className?: string | undefined;
        }
      | undefined
    >();
    expect(recipe()).toBe("cursor-pointer");
    expect(recipe({ loading: "false" })).toBe("cursor-pointer");
    expect(recipe({ disabled: true, loading: true })).toBe(
      "opacity-50 cursor-wait",
    );
    expect(recipe({ loading: false })).toBe("cursor-pointer");
  });

  it("caches a false option that a boolean variant does not declare", () => {
    const calls: (readonly string[])[] = [];
    const join: ClassJoin = (...classNames) => {
      calls.push(classNames);
      return classNames.join(" ");
    };
    const recipe = makeCreateRecipe({ cache: true, join })({
      base: "inline-flex",
      variants: { loading: { true: "cursor-wait" } },
    });

    recipe({ loading: false });
    recipe({ loading: false });
    recipe();

    expect(calls).toStrictEqual([["inline-flex"]]);
  });

  it("matches a compound condition on a boolean variant's default", () => {
    const recipe = createRecipe({
      variants: {
        loading: { true: "cursor-wait" },
        tone: { neutral: "bg-surface", danger: "bg-danger" },
      },
      compoundVariants: [
        { variants: { loading: false, tone: "danger" }, className: "ring-2" },
      ],
    });

    expect(recipe({ tone: "danger" })).toBe("bg-danger ring-2");
    expect(recipe({ tone: "danger", loading: true })).toBe(
      "cursor-wait bg-danger",
    );
  });

  it("accepts option names that are numbers", () => {
    const recipe = createRecipe({
      variants: { level: { 1: "text-3xl", 2: "text-2xl" } },
    });

    expectTypeOf(recipe).parameter(0).toEqualTypeOf<{
      readonly level: "1" | "2" | 1 | 2;
      readonly className?: string | undefined;
    }>();
    expect(recipe({ level: "2" })).toBe("text-2xl");
    expect(recipe({ level: 1 })).toBe("text-3xl");
  });

  it("rejects undeclared compound conditions", () => {
    const recipe = createRecipe({
      variants: { size: { sm: "p-2", md: "p-4" } },
      compoundVariants: [
        // @ts-expect-error "lg" is not a size option
        { variants: { size: "lg" }, className: "text-lg" },
        // @ts-expect-error "tone" is not a variant
        { variants: { tone: "danger" }, className: "ring-2" },
      ],
    });

    expect(recipe({ size: "md" })).toBe("p-4");
  });
});
