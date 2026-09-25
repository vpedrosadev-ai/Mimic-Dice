# Fechas de las fuentes del compendio

Mimic Dice usa `COMPENDIUM_SOURCE_PUBLICATION_DATES` para decidir qué registro es más reciente cuando varios hechizos, objetos o criaturas comparten nombre. La fuente seleccionada manualmente sigue teniendo prioridad.

## Cobertura

- 108 códigos de fuente distintos encontrados en `Bestiary.csv`, `Items.csv` y `Spells.csv`.
- 108 códigos con fecha guardada.
- 98 fechas proceden de los metadatos estructurados de libros y aventuras enlazados abajo.
- 10 fuentes digitales o suplementos se contrastaron con páginas de lanzamiento adicionales.
- `EET`, `RoTOS` y `SADS` están marcadas como aproximadas porque no se encontró un día de publicación inequívoco en los metadatos principales.

La tabla canónica completa está en `src/data/compendiumSourceDates.js`. Una prueba recorre los tres CSV y falla si aparece un código sin fecha.

## Criterio de selección

1. Si el enlace incluye una fuente elegida expresamente, se conserva esa versión.
2. Si el enlace solo aporta el nombre, se comparan las fechas de publicación guardadas.
3. Para fuentes personalizadas no registradas, se intenta extraer el año del nombre de la fuente.
4. Solo si no existe ninguna fecha, se usa como último recurso el orden del catálogo.

Ejemplo: `Rayo de hechicería` existe en `PHB'14` (2014-08-19) y `PHB'24` (2024-09-17), por lo que un enlace genérico abre `PHB'24`.

## Referencias consultadas

- [Metadatos estructurados de libros](https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/books.json)
- [Metadatos estructurados de aventuras](https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/adventures.json)
- [Player's Handbook 2024 — fecha oficial](https://wpn.wizards.com/en/products/2024-players-handbook)
- [Princes of the Apocalypse — fecha oficial de la línea Elemental Evil](https://wpn.wizards.com/en/products/princes-of-the-apocalypse)
- [Mordenkainen's Fiendish Folio Volume 1 — lanzamiento](https://www.dndbeyond.com/forums/d-d-beyond-general/release-issues-support/53208-mordenkainens-fiendish-folio-volume-1-bugs-and)
- [Monstrous Compendium Volume 3 — lanzamiento](https://www.dndbeyond.com/forums/d-d-beyond-general/release-issues-support/168084-monstrous-compendium-volume-three-minecraft)
- [Misplaced Monsters Volume One — lanzamiento](https://www.dndbeyond.com/forums/d-d-beyond-general/release-issues-support/170851-misplaced-monsters-volume-one-issues-and-support)
- [Rise of Tiamat Online Supplement](https://media.wizards.com/2014/downloads/dnd/RiseTiamatSupplement_Printer.pdf)
- [Tales from the Yawning Portal — fecha oficial](https://wpn.wizards.com/en/products/tales-from-the-yawning-portal)
- [Vecna Dossier — lanzamiento](https://www.dndbeyond.com/posts/1257-what-is-the-vecna-dossier-uncover-the-archlichs/1000?page=2)
- [Sapphire Anniversary Dice Set — confirmación del contenido y año](https://www.dndbeyond.com/posts/866-behold-their-majesty-three-brand-new-dragons-from?page=2)

## Mantenimiento

Al añadir contenido nuevo al compendio, debe añadirse también su fecha en `COMPENDIUM_SOURCE_PUBLICATION_DATES`. `tests/compendium-references.test.js` garantiza la cobertura completa de los catálogos incluidos.
