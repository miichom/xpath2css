import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"],
  platform: "browser",
  sourcemap: true,
  minify: "dce-only",
});
