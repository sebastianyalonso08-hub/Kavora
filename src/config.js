const path = require("path");
const root = process.cwd();

module.exports = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 10000),
  dataDir: path.resolve(process.env.KAVORA_DATA_DIR || path.join(root, "data")),
  uploadDir: path.resolve(process.env.KAVORA_UPLOAD_DIR || path.join(root, "data", "uploads")),
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 2592000000),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024
};
