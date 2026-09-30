import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    benchmark: {
      include: ["src/**/*.bench.ts"],
    },
    coverage: {
      exclude: ["src/**/*.bench.ts", "src/**/*.test.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
    },
    include: ["src/**/*.test.ts"],
  },
});
