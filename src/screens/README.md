# Pantallas

Este directorio queda reservado para extraer pantallas de `src/main.js` de forma incremental.

Antes de crear una pantalla nueva o extraer una existente, revisar estos modulos compartidos:

```text
src/config/appConstants.js      runtime, rutas, storage y constantes de virtualizacion
src/data/uiText.js              textos ES/EN y traducciones
src/data/compendiumEntries.js   normalizacion CSV, fuentes, rarezas, tamanos e imagenes de compendios
src/data/contentTranslation.js  idioma de contenido CSV, sidecars .es.csv y glosario EN->ES
src/data/gameConstants.js       progresiones, monedas, XP, tags y datos de personaje/combate
src/data/itemTypeGroups.js      jerarquia de filtros por tipo de item
src/shared/compendiumLayout.js  altura comun de listas y detalles de compendios
src/shared/csv.js               parser CSV compartido
src/shared/dndRules.js          stats, modificadores, CR, pesos y dados de PG
src/shared/numberUtils.js       numeros seguros y objeto plano
src/shared/text.js              texto limpio, escape HTML, slug y listas
src/shared/virtualList.js       ventana visible de listas virtualizadas
src/screens/compendiums/detailRender.js  fichas seleccionadas de compendios
src/screens/compendiums/listRender.js    filas y listas virtualizadas de compendios
```

La convencion recomendada para nuevas funcionalidades es:

```text
src/screens/<screen-id>/
  render.js
  actions.js
  state.js
  selectors.js
```

Cada rama debe intentar tocar solo el modulo de su pantalla. Si una pantalla necesita comportamiento compartido, moverlo primero a `src/shared/` o `src/data/` para evitar conflictos repetidos en `src/main.js`.

Para extraer pantallas existentes, ruta recomendada:

1. Mover primero constantes puras a `src/data/` o `src/config/`.
2. Mover helpers sin dependencia de `state` a `src/shared/`.
3. Extraer render puro de pantalla a `src/screens/<screen-id>/render.js`, inyectando dependencias desde `main.js` mientras `state` siga global. En compendios ya existe el patron con `detailRender.js` y `listRender.js`.
4. Mantener handlers y mutaciones de `state` en `src/main.js` hasta que haya un patron claro para `actions.js`.
