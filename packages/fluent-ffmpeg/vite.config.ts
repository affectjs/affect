import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "fluent-ffmpeg",
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "events",
        "path",
        "fs",
        "child_process",
        "util",
        "stream",
        "async",
        "which",
        "module",
        "os",
      ],
    },
  },
});
