import { Server, Socket } from "socket.io";

export function setupSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on("message", (data: unknown) => {
      console.log(`📩 Message from ${socket.id}:`, data);

      socket.broadcast.emit("message", data);
    });

    socket.on("join-room", (room: string) => {
      socket.join(room);
      console.log(`🚪 ${socket.id} joined room: ${room}`);
      io.to(room).emit("room-update", {
        message: `${socket.id} joined ${room}`,
      });
    });

    socket.on("leave-room", (room: string) => {
      socket.leave(room);
      console.log(`🚶 ${socket.id} left room: ${room}`);
      io.to(room).emit("room-update", {
        message: `${socket.id} left ${room}`,
      });
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
    });
  });
}
