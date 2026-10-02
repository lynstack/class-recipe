import type { CodeBlock } from "./markdown.ts";
import type { SectionPlace } from "./sections.ts";
import type { Token, Tokens } from "marked";
import { Lexer } from "marked";
import {
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
} from "./markdown.ts";
import { placeOf } from "./sections.ts";

/** A second-level section of the README that the docs show. */
interface Section {
  readonly id: string;
  readonly heading: Tokens.Heading;
  readonly place: SectionPlace;
  readonly tokens: readonly Token[];
}

/** The parts of the page that come from the README. */
interface PageContent {
  readonly lead: string;
  readonly example: string;
  readonly features: string;
  readonly nav: string;
  readonly sections: string;
}

const SECTION_DEPTH = 2;
const REPOSITORY_FILES = "https://github.com/lynstack/class-recipe/blob/main/";
const RELATIVE_LINK = /\]\((?!#|[a-z]+:)(?<path>[^)]+)\)/gu;

/** Points links to files of the repository at GitHub. */
function absoluteLinks(markdown: string): string {
  return markdown.replaceAll(RELATIVE_LINK, `](${REPOSITORY_FILES}$<path>)`);
}

function isSectionHeading(token: Token): token is Tokens.Heading {
  return isToken(token, "heading") && token.depth === SECTION_DEPTH;
}

/** Whether a paragraph holds only links and images, such as badges. */
function isLinksOnly(paragraph: Tokens.Paragraph): boolean {
  return paragraph.tokens.every(
    (token) =>
      isToken(token, "link") ||
      isToken(token, "image") ||
      (isToken(token, "text") && token.text.trim() === ""),
  );
}

/** Renders a feature, a list item that starts with its name in bold. */
function renderFeature(item: Tokens.ListItem): string {
  const [first] = item.tokens;
  const inline =
    first !== undefined && isToken(first, "text") ? (first.tokens ?? []) : [];
  const [term, ...description] = inline;
  if (term === undefined || !isToken(term, "strong")) {
    throw new Error(`A feature must start in bold: "${item.text}".`);
  }
  const name = renderInline(term.tokens).replace(/\.$/u, "");
  return `<div><dt class="eyebrow">${name}</dt><dd>${renderInline(description).trim()}</dd></div>`;
}

/** Renders the hero from what the README holds before its first section. */
function renderHero(
  tokens: readonly Token[],
): Pick<PageContent, "example" | "features" | "lead"> {
  const lead = tokens.find(
    (token): token is Tokens.Paragraph =>
      isToken(token, "paragraph") && !isLinksOnly(token),
  );
  const example = tokens.find((token) => isToken(token, "code"));
  const features = tokens.find((token) => isToken(token, "list"));
  if (lead === undefined || example === undefined || features === undefined) {
    throw new Error(
      "The README must start with a lead, an example, and features.",
    );
  }
  return {
    example: renderCode(codeBlockOf(example)),
    features: features.items.map((item) => renderFeature(item)).join("\n"),
    lead: renderInline(lead.tokens),
  };
}

/** Splits the README into its hero and its sections. */
function splitReadme(tokens: readonly Token[]): {
  readonly hero: readonly Token[];
  readonly sections: readonly Section[];
} {
  const starts = tokens.flatMap((token, index) =>
    isSectionHeading(token) ? [index] : [],
  );
  const sections = starts.flatMap((start, position): Section[] => {
    const heading = tokens[start];
    if (heading === undefined || !isSectionHeading(heading)) {
      return [];
    }
    const place = placeOf(heading.text);
    return place === undefined
      ? []
      : [
          {
            heading,
            id: slugOf(heading.text),
            place,
            tokens: tokens.slice(start + 1, starts[position + 1]),
          },
        ];
  });
  return { hero: tokens.slice(0, starts[0]), sections };
}

/** Renders a token of a section's body, labeling tables by `label`. */
function renderToken(token: Token, label: string): string {
  if (isToken(token, "heading")) {
    return renderHeading(token, slugOf(token.text));
  }
  if (isToken(token, "table")) {
    return renderTable(token, label);
  }
  if (isToken(token, "code")) {
    return renderCode(codeBlockOf(token));
  }
  return renderBlocks([token]);
}

/**
 * Renders a section's body. Neighboring code blocks with tabs become one
 * block of tabs, and each table is labeled by the heading above it.
 */
function renderBody(section: Section): string {
  const parts: string[] = [];
  let label = plainText(section.heading.text);
  let anchor = section.id;
  let tabs: CodeBlock[] = [];
  for (const token of section.tokens) {
    const block = isToken(token, "code") ? codeBlockOf(token) : undefined;
    if (block?.tab !== undefined) {
      tabs.push(block);
    } else if (!isToken(token, "space")) {
      if (tabs.length > 0) {
        parts.push(renderTabs(tabs, anchor, label));
        tabs = [];
      }
      if (isToken(token, "heading")) {
        label = plainText(token.text);
        anchor = slugOf(token.text);
      }
      parts.push(renderToken(token, label));
    }
  }
  if (tabs.length > 0) {
    parts.push(renderTabs(tabs, anchor, label));
  }
  return parts.join("\n");
}

function renderSection(section: Section): string {
  return `<section id="${section.id}">
<p class="eyebrow section-eyebrow">${escapeHtml(section.place.group)}</p>
${renderHeading(section.heading, section.id)}
${renderBody(section)}
</section>`;
}

function navLink(id: string, markdown: string): string {
  const label = renderInline(Lexer.lexInline(markdown));
  return `<li><a class="nav-link" href="#${id}">${label}</a></li>`;
}

/** Renders the navigation, which starts with a link to the overview. */
function renderNav(sections: readonly Section[]): string {
  const groups = Map.groupBy(sections, (section) => section.place.group);
  return [...groups]
    .map(([group, members], index) => {
      const id = `nav-${slugOf(group)}`;
      const overview = index === 0 ? navLink("overview", "Overview") : "";
      const links = members.map((section) =>
        navLink(section.id, section.place.nav),
      );
      return `<div class="nav-group">
<p class="eyebrow" id="${id}">${escapeHtml(group)}</p>
<ul aria-labelledby="${id}">${overview}${links.join("")}</ul>
</div>`;
    })
    .join("\n");
}

/** Renders the parts of the docs page that come from the README. */
function renderPage(readme: string): PageContent {
  const { hero, sections } = splitReadme(Lexer.lex(absoluteLinks(readme)));
  return {
    ...renderHero(hero),
    nav: renderNav(sections),
    sections: sections.map((section) => renderSection(section)).join("\n\n"),
  };
}

export { renderPage };
export type { PageContent };
