const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { WebSocketServer } = require("ws");

const config = require("./src/config");
const storage = require("./src/storage");
const auth = require("./src/auth/auth");
const games = require("./src/games/games");
const studio = require("./src/studio/projects");
const catalog = require("./src/catalog/creators");
const rooms = require("./src/multiplayer/rooms");

storage.ensure();
fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(config.uploadDir));
app.use(express.static(path.join(__dirname, "public")));

function getToken(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function requireUser(req, res, next) {
  req.user = auth.userFromToken(getToken(req));
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  next();
}

function safe(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (error) {
      res.status(400).json({ error: error.message || "Request failed." });
    }
  };
}

app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "KAVORA", time: new Date().toISOString() })
);

app.post("/api/auth/register", safe((req, res) =>
  res.status(201).json({ user: auth.register(req.body.username, req.body.password) })
));

app.post("/api/auth/login", safe((req, res) =>
  res.json(auth.login(req.body.username, req.body.password))
));

app.post("/api/auth/logout", safe((req, res) => {
  auth.logout(getToken(req));
  res.json({ ok: true });
}));

app.get("/api/me", safe((req, res) => {
  const user = auth.userFromToken(getToken(req));
  if (!user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user });
}));

app.get("/api/games", safe((req, res) =>
  res.json({ games: games.list() })
));

app.get("/api/games/:id", safe((req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found." });
  res.json({ game });
}));

app.get("/api/games/:id/servers", safe((req, res) =>
  res.json({ servers: rooms.list(req.params.id) })
));

app.post("/api/games/:id/servers", requireUser, safe((req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found." });

  const room = rooms.create(game.id, req.body.maxPlayers || 12);
  res.status(201).json({ server: rooms.publicRoom(room) });
}));

app.get("/api/studio/projects", requireUser, safe((req, res) =>
  res.json({ projects: studio.list(req.user.id) })
));

app.post("/api/studio/projects", requireUser, safe((req, res) =>
  res.status(201).json({ project: studio.create(req.user, req.body) })
));

app.put("/api/studio/projects/:id", requireUser, safe((req, res) =>
  res.json({ project: studio.save(req.user, req.params.id, req.body) })
));

app.post("/api/studio/projects/:id/publish", requireUser, safe((req, res) =>
  res.status(201).json({ game: studio.publish(req.user, req.params.id) })
));

app.get("/api/catalog", safe((req, res) =>
  res.json({ items: catalog.list() })
));

const upload = multer({
  dest: config.uploadDir,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    cb(null, ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype));
  }
});

function creatorUpload(type) {
  return [
    requireUser,
    upload.single("image"),
    safe((req, res) => {
      if (!req.file) throw new Error("Use PNG, JPEG or WebP.");
      const ext = req.file.mimetype === "image/png"
        ? ".png"
        : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";

      const filename = req.file.filename + ext;
      fs.renameSync(
        path.join(config.uploadDir, req.file.filename),
        path.join(config.uploadDir, filename)
      );

      res.status(201).json({
        item: catalog.add(req.user, type, req.file.originalname, `/uploads/${filename}`)
      });
    })
  ];
}

app.post("/api/creations/face", creatorUpload("face"));
app.post("/api/creations/clothing", creatorUpload("clothing"));

wss.on("connection", (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const user = auth.userFromToken(url.searchParams.get("token"));
  const game = games.get(url.searchParams.get("gameId"));

  if (!user || !game) {
    socket.close(1008, "Authentication required.");
    return;
  }

  const room = rooms.available(game.id);

  try {
    rooms.join(room, socket, { id: user.id, username: user.username });
  } catch (error) {
    socket.close(1013, error.message);
    return;
  }

  socket.room = room;
  socket.userId = user.id;

  socket.send(JSON.stringify({
    type: "welcome",
    room: rooms.publicRoom(room),
    game: { id: game.id, name: game.name, runtime: game.runtime }
  }));

  rooms.broadcast(room, {
    type: "player_joined",
    player: { id: user.id, username: user.username },
    players: rooms.publicRoom(room).players
  }, user.id);

  socket.on("message", raw => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === "chat") {
        const text = String(message.text || "").trim().slice(0, 200);
        if (!text) return;

        rooms.broadcast(room, {
          type: "chat",
          player: { id: user.id, username: user.username },
          text
        });
      }

      if (message.type === "state") {
        rooms.broadcast(room, {
          type: "state",
          playerId: user.id,
          state: message.state || {}
        }, user.id);
      }
    } catch {}
  });

  socket.on("close", () => {
    rooms.leave(room, user.id);
    rooms.broadcast(room, {
      type: "player_left",
      playerId: user.id,
      players: rooms.publicRoom(room).players
    });
  });
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(config.port, config.host, () =>
  console.log(`KAVORA listening on http://${config.host}:${config.port}`)
);
