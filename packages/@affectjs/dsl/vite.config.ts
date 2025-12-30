import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "AffectJsDsl",
            fileName: (format) => {
                if (format === "es") return "index.mjs";
                if (format === "cjs") return "index.cjs";
                return `index.${format}.js`;
            },
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: ["peggy", "@luban-ws/fluent-ffmpeg", "fs", "path"],
            output: [
                {
                    format: "es",
                    entryFileNames: "index.mjs",
                    preserveModules: false,
                    exports: "named",
                },
                {
                    format: "cjs",
                    entryFileNames: "index.cjs",
                    preserveModules: false,
                    exports: "named",
                },
            ],
        },
    },
});
