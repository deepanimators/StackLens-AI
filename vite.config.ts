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
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "apps/web", "src"),
        "@shared": path.resolve(import.meta.dirname, "packages/shared"),
        "@database": path.resolve(import.meta.dirname, "packages/database"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets")
      }
    },
    root: path.resolve(import.meta.dirname, "apps/web"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // Vendor chunks
            if (id.includes("node_modules/react")) {
              return "react";
            }
            if (id.includes("node_modules/@tanstack")) {
              return "tanstack";
            }
            if (id.includes("node_modules/@radix-ui")) {
              return "ui";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }

            // Feature-based code splitting
            if (id.includes("pages/admin") || id.includes("jira-integration-admin")) {
              return "admin";
            }
            if (id.includes("pages/dashboard") || id.includes("pages/ai-enhanced-dashboard")) {
              return "dashboard";
            }
            if (id.includes("pages/upload")) {
              return "upload";
            }
            if (id.includes("pages/") && id.includes("analysis")) {
              return "analysis";
            }
            if (id.includes("lib/") || id.includes("utils/")) {
              return "utils";
            }
          }
        }
      }
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"]
      },
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});


