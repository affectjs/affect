import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "fluent-ffmpeg",
      fileName: "index",
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
        "events",
      ],
      output: {
        globals: {
          events: "EventEmitter",
          path: "path",
          fs: "fs",
          child_process: "child_process",
        },
      },
    },
  },
});
