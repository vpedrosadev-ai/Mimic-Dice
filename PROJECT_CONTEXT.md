# Project Context

## Purpose

Mimic Dice es una app de apoyo para mesa tipo D&D. Corre como web app con Vite y tambien como app de escritorio con Electron. Objetivo principal actual: que la aplicacion sea funcional y comoda para gestionar sesiones de Dungeons & Dragons para master.

## Product Context

- Usuario principal: master de Dungeons & Dragons 5e.
- Prioridad actual: terminar funcionalidades de pantalla de personajes.
- Estado de `Session Vault`: nombre de navegacion existente, pero sin definicion funcional cerrada por ahora.

## Read Order For New Sessions

1. Leer este archivo.
2. Leer `CURRENT_STATE.md`.
3. Abrir solo archivos de zona afectada por tarea.
4. Ignorar arboles grandes o generados salvo que tarea los necesite.

## Canonical Commands

```powershell
npm install
npm run dev
npm run build
npm run electron:dev
npm run electron:build
npm run cache:bestiary-images
npm run cache:item-images
```

Notas:
- No hay suite formal de tests detectada.
- `npm run build` es verificacion minima antes de integrar.
- `electron:dev` hace correr Vite y Electron juntos.

## Entry Points

- `index.html`: entrada web.
- `src/main.js`: orquestacion principal de estado, eventos, render, carga de datos y persistencia.
- `src/styles.css`: estilos globales.
- `electron/main.js`: shell de escritorio, dialogos y guardado/carga de campanas.
- `electron/preload.js`: API segura expuesta al frontend.

## Directory Map

- `src/`: app frontend.
- `src/data/`: datos pequenos y configuracion compartida.
- `src/navigation/`: definicion de pantallas visibles en navegacion.
- `src/screens/`: reservado para extraer pantallas desde `src/main.js` de forma incremental.
- `src/assets/`: iconos y recursos importados por Vite.
- `public/data/`: CSV/JSON canonicos de bestiario, items y conjuros.
- `public/images/`: cache grande de imagenes para bestiario e items.
- `scripts/`: scripts PowerShell para poblar caches de imagenes.
- `docs/`: notas operativas del repo.
- `electron/`: wrapper desktop.
- `dist/` y `dist-electron/`: salidas generadas.
- `node_modules/`: dependencias instaladas.

## Screens In Navigation

Fuente de verdad: `src/navigation/screens.js`.

- `combat-tracker`: tracker de combate y turnos.
- `bestiary`: compendio de criaturas.
- `items`: compendio de objetos.
- `arcanum`: compendio de conjuros.
- `initiative-board`: pantalla de personajes.
- `session-vault`: placeholder visual por ahora. Nombre reservado para una posible pantalla futura de recursos de sesion o campana, pero aun sin alcance definido.

## Data And Persistence

Datos estaticos cargados en runtime:

- `public/data/Bestiary.csv`
- `public/data/BestiaryImages.json`
- `public/data/Items.csv`
- `public/data/ItemsImages.json`
- `public/data/Spells.csv`

Persistencia local web:

- `mimic-dice:campaign-meta:v1`
- `mimic-dice:characters:v1`
- `mimic-dice:encounter-inventory:v1`
- `mimic-dice:combat-tracker:v1`

Persistencia desktop:

- Esquema: `mimic-dice:campaign`
- Version: `1`
- Extension: `.mimic-campaign.json`
- Carpeta de guardado: `campaigns/` junto a app empaquetada o raiz de app en dev.
- Autosave: cada 5 minutos y al cerrar ventana si ya existe archivo de campana.

## Architecture Notes

- `src/main.js` es archivo monolitico grande, aprox. 9.4k lineas.
- `state` global vive en `src/main.js` y concentra UI, compendios, personajes, encuentros y combate.
- Cada cambio de UX suele implicar tocar handlers, estado y `render()` en mismo archivo.
- Las skills de campana ahora se definen a nivel global de campana y se comparten entre todos los personajes.
- Cada personaje solo guarda su progreso por skill comun: nivel derivado de XP y avance individual por skill.
- Las skills comunes pueden definir XP por resultado. Caso especial actual: `Cocina` usa tres resultados distintos: fracaso `1`, intermedio `2`, exito `3`.
- `src/data/combatTrackerData.js` guarda columnas del tracker y datos iniciales de ejemplo.
- `src/data/bestiarySources.js` centraliza nombres largos de fuentes.
- `src/assets/characterClassIcons.js` resuelve iconos por clase de personaje.
- `src/screens/README.md` marca intencion de extraer pantallas a modulos por pantalla.

## High-Noise Paths To Ignore By Default

No releer salvo necesidad clara:

- `node_modules/`
- `dist/`
- `dist-electron/`
- `public/images/`

Leer solo bajo demanda:

- `public/data/` si tarea cambia dataset, filtros o mapeos.
- `scripts/` si tarea toca cache de imagenes.

## Working Rules That Save Tokens

- Si tarea es de navegacion o alta de pantalla, abrir primero `src/navigation/screens.js`.
- Si tarea es desktop save/load, abrir primero `electron/main.js` y `electron/preload.js`.
- Si tarea es compendio, abrir solo bloque relevante de `src/main.js` y dataset asociado.
- Si tarea es modularizacion, mover logica compartida a `src/data/` o futuro `src/shared/` antes de partir pantalla.
- No escanear `public/images/` para tareas de UI normal.
- Mantener `PROJECT_CONTEXT.md` estable: actualizarlo solo si cambia arquitectura, flujo canonico, comandos, prioridades globales o significado de una pantalla.
- Mantener `CURRENT_STATE.md` vivo durante la sesion cuando cambie foco, estado funcional o riesgos activos.
- Antes de cerrar sesion o si contexto se vuelve largo, hacer barrido final de `.md` para dejar handoff corto y reutilizable.

## Session Preferences

- Iniciar cada sesion usando skill `$caveman` por defecto, salvo que usuario pida `stop caveman` o `normal mode`.
- Tras cada respuesta, intentar indicar porcentaje restante de rate limit de ventana de 5 horas y de cuota semanal.
- Si entorno no expone esos datos de rate limit en la sesion actual, decirlo de forma explicita en vez de inventarlo.

## Merge And Maintenance Risk

- Archivo mas conflictivo: `src/main.js`.
- Refactor recomendado por repo: extraer pantallas gradualmente a `src/screens/<screen-id>/`.
- Si varias ramas tocan UI a la vez, revisar `docs/git-integration.md`.
