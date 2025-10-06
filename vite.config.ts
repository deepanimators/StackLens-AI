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
        "@assets": path.resolve(import.meta.dirname, "attached_assets")}},
    root: path.resolve(import.meta.dirname, "apps/web"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true},
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"]},
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false}}}};
});

