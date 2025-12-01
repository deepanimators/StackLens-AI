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
        // Allow access from EC2 IP and hostname
        allowedHosts: [
            'all',
            "localhost",
            "127.0.0.1",
            ".amazonaws.com", // Allow any AWS hostname
            "pos.stacklens.app",
            "posapi.stacklens.app",
            ".stacklens.app"  // Allow all subdomains
        ],
        proxy: {
            "/api": {
                target: process.env.POS_API_URL || "http://127.0.0.1:3000",
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
