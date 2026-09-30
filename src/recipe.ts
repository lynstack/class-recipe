import type {
  CompoundCondition,
  DefaultVariants,
  RecipeFunction,
  Simplify,
  VariantSelection,
} from "./types.js";
import type { LooseRecipeConfig, LooseRecipeProps } from "./compile-recipe.js";
import type { BuildOptions } from "./build-options.js";
import type { LooseVariants } from "./variants.js";
import { buildRecipe } from "./compile-recipe.js";
import { defaultBuildOptions } from "./build-options.js";

/**
 * The variants of a {@link RecipeConfig}: for each variant name, the classes
 * of each of its options.
 */
type RecipeVariants = LooseVariants<string>;

/**
 * Classes added when several variants have particular options at the same
 * time.
 *
 * @typeParam Variants - The variant definitions of the recipe.
 */
interface CompoundVariant<Variants> {
  /**
   * The options that must all be selected for
   * {@link CompoundVariant.className} to apply.
   */
  readonly variants: CompoundCondition<Variants>;
  /** The classes added when the condition matches. */
  readonly className: string;
}

/**
 * The configuration of a recipe made by `createRecipe`.
 *
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
interface RecipeConfig<
  Variants extends RecipeVariants,
  DefaultedName extends keyof Variants,
> {
  /** Classes applied whatever the variants. */
  readonly base?: string | undefined;
  /**
   * For each variant name, the classes of each of its options. The names
   * `className` and `classNames` are reserved for overrides.
   */
  readonly variants: Variants & {
    readonly className?: never;
    readonly classNames?: never;
  };
  /**
   * Classes added when several variants have particular options at the same
   * time, applied in order after the variants' own classes.
   */
  readonly compoundVariants?:
    readonly CompoundVariant<NoInfer<Variants>>[] | undefined;
  /** The option each variant uses when a recipe is called without it. */
  readonly defaultVariants?:
    DefaultVariants<Variants, DefaultedName> | undefined;
}

/**
 * The properties a recipe accepts: its variants and a `className` override.
 *
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
type RecipeProps<Variants, DefaultedName extends keyof Variants> = Simplify<
  VariantSelection<Variants, DefaultedName> & {
    /** Classes added last, after every class of the recipe. */
    readonly className?: string | undefined;
  }
>;

/**
 * A function that returns the class name for a selection of variants.
 *
 * @typeParam Props - The properties the recipe accepts; see
 *   {@link RecipeProps}.
 */
type Recipe<Props> = RecipeFunction<Props, string>;

/**
 * The type of {@link createRecipe}.
 *
 * @typeParam Variants - The variant definitions, inferred from
 *   `config.variants`.
 * @typeParam DefaultedName - The names of the variants that have a
 *   default, inferred from `config.defaultVariants`.
 * @param config - The base classes, variants, compound variants, and
 *   default variants of the recipe.
 * @returns The recipe.
 */
type CreateRecipe = <
  const Variants extends RecipeVariants,
  const DefaultedName extends keyof Variants = never,
>(
  config: RecipeConfig<Variants, DefaultedName>,
) => Recipe<RecipeProps<Variants, DefaultedName>>;

/**
 * Returns a `createRecipe` whose recipes combine their classes with
 * `options.join` and cache them unless `options.cache` is false.
 */
function makeCreateRecipe(options: BuildOptions): CreateRecipe {
  function createRecipe<
    const Variants extends RecipeVariants,
    const DefaultedName extends keyof Variants = never,
  >(
    config: RecipeConfig<Variants, DefaultedName>,
  ): Recipe<RecipeProps<Variants, DefaultedName>>;

  function createRecipe(
    config: LooseRecipeConfig,
  ): (props?: LooseRecipeProps) => string {
    return buildRecipe(config, options);
  }

  return createRecipe;
}

/**
 * Creates a recipe: a function that returns the class name of one element
 * for a selection of variants. Its classes are joined with {@link cx}; use
 * `createRecipes` to join them with another function, such as `twMerge`, or
 * to turn off the cache.
 *
 * @remarks
 * The class name of each selection is built once and cached, so calling a
 * recipe again with the same variants costs one lookup per variant and one
 * for the cache. A `className` passed to the recipe is joined after the
 * cached classes.
 *
 * A variant without a default is required, except a boolean variant, whose
 * only options are `"true"` and `"false"` and which defaults to `false`. An
 * option that the config does not declare adds no classes.
 *
 * Classes are added, never removed, so without a join function that merges
 * them, set each CSS property of an element in one place; see
 * {@link https://github.com/lynstack/class-recipe#writing-conflict-free-recipes | Writing conflict-free recipes}.
 *
 * @example
 * ```ts
 * const button = createRecipe({
 *   base: "inline-flex items-center rounded-md",
 *   variants: {
 *     tone: { neutral: "bg-gray-100", danger: "bg-red-600 text-white" },
 *     size: { sm: "h-8 px-2", md: "h-10 px-4" },
 *   },
 *   compoundVariants: [
 *     { variants: { tone: "danger", size: "md" }, className: "font-semibold" },
 *   ],
 *   defaultVariants: { size: "md" },
 * });
 *
 * button({ tone: "danger" });
 * // => "inline-flex items-center rounded-md bg-red-600 text-white h-10 px-4 font-semibold"
 *
 * button({ tone: "neutral", size: "sm", className: "w-full" });
 * // => "inline-flex items-center rounded-md bg-gray-100 h-8 px-2 w-full"
 * ```
 */
const createRecipe: CreateRecipe = makeCreateRecipe(defaultBuildOptions);

/**
 * A shorter name for {@link createRecipe}: the same function, taking the
 * same config.
 *
 * @example
 * ```ts
 * const badge = cva({
 *   base: "rounded-full px-2 text-xs",
 *   variants: { tone: { neutral: "bg-gray-100", danger: "bg-red-100" } },
 * });
 *
 * badge({ tone: "danger" }); // => "rounded-full px-2 text-xs bg-red-100"
 * ```
 */
const cva: CreateRecipe = createRecipe;

export { createRecipe, cva, makeCreateRecipe };
export type {
  CompoundVariant,
  CreateRecipe,
  Recipe,
  RecipeConfig,
  RecipeProps,
  RecipeVariants,
};
