import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { Server } from "socket.io";
import { io as createSocketClient } from "socket.io-client";
import { registerSocketHandlers } from "./socketHandlers.js";

let httpServer;
let socketServer;
let serverUrl;
const clients = [];

function waitForEvent(socket, eventName, predicate, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handleEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const handleEvent = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(eventName, handleEvent);
      resolve(payload);
    };
    socket.on(eventName, handleEvent);
  });
}

async function connectGuest(clientId) {
  const socket = createSocketClient(serverUrl, {
    autoConnect: false,
    transports: ["websocket"],
  });
  clients.push(socket);
  const connected = once(socket, "connect");
  socket.connect();
  await connected;
  return { socket, clientId };
}

before(async () => {
  httpServer = createServer();
  socketServer = new Server(httpServer, { cors: { origin: "*" } });
  registerSocketHandlers(socketServer);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  serverUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

after(async () => {
  for (const client of clients) client.disconnect();
  await new Promise((resolve) => socketServer.close(resolve));
});

test("rooms isolate operations, deduplicate IDs, and remove disconnected guests", async () => {
  const [first, second, isolated] = await Promise.all([
    connectGuest("guest-client-a"),
    connectGuest("guest-client-b"),
    connectGuest("guest-client-c"),
  ]);
  const sharedDocumentId = "document-shared-123";
  const otherDocumentId = "document-other-456";
  const usersJoined = waitForEvent(
    second.socket,
    "document:users",
    (message) =>
      message.documentId === sharedDocumentId && message.users.length === 2,
  );

  first.socket.emit("document:join", {
    documentId: sharedDocumentId,
    clientId: first.clientId,
  });
  second.socket.emit("document:join", {
    documentId: sharedDocumentId,
    clientId: second.clientId,
  });
  isolated.socket.emit("document:join", {
    documentId: otherDocumentId,
    clientId: isolated.clientId,
  });
  await usersJoined;

  const received = [];
  const isolatedReceived = [];
  second.socket.on("canvas:operation", (operation) => received.push(operation));
  isolated.socket.on("canvas:operation", (operation) =>
    isolatedReceived.push(operation),
  );
  const operationReceived = waitForEvent(
    second.socket,
    "canvas:operation",
    (operation) => operation.operationId === "operation-deduplicate-1",
  );
  const operation = {
    operationId: "operation-deduplicate-1",
    documentId: sharedDocumentId,
    clientId: first.clientId,
    action: "add",
    objectId: "object-1",
    object: { type: "rect" },
    timestamp: new Date().toISOString(),
  };
  first.socket.emit("canvas:operation", operation);
  first.socket.emit("canvas:operation", operation);
  await operationReceived;
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(received.length, 1);
  assert.equal(isolatedReceived.length, 0);

  const usersLeft = waitForEvent(
    first.socket,
    "document:users",
    (message) =>
      message.documentId === sharedDocumentId && message.users.length === 1,
  );
  second.socket.disconnect();
  await usersLeft;
});
