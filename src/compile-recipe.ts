import type {
  CompiledVariants,
  LooseVariants,
  SelectedVariants,
} from "./variants.js";
import { appendClasses, createJoinClasses } from "./join-classes.js";
import {
  collectClasses,
  compileVariants,
  matches,
  noOption,
  noProps,
} from "./variants.js";
import type { BuildOptions } from "./build-options.js";
import { createSelector } from "./selector.js";
import { cx } from "./cx.js";
import { defaultBuildOptions } from "./build-options.js";

interface LooseRecipeConfig {
  readonly base?: string | undefined;
  readonly variants: LooseVariants<string>;
  readonly compoundVariants?:
    | readonly {
        readonly variants: SelectedVariants;
        readonly className: string;
      }[]
    | undefined;
  readonly defaultVariants?: SelectedVariants | undefined;
}

interface LooseRecipeProps extends SelectedVariants {
  readonly className?: string | undefined;
}

/**
 * Returns the recipe function for `config`, whose classes are combined with
 * `options.join` and cached unless `options.cache` is false.
 */
function buildRecipe(
  config: LooseRecipeConfig,
  options: BuildOptions = defaultBuildOptions,
): (props?: LooseRecipeProps | null) => string {
  const { base = "" } = config;
  const { join } = options;
  const compiled = compileRecipe(config);
  const joinClasses = createJoinClasses(join);
  const classesOf = createSelector(
    compiled,
    join === cx
      ? (indexes): string => concatSelected(compiled, base, indexes)
      : (indexes): string =>
          joinClasses(collectClasses(compiled, base, indexes)),
    options,
  );

  return (props) => {
    const selected = props ?? noProps;
    const classes = classesOf(selected);
    const { className } = selected;
    return typeof className === "string" && className !== ""
      ? joinClasses([classes, className])
      : classes;
  };
}

function compileRecipe(config: LooseRecipeConfig): CompiledVariants<string> {
  return compileVariants({
    compoundVariants: (config.compoundVariants ?? []).map((compound) => ({
      classes: compound.className,
      variants: compound.variants,
    })),
    defaultVariants: config.defaultVariants ?? {},
    noClasses: "",
    variants: config.variants,
  });
}

function concatSelected(
  compiled: CompiledVariants<string>,
  base: string,
  indexes: Int32Array,
): string {
  let className = base;
  const { classesByIndex } = compiled;
  for (let variant = 0; variant < classesByIndex.length; variant += 1) {
    className = appendClasses(
      className,
      classesByIndex[variant]?.[indexes[variant] ?? noOption] ?? "",
    );
  }
  for (const compound of compiled.compounds) {
    if (matches(compound, indexes)) {
      className = appendClasses(className, compound.classes);
    }
  }
  return className;
}

export { buildRecipe };
export type { LooseRecipeConfig, LooseRecipeProps };
