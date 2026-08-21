import { build } from "esbuild";

const shared = {
  bundle: false,
  format: "esm",
  platform: "node",
  target: "node22",
  sourcemap: true,
};

await build({
  ...shared,
  entryPoints: ["src/index.ts"],
  outdir: "lib",
});

await build({
  ...shared,
  entryPoints: ["src/client/index.ts"],
  outdir: "lib/client",
  platform: "browser",
  external: ["react", "react-dom", "react/jsx-runtime", "@deepseek-ai/*"],
});

console.log("build done");
