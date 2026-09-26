const crypto = require("crypto");
const storage = require("../storage");
const games = require("../games/games");

function list(userId) {
  return Object.values(storage.read("projects"))
    .filter(project => project.ownerId === userId);
}

function create(user, input = {}) {
  const all = storage.read("projects");
  const now = new Date().toISOString();

  const project = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    name: String(input.name || "My KAVORA Game").slice(0, 60),
    description: String(input.description || "").slice(0, 500),
    blocks: Array.isArray(input.blocks) ? input.blocks : [],
    scene: input.scene || { objects: [] },
    versions: [],
    createdAt: now,
    updatedAt: now
  };

  all[project.id] = project;
  storage.write("projects", all);
  return project;
}

function save(user, id, input = {}) {
  const all = storage.read("projects");
  const project = all[id];

  if (!project || project.ownerId !== user.id) {
    throw new Error("Project not found.");
  }

  project.name = String(input.name ?? project.name).slice(0, 60);
  project.description = String(input.description ?? project.description).slice(0, 500);

  if (Array.isArray(input.blocks)) project.blocks = input.blocks;
  if (input.scene) project.scene = input.scene;

  project.updatedAt = new Date().toISOString();
  project.versions.push({
    version: project.versions.length + 1,
    createdAt: project.updatedAt,
    blocks: project.blocks,
    scene: project.scene
  });

  if (project.versions.length > 20) project.versions.shift();

  storage.write("projects", all);
  return project;
}

function publish(user, id) {
  const project = storage.read("projects")[id];
  if (!project || project.ownerId !== user.id) {
    throw new Error("Project not found.");
  }
  return games.publish(user, project);
}

module.exports = { list, create, save, publish };
