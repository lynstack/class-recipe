/** Where the docs show a section of the README. */
interface SectionPlace {
  /** The navigation group, also shown above the section's heading. */
  readonly group: string;
  /** The link text in the navigation, in Markdown. */
  readonly nav: string;
}

/**
 * The place of each second-level heading of the README in the docs, keyed by
 * the heading's Markdown. A heading mapped to `undefined` stays out of the
 * docs, and a heading missing here stops the build, so that a new section
 * cannot be left out of the navigation by mistake.
 */
const sectionPlaces: ReadonlyMap<string, SectionPlace | undefined> = new Map([
  ["Contents", undefined],
  ["Installation", { group: "Get started", nav: "Installation" }],
  ["Why class-recipe", { group: "Get started", nav: "Why class-recipe" }],
  ["`cx`", { group: "API", nav: "`cx`" }],
  ["`cva`", { group: "API", nav: "`cva`" }],
  ["`sva`", { group: "API", nav: "`sva`" }],
  [
    "Writing conflict-free recipes",
    { group: "Guides", nav: "Conflict-free recipes" },
  ],
  [
    "Resolving conflicts with tailwind-merge",
    { group: "Guides", nav: "tailwind-merge" },
  ],
  ["TypeScript", { group: "Guides", nav: "TypeScript" }],
  [
    "Migrating from class-variance-authority",
    { group: "Guides", nav: "Migrating from cva" },
  ],
  ["Performance", { group: "Reference", nav: "Performance" }],
  ["Size", { group: "Reference", nav: "Size" }],
  ["API", { group: "Reference", nav: "Exports" }],
  ["Contributing", { group: "Reference", nav: "Contributing" }],
  ["License", undefined],
]);

/** Returns the place of a section, or `undefined` to leave it out. */
function placeOf(heading: string): SectionPlace | undefined {
  if (!sectionPlaces.has(heading)) {
    throw new Error(
      `Add the README section "${heading}" to scripts/docs/sections.ts.`,
    );
  }
  return sectionPlaces.get(heading);
}

export { placeOf };
export type { SectionPlace };
