/** Contents to write between markers, keyed by marker name. */
type MarkerContents = Readonly<Record<string, string>>;

function markerPattern(name: string): RegExp {
  return new RegExp(
    `(?<start><!-- report:${name} -->)[\\s\\S]*?(?<end><!-- /report:${name} -->)`,
    "u",
  );
}

function matchMarker(text: string, name: string): RegExp {
  const pattern = markerPattern(name);
  if (!pattern.test(text)) {
    throw new Error(`The markers of "${name}" are missing.`);
  }
  return pattern;
}

/**
 * Writes each content between the `<!-- report:name -->` and
 * `<!-- /report:name -->` markers of its name, keeping the markers.
 */
function fillMarkers(text: string, contents: MarkerContents): string {
  let filled = text;
  for (const [name, content] of Object.entries(contents)) {
    filled = filled.replace(
      matchMarker(filled, name),
      () => `<!-- report:${name} -->${content}<!-- /report:${name} -->`,
    );
  }
  return filled;
}

/** Replaces each pair of markers, and what they hold, with a content. */
function replaceMarkers(text: string, contents: MarkerContents): string {
  let replaced = text;
  for (const [name, content] of Object.entries(contents)) {
    replaced = replaced.replace(matchMarker(replaced, name), () => content);
  }
  return replaced;
}

/** Removes every marker comment, keeping what the markers hold. */
function removeMarkers(text: string): string {
  return text.replaceAll(/<!-- \/?report:[\w-]+ -->/gu, "");
}

export { fillMarkers, removeMarkers, replaceMarkers };
export type { MarkerContents };
