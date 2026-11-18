import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let guestId: string | null = null;

function generateGuestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getGuestClientId() {
  if (guestId) return guestId;
  const storedId = sessionStorage.getItem("canvas-guest-id");

  guestId = storedId || generateGuestId();

  if (!storedId) sessionStorage.setItem("canvas-guest-id", guestId);
  return guestId;
}

export function getSocketClient() {
  if (!socket) {
    socket = io(
      import.meta.env.VITE_COLLAB_SERVER_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
      },
    );
  }
  return socket;
}
