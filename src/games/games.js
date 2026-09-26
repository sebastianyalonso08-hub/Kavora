const crypto = require("crypto");
const storage = require("../storage");

function list() {
  return Object.values(storage.read("games"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function get(id) {
  return storage.read("games")[id] || null;
}

function publish(owner, project) {
  const all = storage.read("games");
  const id = project.gameId || crypto.randomUUID();
  const now = new Date().toISOString();

  const game = {
    id,
    ownerId: owner.id,
    name: project.name || "Untitled Experience",
    description: project.description || "A KAVORA experience.",
    projectId: project.id,
    runtime: {
      type: "kavora-block-runtime",
      version: 1,
      blocks: project.blocks || [],
      scene: project.scene || {}
    },
    createdAt: all[id]?.createdAt || now,
    updatedAt: now
  };

  all[id] = game;
  storage.write("games", all);
  return game;
}

module.exports = { list, get, publish };
