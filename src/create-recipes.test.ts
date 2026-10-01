import { createRecipe, cva } from "./recipe.js";
import { createSlotRecipe, sva } from "./slot-recipe.js";
import { describe, expect, it } from "vitest";
import type { ClassJoin } from "./join.js";
import { createRecipes } from "./create-recipes.js";
import { cx } from "./cx.js";

function keepLastOfEachPrefix(...classNames: readonly string[]): string {
  const byPrefix = new Map<string, string>();
  for (const className of classNames.join(" ").split(" ")) {
    const [prefix = className] = className.split("-");
    byPrefix.delete(prefix);
    byPrefix.set(prefix, className);
  }
  return [...byPrefix.values()].join(" ");
}

const merged = createRecipes({ join: keepLastOfEachPrefix });

describe(createRecipes, () => {
  it("returns the default functions without a join function", () => {
    expect(createRecipes()).toStrictEqual({
      cx,
      createRecipe,
      createSlotRecipe,
      cva,
      sva,
    });
    expect(createRecipes({ join: cx })).toStrictEqual({
      cx,
      createRecipe,
      createSlotRecipe,
      cva,
      sva,
    });
    expect(createRecipes({ cache: true })).toStrictEqual({
      cx,
      createRecipe,
      createSlotRecipe,
      cva,
      sva,
    });
  });

  it("returns cva and sva as the configured recipe creators", () => {
    expect(merged.cva).toBe(merged.createRecipe);
    expect(merged.sva).toBe(merged.createSlotRecipe);

    const button = merged.cva({
      base: "px-4 py-2",
      variants: { size: { sm: "px-2" } },
    });
    const card = merged.sva({
      slots: ["root"],
      base: { root: "p-4" },
      variants: { size: { sm: { root: "p-2" } } },
    });

    expect(button({ size: "sm" })).toBe("py-2 px-2");
    expect(card({ size: "sm" })).toStrictEqual({ root: "p-2" });
  });

  it("keeps the default cx without the cache", () => {
    expect(createRecipes({ cache: false }).cx).toBe(cx);
  });

  it("builds a recipe's class name on every call without the cache", () => {
    const calls: (readonly string[])[] = [];
    const join: ClassJoin = (...classNames) => {
      calls.push(classNames);
      return classNames.join(" ");
    };
    const button = createRecipes({ cache: false, join }).createRecipe({
      base: "rounded-md",
      variants: { size: { sm: "h-8", md: "h-10" } },
    });

    expect(button({ size: "sm" })).toBe("rounded-md h-8");
    expect(button({ size: "sm" })).toBe("rounded-md h-8");
    expect(calls).toStrictEqual([
      ["rounded-md", "h-8"],
      ["rounded-md", "h-8"],
    ]);
  });

  it("returns a new slot recipe object on every call without the cache", () => {
    const card = createRecipes({ cache: false }).createSlotRecipe({
      slots: ["root", "title"],
      base: { root: "p-4" },
      variants: { size: { sm: { title: "text-sm" } } },
    });

    const first = card({ size: "sm" });
    const second = card({ size: "sm" });
    expect(first).toStrictEqual({ root: "p-4", title: "text-sm" });
    expect(second).toStrictEqual(first);
    expect(second).not.toBe(first);
  });

  it("resolves conflicts without the cache", () => {
    const button = createRecipes({
      cache: false,
      join: keepLastOfEachPrefix,
    }).createRecipe({
      base: "px-4 py-2",
      variants: { size: { sm: "px-2" } },
    });

    expect(button({ size: "sm" })).toBe("py-2 px-2");
  });

  it("rejects a cache setting that is not a boolean", () => {
    // @ts-expect-error cache must be a boolean
    const recipes = createRecipes({ cache: "no" });

    expect(recipes.createRecipe).toBe(createRecipe);
  });

  it("passes cx's result through the join function", () => {
    expect(merged.cx("p-2", { "p-4": true }, ["text-sm", "text-lg"])).toBe(
      "p-4 text-lg",
    );
  });

  it("resolves conflicts between a recipe's classes", () => {
    const button = merged.createRecipe({
      base: "px-4 py-2",
      variants: { size: { sm: "px-2", md: "" } },
      compoundVariants: [{ variants: { size: "sm" }, className: "py-1" }],
    });

    expect(button({ size: "sm" })).toBe("px-2 py-1");
    expect(button({ size: "md" })).toBe("px-4 py-2");
  });

  it("resolves conflicts with className", () => {
    const button = merged.createRecipe({
      base: "rounded-md bg-gray-100",
      variants: { tone: { danger: "bg-red-600" } },
    });

    expect(button({ tone: "danger", className: "bg-blue-600" })).toBe(
      "rounded-md bg-blue-600",
    );
  });

  it("resolves conflicts in each slot", () => {
    const card = merged.createSlotRecipe({
      slots: ["root", "title"],
      base: { root: "p-4", title: "text-base" },
      variants: { size: { sm: { root: "p-2", title: "text-sm" } } },
    });

    expect(
      card({ size: "sm", classNames: { title: "text-lg" } }),
    ).toStrictEqual({
      root: "p-2",
      title: "text-lg",
    });
  });
});
