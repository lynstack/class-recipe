import type { ClassJoin } from "./join.js";
import type { SelectorOptions } from "./selector.js";
import { cx } from "./cx.js";

/** How a recipe combines and caches its classes. */
interface BuildOptions extends SelectorOptions {
  /** Combines the class strings of a recipe into its class name. */
  readonly join: ClassJoin;
}

const defaultBuildOptions: BuildOptions = { cache: true, join: cx };

export { defaultBuildOptions };
export type { BuildOptions };
