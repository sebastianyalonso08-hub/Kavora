# KAVORA Architecture

The code is separated into configuration, storage, authentication, games, multiplayer, Studio and creator modules.

`server.js` is intentionally a composition layer.

The JSON storage adapter is a development implementation. For durable Render production storage, replace it with a database adapter and move uploads to object storage/CDN.

The WebSocket room layer is a starter multiplayer service. A larger deployment should use dedicated authoritative game servers and a scalable server registry.
