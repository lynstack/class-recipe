import type { CompiledVariants, SelectedVariants } from "./variants.js";
import { select, undeclared } from "./variants.js";

/** How a selector computes its results. */
interface SelectorOptions {
  /** Whether to cache the result of each declared selection. */
  readonly cache: boolean;
}

/**
 * Returns a function that builds the result of a selection from the option
 * index of each variant. With `options.cache`, it builds the result of each
 * declared selection once and caches it by the selection's key.
 */
function createSelector<Result>(
  compiled: CompiledVariants<unknown>,
  build: (indexes: Int32Array) => Result,
  options: SelectorOptions,
): (selected: SelectedVariants) => Result {
  const indexes = new Int32Array(compiled.names.length);
  const results =
    options.cache && compiled.isCacheable
      ? new Map<number, Result>()
      : undefined;

  return (selected) => {
    const key = select(compiled, selected, indexes);
    const cachedResult = key === undeclared ? undefined : results?.get(key);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    const result = build(indexes);
    if (key !== undeclared) {
      results?.set(key, result);
    }
    return result;
  };
}

export { createSelector };
export type { SelectorOptions };
