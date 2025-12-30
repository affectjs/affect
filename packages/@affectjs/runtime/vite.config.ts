import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "affectjs-affect",
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["@affectjs/dsl", "@affectjs/fluent-ffmpeg", "sharp", "path", "fs"],
    },
  },
  resolve: {
    // 使用 pnpm workspace 的包解析机制，不需要 alias
    // vitest 会通过 deps.inline 和正常的包解析找到 @affectjs/fluent-ffmpeg
  },
  test: {
    globals: true,
    environment: "node",
    deps: {
      inline: ["@affectjs/fluent-ffmpeg", "sharp"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "dist/", "**/*.test.ts", "**/*.spec.ts"],
    },
  },
});
