# Session Handoff

- Fecha: 2026-04-23
- Objetivo de sesion: pulir pantalla de personajes y dejar contexto persistente para ahorrar tokens entre sesiones.
- Cambios hechos: creados `PROJECT_CONTEXT.md`, `CURRENT_STATE.md` y `SESSION_HANDOFF.md`; resumen de grupo con barra XP sin total, nivel integrado y sin columna separada; sistema de skills comunes por campana con progreso por personaje; menu `Skills` oculto tras boton; `Cocina` usa fracaso `1`, intermedio `2`, exito `3`; `Trampas y puertas secretas` da XP solo por exito `3`; panel de configuracion de skills ahora se superpone sobre la UI.
- Archivos tocados: `src/main.js`, `src/styles.css`, `PROJECT_CONTEXT.md`, `CURRENT_STATE.md`, `SESSION_HANDOFF.md`.
- Verificacion corrida: `npm run build` OK tras ultimos cambios.
- Bloqueos o riesgos: `src/main.js` sigue muy grande y es punto principal de conflicto; falta revisar UX fina del overlay de `Skills` en uso real por si algun ancho concreto necesita ajuste.
- Preguntas para usuario: ninguna abierta ahora mismo.
- Siguiente paso recomendado: seguir cerrando funcionalidades pendientes de pantalla de personajes y probar visualmente el overlay de `Skills` y los botones de progreso de `Cocina`.
- Comando de arranque: `npm run electron:dev`
