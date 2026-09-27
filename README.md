# Kavora V2

MVP corregido con una interfaz más cercana a una plataforma de creación/juegos moderna, Kavora Studio y Kavora Client.

## Mejoras
- Navegación lateral estilo plataforma de juegos.
- Discover / My Games / Avatar / Create / Marketplace.
- Studio con Explorer, viewport, toolbar y propiedades.
- Client con mundo 3D-like, personaje y WebSocket multiplayer.
- Backend arranca el esquema PostgreSQL automáticamente.
- Si no hay DATABASE_URL, funciona en modo demo en memoria para probar localmente.
- Render listo mediante render.yaml.

## Producción
Para persistencia real usa PostgreSQL y configura DATABASE_URL y JWT_SECRET. El modo demo se pierde al reiniciar.
