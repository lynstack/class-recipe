/**
 * Writes the results of `pnpm report` into the README, then builds the docs
 * page from the README and its template. With `--check`, it writes nothing
 * and fails when either file is out of date.
 */
import { fillMarkers, removeMarkers, replaceMarkers } from "./markers.ts";
import { format, resolveConfig } from "prettier";
import { htmlReport, markdownReport } from "../report/render.ts";
import { readFileSync, writeFileSync } from "node:fs";
import type { PageContent } from "./page.ts";
import type { Results } from "../report/results.ts";
import { fileURLToPath } from "node:url";
import latest from "../report/latest.json" with { type: "json" };
import { renderPage } from "./page.ts";

const readmePath = fileURLToPath(new URL("../../README.md", import.meta.url));
const docsPath = fileURLToPath(
  new URL("../../docs/index.html", import.meta.url),
);
const templatePath = fileURLToPath(new URL("page.html", import.meta.url));
const results: Results = latest;

async function formatted(path: string, text: string): Promise<string> {
  const options = await resolveConfig(path);
  return format(text, { ...options, filepath: path });
}

function fillSlots(template: string, content: PageContent): string {
  let page = template;
  for (const [name, html] of Object.entries(content)) {
    const slot = `<!-- slot:${name} -->`;
    if (!page.includes(slot)) {
      throw new Error(`The template has no "${name}" slot.`);
    }
    page = page.replace(slot, () => String(html));
  }
  return page;
}

const readme = await formatted(
  readmePath,
  fillMarkers(readFileSync(readmePath, "utf8"), markdownReport(results)),
);
const docs = await formatted(
  docsPath,
  fillSlots(
    readFileSync(templatePath, "utf8"),
    renderPage(removeMarkers(replaceMarkers(readme, htmlReport(results)))),
  ),
);

const outputs: ReadonlyMap<string, string> = new Map([
  [readmePath, readme],
  [docsPath, docs],
]);
const isCheck = process.argv.includes("--check");
for (const [path, text] of outputs) {
  if (!isCheck) {
    writeFileSync(path, text);
  } else if (readFileSync(path, "utf8") !== text) {
    process.exitCode = 1;
    process.stderr.write(`${path} is out of date. Run pnpm docs:build.\n`);
  }
}
