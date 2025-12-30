import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, "src/index.ts"),
                cli: resolve(__dirname, "src/cli.ts"),
            },
            formats: ["es"],
            fileName: (format, entryName) => `${entryName}.js`,
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
            output: {
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name === "cli" ? "cli.js" : "[name].js";
                },
            },
        },
        target: "node18",
        minify: false,
        sourcemap: true,
    },
});
