import { readJson, stringField } from "./json.ts";
import { fileURLToPath } from "node:url";

/** The version of each package measured, keyed by package name. */
type Versions = Readonly<Record<string, string>>;

const root = new URL("../../", import.meta.url);

const dependencies = [
  "class-variance-authority",
  "classnames",
  "clsx",
  "rolldown",
  "tailwind-merge",
  "tailwind-variants",
] as const;

function versionAt(packageJson: string): string {
  const path = fileURLToPath(new URL(packageJson, root));
  return stringField(readJson(path), "version");
}

/**
 * Returns the version of class-recipe, from its package.json, and of each
 * package it is compared with or measured by, as installed.
 */
function readVersions(): Versions {
  const entries: readonly (readonly [string, string])[] = [
    ["class-recipe", versionAt("package.json")],
    ...dependencies.map((name): readonly [string, string] => [
      name,
      versionAt(`node_modules/${name}/package.json`),
    ]),
  ];
  return Object.fromEntries(entries);
}

export { readVersions };
export type { Versions };
