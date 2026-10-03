import type {
  CompiledVariants,
  LooseVariants,
  SelectedVariants,
  WithVariantKeys,
} from "./variants.js";
import {
  appendClasses,
  concatClasses,
  createJoinClasses,
} from "./join-classes.js";
import {
  collectClasses,
  compileVariants,
  noProps,
  withVariantKeys,
} from "./variants.js";
import type { BuildOptions } from "./build-options.js";
import type { JoinClasses } from "./join-classes.js";
import { createSelector } from "./selector.js";
import { defaultBuildOptions } from "./build-options.js";

type LooseSlotClasses = Readonly<Record<string, string | undefined>>;

type LooseSlotClassNames = Readonly<Record<string, string>>;

/** The classes of each slot, in the order of the declared slots. */
type ClassesBySlot = readonly string[];

interface LooseSlotRecipeConfig {
  readonly slots: readonly string[];
  readonly base?: LooseSlotClasses | undefined;
  readonly variants: LooseVariants<LooseSlotClasses>;
  readonly compoundVariants?:
    | readonly {
        readonly variants: SelectedVariants;
        readonly classNames: LooseSlotClasses;
      }[]
    | undefined;
  readonly defaultVariants?: SelectedVariants | undefined;
}

interface LooseSlotRecipeProps extends SelectedVariants {
  readonly classNames?: LooseSlotClasses | null | undefined;
}

type LooseSlotRecipe = WithVariantKeys<
  (props?: LooseSlotRecipeProps | null) => LooseSlotClassNames
>;

/** The slots of a slot recipe and how it joins their classes. */
interface Slots {
  readonly names: readonly string[];
  readonly joinClasses: JoinClasses;
}

/**
 * Returns the slot recipe function for `config`, whose classes are combined
 * with `options.join` and cached unless `options.cache` is false.
 */
function buildSlotRecipe(
  config: LooseSlotRecipeConfig,
  options: BuildOptions = defaultBuildOptions,
): LooseSlotRecipe {
  const slots: Slots = {
    joinClasses: createJoinClasses(options.join),
    names: [...config.slots],
  };
  const compiled = compileSlotRecipe(config, slots.names);
  const baseBySlot = bySlot(slots.names, config.base ?? {});
  const classNamesOf = createSelector(
    compiled,
    (indexes) =>
      joinBySlot(slots, collectClasses(compiled, baseBySlot, indexes)),
    options,
  );

  const slotRecipe = (
    props?: LooseSlotRecipeProps | null,
  ): LooseSlotClassNames => {
    const classNames = classNamesOf(props ?? noProps);
    const overrides = props?.classNames;
    return overrides === undefined || overrides === null
      ? classNames
      : withOverrides(slots, classNames, overrides);
  };
  return withVariantKeys(slotRecipe, compiled);
}

function compileSlotRecipe(
  config: LooseSlotRecipeConfig,
  slots: readonly string[],
): CompiledVariants<ClassesBySlot> {
  const variants: Record<string, Record<string, ClassesBySlot>> = {};
  for (const [name, options] of Object.entries(config.variants)) {
    variants[name] = Object.fromEntries(
      Object.entries(options).map(
        ([option, classes]: readonly [string, LooseSlotClasses]) => [
          option,
          bySlot(slots, classes),
        ],
      ),
    );
  }

  return compileVariants({
    compoundVariants: (config.compoundVariants ?? []).map((compound) => ({
      classes: bySlot(slots, compound.classNames),
      variants: compound.variants,
    })),
    defaultVariants: config.defaultVariants ?? {},
    noClasses: bySlot(slots, {}),
    variants,
  });
}

function bySlot(
  slots: readonly string[],
  classes: LooseSlotClasses,
): ClassesBySlot {
  return slots.map((slot) => classOfSlot(classes, slot));
}

function joinBySlot(
  slots: Slots,
  collected: readonly ClassesBySlot[],
): LooseSlotClassNames {
  const classNames: Record<string, string> = {};
  const { names } = slots;
  for (let index = 0; index < names.length; index += 1) {
    classNames[names[index] ?? ""] =
      slots.joinClasses === concatClasses
        ? concatSlot(collected, index)
        : slots.joinClasses(collected.map((classes) => classes[index] ?? ""));
  }
  return Object.freeze(classNames);
}

function concatSlot(
  collected: readonly ClassesBySlot[],
  index: number,
): string {
  let className = "";
  for (const classes of collected) {
    className = appendClasses(className, classes[index] ?? "");
  }
  return className;
}

function withOverrides(
  slots: Slots,
  classNames: LooseSlotClassNames,
  overrides: LooseSlotClasses,
): LooseSlotClassNames {
  const overridden = slots.names.filter(
    (slot) => classOfSlot(overrides, slot) !== "",
  );
  if (overridden.length === 0) {
    return classNames;
  }
  const result = { ...classNames };
  for (const slot of overridden) {
    result[slot] = slots.joinClasses([
      classOfSlot(classNames, slot),
      classOfSlot(overrides, slot),
    ]);
  }
  return result;
}

function classOfSlot(classes: LooseSlotClasses, slot: string): string {
  const classesOfSlot = Object.hasOwn(classes, slot) ? classes[slot] : "";
  return typeof classesOfSlot === "string" ? classesOfSlot : "";
}

export { buildSlotRecipe };
export type { LooseSlotRecipe, LooseSlotRecipeConfig, LooseSlotRecipeProps };
