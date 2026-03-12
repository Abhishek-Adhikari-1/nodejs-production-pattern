import http from "http";
import express from "express";
import { Server } from "socket.io";
import router from "./routes";
import { setupSocket } from "./socket";
import contentNegotiation from "./middlewares/content-negotiation";
import { errorHandler } from "./middlewares/error-handler";
import dotenv from "dotenv";
import xmlparser from "express-xml-bodyparser";

dotenv.config({
  debug: process.env.NODE_ENVIRONMENT !== "production",
});

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = new Set(["*"]);
const PORT = process.env.PORT || 3000;

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xmlparser());

app.use("/api", router);

app.use(errorHandler);

setupSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready and listening`);
});

process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export { app, server, io };
