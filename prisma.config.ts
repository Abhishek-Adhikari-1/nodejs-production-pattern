import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { envConfig } from "./src/config/env-config";

dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: envConfig.DATABASE_URL,
  },
});
