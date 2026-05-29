import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./server";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }
});

io.on("connection", (socket) => {
  socket.on("joinBooking", (bookingId: string) => socket.join(`booking:${bookingId}`));
  socket.on("messageSent", (payload: { bookingId: string }) => {
    io.to(`booking:${payload.bookingId}`).emit("messageReceived", payload);
  });
});

server.listen(port, () => {
  console.log(`The Pet Villa API listening on http://localhost:${port}`);
});
