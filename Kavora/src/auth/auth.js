const crypto = require("crypto");
const storage = require("../storage");
const { sessionTtlMs } = require("../config");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    coins: user.coins || 0,
    avatar: user.avatar || {},
    createdAt: user.createdAt
  };
}

function register(username, password) {
  username = String(username || "").trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3-20 letters, numbers, or underscores.");
  }
  if (String(password || "").length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const users = storage.read("users");
  if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username is already taken.");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  users[id] = {
    id,
    username,
    displayName: username,
    passwordHash: hashPassword(password),
    coins: 0,
    avatar: { body: "classic" },
    createdAt: now
  };

  storage.write("users", users);
  return publicUser(users[id]);
}

function login(username, password) {
  const users = storage.read("users");
  const user = Object.values(users).find(
    u => u.username.toLowerCase() === String(username || "").trim().toLowerCase()
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid username or password.");
  }

  const sessions = storage.read("sessions");
  const token = crypto.randomBytes(32).toString("hex");

  sessions[token] = {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionTtlMs
  };

  storage.write("sessions", sessions);
  return { token, user: publicUser(user) };
}

function userFromToken(token) {
  if (!token) return null;
  const sessions = storage.read("sessions");
  const session = sessions[token];
  if (!session || session.expiresAt < Date.now()) return null;
  return publicUser(storage.read("users")[session.userId]);
}

function logout(token) {
  const sessions = storage.read("sessions");
  delete sessions[token];
  storage.write("sessions", sessions);
}

module.exports = { register, login, userFromToken, logout, publicUser };
