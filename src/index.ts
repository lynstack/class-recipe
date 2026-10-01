/**
 * Fast, type-safe class name recipes with variants, compound variants, and
 * slots, plus {@link cx}, a drop-in replacement for `clsx`.
 *
 * @packageDocumentation
 */

export { createRecipes } from "./create-recipes.js";
export type { Recipes, RecipesOptions } from "./create-recipes.js";
export { cx } from "./cx.js";
export type { ClassArray, ClassDictionary, ClassValue } from "./cx.js";
export type { ClassJoin } from "./join.js";
export { createRecipe, cva } from "./recipe.js";
export type {
  CompoundVariant,
  CreateRecipe,
  Recipe,
  RecipeConfig,
  RecipeProps,
  RecipeVariants,
} from "./recipe.js";
export { createSlotRecipe, sva } from "./slot-recipe.js";
export type {
  CreateSlotRecipe,
  SlotClasses,
  SlotClassNames,
  SlotCompoundVariant,
  SlotRecipe,
  SlotRecipeConfig,
  SlotRecipeProps,
  SlotRecipeVariants,
} from "./slot-recipe.js";
export type {
  CompoundCondition,
  DefaultVariants,
  RecipeFunction,
  VariantOption,
  VariantSelection,
  VariantsOf,
} from "./types.js";
