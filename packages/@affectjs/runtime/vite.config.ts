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
            external: [
                "@affectjs/dsl",
                "@affectjs/fluent-ffmpeg",
                "sharp",
                "path",
                "fs",
            ],
        },
    },
    test: {
        globals: true,
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "test/",
                "dist/",
                "**/*.test.ts",
                "**/*.spec.ts",
            ],
        },
    },
});
