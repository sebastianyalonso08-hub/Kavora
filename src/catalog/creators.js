const crypto = require("crypto");
const storage = require("../storage");

function list() {
  return Object.values(storage.read("catalog"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function add(user, type, originalName, assetUrl) {
  const all = storage.read("catalog");

  const item = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    type,
    name: originalName.replace(/\.[^.]+$/, "").slice(0, 50),
    assetUrl,
    createdAt: new Date().toISOString()
  };

  all[item.id] = item;
  storage.write("catalog", all);
  return item;
}

module.exports = { list, add };
