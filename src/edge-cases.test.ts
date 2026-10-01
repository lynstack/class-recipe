import { createRecipe, makeCreateRecipe } from "./recipe.js";
import { createSlotRecipe, makeCreateSlotRecipe } from "./slot-recipe.js";
import { describe, expect, it } from "vitest";
import type { ClassJoin } from "./join.js";
import type { RecipeVariants } from "./recipe.js";
import { createRecipes } from "./create-recipes.js";

function recordingJoin(): {
  readonly calls: (readonly string[])[];
  readonly join: ClassJoin;
} {
  const calls: (readonly string[])[] = [];
  return {
    calls,
    join: (...classNames) => {
      calls.push(classNames);
      return classNames.join(" ");
    },
  };
}

describe("edge cases", () => {
  it("never matches a compound condition on an undeclared variant", () => {
    const variants: RecipeVariants = { size: { sm: "p-2" } };
    const recipe = createRecipe({
      compoundVariants: [{ className: "ring-2", variants: { tone: "danger" } }],
      defaultVariants: { size: "sm" },
      variants,
    });

    expect(recipe({ tone: "danger" })).toBe("p-2");
    expect(recipe({ tone: "neutral" })).toBe("p-2");
  });

  it("never matches a compound condition without options", () => {
    const recipe = createRecipe({
      compoundVariants: [{ className: "ring-2", variants: { size: [] } }],
      variants: { size: { md: "p-4", sm: "p-2" } },
    });

    expect(recipe({ size: "sm" })).toBe("p-2");
  });

  it("never passes an empty string to the join function", () => {
    const { calls, join } = recordingJoin();
    const recipe = makeCreateRecipe({ cache: true, join })({
      variants: { size: { md: "p-4", sm: "" } },
    });
    const slotRecipe = makeCreateSlotRecipe({ cache: true, join })({
      slots: ["root", "icon"],
      variants: { size: { sm: { root: "p-2" } } },
    });

    recipe({ className: "w-full", size: "sm" });
    slotRecipe({ classNames: { icon: "size-4" }, size: "sm" });
    createRecipes({ join }).cx(false, null);

    expect(calls).toStrictEqual([["w-full"], ["p-2"], ["size-4"]]);
  });

  it("treats null props and overrides as absent", () => {
    const recipe = createRecipe({
      defaultVariants: { size: "md" },
      variants: { size: { md: "p-4", sm: "p-2" } },
    });
    const slotRecipe = createSlotRecipe({
      slots: ["root"],
      variants: { size: { md: { root: "p-4" } } },
    });

    // @ts-expect-error props cannot be null
    expect(recipe(null)).toBe("p-4");
    // @ts-expect-error classNames cannot be null
    expect(slotRecipe({ classNames: null, size: "md" })).toStrictEqual({
      root: "p-4",
    });
  });

  it("ignores changes to the config after the recipe is created", () => {
    const options: Record<string, string> = { md: "p-4", sm: "p-2" };
    const slots = ["root"];
    const recipe = createRecipe({ variants: { size: options } });
    const slotRecipe = createSlotRecipe({
      slots,
      variants: { size: { md: { root: "p-4" } } },
    });

    options["sm"] = "p-1";
    slots.push("icon");

    expect(recipe({ size: "sm" })).toBe("p-2");
    expect(slotRecipe({ size: "md" })).toStrictEqual({ root: "p-4" });
  });
});
