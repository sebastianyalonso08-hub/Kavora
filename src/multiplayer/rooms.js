const crypto = require("crypto");

const rooms = new Map();

function create(gameId, maxPlayers = 12) {
  const room = {
    id: crypto.randomUUID(),
    gameId,
    maxPlayers: Math.max(2, Math.min(50, Number(maxPlayers) || 12)),
    players: new Map(),
    createdAt: Date.now()
  };
  rooms.set(room.id, room);
  return room;
}

function available(gameId) {
  for (const room of rooms.values()) {
    if (room.gameId === gameId && room.players.size < room.maxPlayers) return room;
  }
  return create(gameId);
}

function publicRoom(room) {
  return {
    id: room.id,
    gameId: room.gameId,
    maxPlayers: room.maxPlayers,
    players: [...room.players.values()].map(p => ({ id: p.id, username: p.username })),
    createdAt: room.createdAt
  };
}

function list(gameId) {
  return [...rooms.values()]
    .filter(room => room.gameId === gameId)
    .map(publicRoom);
}

function join(room, socket, player) {
  if (room.players.size >= room.maxPlayers) throw new Error("Server is full.");
  room.players.set(player.id, { ...player, socket });
}

function leave(room, id) {
  room.players.delete(id);
  if (!room.players.size) rooms.delete(room.id);
}

function broadcast(room, message, exceptId) {
  const payload = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.id !== exceptId && player.socket.readyState === 1) {
      player.socket.send(payload);
    }
  }
}

module.exports = { create, available, publicRoom, list, join, leave, broadcast };
