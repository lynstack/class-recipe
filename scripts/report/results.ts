import type { Speed, Speeds } from "./speed.ts";
import type { Size } from "./size.ts";
import type { Versions } from "./versions.ts";
import { cpus } from "node:os";
import { measureSize } from "./size.ts";
import { measureSpeeds } from "./speed.ts";
import { readVersions } from "./versions.ts";

/** A benchmark run with and without `tailwind-merge`. */
interface Comparison {
  readonly plain: readonly Speed[];
  readonly merged: readonly Speed[];
}

/** The speed of each library for one input of `cx`. */
interface CxInput {
  readonly name: string;
  readonly speeds: readonly Speed[];
}

/** The minified and gzipped size of each set of imports. */
interface Sizes {
  readonly cx: Size;
  readonly cva: Size;
  readonly sva: Size;
  readonly all: Size;
  readonly classVarianceAuthority: Size;
  readonly tailwindVariants: Size;
  readonly tailwindMerge: Size;
}

/** Everything the README and the docs report. */
interface Results {
  /** The day of the measurement, such as `2026-10-02`. */
  readonly date: string;
  readonly cpu: string;
  readonly node: string;
  readonly recipe: Comparison;
  readonly slotRecipe: Comparison;
  readonly cx: readonly CxInput[];
  readonly recipeCache: readonly Speed[];
  readonly slotRecipeCache: readonly Speed[];
  readonly sizes: Sizes;
  readonly versions: Versions;
}

/** Returns the contents of each report marker, such as a table. */
type Report = (results: Results) => Readonly<Record<string, string>>;

const CX_PREFIX = "cx compared with other libraries > with ";
const cxLibraries = ["class-recipe", "clsx", "classnames"] as const;

/** Formats today's date in the local time zone, such as `2026-10-02`. */
const isoDate = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Returns the speeds of a benchmark's tasks, which must have run. */
function speedsOf(speeds: Speeds, benchmark: string): readonly Speed[] {
  const tasks = speeds[benchmark];
  if (tasks === undefined) {
    throw new Error(`No benchmark is named "${benchmark}".`);
  }
  return tasks;
}

function comparisonOf(speeds: Speeds, suite: string): Comparison {
  return {
    merged: speedsOf(speeds, `${suite} > with tailwind-merge > benchmark`),
    plain: speedsOf(speeds, `${suite} > without tailwind-merge > benchmark`),
  };
}

function cxInputOf(speeds: Speeds, benchmark: string): CxInput {
  const measured = speedsOf(speeds, benchmark);
  return {
    name: benchmark.slice(CX_PREFIX.length),
    speeds: cxLibraries.map((name): Speed => ({
      hz: measured.find((speed) => speed.name === name)?.hz ?? Number.NaN,
      name,
    })),
  };
}

async function measureSizes(): Promise<Sizes> {
  const library = "@lynstack/class-recipe";
  const [all, cva, cx, sva, classVarianceAuthority, tailwindVariants, merge] =
    await Promise.all([
      measureSize(`export * from "${library}";`),
      measureSize(`export { cva } from "${library}";`),
      measureSize(`export { cx } from "${library}";`),
      measureSize(`export { sva } from "${library}";`),
      measureSize('export { cva } from "class-variance-authority";'),
      measureSize('export { tv } from "tailwind-variants/lite";'),
      measureSize('export { twMerge } from "tailwind-merge";'),
    ]);
  return {
    all,
    classVarianceAuthority,
    cva,
    cx,
    sva,
    tailwindMerge: merge,
    tailwindVariants,
  };
}

/** Runs the benchmarks and measures the bundle sizes. */
async function collectResults(): Promise<Results> {
  const speeds = measureSpeeds();
  return {
    cpu: cpus()[0]?.model ?? "an unknown CPU",
    cx: Object.keys(speeds)
      .filter((benchmark) => benchmark.startsWith(CX_PREFIX))
      .map((benchmark) => cxInputOf(speeds, benchmark)),
    date: isoDate.format(new Date()),
    node: process.versions.node,
    recipe: comparisonOf(speeds, "recipe compared with other libraries"),
    recipeCache: speedsOf(speeds, "recipe > is faster with the cache"),
    sizes: await measureSizes(),
    slotRecipe: comparisonOf(
      speeds,
      "slot recipe compared with other libraries",
    ),
    slotRecipeCache: speedsOf(speeds, "slot recipe > is faster with the cache"),
    versions: readVersions(),
  };
}

export { collectResults };
export type { Comparison, CxInput, Report, Results };
