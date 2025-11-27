import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const plugins = [
    react(),
    runtimeErrorOverlay()];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {

  }

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "apps/web", "src"),
        "@shared": path.resolve(import.meta.dirname, "packages/shared"),
        "@database": path.resolve(import.meta.dirname, "packages/database"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets")
      }
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-chartjs-2", "chart.js", "wouter", "@tanstack/react-query"],
      exclude: []
    },
    root: path.resolve(import.meta.dirname, "apps/web"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"]
      },
      hmr: {
        overlay: false
      },
      proxy: {
        "/api": {
          target: process.env.VITE_API_URL || "http://localhost:4000",
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});


