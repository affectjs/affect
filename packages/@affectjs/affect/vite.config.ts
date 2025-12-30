import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "AffectJsAffect",
            fileName: (format) => {
                if (format === "es") return "index.mjs";
                if (format === "cjs") return "index.cjs";
                return `index.${format}.js`;
            },
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: [
                "@affectjs/dsl",
                "@luban-ws/fluent-ffmpeg",
                "sharp",
                "fs",
                "path",
            ],
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
