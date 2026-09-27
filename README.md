# KAVORA 3D — V3

Kavora is a web-first user-generated 3D game platform MVP.

## Added in this version

### Kavora Studio
- Real Three.js 3D viewport.
- Explorer hierarchy.
- Select / Move / Rotate / Scale tools.
- Cubes, spheres, cylinders, ground, terrain and spawn objects.
- GLB/GLTF model loading by URL.
- Object properties: name, color, position, scale and behavior.
- Behaviors: spin, bob and bounce.
- SpawnLocation object for player spawn.
- Save and publish scenes to the backend.
- Edit/update an existing published game.

### Kavora Client
- Real 3D scene loaded from the published game data.
- Third-person camera.
- Humanoid-style player avatar with head, torso, arms and legs.
- WASD / arrow movement.
- Space jump.
- Gravity and basic collision checks.
- Spawn from the saved scene.
- Scene behaviors run in the client.
- GLB/GLTF model loading.
- FPS display and online status.

### Multiplayer
- WebSocket game rooms.
- Player position, height and rotation synchronization.
- Other players are rendered as simple avatars.
- Rooms are separated by game ID.

### Data
- Account authentication.
- PostgreSQL persistence when `DATABASE_URL` is configured.
- Demo in-memory mode when it is not.
- Published game scene JSON is stored in the `games.data` column.

## Render

Set these environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

The included `render.yaml` configures the Node web service. A PostgreSQL database should be created in Render and its connection string supplied as `DATABASE_URL`.

## Local

```bash
npm install
npm start
```

Open `http://localhost:10000`.

## Notes

This is still a platform foundation, not a complete Roblox-scale engine. Production work should add a proper asset pipeline/storage service, moderation, rate limiting, server authority/anti-cheat, persistent game servers, physics/collision engine, animation system, friends/chat, avatar clothing, creator marketplace, scripting sandbox, and backups.


## Kavora Blocks

Kavora Studio now includes a visual block-coding editor inspired by RetroStudio/Scratch. Scripts are stored as XML inside each scene object and execute in Kavora Client.

Supported blocks include:
- when game starts
- when this object clicked
- when key pressed
- move / change position
- turn
- wait
- say
- change color
- if / touching player
- forever
- broadcast
- beep

The runtime is intentionally sandboxed and does not execute arbitrary JavaScript from user-created scripts.
