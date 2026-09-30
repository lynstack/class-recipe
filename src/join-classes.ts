import type { ClassJoin } from "./join.js";
import { cx } from "./cx.js";

/** Joins class strings, given in order of precedence, into a class name. */
type JoinClasses = (classNames: readonly string[]) => string;

/** Concatenates the class strings that are not empty, separated by spaces. */
function concatClasses(classNames: readonly string[]): string {
  let joined = "";
  for (const className of classNames) {
    joined = appendClasses(joined, className);
  }
  return joined;
}

/** Appends `classes` to `className`, separated by a space when both exist. */
function appendClasses(className: string, classes: string): string {
  if (classes === "") {
    return className;
  }
  if (className === "") {
    return classes;
  }
  let joined = className;
  joined += " ";
  joined += classes;
  return joined;
}

/**
 * Returns a function that passes the class strings that are not empty to
 * `join`, or concatenates them directly when `join` is {@link cx}. Without
 * any class string, it returns `""` and does not call `join`.
 */
function createJoinClasses(join: ClassJoin): JoinClasses {
  if (join === cx) {
    return concatClasses;
  }
  return (classNames) => {
    const present = classNames.filter((className) => className !== "");
    return present.length === 0 ? "" : join(...present);
  };
}

export { appendClasses, concatClasses, createJoinClasses };
export type { JoinClasses };
