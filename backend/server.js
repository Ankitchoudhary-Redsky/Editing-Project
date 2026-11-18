import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/socketHandlers.js";

const port = Number(process.env.COLLAB_PORT || 3001);
const allowedOrigins = new Set(
  (
    process.env.COLLAB_ALLOWED_ORIGIN ||
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const isDevelopment = process.env.NODE_ENV !== "production";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      const isLocalViteOrigin =
        isDevelopment &&
        /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
      if (!origin || allowedOrigins.has(origin) || isLocalViteOrigin) {
        callback(null, true);
        return;
      }
      callback(
        new Error(
          `Origin ${origin} is not allowed by the collaboration server.`,
        ),
      );
    },
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1_000_000,
});

registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`Canvas collaboration relay listening on port ${port}`);
  console.log(
    `Allowed browser origins: ${[...allowedOrigins].join(", ")}${isDevelopment ? " plus localhost development ports" : ""}`,
  );
});

function closeServer() {
  io.close(() => process.exit(0));
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
