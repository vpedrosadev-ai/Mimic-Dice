# Current State

## Snapshot

- Fecha de revision: 2026-04-23
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
