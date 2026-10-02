import type { Comparison, Results } from "./results.ts";
import {
  capitalize,
  cxFastestEverywhere,
  cxSpread,
  formatDate,
  formatHz,
  formatMillions,
  formatRoughHz,
  formatSize,
  speedNamed,
} from "./format.ts";
import type { Size } from "./size.ts";
import type { Speed } from "./speed.ts";

/**
 * A table whose first column names each row. Text in backticks is code, in
 * both the Markdown and the HTML output.
 */
interface Table {
  /** Describes the table to assistive technology. */
  readonly label: string;
  readonly head: readonly string[];
  readonly rows: readonly (readonly string[])[];
  /** Whether every column after the first holds numbers. */
  readonly numeric: boolean;
}

const VOWEL = /^[aeiou]/iu;

/** The libraries that the README names with the version measured. */
const LIBRARIES = [
  "class-recipe",
  "class-variance-authority",
  "tailwind-variants",
  "tailwind-merge",
  "clsx",
  "classnames",
] as const;

/** Names the CPU with its article, such as `an Apple M1 Pro`. */
function cpuOf(results: Results): string {
  return `${VOWEL.test(results.cpu) ? "an" : "a"} ${results.cpu}`;
}

/** Returns the version of a package that was measured. */
function versionOf(results: Results, name: string): string {
  const version = results.versions[name];
  if (version === undefined) {
    throw new Error(`No version of "${name}" was recorded.`);
  }
  return version;
}

/** Names a library with its version in code, such as ``clsx `2.1.1` ``. */
function labelOf(results: Results, name: string): string {
  return `${name} \`${versionOf(results, name)}\``;
}

/**
 * States when, where, and against which versions the measurements ran. The
 * libraries are Markdown, such as ``clsx `2.1.1` ``.
 */
function measurement(results: Results): {
  readonly date: string;
  readonly environment: string;
  readonly libraries: readonly string[];
} {
  return {
    date: formatDate(results.date),
    environment: `${cpuOf(results)} with Node.js ${results.node}`,
    libraries: LIBRARIES.map((name) => labelOf(results, name)),
  };
}

function whyTable(results: Results): Table {
  const { sizes } = results;
  const speedOf = (name: string): string =>
    formatRoughHz(speedNamed(results.recipe.plain, name));
  return {
    head: [
      "",
      labelOf(results, "class-recipe"),
      labelOf(results, "class-variance-authority"),
      `${labelOf(results, "tailwind-variants")}, lite`,
    ],
    label: "class-recipe compared with other libraries",
    numeric: false,
    rows: [
      ["Slots", "Yes", "No", "Yes"],
      [
        "Variant without a default",
        "Required by its type",
        "Optional",
        "Optional",
      ],
      [
        "Conflict resolution",
        "Any join function, cached",
        "Call `twMerge` on the result",
        "`tailwind-merge`, built in",
      ],
      [
        "Recipe calls per second",
        speedOf("class-recipe"),
        speedOf("class-variance-authority"),
        speedOf("tailwind-variants"),
      ],
      [
        "Size, minified and gzipped",
        formatSize(sizes.all.gzipped),
        formatSize(sizes.classVarianceAuthority.gzipped),
        formatSize(sizes.tailwindVariants.gzipped),
      ],
    ],
  };
}

function comparisonTable(
  results: Results,
  title: string,
  comparison: Comparison,
): Table {
  return {
    head: [title, "Iterations per second", "With `tailwind-merge`"],
    label: `${title} benchmark`,
    numeric: true,
    rows: comparison.plain.map(({ hz, name }) => [
      labelOf(results, name),
      formatHz(hz),
      formatHz(speedNamed(comparison.merged, name)),
    ]),
  };
}

function cxSummary(results: Results): string {
  const fastest = cxFastestEverywhere(results.cx);
  const winner = fastest === undefined ? "none is" : `${fastest} is`;
  return [
    "Across every input, `cx`, `clsx`, and `classnames` stay within",
    `${cxSpread(results.cx)}% of each other, and ${winner} fastest on every`,
    "input. Calls per second, in millions:",
  ].join(" ");
}

function cxTable(results: Results): Table {
  return {
    head: [
      "Input",
      labelOf(results, "class-recipe"),
      labelOf(results, "clsx"),
      labelOf(results, "classnames"),
    ],
    label: "cx compared with clsx and classnames",
    numeric: true,
    rows: results.cx.map(({ name, speeds }) => [
      capitalize(name),
      ...speeds.map(({ hz }) => formatMillions(hz)),
    ]),
  };
}

function cacheTable(title: string, speeds: readonly Speed[]): Table {
  return {
    head: [title, "Iterations per second"],
    label: `${title} cache benchmark`,
    numeric: true,
    rows: [
      ["With cache", formatHz(speedNamed(speeds, "cached"))],
      ["Without cache", formatHz(speedNamed(speeds, "uncached"))],
    ],
  };
}

function sizeRow(name: string, size: Size): readonly string[] {
  return [name, formatSize(size.minified), formatSize(size.gzipped)];
}

function sizeTable(results: Results): Table {
  return {
    head: ["Imports", "Minified", "Minified and gzipped"],
    label: "Bundle size",
    numeric: true,
    rows: [
      sizeRow("`cx`", results.sizes.cx),
      sizeRow("`cva`", results.sizes.cva),
      sizeRow("`sva`", results.sizes.sva),
      sizeRow("Everything", results.sizes.all),
    ],
  };
}

function sizeIntroduction(results: Results): string {
  return [
    "Each row bundles only the named exports, minified with",
    `Rolldown \`${versionOf(results, "rolldown")}\` and`,
    "compressed with gzip, so it shows what an app that imports them ships.",
  ].join(" ");
}

function sizeSummary(results: Results): string {
  const { sizes } = results;
  return [
    "Measured the same way, class-variance-authority with `clsx` takes",
    `${formatSize(sizes.classVarianceAuthority.gzipped)}, tailwind-variants`,
    `takes ${formatSize(sizes.tailwindVariants.gzipped)} from its \`lite\``,
    "entry point, and `tailwind-merge`, which any of them may add, takes",
    `${formatSize(sizes.tailwindMerge.gzipped)}.`,
  ].join(" ");
}

export {
  cacheTable,
  comparisonTable,
  cxSummary,
  cxTable,
  labelOf,
  measurement,
  sizeIntroduction,
  sizeSummary,
  sizeTable,
  versionOf,
  whyTable,
};
export type { Table };
