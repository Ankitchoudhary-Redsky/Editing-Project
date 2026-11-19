import type { Socket } from "socket.io-client";

export type CanvasOperation = {
  operationId: string;
  documentId: string;
  clientId: string;
  action: "add" | "update" | "remove";
  objectId: string;
  object?: Record<string, unknown>;
  stackIndex?: number;
  timestamp: string;
};

export function joinDocumentRoom(
  socket: Socket,
  documentId: string,
  clientId: string,
) {
  socket.emit("document:join", { documentId, clientId });
}

export function leaveDocumentRoom(
  socket: Socket,
  documentId: string,
  clientId: string,
) {
  socket.emit("document:leave", { documentId, clientId });
}

export function sendCanvasOperation(
  socket: Socket,
  operation: CanvasOperation,
) {
  socket.emit("canvas:operation", operation);
}
