import { createRecipe, cva, makeCreateRecipe } from "./recipe.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ClassJoin } from "./join.js";
import type { VariantsOf } from "./types.js";

const joinWithBars: ClassJoin = (...classNames) => classNames.join("|");

const badge = createRecipe({
  base: "rounded-md",
  variants: {
    tone: {
      neutral: "bg-surface",
      danger: "bg-danger text-on-danger",
    },
    size: {
      md: "p-4",
      sm: "p-2",
    },
  },
  defaultVariants: { size: "md" },
});

describe(createRecipe, () => {
  it("joins base and selected variant classes", () => {
    expect(badge({ tone: "danger", size: "sm" })).toBe(
      "rounded-md bg-danger text-on-danger p-2",
    );
  });

  it("applies default variants when a variant is omitted", () => {
    expect(badge({ tone: "neutral" })).toBe("rounded-md bg-surface p-4");
  });

  it("applies default variants when a variant is undefined", () => {
    expect(badge({ tone: "neutral", size: undefined })).toBe(
      badge({ tone: "neutral", size: "md" }),
    );
  });

  it("skips an option without classes", () => {
    const recipe = createRecipe({
      variants: { emphasis: { muted: "opacity-70", strong: "" } },
    });

    expect(recipe({ emphasis: "strong" })).toBe("");
  });

  it("accepts no argument when every variant has a default", () => {
    const recipe = createRecipe({
      variants: { size: { md: "p-4", sm: "p-2" } },
      defaultVariants: { size: "sm" },
    });

    expect(recipe()).toBe("p-2");
  });

  it("adds className after every class of the recipe", () => {
    expect(badge({ tone: "neutral", className: "w-full" })).toBe(
      "rounded-md bg-surface p-4 w-full",
    );
  });

  it("ignores an empty or undefined className", () => {
    expect(badge({ tone: "neutral", className: "" })).toBe(
      "rounded-md bg-surface p-4",
    );
    expect(badge({ tone: "neutral", className: undefined })).toBe(
      "rounded-md bg-surface p-4",
    );
  });

  it("joins classes with the given join function", () => {
    const recipe = makeCreateRecipe({ cache: true, join: joinWithBars })({
      base: "a",
      variants: { size: { sm: "b", md: "" } },
      compoundVariants: [{ variants: { size: "sm" }, className: "c" }],
    });

    expect(recipe({ size: "sm" })).toBe("a|b|c");
    expect(recipe({ size: "md" })).toBe("a");
    expect(recipe({ size: "sm", className: "d" })).toBe("a|b|c|d");
  });

  it("calls the join function once per selection", () => {
    const calls: (readonly string[])[] = [];
    const join: ClassJoin = (...classNames) => {
      calls.push(classNames);
      return classNames.join(" ");
    };
    const recipe = makeCreateRecipe({ cache: true, join })({
      variants: { size: { sm: "p-2", md: "p-4" } },
    });

    recipe({ size: "sm" });
    recipe({ size: "sm" });
    recipe({ size: "md" });

    expect(calls).toStrictEqual([["p-2"], ["p-4"]]);
  });

  it("infers variant options", () => {
    expectTypeOf(badge).returns.toEqualTypeOf<string>();
    expectTypeOf<VariantsOf<typeof badge>>().toEqualTypeOf<{
      readonly tone: "neutral" | "danger";
      readonly size?: "md" | "sm" | undefined;
    }>();
  });

  it("lists the names of its variants", () => {
    const recipe = createRecipe({ variants: { 2: { sm: "p-2" } } });

    expect(badge.variantKeys).toStrictEqual(["tone", "size"]);
    expect(recipe.variantKeys).toStrictEqual(["2"]);
    expect(Object.isFrozen(badge.variantKeys)).toBe(true);
    expectTypeOf(badge.variantKeys).toEqualTypeOf<
      readonly ("tone" | "size")[]
    >();
    expectTypeOf(recipe.variantKeys).toEqualTypeOf<readonly "2"[]>();
  });

  it("lists no variant names without variants", () => {
    const recipe = createRecipe({ base: "p-2", variants: {} });

    expect(recipe.variantKeys).toStrictEqual([]);
    expectTypeOf(recipe.variantKeys).toEqualTypeOf<readonly never[]>();
  });

  it("makes the argument optional only when every variant has a default", () => {
    const recipe = createRecipe({
      variants: { size: { sm: "p-2", md: "p-4" } },
      defaultVariants: { size: "md" },
    });

    expectTypeOf(recipe).parameter(0).toEqualTypeOf<
      | {
          readonly size?: "sm" | "md" | undefined;
          readonly className?: string | undefined;
        }
      | undefined
    >();
    // @ts-expect-error tone has no default, so the argument is required
    expect(badge()).toBe("rounded-md p-4");
  });

  it("rejects a missing required variant", () => {
    // @ts-expect-error tone has no default, so it is required
    expect(badge({ size: "sm" })).toBe("rounded-md p-2");
  });

  it("rejects an undeclared option and ignores it at runtime", () => {
    // @ts-expect-error "warning" is not a tone option
    expect(badge({ tone: "warning" })).toBe("rounded-md p-4");
  });

  it("ignores an undeclared option in the last variant", () => {
    // @ts-expect-error "xl" is not a size option
    expect(badge({ tone: "neutral", size: "xl" })).toBe(
      "rounded-md bg-surface",
    );
  });

  it("ignores option names inherited from Object.prototype", () => {
    // @ts-expect-error "toString" is not a tone option
    expect(badge({ tone: "toString" })).toBe("rounded-md p-4");
  });

  it("rejects undeclared default variants", () => {
    const withUnknownOption = createRecipe({
      variants: { size: { md: "p-4" } },
      // @ts-expect-error "lg" is not a size option
      defaultVariants: { size: "lg" },
    });
    const withUnknownVariant = createRecipe({
      variants: { size: { md: "p-4" } },
      // @ts-expect-error "tone" is not a variant
      defaultVariants: { size: "md", tone: "danger" },
    });

    expect(withUnknownOption({ size: "md" })).toBe("p-4");
    expect(withUnknownVariant({ size: "md" })).toBe("p-4");
  });

  it("reserves className as a variant name", () => {
    const recipe = createRecipe({
      // @ts-expect-error className is reserved for overrides
      variants: { className: { sm: "p-2" } },
    });

    expect(recipe).toBeTypeOf("function");
  });
});

describe(cva, () => {
  it("is createRecipe", () => {
    expect(cva).toBe(createRecipe);
  });

  it("builds a recipe from the same config", () => {
    const pill = cva({
      base: "rounded-full px-2 text-xs",
      variants: { tone: { neutral: "bg-gray-100", danger: "bg-red-100" } },
    });

    expectTypeOf<VariantsOf<typeof pill>>().toEqualTypeOf<{
      readonly tone: "neutral" | "danger";
    }>();
    expect(pill({ tone: "danger" })).toBe(
      "rounded-full px-2 text-xs bg-red-100",
    );
  });
});
