import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative paths so the build works under any GitHub Pages sub-path.
  base: "./",
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
