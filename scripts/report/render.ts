import type { Comparison, Report, Results } from "./results.ts";
import {
  cacheTable,
  comparisonTable,
  cxSummary,
  cxTable,
  measurement,
  sizeIntroduction,
  sizeSummary,
  sizeTable,
  versionOf,
  whyTable,
} from "./content.ts";
import {
  formatHz,
  formatSize,
  percentOf,
  speedNamed,
  speedup,
} from "./format.ts";
import type { Speed } from "./speed.ts";
import type { Table } from "./content.ts";

/** A row of a table that draws each speed as a bar. */
interface BarRow {
  readonly label: string;
  readonly version?: string;
  readonly hz: number;
  readonly emphasis: "strong" | "muted" | "none";
}

/** Rows under an optional heading. */
interface BarGroup {
  readonly heading?: string;
  readonly rows: readonly BarRow[];
}

const LINE_WIDTH = 80;

/** The index of the last item of a list, counted from its end. */
const LAST = -1;

/** Splits prose at spaces, keeping a name and the code after it together. */
const BREAK = / (?!`)/u;

/** Wraps prose at the line width of the rest of the README. */
function wrap(text: string): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(BREAK)) {
    if (line !== "" && line.length + word.length >= LINE_WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  return [...lines, line].join("\n");
}

function markdownTable(table: Table): string {
  const alignment = table.head.map((_cell, index) =>
    table.numeric && index > 0 ? "--:" : "---",
  );
  return [table.head, alignment, ...table.rows]
    .map((cells) => `| ${cells.join(" | ")} |`)
    .join("\n");
}

function block(...parts: readonly string[]): string {
  return `\n\n${parts.join("\n\n")}\n\n`;
}

/** Quotes Markdown, so that the measurement stands out from the prose. */
function quote(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line === "" ? ">" : `> ${line}`))
    .join("\n");
}

function markdownMeasurement(results: Results): string {
  const { date, environment, libraries } = measurement(results);
  const others = libraries.slice(0, LAST).join(", ");
  const details = `On ${environment}, against ${others}, and ${libraries.at(LAST) ?? ""}.`;
  return quote(`**Measured on ${date}.**\n\n${wrap(details)}`);
}

/** Returns the content of each report marker in the README. */
const markdownReport: Report = (results) => ({
  cache: block(
    markdownTable(cacheTable("Recipe", results.recipeCache)),
    markdownTable(cacheTable("Slot recipe", results.slotRecipeCache)),
  ),
  comparison: block(
    markdownTable(comparisonTable(results, "Recipe", results.recipe)),
    markdownTable(comparisonTable(results, "Slot recipe", results.slotRecipe)),
  ),
  cx: block(wrap(cxSummary(results)), markdownTable(cxTable(results))),
  measurement: block(markdownMeasurement(results)),
  size: block(
    wrap(sizeIntroduction(results)),
    markdownTable(sizeTable(results)),
    wrap(sizeSummary(results)),
  ),
  "size-all": formatSize(results.sizes.all.gzipped),
  "size-cx": formatSize(results.sizes.cx.gzipped),
  speedup: String(speedup(results)),
  why: block(markdownTable(whyTable(results))),
});

function region(label: string, body: string): string {
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}">
<table>
<caption class="visually-hidden">${label}</caption>
${body}
</table>
</div>`;
}

function barRow(row: BarRow, fastest: number): string {
  const percent = percentOf(row.hz, fastest);
  const name =
    row.emphasis === "strong" ? `<strong>${row.label}</strong>` : row.label;
  const label =
    row.version === undefined ? name : `${name} <code>${row.version}</code>`;
  const labelClass = row.emphasis === "muted" ? ' class="muted"' : "";
  const barClass = row.emphasis === "strong" ? "bar" : "bar bar-muted";
  return `<tr>
<td${labelClass}>${label}</td>
<td class="number">${formatHz(row.hz)}</td>
<td class="bar-cell"><div class="${barClass}" role="img" aria-label="${Math.round(percent)}% of the fastest"><span style="width: ${percent.toFixed(1)}%"></span></div></td>
</tr>`;
}

function barGroup(group: BarGroup, fastest: number): string {
  const heading =
    group.heading === undefined
      ? ""
      : `<tr><th class="eyebrow group-head" scope="rowgroup" colspan="3">${group.heading}</th></tr>\n`;
  const rows = group.rows.map((row) => barRow(row, fastest));
  return `<tbody>\n${heading}${rows.join("\n")}\n</tbody>`;
}

function barTable(title: string, groups: readonly BarGroup[]): string {
  const fastest = Math.max(
    ...groups.flatMap((group) => group.rows.map((row) => row.hz)),
  );
  const head = `<thead><tr>
<th class="eyebrow" scope="col">${title}</th>
<th class="eyebrow number" scope="col">Iterations/s</th>
<th class="eyebrow bar-cell" scope="col"><span class="visually-hidden">Relative to the fastest</span></th>
</tr></thead>`;
  const body = groups.map((group) => barGroup(group, fastest));
  return region(`${title} benchmark`, `${head}\n${body.join("\n")}`);
}

function libraryRows(
  results: Results,
  speeds: readonly Speed[],
): readonly BarRow[] {
  return speeds.map(({ hz, name }): BarRow => ({
    emphasis: name === "class-recipe" ? "strong" : "none",
    hz,
    label: name,
    version: versionOf(results, name),
  }));
}

function comparisonTables(
  results: Results,
  title: string,
  comparison: Comparison,
): string {
  return barTable(title, [
    {
      heading: "Without tailwind-merge",
      rows: libraryRows(results, comparison.plain),
    },
    {
      heading: "With tailwind-merge",
      rows: libraryRows(results, comparison.merged),
    },
  ]);
}

/** Renders Markdown inline code as HTML, for text without other markup. */
function inlineCode(text: string): string {
  return text.replaceAll(/`(?<code>[^`]+)`/gu, "<code>$<code></code>");
}

function htmlMeasurement(results: Results): string {
  const { date, environment, libraries } = measurement(results);
  const items = libraries.map((library) => `<li>${inlineCode(library)}</li>`);
  return `<aside class="measurement" aria-label="Measurement">
<p class="eyebrow">Measured on</p>
<p class="measurement-date"><time datetime="${results.date}">${date}</time></p>
<p class="measurement-details">On ${environment}, against:</p>
<ul class="measurement-versions">${items.join("")}</ul>
</aside>`;
}

function cacheRows(title: string, speeds: readonly Speed[]): readonly BarRow[] {
  return [
    {
      emphasis: "none",
      hz: speedNamed(speeds, "cached"),
      label: `${title}, with cache`,
    },
    {
      emphasis: "muted",
      hz: speedNamed(speeds, "uncached"),
      label: `${title}, without cache`,
    },
  ];
}

/**
 * Returns the content of the report markers that the docs show differently
 * from the README: speeds as bars, and the measurement as a callout whose
 * date is a `time` element.
 */
const htmlReport: Report = (results) => ({
  cache: block(
    barTable("Cache", [
      {
        rows: [
          ...cacheRows("Recipe", results.recipeCache),
          ...cacheRows("Slot recipe", results.slotRecipeCache),
        ],
      },
    ]),
  ),
  comparison: block(
    comparisonTables(results, "Recipe", results.recipe),
    comparisonTables(results, "Slot recipe", results.slotRecipe),
  ),
  measurement: block(htmlMeasurement(results)),
});

export { htmlReport, markdownReport };
