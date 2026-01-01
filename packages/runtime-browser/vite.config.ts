import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [
    wasm(), // Support WASM bundling
    topLevelAwait(), // Support top-level await
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "RuntimeBrowser",
      fileName: (format) => `index.${format}.js`,
      formats: ["es"],
    },
    target: "esnext",
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
});
