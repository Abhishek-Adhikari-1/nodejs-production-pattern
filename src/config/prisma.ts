import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { envConfig } from "./env-config";

dotenv.config();

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const isProduction = envConfig.NODE_ENV === "production";

let pool: Pool;

if (isProduction) {
  pool = new Pool({
    user: envConfig.DATABASE_USER,
    password: envConfig.DATABASE_PASSWORD,
    host: envConfig.DATABASE_HOST,
    port: envConfig.DATABASE_PORT,
    database: envConfig.DATABASE_NAME,
    ssl: {
      rejectUnauthorized: true,
      ca: envConfig.DATABASE_SSL_CA,
    },
  });
} else {
  pool = new Pool({
    user: envConfig.DATABASE_USER,
    password: envConfig.DATABASE_PASSWORD,
    host: envConfig.DATABASE_HOST,
    port: envConfig.DATABASE_PORT,
    database: envConfig.DATABASE_NAME,
  });
}

const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      envConfig.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn", "info"],
  });

if (envConfig.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
