import type { MarkedToken, Token, Tokens } from "marked";
import { Parser } from "marked";

/** A code block, which joins the tabs of its neighbors when it has a tab. */
interface CodeBlock {
  readonly language: string;
  readonly tab: string | undefined;
  readonly code: string;
}

const TAB_PREFIX = "tab=";

/** Whether a token has a type, which narrows it to that type's token. */
function isToken<Type extends MarkedToken["type"]>(
  token: Token,
  type: Type,
): token is Extract<MarkedToken, { readonly type: Type }> {
  return token.type === type;
}

/** Escapes text for HTML content and attribute values. */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Returns a heading's text without Markdown, such as `cx` for `` `cx` ``. */
function plainText(markdown: string): string {
  return markdown.replaceAll("`", "");
}

/** Returns the anchor GitHub gives a heading, such as `why-class-recipe`. */
function slugOf(markdown: string): string {
  return plainText(markdown)
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s/gu, "-");
}

function renderInline(tokens: readonly Token[]): string {
  return Parser.parseInline([...tokens]);
}

function renderBlocks(tokens: readonly Token[]): string {
  return Parser.parse([...tokens]);
}

/**
 * Reads a fenced code block. Its info string may add a tab after the
 * language, as in `` ```sh tab=npm ``, which GitHub ignores.
 */
function codeBlockOf(token: Tokens.Code): CodeBlock {
  const [language = "", ...options] = (token.lang ?? "").split(/\s+/u);
  const tab = options.find((option) => option.startsWith(TAB_PREFIX));
  return {
    code: token.text,
    language,
    tab: tab?.slice(TAB_PREFIX.length),
  };
}

function renderPre(block: CodeBlock, attributes = ""): string {
  return `<pre tabindex="0"${attributes}><code data-lang="${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`;
}

function renderCode(block: CodeBlock): string {
  return `<div class="code">
<div class="code-head"><span class="eyebrow">${escapeHtml(block.language)}</span></div>
${renderPre(block)}
</div>`;
}

/**
 * Renders code blocks as tabs, whose ids start with `idPrefix`, labeled by
 * `label` for assistive technology.
 */
function renderTabs(
  blocks: readonly CodeBlock[],
  idPrefix: string,
  label: string,
): string {
  const ids = blocks.map((block) => slugOf(`${idPrefix} ${block.tab ?? ""}`));
  const tabs = blocks.map((block, index) => {
    const id = ids[index] ?? "";
    const selected = index === 0;
    return `<button class="code-tab eyebrow" type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${String(selected)}"${selected ? "" : ' tabindex="-1"'}>${escapeHtml(block.tab ?? "")}</button>`;
  });
  const panels = blocks.map((block, index) => {
    const id = ids[index] ?? "";
    const hidden = index === 0 ? "" : " hidden";
    return renderPre(
      block,
      ` id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}"${hidden}`,
    );
  });
  return `<div class="code" data-tabs>
<div class="code-head"><div class="code-tabs" role="tablist" aria-label="${escapeHtml(label)}">${tabs.join("")}</div></div>
${panels.join("\n")}
</div>`;
}

function renderHeadCell(cell: Tokens.TableCell): string {
  const numeric = cell.align === "right" ? " number" : "";
  const content =
    cell.text === ""
      ? '<span class="visually-hidden">Row</span>'
      : renderInline(cell.tokens);
  return `<th class="eyebrow${numeric}" scope="col">${content}</th>`;
}

function renderRow(cells: readonly Tokens.TableCell[]): string {
  const rendered = cells.map((cell, index) => {
    const content = renderInline(cell.tokens);
    if (index === 0) {
      return `<th scope="row">${content}</th>`;
    }
    return cell.align === "right"
      ? `<td class="number">${content}</td>`
      : `<td>${content}</td>`;
  });
  return `<tr>${rendered.join("")}</tr>`;
}

/** Renders a table in a scrollable region named `label`. */
function renderTable(table: Tokens.Table, label: string): string {
  const head = table.header.map((cell) => renderHeadCell(cell)).join("");
  const rows = table.rows.map((cells) => renderRow(cells)).join("\n");
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${escapeHtml(label)}">
<table>
<caption class="visually-hidden">${escapeHtml(label)}</caption>
<thead><tr>${head}</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

/** Renders a heading with a link to itself. */
function renderHeading(heading: Tokens.Heading, id: string): string {
  const label = escapeHtml(`Permalink to ${plainText(heading.text)}`);
  const content = renderInline(heading.tokens);
  const element =
    heading.depth === 2
      ? `<h2>${content}</h2>`
      : `<h${heading.depth} id="${id}">${content}</h${heading.depth}>`;
  return `<div class="heading">${element}<a class="heading-anchor" href="#${id}" aria-label="${label}">#</a></div>`;
}

export {
  codeBlockOf,
  escapeHtml,
  isToken,
  plainText,
  renderBlocks,
  renderCode,
  renderHeading,
  renderInline,
  renderTable,
  renderTabs,
  slugOf,
};
export type { CodeBlock };
