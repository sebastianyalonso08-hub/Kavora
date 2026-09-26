const fs = require("fs");
const path = require("path");
const { dataDir } = require("../config");

const collections = ["users", "sessions", "games", "projects", "catalog"];

function ensure() {
  fs.mkdirSync(dataDir, { recursive: true });
  for (const name of collections) {
    const file = path.join(dataDir, `${name}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, "{}\n");
  }
}

function read(name) {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8") || "{}");
  } catch {
    return {};
  }
}

function write(name, value) {
  ensure();
  const file = path.join(dataDir, `${name}.json`);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
}

module.exports = { ensure, read, write };
