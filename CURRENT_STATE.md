# Current State

## Snapshot

- Fecha de revision: 2026-04-24
- Repo asumido: `Mimic Dice`
- Rama actual: `feature/desktop-build`
- HEAD: `6d204df`
- Working tree al crear este archivo: con cambios locales enfocados en desktop packaging
- Objetivo producto confirmado: app funcional y comoda para gestionar sesiones de D&D para master
- Usuario principal confirmado: master de D&D 5e
- Prioridad actual confirmada: terminar pantalla de personajes

## What Exists Today

- Tracker de combate con tabla, orden de turnos, filtros, seleccion multiple, dano en area y ajustes inline de PG.
- Inventario de encuentros con carpetas, encuentros, drag and drop y picker para anadir entidades al combate.
- Bestiario con carga de CSV, mapa de imagenes, filtros, busqueda y virtualizacion de lista.
- Items con carga de CSV, mapa de imagenes, filtros por rareza/tipo/source y panel de detalle.
- Arcanum con carga de `Spells.csv`, filtros por source/nivel/escuela/clase/casting time y detalle.
- Pantalla de personajes con ficha amplia, progreso, stats, habilidades, inventario, avatar e iconos de clase.
- Pantalla de personajes con skills de campana comunes para toda la campana, configuradas fuera de cada ficha.
- Cada personaje ajusta nivel y XP por skill comun, con botones de progreso segun resultado.
- Valores por defecto de skills comunes: exito `2`, fracaso `1`.
- Caso especial actual: `Cocina` usa tres resultados: fracaso `1`, intermedio `2`, exito `3`.
- Caso especial actual: `Trampas y puertas secretas` solo da XP por exito y da `3`; por fracaso da `0`.
- Resumen de grupo mostrando XP de personaje con nivel integrado en barra y progreso compacto de skills comunes.
- Resumen de grupo reordena columnas con `Carga` antes de `Skills`; XP muestra nivel y `%`, Carga muestra `actual/max` y `%` sin `lb`, y Skills muestra `NV.` separado del divisor `actual/requerida` sin texto `XP`.
- Resumen de grupo comprime `Personaje` a la mitad de ancho anterior y usa 3 barras de skill por fila para aprovechar mas espacio horizontal.
- En resumen de grupo, nombres largos de personaje pueden ocupar dos lineas y el titulo de cada skill se adapta mejor al ancho de su tarjeta.
- En barras de `Skills` del resumen de grupo, `NV.` queda alineado a la izquierda y el divisor `actual/requerida` a la derecha.
- Las skills de ficha ahora tratan el selector de nivel y el campo `XP nivel` como progreso real dentro del nivel actual, no como XP acumulada total.
- En la ficha, cuando las skills estan en vista resumida, clicar una tarjeta tambien despliega el detalle global igual que el boton `Ver detalle`.
- En inventario de personaje, si una fila coincide con un item del catalogo, el nombre se subraya y al pasar el raton aparece a la izquierda una ficha flotante del item.
- La ficha flotante del item en inventario queda alineada para que su esquina inferior derecha coincida en altura con la fila del objeto.
- La ficha flotante del item en inventario se puede recorrer con el raton sin desaparecer, y las monedas ya no salen como filas: se editan desde las chips superiores.
- En resumen de grupo, `XP` y `Carga` alinean su texto partido como las barras de `Skills`. Si un enemigo del combat tracker muere, su XP se reparte automaticamente entre personajes aliados con iniciativa y se suma a sus fichas.
- En combat tracker, la fila en blanco nace como `ENEMIGO` sin iniciativa, `COMBATE!` ignora entidades sin iniciativa, y la tarjeta de experiencia de ficha rapida ensancha el campo de nivel.
- En `feature/desktop-build`, foco actual pasa a desktop: icono dedicado, empaquetado portable de Windows y descarga simple desde GitHub Actions para probar en otro PC sin instalar Node.
- `ICONO.png` del root se recoloco en `electron/assets/icon.png` para runtime desktop y se genero `build-resources/icon.ico` para empaquetado de Windows.
- Ya existe workflow `Build Desktop` en `.github/workflows/build-desktop.yml` para construir en GitHub un artefacto portable descargable.
- `npm run electron:build:portable` genera ya `dist-electron/Mimic-Dice-portable-0.1.0-x64.exe`.
- Para evitar el bloqueo local de `winCodeSign` por permisos de symlink en Windows, la build portable usa `signAndEditExecutable: false`.
- El portable actual pesa aprox. `1.1 GB` porque la build arrastra el contenido de `public/`, incluidas caches grandes de imagenes.
- Se corrigio una pantalla negra al arrancar el portable: Vite ahora compila con `base: "./"` para que Electron empaquetado no rompa rutas de `assets` al abrir con `file://`.
- La app empaquetada ahora limpia una vez el `localStorage` relevante con una version de reseteo controlada para evitar estado corrupto heredado entre ejecutables.
- La app muestra overlay de carga al arrancar mientras terminan de entrar `Bestiario`, `Objetos` y `Arcanum`.
- El guardado desktop ya recuerda y reutiliza la ruta completa del archivo de campana; `Guardar`, autosave y guardado al cerrar ya no dependen solo del nombre del fichero.
- `Guardar como` ahora respeta la carpeta elegida por el usuario en vez de forzar todo a `campaigns/`.
- `Nueva campana` en desktop limpia ya estado previo antes de abrir `Guardar como`, y al aplicar campana tambien cierra paneles/selecciones de UI que antes quedaban arrastrados.
- Arranque desktop ahora reparte carga en tandas: primero primer render, luego `Bestiario`, despues `Items` y `Arcanum`.
- El portable usa ahora `compression: store` y `portable.useZip: true` para reducir castigo de CPU en apertura/cierre. Tradeoff: exe crece; build actual ronda `1.43 GB`.
- `index.html` ahora trae splash estatico inline, asi ventana puede pintar de inmediato antes de que bundle JS termine de arrancar.
- `combatTrackerData.js` ya no trae entidades placeholder; tabla de combate tracker arranca vacia por defecto.
- Se subio `DESKTOP_STORAGE_RESET_VERSION` a `2026-04-24-c`, ahora limpia todas las claves `mimic-dice:*` de la ejecutable empaquetada y no solo parte del estado.
- `Nueva campana` ahora limpia storage gestionado antes de resetear memoria y espera un paint antes de abrir `Guardar como`, para que el vaciado de datos se note de forma inmediata.
- `normalizeStoredCombatTrackerState()` purga automaticamente la vieja semilla placeholder del combat tracker si aparece desde storage o desde una campana antigua.
- El cierre desktop ya no espera handshake de guardado si renderer aun no esta listo o si no hay cambios sin guardar; main process recibe estado `dirty` y el timeout de cierre baja a `1.8s`.
- El menu `Archivo` ahora muestra el fichero activo cuando existe, con etiqueta `Fichero de campana activa:` y ruta asociada.
- `Guardar campana como` siempre abre primero un modal centrado para pedir nombre de campana; `Guardar campana` hace lo mismo si aun no hay fichero asociado.
- Al confirmar el nombre, ese valor se usa como nombre de campana en memoria y como nombre sugerido del JSON cuando se abre el explorador de Windows.
- `electron/main.js` ya no toca `window.webContents.id` cuando la ventana esta destruida; captura el id antes y evita el error de cierre visto en Windows.
- La ventana desktop ahora abre maximizada por defecto.
- La topbar usa ya la imagen real del icono de la app en vez del bloque `MD`; el mismo icono se reutiliza en el overlay de carga.
- `Nueva campana` refuerza el reset: limpia storage gestionado, borra la seleccion de fichero activo y, si se cancela el `Guardar como`, no debe seguir apuntando al archivo anterior.
- El icono de topbar se agrando para ocupar casi toda la altura util de la barra, manteniendo proporcion y dejando margen.
- `electron/preload.js` expone una firma de build del `.exe`; la app empaquetada la usa para detectar un ejecutable nuevo y limpiar estado persistido en el primer arranque de cada build.
- La build desktop ya no empaqueta `dist/images/bestiary/**/*`; en desktop empaquetado, criaturas usan placeholders en vez de arrastrar mas de 1 GB de imagenes locales.
- Resultado actual: portable baja aprox. de `1.43 GB` a `363 MB`, lo que deberia mejorar mucho la primera apertura antes de ver ventana.
- Existe ya una segunda build desktop `editable zip`: `Mimic-Dice-editable-0.1.0-x64.zip`.
- Esa build empaqueta `resources/app-assets/data` y `resources/app-assets/images` fuera de `app.asar`, para que el usuario pueda editar CSV e imagenes tras descomprimir.
- El renderer detecta `assetBaseUrl` desde `preload` y, si existe `resources/app-assets`, lee CSV/JSON/imagenes desde ahi en vez de depender de rutas internas del bundle.
- Tradeoff: la editable zip vuelve a pesar aprox. `1.43 GB`, pero evita el problema del `portable` de primera ejecucion porque el usuario descomprime antes de lanzar el `.exe`.
- Fix adicional: la editable zip ya no usa `fetch(file://...)` para CSV y JSON. `preload` expone lectura por filesystem y el renderer usa esa via cuando detecta carpeta externa de assets.
- La deteccion de `resources/app-assets` ahora prueba varias rutas posibles relativas al `.exe` descomprimido, no solo `process.resourcesPath`.
- El menu de configuracion de skills se despliega como overlay sobre la UI y no empuja el layout.
- En ficha de personaje, campo editable de XP de skill representa progreso dentro del nivel actual, no XP total acumulada.
- Skills de ficha usan tarjetas en grid de 2 columnas en desktop y cada skill tiene color propio, reutilizado tambien en resumen de grupo.
- Configuracion global de skills muestra color por skill en fondo de cada fila y nuevas skills reciben color nuevo automatico.
- Tarjetas de skills en ficha arrancan resumidas por defecto y un unico boton en cabecera despliega u oculta el detalle de todas.
- Shell Electron con guardar, guardar como, cargar y autosave de campanas.
- `Session Vault` aun no tiene implementacion real; renderiza placeholder.

## Repo Signals

- Historial reciente enfocado en pantalla de personajes.
- Commits visibles mas recientes:
  - `acae44c` `wip`
  - `6674cb2` `version estable de personajes`
  - `5cee789` `wip`
  - `ecc1a37` `avances en diseno ficha de personajes`
  - `9c2e19c` `avances en pantalla de personajes`
- Lectura razonable: rama sigue refinando personajes, aunque ya hubo un hito considerado estable.

## Immediate Focus

- Cerrar funcionalidades pendientes de pantalla de personajes antes de abrir nuevas superficies grandes.
- Evitar expandir `Session Vault` hasta que exista definicion de uso real.

## Current Technical Constraints

- `src/main.js` concentra casi toda logica del frontend y mide aprox. 9425 lineas.
- No se detecto carpeta `tests/` ni scripts de test en `package.json`.
- Verificacion minima actual parece ser `npm run build`.
- La build desktop portable tarda varios minutos porque el paquete actual supera 1 GB.
- `public/images/` es enorme; mala idea releerlo en sesiones normales.
- `session-vault` sigue siendo deuda funcional clara.

## Practical Next Steps

1. Seguir extraccion incremental desde `src/main.js` hacia `src/screens/<screen-id>/`.
2. Decidir alcance de `Session Vault`: placeholder temporal o siguiente modulo real.
3. Definir smoke checklist minima para no depender solo de inspeccion manual.
4. Mantener `public/data/` y scripts de cache como fuente canonica para compendios.

## Known Good Navigation Map

- `combat-tracker` -> combate
- `bestiary` -> criaturas
- `items` -> objetos
- `arcanum` -> conjuros
- `initiative-board` -> personajes
- `session-vault` -> placeholder

## Session Vault Clarification

- `Session Vault` aparece en navegacion, pero hoy no es modulo funcional.
- En codigo actual renderiza placeholder con texto orientado a criaturas guardadas, encuentros preparados, notas de sesion y presets de campana.
- Como el alcance no esta decidido, debe tratarse como idea abierta, no como feature comprometida.
