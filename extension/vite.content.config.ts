import { defineConfig } from "vite";
import { resolve } from "path";

// Chrome manifest content scripts are classic scripts, not ES modules. Build
// this entry independently so all imports are inlined into one injectable file.
export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: false,
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, "src/content/content-script.ts"),
      output: {
        entryFileNames: "content.js",
        inlineDynamicImports: true
      }
    }
  }
});
