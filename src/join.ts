/**
 * Combines class strings into the final class name.
 *
 * The default is `cx`. Pass another function, such as `twMerge` from
 * `tailwind-merge`, to `createRecipes` to also resolve conflicting classes.
 * A recipe calls it once for each declared selection of variants and caches
 * the result. It calls it again for each call that passes a `className` or
 * `classNames` override, and for each call with an undeclared option, which
 * is never cached. Without the cache, it calls it on every call.
 *
 * @param classNames - The class strings to combine, in order of precedence,
 *   lowest first. There is at least one, and none of them is empty.
 * @returns The combined class name.
 */
type ClassJoin = (...classNames: readonly string[]) => string;

export type { ClassJoin };
