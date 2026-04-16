# Estrategia de integracion de ramas

## Objetivo

Reducir conflictos al integrar pantallas en `main`, evitando que todas las ramas cambien los mismos bloques grandes.

## Reglas de trabajo

- Mantener ramas pequenas por funcionalidad, no ramas largas por pantalla completa.
- Evitar meter cambios de varias pantallas en el mismo commit.
- Antes de abrir una integracion, actualizar la rama con `main` y resolver conflictos localmente.
- Usar una rama temporal `integration/ui-screens` cuando haya varias pantallas activas a la vez.
- No tocar datos estaticos compartidos desde pantallas si ya existen modulos dedicados.

## Estructura modular

- `src/data/bestiarySources.js`: nombres completos de fuentes del bestiario.
- `src/data/combatTrackerData.js`: columnas y entidades iniciales del tracker.
- `src/navigation/screens.js`: definicion de pantallas de navegacion.
- `src/main.js`: orquestacion de estado, eventos y render.

Cuando una pantalla crezca, el siguiente paso recomendado es extraer su render y acciones a:

```text
src/screens/bestiary/
src/screens/combat-tracker/
src/screens/initiative-board/
src/screens/session-vault/
```

## Flujo recomendado

1. Crear una rama corta desde `main`.
2. Implementar una funcionalidad concreta.
3. Ejecutar `npm run build`.
4. Actualizar desde `main`.
5. Resolver conflictos con `rerere` activo.
6. Fusionar primero en `integration/ui-screens` si hay varias pantallas pendientes.
7. Fusionar `integration/ui-screens` a `main` solo cuando compile y esté estable.

## Git rerere

Este repositorio debe tener activado:

```bash
git config rerere.enabled true
git config rerere.autoupdate true
```

Con esto, Git recuerda resoluciones de conflictos repetidos y reduce trabajo en integraciones futuras.
