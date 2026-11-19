import { roomManager } from "./roomManager.js";

const seenOperations = new Set();
const MAX_SEEN_OPERATIONS = 20_000;

function validDocumentId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

function validClientId(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 100;
}

function rememberOperation(operationId) {
  if (seenOperations.has(operationId)) return false;
  seenOperations.add(operationId);
  if (seenOperations.size > MAX_SEEN_OPERATIONS) {
    const oldest = seenOperations.values().next().value;
    if (oldest) seenOperations.delete(oldest);
  }
  return true;
}

function publishUsers(io, documentId) {
  io.to(roomManager.roomName(documentId)).emit("document:users", {
    documentId,
    users: roomManager.getDocumentUsers(documentId),
  });
}

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.data.clientId = null;
    socket.data.documentId = null;

    const leaveCurrentDocument = () => {
      const { documentId, clientId } = socket.data;
      if (!documentId || !clientId) return;
      socket.leave(roomManager.roomName(documentId));
      socket.data.documentId = null;
      roomManager.leaveDocument(documentId, clientId, socket.id);
      publishUsers(io, documentId);
    };

    socket.on("document:join", (payload = {}) => {
      const { documentId, clientId } = payload ?? {};
      if (!validDocumentId(documentId) || !validClientId(clientId)) return;
      if (
        socket.data.documentId === documentId &&
        socket.data.clientId === clientId
      )
        return;
      leaveCurrentDocument();
      socket.data.documentId = documentId;
      socket.data.clientId = clientId;
      roomManager.joinDocument(documentId, clientId, socket.id);
      socket.join(roomManager.roomName(documentId));
      publishUsers(io, documentId);
    });

    socket.on("document:leave", (payload = {}) => {
      const { documentId, clientId } = payload ?? {};
      if (
        socket.data.documentId !== documentId ||
        socket.data.clientId !== clientId
      )
        return;
      leaveCurrentDocument();
      socket.data.clientId = null;
    });

    socket.on("canvas:operation", (operation) => {
      if (!operation || operation.documentId !== socket.data.documentId) return;
      if (operation.clientId !== socket.data.clientId) return;
      if (!validDocumentId(operation.documentId)) return;
      if (
        typeof operation.operationId !== "string" ||
        operation.operationId.length > 120
      )
        return;
      if (
        typeof operation.objectId !== "string" ||
        operation.objectId.length > 120
      )
        return;
      if (!["add", "update", "remove"].includes(operation.action)) return;
      if (
        operation.action !== "remove" &&
        (!operation.object || typeof operation.object !== "object")
      )
        return;
      if (!rememberOperation(operation.operationId)) return;
      socket
        .to(roomManager.roomName(operation.documentId))
        .emit("canvas:operation", operation);
    });

    socket.on("disconnect", () => {
      const { documentId, clientId } = socket.data;
      if (!documentId || !clientId) return;
      roomManager.leaveDocument(documentId, clientId, socket.id);
      publishUsers(io, documentId);
      socket.data.documentId = null;
      socket.data.clientId = null;
    });
  });
}
