/**
 * Runs the benchmarks against the built package, measures the bundle sizes,
 * and saves the results in `latest.json`, from which `pnpm docs:build`
 * writes the README and the docs.
 */
import { format, resolveConfig } from "prettier";
import { collectResults } from "./results.ts";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const path = fileURLToPath(new URL("latest.json", import.meta.url));
const results = await collectResults();
const options = await resolveConfig(path);
writeFileSync(
  path,
  await format(JSON.stringify(results), { ...options, filepath: path }),
);
