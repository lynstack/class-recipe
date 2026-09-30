/**
 * Turns a type's intersections into a single object type, so editors show
 * its properties instead of the types it was built from.
 */
type Simplify<Type> = { [Key in keyof Type]: Type[Key] };

type OptionName<Options> = `${Extract<keyof Options, string | number>}`;

type BooleanName = "true" | "false";

type NumberOption<Options> = Extract<keyof Options, number>;

type BooleanOption<Name extends string> = [Extract<Name, BooleanName>] extends [
  never,
]
  ? never
  : BooleanName | boolean;

type BooleanVariantName<Variants> = {
  [Name in keyof Variants]: [OptionName<Variants[Name]>] extends [never]
    ? never
    : [OptionName<Variants[Name]>] extends [BooleanName]
      ? Name
      : never;
}[keyof Variants];

/**
 * The values accepted for one variant: the names of its options, as
 * strings or, for numeric names, as numbers, plus `true`, `false`, `"true"`,
 * and `"false"` when it declares an option named `"true"` or `"false"`.
 *
 * @typeParam Options - The options of the variant, keyed by option name.
 */
type VariantOption<Options> =
  | OptionName<Options>
  | NumberOption<Options>
  | BooleanOption<OptionName<Options>>;

/**
 * The variants a recipe accepts. A variant with a default may be omitted,
 * and so may a boolean variant, whose only options are `"true"` and
 * `"false"`; any other variant is required.
 *
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
type VariantSelection<
  Variants,
  DefaultedName extends keyof Variants,
> = Simplify<
  {
    readonly [
      Name in Exclude<
        keyof Variants,
        DefaultedName | BooleanVariantName<Variants>
      >
    ]: VariantOption<Variants[Name]>;
  } & {
    readonly [Name in DefaultedName | BooleanVariantName<Variants>]?:
      VariantOption<Variants[Name]> | undefined;
  }
>;

/**
 * The option each defaulted variant uses when a recipe is called without it.
 *
 * @typeParam Variants - The variant definitions, keyed by variant name.
 * @typeParam DefaultedName - The names of the variants that have a default.
 */
type DefaultVariants<Variants, DefaultedName extends keyof Variants> = {
  readonly [Name in DefaultedName]: VariantOption<NoInfer<Variants>[Name]>;
};

/**
 * The condition of a compound variant: for each variant it names, the option
 * or the list of options that it matches. A variant left out matches any
 * option.
 *
 * @typeParam Variants - The variant definitions, keyed by variant name.
 */
type CompoundCondition<Variants> = {
  readonly [Name in keyof Variants]?:
    | VariantOption<Variants[Name]>
    | readonly VariantOption<Variants[Name]>[]
    | undefined;
};

/**
 * A recipe function, whose argument is optional when every property of
 * `Props` is.
 *
 * @typeParam Props - The properties the recipe accepts.
 * @typeParam Result - What the recipe returns.
 */
type RecipeFunction<Props, Result> =
  Partial<Props> extends Props
    ? (props?: Props) => Result
    : (props: Props) => Result;

/**
 * The variants a recipe accepts, without its `className` or `classNames`
 * property. Use it to type the props of a component built on a recipe.
 *
 * @typeParam Recipe - The type of a recipe made by `createRecipe` or
 *   `createSlotRecipe`.
 *
 * @example
 * ```ts
 * const button = createRecipe({ variants: { size: { sm: "h-8", md: "h-10" } } });
 *
 * type ButtonVariants = VariantsOf<typeof button>;
 * // => { readonly size: "sm" | "md" }
 * ```
 */
type VariantsOf<Recipe extends (props: never) => unknown> = Simplify<
  Omit<NonNullable<Parameters<Recipe>[0]>, "className" | "classNames">
>;

export type {
  CompoundCondition,
  DefaultVariants,
  RecipeFunction,
  Simplify,
  VariantOption,
  VariantSelection,
  VariantsOf,
};
