import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import dts from "vite-plugin-dts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [dts({
    outDir: 'dist',
    rollupTypes: true,
  })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
      },
      name: "fluent-setup",
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "commander",
        "ora",
        "fs",
        "path",
        "os",
        "url",
        "node:url",
        "child_process",
        "readline",
        "module",
        "util",
      ],
    },
    target: "node18",
    minify: false,
    sourcemap: true,
  },
});
