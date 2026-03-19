import http from "http";
import express from "express";
import { Server } from "socket.io";
import router from "./routes";
import { setupSocket } from "./socket";
import contentNegotiation from "./middlewares/content-negotiation";
import { errorHandler } from "./middlewares/error-handler";
import dotenv from "dotenv";
import xmlparser from "express-xml-bodyparser";
import { prisma } from "./config/prisma";
import { HTTP_STATUS } from "./utils/http-status";
import { envConfig } from "./config/env-config";

dotenv.config({
  debug: envConfig.NODE_ENVIRONMENT !== "production",
});

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);

const ALLOWED_ORIGINS = new Set(envConfig.ALLOWED_ORIGINS);

const PORT = envConfig.PORT;

const io = new Server(server, {
  transports: ["websocket"],
  path: "/realtime/",
  cors: {
    origin: [...ALLOWED_ORIGINS],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.use(contentNegotiation);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(xmlparser());

app.use("/api", router);

app.use((_req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).respond({ message: "Route not found" });
});

app.use(errorHandler);

setupSocket(io);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("🐘 Connected to the database successfully");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready and listening`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    await prisma.$disconnect();
    console.log("🐘 Database disconnected.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
});

export { app, server, io };
