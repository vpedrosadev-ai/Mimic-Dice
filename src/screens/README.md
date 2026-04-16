# Pantallas

Este directorio queda reservado para extraer pantallas de `src/main.js` de forma incremental.

La convencion recomendada para nuevas funcionalidades es:

```text
src/screens/<screen-id>/
  render.js
  actions.js
  state.js
  selectors.js
```

Cada rama debe intentar tocar solo el modulo de su pantalla. Si una pantalla necesita comportamiento compartido, moverlo primero a `src/shared/` o `src/data/` para evitar conflictos repetidos en `src/main.js`.
