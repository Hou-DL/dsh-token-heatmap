/** dsh-token-pulse build: ESM host (Node) + official client bundle
 *  (cjs wrapped in the `__ModuleLoader__` contract required by dsh-client-modules). */

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

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
    name: "dsh-token-pulse/client",
    entry: { client: "src/client/index.ts" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    dts: false,
    clean: false,
    sourcemap: true,
    external: [/@deepseek-ai\/dsh-client-/, "react", "react-dom"],
    define: { __PLUGIN_VERSION__: JSON.stringify(pkg.version) },
    outputOptions: {
      entryFileNames: "client.js",
      banner: 'window.__ModuleLoader__.load({ id: "dsh-token-pulse", factory: (require) => {',
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
    },
  },
]