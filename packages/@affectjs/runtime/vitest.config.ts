import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    // 在 monorepo 中，vitest 需要明确知道如何解析 workspace 包
    // 使用 alias 指向实际的包路径，这是 monorepo 的标准做法
    alias: {
      "@affectjs/fluent-ffmpeg": resolve(__dirname, "../../@affectjs/fluent-ffmpeg"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // deps.inline 告诉 vitest 不要外部化这些包，而是内联处理
    // 这对于 workspace 包和原生模块（如 sharp）很重要
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
