const documents = new Map();

function roomName(documentId) {
  return `document:${documentId}`;
}

function getDocumentUsers(documentId) {
  return [...(documents.get(documentId)?.keys() ?? [])];
}

function joinDocument(documentId, clientId, socketId) {
  let clients = documents.get(documentId);
  if (!clients) {
    clients = new Map();
    documents.set(documentId, clients);
  }

  let sockets = clients.get(clientId);
  if (!sockets) {
    sockets = new Set();
    clients.set(clientId, sockets);
  }
  sockets.add(socketId);
  return getDocumentUsers(documentId);
}

function leaveDocument(documentId, clientId, socketId) {
  const clients = documents.get(documentId);
  const sockets = clients?.get(clientId);
  sockets?.delete(socketId);
  if (sockets?.size === 0) clients?.delete(clientId);
  if (clients?.size === 0) documents.delete(documentId);
  return getDocumentUsers(documentId);
}

export const roomManager = {
  getDocumentUsers,
  joinDocument,
  leaveDocument,
  roomName,
};
