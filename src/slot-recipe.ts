import type {
  CompoundCondition,
  DefaultVariants,
  RecipeFunction,
  Simplify,
  VariantSelection,
} from "./types.js";
import type {
  LooseSlotRecipeConfig,
  LooseSlotRecipeProps,
} from "./compile-slot-recipe.js";
import type { BuildOptions } from "./build-options.js";
import type { LooseVariants } from "./variants.js";
import { buildSlotRecipe } from "./compile-slot-recipe.js";
import { defaultBuildOptions } from "./build-options.js";

/**
 * Classes for some of a slot recipe's slots, keyed by slot name.
 *
 * @typeParam Slot - The names of the slots.
 */
type SlotClasses<Slot extends string> = Readonly<
  Partial<Record<Slot, string | undefined>>
>;

/**
 * The class name of every slot, keyed by slot name, as returned by a slot
 * recipe.
 *
 * @typeParam Slot - The names of the slots.
 */
type SlotClassNames<Slot extends string> = Readonly<Record<Slot, string>>;

/**
 * The variants of a {@link SlotRecipeConfig}: for each variant name, the
 * classes of each slot for each of its options.
 */
type SlotRecipeVariants = LooseVariants<SlotClasses<string>>;

type NoUnknownSlots<Variants, Slot extends string> = {
  readonly [Name in keyof Variants]: {
    readonly [Option in keyof Variants[Name]]: Readonly<
      Record<Exclude<keyof Variants[Name][Option], Slot>, never>
    >;
  };
};

/**
 * Classes added to some slots when several variants have particular options
 * at the same time.
 *
 * @typeParam Slot - The names of the slots.
 * @typeParam Variants - The variant definitions of the slot recipe.
 */
interface SlotCompoundVariant<Slot extends string, Variants> {
  /**
   * The options that must all be selected for
   * {@link SlotCompoundVariant.classNames} to apply.
   */
  readonly variants: CompoundCondition<Variants>;
  /** The classes added to each slot when the condition matches. */
  readonly classNames: SlotClasses<Slot>;
}

/**
 * The configuration of a slot recipe made by `createSlotRecipe`.
 *
 * @typeParam Slot - The names of the slots.
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
interface SlotRecipeConfig<
  Slot extends string,
  Variants extends SlotRecipeVariants,
  DefaultedName extends keyof Variants,
> {
  /** The names of the elements the recipe styles. */
  readonly slots: readonly Slot[];
  /** Classes applied to each slot whatever the variants. */
  readonly base?: SlotClasses<NoInfer<Slot>> | undefined;
  /**
   * For each variant name, the classes of each slot for each of its options.
   * The names `className` and `classNames` are reserved for overrides.
   */
  readonly variants: Variants &
    NoUnknownSlots<Variants, NoInfer<Slot>> & {
      readonly className?: never;
      readonly classNames?: never;
    };
  /**
   * Classes added to some slots when several variants have particular
   * options at the same time, applied in order after the variants' own
   * classes.
   */
  readonly compoundVariants?:
    | readonly SlotCompoundVariant<NoInfer<Slot>, NoInfer<Variants>>[]
    | undefined;
  /** The option each variant uses when a recipe is called without it. */
  readonly defaultVariants?:
    DefaultVariants<Variants, DefaultedName> | undefined;
}

/**
 * The properties a slot recipe accepts: its variants and a `classNames`
 * override for each slot.
 *
 * @typeParam Slot - The names of the slots.
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
type SlotRecipeProps<
  Slot extends string,
  Variants,
  DefaultedName extends keyof Variants,
> = Simplify<
  VariantSelection<Variants, DefaultedName> & {
    /** Classes added last to each slot, after every class of the recipe. */
    readonly classNames?: SlotClasses<Slot> | undefined;
  }
>;

/**
 * A function that returns the class name of every slot for a selection of
 * variants.
 *
 * @typeParam Slot - The names of the slots.
 * @typeParam Props - The properties the recipe accepts; see
 *   {@link SlotRecipeProps}.
 */
type SlotRecipe<Slot extends string, Props> = RecipeFunction<
  Props,
  SlotClassNames<Slot>
>;

/**
 * The type of {@link createSlotRecipe}.
 *
 * @typeParam Slot - The names of the slots, inferred from `config.slots`.
 * @typeParam Variants - The variant definitions, inferred from
 *   `config.variants`.
 * @typeParam DefaultedName - The names of the variants that have a
 *   default, inferred from `config.defaultVariants`.
 * @param config - The slots, base classes, variants, compound variants,
 *   and default variants of the recipe.
 * @returns The slot recipe.
 */
type CreateSlotRecipe = <
  const Slot extends string,
  const Variants extends SlotRecipeVariants,
  const DefaultedName extends keyof Variants = never,
>(
  config: SlotRecipeConfig<Slot, Variants, DefaultedName>,
) => SlotRecipe<Slot, SlotRecipeProps<Slot, Variants, DefaultedName>>;

/**
 * Returns a `createSlotRecipe` whose recipes combine their classes with
 * `options.join` and cache them unless `options.cache` is false.
 */
function makeCreateSlotRecipe(options: BuildOptions): CreateSlotRecipe {
  function createSlotRecipe<
    const Slot extends string,
    const Variants extends SlotRecipeVariants,
    const DefaultedName extends keyof Variants = never,
  >(
    config: SlotRecipeConfig<Slot, Variants, DefaultedName>,
  ): SlotRecipe<Slot, SlotRecipeProps<Slot, Variants, DefaultedName>>;

  function createSlotRecipe(
    config: LooseSlotRecipeConfig,
  ): (props?: LooseSlotRecipeProps) => SlotClassNames<string> {
    return buildSlotRecipe(config, options);
  }

  return createSlotRecipe;
}

/**
 * Creates a slot recipe: a function that returns the class name of each
 * element of a component, its slots, for a selection of variants. Their
 * classes are joined with {@link cx}; use `createRecipes` to join them with
 * another function, such as `twMerge`, or to turn off the cache.
 *
 * @remarks
 * The class names of each selection are built once and cached in a frozen
 * object, so calling a slot recipe again with the same variants returns the
 * same object. Passing `classNames` with classes for at least one slot
 * returns a new object, with each override joined after the cached classes
 * of its slot.
 *
 * Every declared slot is present in the result, as `""` when it has no
 * classes. A variant without a default is required, except a boolean
 * variant, whose only options are `"true"` and `"false"` and which defaults
 * to `false`. An option that the config does not declare adds no classes.
 *
 * Classes are added, never removed, so without a join function that merges
 * them, set each CSS property of an element in one place; see
 * {@link https://github.com/lynstack/class-recipe#writing-conflict-free-recipes | Writing conflict-free recipes}.
 *
 * @example
 * ```ts
 * const card = createSlotRecipe({
 *   slots: ["root", "title"],
 *   base: { root: "rounded-lg border", title: "font-medium" },
 *   variants: {
 *     size: {
 *       sm: { root: "p-2", title: "text-sm" },
 *       md: { root: "p-4", title: "text-base" },
 *     },
 *   },
 *   defaultVariants: { size: "md" },
 * });
 *
 * const classNames = card({ classNames: { root: "shadow" } });
 * classNames.root; // => "rounded-lg border p-4 shadow"
 * classNames.title; // => "font-medium text-base"
 * ```
 */
const createSlotRecipe: CreateSlotRecipe =
  makeCreateSlotRecipe(defaultBuildOptions);

/**
 * A shorter name for {@link createSlotRecipe}: the same function, taking the
 * same config.
 *
 * @example
 * ```ts
 * const field = sva({
 *   slots: ["label", "input"],
 *   base: { label: "text-sm", input: "rounded-md border" },
 *   variants: {
 *     invalid: {
 *       true: { label: "text-red-700", input: "border-red-600" },
 *       false: { input: "border-gray-300" },
 *     },
 *   },
 * });
 *
 * const classNames = field({ invalid: true });
 * classNames.label; // => "text-sm text-red-700"
 * classNames.input; // => "rounded-md border border-red-600"
 * ```
 */
const sva: CreateSlotRecipe = createSlotRecipe;

export { createSlotRecipe, makeCreateSlotRecipe, sva };
export type {
  CreateSlotRecipe,
  SlotClassNames,
  SlotClasses,
  SlotCompoundVariant,
  SlotRecipe,
  SlotRecipeConfig,
  SlotRecipeProps,
  SlotRecipeVariants,
};
