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
npm run electron:build:portable
npm run cache:bestiary-images
npm run cache:item-images
```

Notas:
- No hay suite formal de tests detectada.
- `npm run build` es verificacion minima antes de integrar.
- `electron:dev` hace correr Vite y Electron juntos.

## Entry Points

- `index.html`: entrada web.
- `src/main.js`: orquestacion principal de estado, eventos, render, carga de datos y persistencia. Sigue siendo grande, pero ya no debe ser el primer destino para cambios de constantes o texto UI.
- `src/styles.css`: estilos globales.
- `src/config/appConstants.js`: constantes de runtime, rutas de assets, claves de storage, versionado desktop y tamanos de virtualizacion.
- `src/data/uiText.js`: textos de interfaz ES/EN y tablas de traduccion.
- `src/data/gameConstants.js`: datos estaticos de reglas internas: atributos, progresion de personaje/skills, monedas, XP por CR, tags de combate y filas de navegacion superior.
- `src/data/itemTypeGroups.js`: jerarquia y deteccion de tipos agregados de items.
- `src/shared/compendiumLayout.js`: sincronizacion de alturas compartida por Bestiario, Items y Arcanum.
- `src/shared/csv.js`: parser CSV compartido por Bestiario, Items y Arcanum.
- `src/shared/virtualList.js`: calculo generico de ventana visible para listas virtualizadas.
- `electron/main.js`: shell de escritorio, dialogos y guardado/carga de campanas.
- `electron/preload.js`: API segura expuesta al frontend.
- `electron/assets/`: recursos del shell desktop, incluido icono runtime de app.
- `build-resources/`: recursos de empaquetado de Electron Builder, incluido icono `.ico` de Windows.

## Directory Map

- `src/`: app frontend.
- `src/config/`: configuracion pura de runtime y constantes transversales.
- `src/data/`: datos pequenos y configuracion compartida.
- `src/navigation/`: definicion de pantallas visibles en navegacion.
- `src/screens/`: reservado para extraer pantallas desde `src/main.js` de forma incremental.
- `src/shared/`: utilidades compartidas entre pantallas que no pertenecen a un dataset concreto.
- `src/assets/`: iconos y recursos importados por Vite.
- `public/data/`: CSV/JSON canonicos de bestiario, items y conjuros.
- `public/images/`: cache grande de imagenes para bestiario e items.
- `scripts/`: scripts PowerShell para poblar caches de imagenes.
- `docs/`: notas operativas del repo.
- `electron/`: wrapper desktop.
- `build-resources/`: iconos y recursos para empaquetado desktop.
- `dist/` y `dist-electron/`: salidas generadas.
- `node_modules/`: dependencias instaladas.

## Screens In Navigation

Fuente de verdad: `src/navigation/screens.js`.

- `combat-tracker`: tracker de combate y turnos.
- `bestiary`: compendio de criaturas.
- `items`: compendio de objetos.
- `arcanum`: compendio de conjuros.
- `initiative-board`: pantalla de personajes.
- `tables`: pantalla de tablas editables de referencia.
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
- `mimic-dice:tables:v1`
- `mimic-dice:encounter-inventory:v1`
- `mimic-dice:combat-tracker:v1`

Notas sobre `tables`:
- Se guarda dentro del fichero de campana.
- Puede importar hojas de Excel a tablas internas.
- Puede exportar cada tabla a `.xlsx`.
- Puede agrupar tablas en carpetas.
- La importacion intenta detectar bloques tabulares, fila de cabeceras y posible titulo de tabla.

Persistencia desktop:

- Esquema: `mimic-dice:campaign`
- Version: `1`
- Extension: `.mimic-campaign.json`
- Carpeta de guardado: `campaigns/` junto a app empaquetada o raiz de app en dev.
- Autosave: cada 5 minutos y al cerrar ventana si ya existe archivo de campana.

## Architecture Notes

- `src/main.js` sigue siendo el archivo de orquestacion principal y aun concentra bastante logica de pantallas, pero ya se empezo a descargar de tablas puras y configuracion transversal.
- Extraccion hecha el 2026-05-01: `src/config/appConstants.js`, `src/data/uiText.js`, `src/data/gameConstants.js`, `src/data/itemTypeGroups.js` y `src/shared/compendiumLayout.js`.
- `state` global vive en `src/main.js` y concentra UI, compendios, personajes, encuentros y combate.
- Cada cambio de UX suele implicar tocar handlers, estado y `render()` en mismo archivo.
- Para cambios de texto, rutas, storage keys, constantes de reglas, jerarquia de items o alturas de compendios, abrir primero los modulos extraidos antes de tocar `src/main.js`.
- La build desktop usa Electron + Electron Builder y ahora prioriza salida `portable` de Windows para pruebas en otros equipos.
- El icono desktop vive en `electron/assets/icon.png` para runtime y en `build-resources/icon.ico` para empaquetado Windows.
- El flujo de distribucion mas simple para terceros sin entorno local es descargar el artefacto portable desde GitHub Actions.
- La config de `electron-builder` usa `signAndEditExecutable: false` para evitar un bloqueo local de `winCodeSign` por permisos de symlink en ciertos Windows.
- La build desktop editable sirve `resources/app-assets/*` mediante protocolo custom de Electron `mimic-assets://local/...` para evitar fallos de carga de imagenes con `file://` en la ejecutable descomprimida.
- Las skills de campana ahora se definen a nivel global de campana y se comparten entre todos los personajes.
- Cada personaje solo guarda su progreso por skill comun: nivel derivado de XP y avance individual por skill.
- Las skills comunes pueden definir XP por resultado. Caso especial actual: `Cocina` usa tres resultados distintos: fracaso `1`, intermedio `2`, exito `3`.
- `src/data/combatTrackerData.js` guarda columnas del tracker y datos iniciales de ejemplo.
- `src/data/tablesSeedData.js` guarda tablas iniciales de referencia para la pantalla `Tablas`.
- `src/data/bestiarySources.js` centraliza nombres largos de fuentes.
- `src/data/uiText.js` centraliza textos de interfaz y traducciones ES/EN.
- `src/data/gameConstants.js` centraliza progresiones, monedas, XP por CR y constantes de combate/personaje.
- `src/data/itemTypeGroups.js` centraliza grupos derivados para filtros de items.
- `src/assets/characterClassIcons.js` resuelve iconos por clase de personaje.
- `src/shared/compendiumLayout.js` centraliza la sincronizacion de altura de listas y paneles de detalle de Bestiario/Items/Arcanum.
- `src/shared/csv.js` centraliza `parseCsv()` para cargas de compendios.
- `src/shared/virtualList.js` centraliza el calculo de `startIndex`, `endIndex`, padding y alto total de listas virtualizadas.
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
- Si tarea es compendio, abrir primero `src/shared/compendiumLayout.js` para altura/layout comun; despues el bloque relevante de `src/main.js` y dataset asociado.
- Si tarea es parseo CSV o rendimiento de listas virtuales, abrir `src/shared/csv.js` o `src/shared/virtualList.js`.
- Si tarea es texto UI o traduccion, abrir `src/data/uiText.js`.
- Si tarea es constantes globales, rutas o storage, abrir `src/config/appConstants.js`.
- Si tarea es filtros de items por tipo, abrir `src/data/itemTypeGroups.js`.
- Si tarea es progresion de personaje/skill, monedas, XP por CR o tags de combate, abrir `src/data/gameConstants.js`.
- Si tarea es modularizacion, mover logica compartida a `src/data/` o futuro `src/shared/` antes de partir pantalla.
- No escanear `public/images/` para tareas de UI normal.
- Mantener `PROJECT_CONTEXT.md` estable: actualizarlo solo si cambia arquitectura, flujo canonico, comandos, prioridades globales o significado de una pantalla.
- Mantener `CURRENT_STATE.md` vivo durante la sesion cuando cambie foco, estado funcional o riesgos activos.
- Antes de cerrar sesion o si contexto se vuelve largo, hacer barrido final de `.md` para dejar handoff corto y reutilizable.

## Session Preferences

- Iniciar cada sesion usando skill `$caveman` por defecto, salvo que usuario pida `stop caveman` o `normal mode`.

## Merge And Maintenance Risk

- Archivo mas conflictivo: `src/main.js`.
- Refactor recomendado por repo: extraer pantallas gradualmente a `src/screens/<screen-id>/`.
- Si varias ramas tocan UI a la vez, revisar `docs/git-integration.md`.
