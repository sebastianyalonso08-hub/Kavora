# KAVORA

KAVORA is an original block-based multiplayer creation platform.

## Included

- Original KAVORA blue/purple/white interface
- Account registration/login/logout
- Server-side sessions
- Game discovery and publishing
- Per-experience server browser
- WebSocket multiplayer room starter
- Kavora Studio
- Block-based project editor
- Project version snapshots
- Browser test mode
- Face Creator
- Clothing Creator
- Community catalog
- Render deployment configuration
- Modular backend architecture

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:10000`.

## Render Free

The application can deploy to Render Free, but local filesystem data should not be treated as durable production storage across deploys/restarts. The JSON storage layer is isolated so it can later be replaced by PostgreSQL or another durable database. Creator uploads should similarly move to object storage for production.

## Architecture

- `server.js` — application composition
- `src/config.js` — configuration
- `src/storage/` — persistence adapter
- `src/auth/` — authentication
- `src/games/` — published experiences
- `src/multiplayer/` — WebSocket rooms
- `src/studio/` — projects and publishing
- `src/catalog/` — creator uploads
- `public/` — KAVORA frontend
- `data/` — local development data

## Studio blocks

The starter editor contains:

- Game Start
- Player Joined
- Key Pressed
- Spawn Object
- Move Player
- Add Coins
- Wait
- Broadcast

## Next production layer

For a large public platform, add a durable database, object storage/CDN, dedicated authoritative game servers, moderation, rate limiting, content scanning, account recovery and a scalable server registry.
