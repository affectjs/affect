import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({
    outDir: 'dist',
    rollupTypes: true,
  })],
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
