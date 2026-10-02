/**
 * A value that {@link cx} turns into class names.
 *
 * - A non-empty string is used as is.
 * - A non-zero number is converted to a string.
 * - A {@link ClassDictionary} contributes the keys whose values are truthy.
 * - A {@link ClassArray} contributes each of its items, recursively.
 * - Every other value (`false`, `true`, `null`, `undefined`, `0`, `""`) is
 *   ignored, which allows conditions such as `isActive && "active"`.
 */
type ClassValue =
  ClassArray | ClassDictionary | string | number | boolean | null | undefined;

/**
 * An object whose keys are class names, each included when its value is
 * truthy.
 *
 * @example
 * ```ts
 * cx({ "opacity-50": isDisabled, "cursor-wait": isLoading });
 * ```
 */
type ClassDictionary = Readonly<Record<string, unknown>>;

/** A list of {@link ClassValue}s, which may be nested. */
type ClassArray = readonly ClassValue[];

/**
 * Joins class names into a single space-separated string, skipping falsy
 * values.
 *
 * It accepts the same inputs as `clsx` and produces the same output, so it
 * can replace `clsx` directly. It does not resolve conflicting classes; to do
 * that, pass a merging function such as `twMerge` to `createRecipes`.
 *
 * @param inputs - The class names to join; see {@link ClassValue}.
 * @returns The class names separated by single spaces, or `""` when there
 *   are none.
 *
 * @example
 * ```ts
 * cx("btn", isActive && "btn-active", { "btn-disabled": isDisabled });
 * // => "btn btn-active" when isActive is true and isDisabled is false
 *
 * cx(["flex", ["items-center", null]], { hidden: false });
 * // => "flex items-center"
 * ```
 */
function cx(...inputs: ClassArray): string {
  return fromArray(inputs);
}

function fromArray(values: ClassArray): string {
  let classNames = "";
  for (const value of values) {
    const isIncluded = Boolean(value);
    if (isIncluded) {
      const classNamesOfValue =
        typeof value === "string" ? value : fromNonString(value);
      if (classNamesOfValue) {
        if (classNames) {
          classNames += " ";
        }
        classNames += classNamesOfValue;
      }
    }
  }
  return classNames;
}

function fromNonString(value: Exclude<ClassValue, string>): string {
  if (typeof value === "number") {
    return value ? String(value) : "";
  }
  if (typeof value !== "object" || value === null) {
    return "";
  }
  return isClassArray(value) ? fromArray(value) : fromDictionary(value);
}

function fromDictionary(dictionary: ClassDictionary): string {
  let classNames = "";
  for (const className in dictionary) {
    const isIncluded = Boolean(dictionary[className]);
    if (isIncluded) {
      if (classNames) {
        classNames += " ";
      }
      classNames += className;
    }
  }
  return classNames;
}

function isClassArray(
  value: ClassArray | ClassDictionary,
): value is ClassArray {
  return Array.isArray(value);
}

export { cx };
export type { ClassArray, ClassDictionary, ClassValue };
