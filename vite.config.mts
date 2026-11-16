import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "lib",
    target: "es2015",
    minify: false,
    license: { fileName: "licenses.md" },
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.mjs" : "index.js"),
    },
    rolldownOptions: {
      external: [/^react(?:\/|$)/],
    },
  },
  plugins: [
    {
      name: "custo-node-esm-entry",
      generateBundle(options, bundle) {
        if (options.format !== "cjs") return;
        const entry = bundle["index.js"];
        if (entry?.type !== "chunk") {
          throw new Error("Custo's CommonJS entry was not generated");
        }

        // Node's import and require share constructors and React contexts.
        this.emitFile({
          type: "asset",
          fileName: "index.node.mjs",
          source: `import custo from "./index.js";\nexport const { ${entry.exports.join(", ")} } = custo;\n`,
        });
        this.emitFile({
          type: "asset",
          fileName: "index.d.mts",
          source: 'export * from "./index.js";\n',
        });
      },
    },
  ],
});
