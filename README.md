# KAVORA V5

Kavora is a web-first 3D game platform MVP inspired by user-created game platforms.

## V5 focus

- Roblox-style platform layout without copying Roblox branding.
- 3D only where it belongs: Avatar preview, Kavora Studio, and Kavora Client/gameplay.
- Blocky third-person player avatar.
- Kavora Studio 3D viewport with Explorer and Move / Rotate / Scale tools.
- 3D parts, spawn, ground, terrain/model hooks.
- Kavora Blocks visual scripting foundation.
- Published games load their saved 3D scenes in Kavora Client.
- WebSocket multiplayer foundation.
- PostgreSQL persistence plus demo mode.
- Marketplace/profile foundations.
- Startup/loading screen and runtime error display so module failures no longer leave a silent black page.

## Run

Node.js 20+ and PostgreSQL are recommended.

```bash
npm install
npm start
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env` for persistent production data.

Three.js and Blockly are loaded from CDN by the browser. A network connection is therefore required for the full 3D Studio/Client experience unless those assets are later vendored locally.

## Render

Use the included `render.yaml`, set `DATABASE_URL` and `JWT_SECRET`, then deploy the Node web service.

## Next major systems

- real asset upload/storage
- terrain editing
- stronger physics/collision system
- avatar clothing/accessories
- animations
- more Kavora Blocks (variables, loops, functions, UI, NPCs, multiplayer events)
- server discovery/instances
- moderation and rate limiting
