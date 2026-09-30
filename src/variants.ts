/** Variant definitions in the loose shape the runtime works with. */
type LooseVariants<Classes> = Readonly<
  Record<string, Readonly<Record<string, Classes>>>
>;

/** A selection in the loose shape the runtime works with. */
type SelectedVariants = Readonly<Record<string, unknown>>;

/** A compound variant in the loose shape the runtime works with. */
interface LooseCompoundVariant<Classes> {
  readonly variants: SelectedVariants;
  readonly classes: Classes;
}

/** The variant's index and the option indexes that a condition matches. */
type CompoundCondition = readonly [number, readonly number[]];

/** A compound variant prepared for matching. */
interface Compound<Classes> {
  readonly conditions: readonly CompoundCondition[];
  readonly classes: Classes;
}

/** What {@link compileVariants} prepares. */
interface VariantsConfig<Classes> {
  readonly variants: LooseVariants<Classes>;
  readonly defaultVariants: SelectedVariants;
  readonly compoundVariants: readonly LooseCompoundVariant<Classes>[];
  /** The classes of an option that declares none. */
  readonly noClasses: Classes;
}

/**
 * Variants prepared for selecting classes. Each variant numbers its options
 * from 1, and 0 stands for no option, so a selection is a list of option
 * indexes. Read together as the digits of a mixed-radix number, they form
 * the selection's key.
 */
interface CompiledVariants<Classes> {
  readonly names: readonly string[];
  readonly defaultOptions: readonly (string | undefined)[];
  readonly indexByOption: readonly ReadonlyMap<string, number>[];
  /** The classes of each variant's options, by option index. */
  readonly classesByIndex: readonly (readonly Classes[])[];
  readonly strides: readonly number[];
  readonly compounds: readonly Compound<Classes>[];
  /** Whether every selection's key is a safe integer. */
  readonly isCacheable: boolean;
}

/** The option index of a variant without a selected option. */
const noOption = 0;

/** The key of a selection with an option that a variant does not declare. */
const undeclared = -1;

const noProps: SelectedVariants = Object.freeze({});

/**
 * Prepares variants for selecting classes. A variant that declares an option
 * named `"true"` or `"false"` also declares the other one, without classes,
 * and a variant whose only options are those defaults to `"false"`. A
 * compound variant that names an undeclared variant or option, or lists no
 * option for a variant, never matches and is left out.
 */
function compileVariants<Classes>(
  config: VariantsConfig<Classes>,
): CompiledVariants<Classes> {
  const names = Object.keys(config.variants);
  const options = names.map((name) =>
    withBooleanOptions(config.variants[name] ?? {}, config.noClasses),
  );
  const indexByOption: readonly ReadonlyMap<string, number>[] = options.map(
    (classesByOption) =>
      new Map(
        Object.keys(classesByOption).map((option, index) => [
          option,
          index + 1,
        ]),
      ),
  );
  const radixes = indexByOption.map((indexes) => indexes.size + 1);

  return {
    classesByIndex: classesByIndexOf(options, config.noClasses),
    compounds: compileCompounds(config.compoundVariants, names, indexByOption),
    defaultOptions: names.map(
      (name, index) =>
        toOptionName(config.defaultVariants[name]) ??
        (isBooleanVariant(indexByOption[index]) ? "false" : undefined),
    ),
    indexByOption,
    isCacheable: product(radixes) <= Number.MAX_SAFE_INTEGER,
    names,
    strides: radixes.map((_radix, index) => product(radixes.slice(0, index))),
  };
}

/**
 * Writes the option index of each variant for `selected` into `indexes`
 * and returns the selection's key, or {@link undeclared} when an option is
 * not declared.
 */
function select(
  compiled: CompiledVariants<unknown>,
  selected: SelectedVariants,
  indexes: Int32Array,
): number {
  let key = 0;
  for (let variant = 0; variant < compiled.names.length; variant += 1) {
    const index = selectIndex(compiled, selected, variant);
    indexes[variant] = index ?? noOption;
    key =
      index === undefined || key === undeclared
        ? undeclared
        : key + index * (compiled.strides[variant] ?? 0);
  }
  return key;
}

/** Whether every condition of `compound` matches the selected indexes. */
function matches(compound: Compound<unknown>, indexes: Int32Array): boolean {
  for (const [variant, matchingIndexes] of compound.conditions) {
    if (!matchingIndexes.includes(indexes[variant] ?? noOption)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns the classes that apply to a selection, in order of precedence:
 * the base classes, the classes of each variant's option, then the classes
 * of each matching compound variant.
 */
function collectClasses<Classes>(
  compiled: CompiledVariants<Classes>,
  base: Classes,
  indexes: Int32Array,
): Classes[] {
  const collected = [base];
  const { classesByIndex } = compiled;
  for (let variant = 0; variant < classesByIndex.length; variant += 1) {
    const classes = classesByIndex[variant]?.[indexes[variant] ?? noOption];
    if (classes !== undefined) {
      collected.push(classes);
    }
  }
  for (const compound of compiled.compounds) {
    if (matches(compound, indexes)) {
      collected.push(compound.classes);
    }
  }
  return collected;
}

function selectIndex(
  compiled: CompiledVariants<unknown>,
  selected: SelectedVariants,
  variant: number,
): number | undefined {
  const option =
    toOptionName(selected[compiled.names[variant] ?? ""]) ??
    compiled.defaultOptions[variant];
  return option === undefined
    ? noOption
    : compiled.indexByOption[variant]?.get(option);
}

function classesByIndexOf<Classes>(
  options: readonly Readonly<Record<string, Classes>>[],
  noClasses: Classes,
): Classes[][] {
  const classesByIndex: Classes[][] = [];
  for (const classesByOption of options) {
    classesByIndex.push([noClasses, ...Object.values(classesByOption)]);
  }
  return classesByIndex;
}

function product(numbers: readonly number[]): number {
  return numbers.reduce((result, number) => result * number, 1);
}

function withBooleanOptions<Classes>(
  classesByOption: Readonly<Record<string, Classes>>,
  noClasses: Classes,
): Readonly<Record<string, Classes>> {
  const optionNames = Object.keys(classesByOption);
  if (!optionNames.some((option) => isBooleanName(option))) {
    return classesByOption;
  }
  return { false: noClasses, true: noClasses, ...classesByOption };
}

function compileCompounds<Classes>(
  compoundVariants: readonly LooseCompoundVariant<Classes>[],
  names: readonly string[],
  indexByOption: readonly ReadonlyMap<string, number>[],
): Compound<Classes>[] {
  return compoundVariants.flatMap(({ variants, classes }) => {
    const conditions = Object.keys(variants)
      .filter((name) => variants[name] !== undefined)
      .map((name) =>
        compileCondition(indexByOption, names.indexOf(name), variants[name]),
      );
    return conditions.every(([, indexes]) => indexes.length > 0)
      ? [{ classes, conditions }]
      : [];
  });
}

function compileCondition(
  indexByOption: readonly ReadonlyMap<string, number>[],
  variant: number,
  value: unknown,
): CompoundCondition {
  const indexes = indexByOption[variant];
  return [
    variant,
    toOptionNames(value)
      .map((option) => indexes?.get(option))
      .filter((index) => index !== undefined),
  ];
}

function isBooleanVariant(
  indexByOption: ReadonlyMap<string, number> | undefined,
): boolean {
  return (
    indexByOption !== undefined &&
    indexByOption.size > 0 &&
    [...indexByOption.keys()].every((option) => isBooleanName(option))
  );
}

function toOptionName(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : undefined;
}

function toOptionNames(value: unknown): readonly string[] {
  const values: readonly unknown[] = Array.isArray(value) ? value : [value];
  return values
    .map((option) => toOptionName(option))
    .filter((option) => option !== undefined);
}

function isBooleanName(option: string): boolean {
  return option === "true" || option === "false";
}

export {
  collectClasses,
  compileVariants,
  matches,
  noOption,
  noProps,
  select,
  undeclared,
};
export type {
  CompiledVariants,
  Compound,
  LooseCompoundVariant,
  LooseVariants,
  SelectedVariants,
};
