import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/shared/src/sqlite-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/database/stacklens.db",
  },
  verbose: true,
  strict: true,
});
