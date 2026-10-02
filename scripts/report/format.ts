import type { CxInput, Results } from "./results.ts";
import type { Speed } from "./speed.ts";

const BYTES_PER_KILOBYTE = 1000;
const MILLION = 1_000_000;
const THOUSAND = 1000;
const PERCENT = 100;
const SPREAD_STEP = 5;

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const longDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** Formats iterations per second, such as `2,247,777`. */
function formatHz(hz: number): string {
  return integer.format(hz);
}

/** Formats iterations per second in millions, such as `17.8`. */
function formatMillions(hz: number): string {
  return oneDecimal.format(hz / MILLION);
}

/** Formats iterations per second for prose, such as `2.2 million`. */
function formatRoughHz(hz: number): string {
  return hz >= MILLION
    ? `${formatMillions(hz)} million`
    : integer.format(Math.round(hz / THOUSAND) * THOUSAND);
}

/** Formats a size in bytes, such as `1.8 kB`. */
function formatSize(bytes: number): string {
  return `${oneDecimal.format(bytes / BYTES_PER_KILOBYTE)} kB`;
}

/** Formats a date such as `2026-10-02` for prose, as `October 2, 2026`. */
function formatDate(isoDate: string): string {
  return longDate.format(new Date(isoDate));
}

/** Returns the share of the fastest speed that `hz` reaches, from 0 to 100. */
function percentOf(hz: number, fastest: number): number {
  return (hz / fastest) * PERCENT;
}

/** Returns the speed named `name`, which must have been measured. */
function speedNamed(speeds: readonly Speed[], name: string): number {
  const speed = speeds.find((candidate) => candidate.name === name);
  if (speed === undefined) {
    throw new Error(`No speed is named "${name}".`);
  }
  return speed.hz;
}

/** Returns how many times as fast class-recipe is as cva, rounded. */
function speedup(results: Results): number {
  return Math.round(
    speedNamed(results.recipe.plain, "class-recipe") /
      speedNamed(results.recipe.plain, "class-variance-authority"),
  );
}

/**
 * Returns the largest gap between the fastest and the slowest library on any
 * input of `cx`, in percent, rounded up to a multiple of 5.
 */
function cxSpread(inputs: readonly CxInput[]): number {
  const gaps = inputs.map(({ speeds }) => {
    const hz = speeds.map((speed) => speed.hz);
    return Math.max(...hz) / Math.min(...hz) - 1;
  });
  return Math.ceil((Math.max(...gaps) * PERCENT) / SPREAD_STEP) * SPREAD_STEP;
}

/** Returns the library fastest on every input of `cx`, if there is one. */
function cxFastestEverywhere(inputs: readonly CxInput[]): string | undefined {
  const fastest = new Set(
    inputs.map(
      ({ speeds }) =>
        speeds.toSorted((left, right) => right.hz - left.hz)[0]?.name,
    ),
  );
  const [name] = fastest;
  return fastest.size === 1 ? name : undefined;
}

/** Capitalizes the first letter of `text`. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export {
  capitalize,
  cxFastestEverywhere,
  cxSpread,
  formatDate,
  formatHz,
  formatMillions,
  formatRoughHz,
  formatSize,
  percentOf,
  speedNamed,
  speedup,
};
