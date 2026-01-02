import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 60000, // 增加到 60 秒，避免 takeScreenshots 等测试超时
    hookTimeout: 60000, // hook 超时也设置为 60 秒
  },
});
