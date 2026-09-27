const path = require("path");
const http = require("http");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 10000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

function tokenFor(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function db() {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  return pool;
}

app.get("/api/health", async (req, res) => {
  let database = "not-configured";
  if (pool) {
    try { await pool.query("SELECT 1"); database = "ok"; }
    catch { database = "error"; }
  }
  res.json({ ok: true, service: "Kavora", database });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required." });
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: "Username must be 3-24 letters, numbers or underscores." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const database = await db();
    const hash = await bcrypt.hash(password, 12);
    const result = await database.query(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES ($1,$2,$3)
       RETURNING id, username, display_name, avatar, inventory`,
      [username, hash, displayName || username]
    );
    const user = result.rows[0];
    res.json({ token: tokenFor(user), user });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Username already exists." });
    console.error(e);
    res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const database = await db();
    const { username, password } = req.body;
    const result = await database.query("SELECT * FROM users WHERE username=$1", [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
      return res.status(401).json({ error: "Invalid username or password." });

    res.json({
      token: tokenFor(user),
      user: {
        id: user.id, username: user.username, display_name: user.display_name,
        avatar: user.avatar, inventory: user.inventory
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed." });
  }
});

app.get("/api/me", auth, async (req, res) => {
  try {
    const database = await db();
    const r = await database.query(
      "SELECT id, username, display_name, avatar, inventory, created_at FROM users WHERE id=$1",
      [req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "User not found." });
    res.json({ user: r.rows[0] });
  } catch (e) { res.status(500).json({ error: "Could not load account." }); }
});

app.put("/api/me/avatar", auth, async (req, res) => {
  try {
    const database = await db();
    const avatar = req.body.avatar || {};
    const r = await database.query(
      "UPDATE users SET avatar=$1 WHERE id=$2 RETURNING avatar",
      [JSON.stringify(avatar), req.user.id]
    );
    res.json({ avatar: r.rows[0].avatar });
  } catch (e) { res.status(500).json({ error: "Could not save avatar." }); }
});

app.get("/api/games", async (req, res) => {
  try {
    const database = await db();
    const r = await database.query(
      `SELECT g.id, g.name, g.description, g.thumbnail, g.owner_id, u.username AS owner,
              g.created_at, g.updated_at
       FROM games g JOIN users u ON u.id=g.owner_id
       WHERE g.is_public=true ORDER BY g.updated_at DESC LIMIT 50`
    );
    res.json({ games: r.rows });
  } catch (e) { res.status(500).json({ error: "Could not load games." }); }
});

app.get("/api/my-games", auth, async (req, res) => {
  try {
    const database = await db();
    const r = await database.query(
      "SELECT * FROM games WHERE owner_id=$1 ORDER BY updated_at DESC", [req.user.id]
    );
    res.json({ games: r.rows });
  } catch (e) { res.status(500).json({ error: "Could not load your games." }); }
});

app.post("/api/games", auth, async (req, res) => {
  try {
    const database = await db();
    const { name, description, thumbnail, data, isPublic } = req.body;
    if (!name || name.length > 80) return res.status(400).json({ error: "Invalid game name." });
    const r = await database.query(
      `INSERT INTO games (owner_id,name,description,thumbnail,data,is_public)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.user.id, name, description || "", thumbnail || "", JSON.stringify(data || {}),
       Boolean(isPublic)]
    );
    res.json({ game: r.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: "Could not create game." }); }
});

app.put("/api/games/:id", auth, async (req, res) => {
  try {
    const database = await db();
    const { name, description, thumbnail, data, isPublic } = req.body;
    const r = await database.query(
      `UPDATE games SET name=$1,description=$2,thumbnail=$3,data=$4,is_public=$5,updated_at=NOW()
       WHERE id=$6 AND owner_id=$7 RETURNING *`,
      [name, description || "", thumbnail || "", JSON.stringify(data || {}),
       Boolean(isPublic), req.params.id, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Game not found or not owned by you." });
    res.json({ game: r.rows[0] });
  } catch (e) { res.status(500).json({ error: "Could not update game." }); }
});

const wss = new WebSocketServer({ server, path: "/ws" });
const rooms = new Map();

function roomFor(id) {
  if (!rooms.has(id)) rooms.set(id, new Map());
  return rooms.get(id);
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("game") || "demo";
  const playerId = Math.random().toString(36).slice(2, 10);
  const room = roomFor(roomId);
  const player = { id: playerId, x: 0, y: 0, name: "Player" + playerId.slice(0, 4) };
  room.set(playerId, { ws, player });

  ws.send(JSON.stringify({ type: "welcome", playerId, players: [...room.values()].map(x => x.player) }));
  broadcast(room, { type: "join", player });

  ws.on("message", raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "move") {
        player.x = Number(msg.x) || 0;
        player.y = Number(msg.y) || 0;
        broadcast(room, { type: "move", player });
      }
    } catch {}
  });

  ws.on("close", () => {
    room.delete(playerId);
    broadcast(room, { type: "leave", playerId });
    if (!room.size) rooms.delete(roomId);
  });
});

function broadcast(room, payload) {
  const data = JSON.stringify(payload);
  for (const { ws } of room.values()) if (ws.readyState === 1) ws.send(data);
}

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kavora running on port ${PORT}`);
});
