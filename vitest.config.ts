import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: false, // Disabled to prevent conflict with Playwright expect
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
        include: ["tests/phase*.test.ts", "apps/**/__tests__/**/*.test.ts", "stacklens/**/tests/**/*.test.ts", "pos-demo/**/tests/**/*.test.ts"],
        exclude: ["node_modules", "dist", "build", "tests/api/**", "tests/e2e/**", "tests/ui/**", "tests/unit/**", "tests/integration/**", "tests/functional/**"],
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
