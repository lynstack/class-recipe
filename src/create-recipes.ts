import { createRecipe, cva, makeCreateRecipe } from "./recipe.js";
import { createSlotRecipe, makeCreateSlotRecipe, sva } from "./slot-recipe.js";
import type { BuildOptions } from "./build-options.js";
import type { ClassArray } from "./cx.js";
import type { ClassJoin } from "./join.js";
import type { CreateRecipe } from "./recipe.js";
import type { CreateSlotRecipe } from "./slot-recipe.js";
import { cx } from "./cx.js";

/** The options of {@link createRecipes}. */
interface RecipesOptions {
  /**
   * Combines class strings into the final class name, for example `twMerge`
   * from `tailwind-merge`. Defaults to {@link cx}.
   */
  readonly join?: ClassJoin | undefined;
  /**
   * Whether recipes cache the class names of each declared selection of
   * variants. Without the cache, a recipe builds its class names on every
   * call, and a slot recipe returns a new object each time. Defaults to
   * `true`.
   */
  readonly cache?: boolean | undefined;
}

/**
 * The functions returned by {@link createRecipes}, all sharing one join and
 * cache setting.
 */
interface Recipes {
  /**
   * Joins class names like {@link cx}, then passes the result through the
   * configured join, unless it is empty.
   */
  readonly cx: (...inputs: ClassArray) => string;
  /**
   * Creates recipes that combine their classes with the configured join and
   * cache setting.
   */
  readonly createRecipe: CreateRecipe;
  /**
   * Creates slot recipes that combine their classes with the configured
   * join and cache setting.
   */
  readonly createSlotRecipe: CreateSlotRecipe;
  /** A shorter name for {@link Recipes.createRecipe}. */
  readonly cva: CreateRecipe;
  /** A shorter name for {@link Recipes.createSlotRecipe}. */
  readonly sva: CreateSlotRecipe;
}

/**
 * Creates `cx`, `createRecipe`, and `createSlotRecipe` functions that
 * combine classes with a custom join function, such as `twMerge` to resolve
 * conflicting Tailwind CSS classes, or whose recipes do not cache their
 * class names. The result also holds `cva` and `sva`, shorter names for
 * `createRecipe` and `createSlotRecipe`.
 *
 * Call it once in a module of your own and import the functions from there.
 *
 * @param options - The join function to use, and whether recipes cache
 *   their class names.
 * @returns The configured functions.
 *
 * @example
 * ```ts
 * // src/lib/recipe.ts
 * import { createRecipes } from "@lynstack/class-recipe";
 * import { twMerge } from "tailwind-merge";
 *
 * export const { cx, createRecipe, createSlotRecipe } = createRecipes({
 *   join: twMerge,
 * });
 * ```
 */
function createRecipes(options: RecipesOptions = {}): Recipes {
  const { join = cx, cache = true } = options;
  if (join === cx && cache) {
    return { createRecipe, createSlotRecipe, cva, cx, sva };
  }

  const buildOptions: BuildOptions = { cache, join };
  const configuredCreateRecipe = makeCreateRecipe(buildOptions);
  const configuredCreateSlotRecipe = makeCreateSlotRecipe(buildOptions);
  return {
    createRecipe: configuredCreateRecipe,
    createSlotRecipe: configuredCreateSlotRecipe,
    cva: configuredCreateRecipe,
    cx: join === cx ? cx : joinAfterCx(join),
    sva: configuredCreateSlotRecipe,
  };
}

function joinAfterCx(join: ClassJoin): Recipes["cx"] {
  return (...inputs) => {
    const className = cx(...inputs);
    return className === "" ? "" : join(className);
  };
}

export { createRecipes };
export type { Recipes, RecipesOptions };
