import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

// Simple plugin to copy manifest and public assets into dist
function copyExtensionAssets() {
  return {
    name: "copy-extension-assets",
    closeBundle() {
      const distDir = resolve(__dirname, "dist");
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // Copy manifest.json
      const manifestSrc = resolve(__dirname, "manifest.json");
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, resolve(distDir, "manifest.json"));
      }

      // Copy public directory contents if any
      const publicDir = resolve(__dirname, "public");
      if (fs.existsSync(publicDir)) {
        fs.cpSync(publicDir, distDir, { recursive: true });
      }

      // Flatten popup.html and offscreen.html to root of dist as well
      const popupHtml = resolve(distDir, "popup", "popup.html");
      if (fs.existsSync(popupHtml)) {
        fs.copyFileSync(popupHtml, resolve(distDir, "popup.html"));
      }
      const offscreenHtml = resolve(distDir, "offscreen", "offscreen.html");
      if (fs.existsSync(offscreenHtml)) {
        fs.copyFileSync(offscreenHtml, resolve(distDir, "offscreen.html"));
      }
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== "production",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        offscreen: resolve(__dirname, "src/offscreen/offscreen.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content") return "content.js";
          if (chunkInfo.name === "offscreen") return "offscreen.js";
          if (chunkInfo.name === "popup") return "popup.js";
          return "[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "[name].[ext]";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
  plugins: [copyExtensionAssets()],
  test: {
    root: resolve(__dirname),
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
