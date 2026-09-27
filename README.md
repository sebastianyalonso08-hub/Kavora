# KAVORA

Kavora is a web-first game platform MVP inspired by the idea of user-created games.

## Included

- Kavora website
- Register/login
- Persistent user data through PostgreSQL
- Avatar editor
- Inventory
- Kavora Studio: browser-based scene editor
- Save/publish games
- Kavora Client: browser game runtime
- WebSocket multiplayer foundation
- Render deployment configuration
- Dark cyan/violet Kavora visual style
- Uploaded Kavora logo included as `public/kavora-logo.png`

## Run locally

1. Install Node.js 20+.
2. Create a PostgreSQL database.
3. Copy `.env.example` to `.env` and fill in the values.
4. Run the SQL in `schema.sql`.
5. Run:

```bash
npm install
npm start
```

6. Open `http://localhost:10000`.

## Render

Create a PostgreSQL database and a Web Service using this repository/project. Set:

- `DATABASE_URL`
- `JWT_SECRET`

The included `render.yaml` configures the web service.

## Important

This is an MVP foundation, not a production-scale Roblox replacement. The multiplayer server synchronizes simple player positions and the Studio stores simple scene JSON. Before a public launch, add moderation, rate limits, asset validation, secure session handling, backups, abuse prevention, and a persistent database/storage plan.
