import { createSlotRecipe, makeCreateSlotRecipe, sva } from "./slot-recipe.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ClassJoin } from "./join.js";
import type { VariantsOf } from "./types.js";

const joinWithBars: ClassJoin = (...classNames) => classNames.join("|");

const card = createSlotRecipe({
  slots: ["root", "title"],
  base: { root: "rounded-md", title: "text-label" },
  variants: {
    tone: {
      neutral: { root: "bg-surface" },
      danger: { root: "bg-danger", title: "text-on-danger" },
    },
    size: {
      md: { root: "p-4" },
      sm: { root: "p-2", title: "text-sm" },
    },
  },
  defaultVariants: { size: "md" },
});

describe(createSlotRecipe, () => {
  it("joins base and selected variant classes per slot", () => {
    expect(card({ tone: "danger", size: "sm" })).toStrictEqual({
      root: "rounded-md bg-danger p-2",
      title: "text-label text-on-danger text-sm",
    });
  });

  it("applies default variants when a variant is omitted", () => {
    expect(card({ tone: "neutral" })).toStrictEqual({
      root: "rounded-md bg-surface p-4",
      title: "text-label",
    });
  });

  it("applies default variants when a variant is undefined", () => {
    expect(card({ tone: "neutral", size: undefined })).toStrictEqual(
      card({ tone: "neutral", size: "md" }),
    );
  });

  it("returns an empty string for a slot without classes", () => {
    const recipe = createSlotRecipe({
      slots: ["root", "icon"],
      variants: { size: { md: { root: "h-control" } } },
    });

    expect(recipe({ size: "md" })).toStrictEqual({
      root: "h-control",
      icon: "",
    });
  });

  it("returns the same frozen object for the same selection", () => {
    const first = card({ tone: "danger" });

    expect(card({ tone: "danger", size: "md" })).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("keeps selections that differ apart", () => {
    expect(card({ tone: "neutral", size: "sm" })).not.toBe(
      card({ tone: "danger", size: "md" }),
    );
  });

  it("accepts no argument when every variant has a default", () => {
    const recipe = createSlotRecipe({
      slots: ["root"],
      variants: { size: { md: { root: "p-4" }, sm: { root: "p-2" } } },
      defaultVariants: { size: "sm" },
    });

    expect(recipe()).toStrictEqual({ root: "p-2" });
  });

  it("adds classNames after every class of their slot", () => {
    const classNames = card({
      tone: "neutral",
      classNames: { title: "uppercase" },
    });

    expect(classNames).toStrictEqual({
      root: "rounded-md bg-surface p-4",
      title: "text-label uppercase",
    });
  });

  it("returns the cached object when classNames overrides nothing", () => {
    const cached = card({ tone: "neutral" });

    expect(card({ tone: "neutral", classNames: {} })).toBe(cached);
    expect(card({ tone: "neutral", classNames: { root: "" } })).toBe(cached);
    expect(card({ tone: "neutral", classNames: { root: undefined } })).toBe(
      cached,
    );
  });

  it("does not change the cached object when classNames is passed", () => {
    card({ tone: "neutral", classNames: { root: "w-full" } });

    expect(card({ tone: "neutral" })).toStrictEqual({
      root: "rounded-md bg-surface p-4",
      title: "text-label",
    });
  });

  it("adds compound classes to their slots when every condition matches", () => {
    const recipe = createSlotRecipe({
      slots: ["root", "icon"],
      variants: {
        tone: {
          neutral: { root: "bg-surface" },
          danger: { root: "bg-danger" },
        },
        size: { sm: { icon: "size-4" }, md: { icon: "size-5" } },
      },
      compoundVariants: [
        {
          variants: { tone: "danger", size: ["sm", "md"] },
          classNames: { icon: "text-danger" },
        },
        { variants: { size: "md" }, classNames: { root: "gap-2" } },
      ],
      defaultVariants: { size: "md" },
    });

    expect(recipe({ tone: "danger" })).toStrictEqual({
      root: "bg-danger gap-2",
      icon: "size-5 text-danger",
    });
    expect(recipe({ tone: "neutral", size: "sm" })).toStrictEqual({
      root: "bg-surface",
      icon: "size-4",
    });
  });

  it("joins classes with the given join function", () => {
    const recipe = makeCreateSlotRecipe({ cache: true, join: joinWithBars })({
      slots: ["root", "icon"],
      base: { root: "a" },
      variants: { size: { sm: { root: "b", icon: "c" } } },
    });

    expect(recipe({ size: "sm", classNames: { icon: "d" } })).toStrictEqual({
      root: "a|b",
      icon: "c|d",
    });
  });

  it("infers slot names and variant options", () => {
    expectTypeOf(card).returns.toEqualTypeOf<
      Readonly<Record<"root" | "title", string>>
    >();
    expectTypeOf<VariantsOf<typeof card>>().toEqualTypeOf<{
      readonly tone: "neutral" | "danger";
      readonly size?: "md" | "sm" | undefined;
    }>();
  });

  it("rejects a missing required variant", () => {
    // @ts-expect-error tone has no default, so it is required
    expect(card({ size: "sm" })).toStrictEqual({
      root: "rounded-md p-2",
      title: "text-label text-sm",
    });
  });

  it("rejects an undeclared option and ignores it at runtime", () => {
    // @ts-expect-error "warning" is not a tone option
    expect(card({ tone: "warning" })).toStrictEqual({
      root: "rounded-md p-4",
      title: "text-label",
    });
  });

  it("ignores an undeclared option in the last variant", () => {
    // @ts-expect-error "xl" is not a size option
    expect(card({ tone: "neutral", size: "xl" })).toStrictEqual({
      root: "rounded-md bg-surface",
      title: "text-label",
    });
  });

  it("ignores option names inherited from Object.prototype", () => {
    // @ts-expect-error "toString" is not a tone option
    expect(card({ tone: "toString" })).toStrictEqual({
      root: "rounded-md p-4",
      title: "text-label",
    });
  });

  it("rejects undeclared slots and ignores them at runtime", () => {
    const recipe = createSlotRecipe({
      slots: ["root"],
      // @ts-expect-error "title" is not a slot
      base: { title: "text-label" },
      // @ts-expect-error "title" is not a slot
      variants: { size: { md: { root: "p-4", title: "text-label" } } },
      compoundVariants: [
        // @ts-expect-error "title" is not a slot
        { variants: { size: "md" }, classNames: { title: "font-bold" } },
      ],
    });

    expect(recipe({ size: "md" })).toStrictEqual({ root: "p-4" });
    const overridden = recipe({
      size: "md",
      // @ts-expect-error "title" is not a slot
      classNames: { title: "font-bold" },
    });

    expect(overridden).toStrictEqual({ root: "p-4" });
  });

  it("rejects undeclared default variants", () => {
    const withUnknownOption = createSlotRecipe({
      slots: ["root"],
      variants: { size: { md: { root: "p-4" } } },
      // @ts-expect-error "lg" is not a size option
      defaultVariants: { size: "lg" },
    });
    const withUnknownVariant = createSlotRecipe({
      slots: ["root"],
      variants: { size: { md: { root: "p-4" } } },
      // @ts-expect-error "tone" is not a variant
      defaultVariants: { size: "md", tone: "danger" },
    });

    expect(withUnknownOption({ size: "md" })).toStrictEqual({ root: "p-4" });
    expect(withUnknownVariant({ size: "md" })).toStrictEqual({ root: "p-4" });
  });

  it("reserves classNames as a variant name", () => {
    const recipe = createSlotRecipe({
      slots: ["root"],
      // @ts-expect-error classNames is reserved for overrides
      variants: { classNames: { sm: { root: "p-2" } } },
    });

    expect(recipe).toBeTypeOf("function");
  });
});

describe(sva, () => {
  it("is createSlotRecipe", () => {
    expect(sva).toBe(createSlotRecipe);
  });

  it("builds a slot recipe from the same config", () => {
    const field = sva({
      slots: ["label", "input"],
      base: { label: "text-sm", input: "rounded-md border" },
      variants: {
        invalid: {
          true: { label: "text-red-700", input: "border-red-600" },
          false: { input: "border-gray-300" },
        },
      },
    });

    expectTypeOf(field({ invalid: true })).toEqualTypeOf<
      Readonly<Record<"label" | "input", string>>
    >();
    expect(field({ invalid: true })).toStrictEqual({
      label: "text-sm text-red-700",
      input: "rounded-md border border-red-600",
    });
  });
});
