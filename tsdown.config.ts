/** dsh-token-heatmap build: ESM host (Node) + official client bundle
 *  (cjs wrapped in the `__ModuleLoader__` contract required by dsh-client-modules). */

export default [
  // Host-side plugin entry (Node ESM)
  {
    entry: ["src/index.ts"],
    format: "esm",
    platform: "node",
    target: "es2024",
    outDir: "lib",
    clean: true,
    sourcemap: true,
    // Existing lib/*.d.ts from the earlier esbuild+tsc emit remain the type
    // surface; no TypeScript install is required to bundle a runtime build.
    dts: false,
  },
  // Client-side bundle (single file served as /plugins/<id>/client.js)
  {
    name: "dsh-token-heatmap/client",
    entry: { client: "src/client/index.ts" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    dts: false,
    clean: false,
    sourcemap: true,
    external: [/@deepseek-ai\/dsh-client-/, "react", "react-dom"],
    outputOptions: {
      entryFileNames: "client.js",
      banner: 'window.__ModuleLoader__.load({ id: "dsh-token-heatmap", factory: (require) => {',
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
    },
  },
]