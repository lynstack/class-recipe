import { defineConfig } from "tsdown";

export default defineConfig({
  attw: { profile: "esm-only" },
  dts: { generator: "oxc" },
  entry: ["src/index.ts"],
  failOnWarn: true,
  platform: "neutral",
  publint: { strict: true },
  sourcemap: true,
  target: "es2022",
  tsconfig: "tsconfig.build.json",
});
