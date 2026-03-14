import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { envConfig } from "./env-config";

dotenv.config();

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const connectionString = `${envConfig.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      envConfig.NODE_ENVIRONMENT === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn", "info"],
  });

if (envConfig.NODE_ENVIRONMENT !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
