import { listField, numberField, readJson, stringField } from "./json.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";

/** The iterations per second of one task of a benchmark. */
interface Speed {
  readonly name: string;
  readonly hz: number;
}

/** The speed of each task, fastest first, keyed by the benchmark's full name. */
type Speeds = Readonly<Record<string, readonly Speed[]>>;

const MILLISECONDS_PER_SECOND = 1000;

/** Reads the speeds out of the report of Vitest's JSON reporter. */
function speedsOf(report: unknown): Speeds {
  const benchmarks = listField(report, "testResults").flatMap((file) =>
    listField(file, "assertionResults").flatMap((test) =>
      listField(test, "benchmarks"),
    ),
  );
  return Object.fromEntries(
    benchmarks.map((benchmark) => [
      stringField(benchmark, "name"),
      listField(benchmark, "tasks")
        .map((task): Speed => ({
          hz: MILLISECONDS_PER_SECOND / numberField(task, "period"),
          name: stringField(task, "name"),
        }))
        .toSorted((left, right) => right.hz - left.hz),
    ]),
  );
}

function runBenchmarks(outputFile: string): unknown {
  execFileSync(
    "vitest",
    ["bench", "--run", "--reporter=json", `--outputFile=${outputFile}`],
    { stdio: "inherit" },
  );
  return readJson(outputFile);
}

/**
 * Runs every benchmark against the built package and returns the speed of
 * each task.
 */
function measureSpeeds(): Speeds {
  const directory = mkdtempSync(path.join(tmpdir(), "class-recipe-report-"));
  try {
    return speedsOf(runBenchmarks(path.join(directory, "benchmarks.json")));
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

export { measureSpeeds };
export type { Speed, Speeds };
