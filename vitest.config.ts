import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "build/",
                "**/*.d.ts",
                "**/mockData/*",
                "tests/**",
            ],
        },
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
        exclude: ["node_modules", "dist", "build"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "apps/web/src"),
            "@shared": path.resolve(__dirname, "packages/shared"),
            "@database": path.resolve(__dirname, "packages/database"),
            "@assets": path.resolve(__dirname, "attached_assets"),
        },
    },
});
