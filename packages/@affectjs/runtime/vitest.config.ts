import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // 使用 pnpm workspace 的包解析机制
    // deps.inline 确保 workspace 包被正确解析
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
