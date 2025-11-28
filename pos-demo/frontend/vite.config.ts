import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: Number(process.env.VITE_POS_PORT || 5174),
        host: process.env.VITE_HOST || "0.0.0.0",
        proxy: {
            "/api": {
                target: process.env.POS_API_URL || "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
});
