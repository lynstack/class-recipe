import { readFileSync } from "node:fs";

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}

/** Reads and parses a JSON file, whose shape the caller checks. */
function readJson(path: string): unknown {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  return value;
}

/** Returns the list `value[key]`, or an empty list when there is none. */
function listField(value: unknown, key: string): readonly unknown[] {
  const items = field(value, key);
  return isList(items) ? items : [];
}

/** Returns the string `value[key]`, which must exist. */
function stringField(value: unknown, key: string): string {
  const text = field(value, key);
  if (typeof text !== "string") {
    throw new TypeError(`Expected a string at "${key}".`);
  }
  return text;
}

/** Returns the number `value[key]`, which must exist. */
function numberField(value: unknown, key: string): number {
  const number = field(value, key);
  if (typeof number !== "number") {
    throw new TypeError(`Expected a number at "${key}".`);
  }
  return number;
}

export { listField, numberField, readJson, stringField };
