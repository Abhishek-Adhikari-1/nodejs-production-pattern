import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { envConfig } from "./src/config/env-config";

dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      `postgresql://${envConfig.DATABASE_USER}:${envConfig.DATABASE_PASSWORD}` +
      `@${envConfig.DATABASE_HOST}:${envConfig.DATABASE_PORT}/${envConfig.DATABASE_NAME}` +
      `${envConfig.NODE_ENV === "production" ? "?sslmode=require" : ""}`,
  },
});
