export const releaseNotesSourceDocument = "NOTAS DE VERSION.docx";

export const releaseNotes = Object.freeze([
  {
    "version": "v1.0",
    "versionNumber": "1.0",
    "contentHash": "c2590f80f085ec4e18769294e67adabe66d7acab73606ae03cb1f914a3dfd109",
    "modifiedDate": "2026-05-18",
    "content": {
      "es": {
        "heading": "Version 1.0",
        "modifiedLabel": "Ultima modificacion",
        "sidebarModifiedLabel": "Notas modificadas",
        "summary": "Primera version publicada de la aplicacion con 5000 funcionalidades que ya mirare de listar aqui.",
        "groups": []
      },
      "en": {
        "heading": "Version 1.0",
        "modifiedLabel": "Last modified",
        "sidebarModifiedLabel": "Notes modified",
        "summary": "First published version of the application, with 5000 features that I will list here later.",
        "groups": []
      }
    }
  },
  {
    "version": "v1.1",
    "versionNumber": "1.1",
    "contentHash": "b30e1b68a22b3e528a1930770fc22178bc2fac764c8999489f5b5056e866b9d0",
    "modifiedDate": "2026-05-18",
    "content": {
      "es": {
        "heading": "Version 1.1",
        "modifiedLabel": "Ultima modificacion",
        "sidebarModifiedLabel": "Notas modificadas",
        "summary": "Se resuelve bugs B.1 y B.2 y sugerencias S.1, S.2 y S.3",
        "groups": [
          {
            "title": "Nuevas funcionalidades",
            "sections": [
              {
                "title": "Combate",
                "changes": [
                  "Anadido un buscador en la pantalla de combate para filtrar criaturas por:",
                  "nombre",
                  "bando",
                  "estados activos",
                  "encuentro",
                  "Ahora es posible hacer clic sobre el contador de turno para elegir manualmente el turno actual.",
                  "Anadido el boton \"JUMP TURN TO\", que permite saltar directamente al turno de cualquier participante en la iniciativa."
                ]
              },
              {
                "title": "Efectos en area",
                "changes": [
                  "Los efectos en area ya no requieren seleccionar filas previamente.",
                  "Al usar efectos como dano, curacion, dano necrotico, vida temporal o experiencia en area, se abre una ventana para elegir exactamente que criaturas se ven afectadas.",
                  "La seleccion de objetivos se realiza de forma mas comoda haciendo clic directamente sobre las tarjetas de cada criatura."
                ]
              },
              {
                "title": "Diario",
                "changes": [
                  "Anadido un buscador de notas por texto.",
                  "El buscador muestra en que notas aparece el texto y filtra la lista para mostrar solo las coincidencias.",
                  "Se pueden crear etiquetas largas usando #, por ejemplo #DIA DE LLUVIA#, que se muestran como chips visuales.",
                  "Al hacer clic en una etiqueta, el buscador se rellena automaticamente con ese texto.",
                  "Al hacer clic derecho sobre una etiqueta, se abre directamente el selector de color.",
                  "El color elegido para una etiqueta se aplica a todas sus apariciones.",
                  "Anadidos botones en la barra del editor para explicar visualmente el uso de # y @.",
                  "Se pueden mencionar con @ personajes, objetos o criaturas.",
                  "Al escribir una mencion, aparecen sugerencias para completarla mas rapido.",
                  "Las menciones completadas aparecen subrayadas y permiten abrir la ficha correspondiente con clic izquierdo.",
                  "Anadido un boton para importar y exportar notas y carpetas del diario.",
                  "Anadida una vista ampliada del calendario de Harptos, con estaciones, ciclos lunares y etiquetas en dias concretos.",
                  "El calendario marca los dias que tienen una nota de diario asociada.",
                  "Al hacer clic sobre el chip de una nota, se abre esa nota directamente en el editor.",
                  "Tambien se pueden anadir notas cortas desde el propio calendario y editarlas con clic izquierdo."
                ]
              }
            ]
          },
          {
            "title": "Arreglos de bugs",
            "sections": [
              {
                "title": "Combate",
                "changes": [
                  "El dano necrotico ahora reduce correctamente tanto la vida actual como la vida maxima, reflejando su efecto de forma inmediata."
                ]
              },
              {
                "title": "Mejoras generales",
                "changes": [
                  "Corregidos varios detalles visuales y de comportamiento en listas, ventanas emergentes y buscadores.",
                  "Mejorada la consistencia general de la interfaz.",
                  "Mejorada la comodidad de uso en pantallas con muchos resultados o muchos participantes en combate."
                ]
              },
              {
                "title": "Bestiario, hechizos e items",
                "changes": [
                  "Los buscadores de criaturas, hechizos y objetos muestran ahora listas mas comodas y legibles.",
                  "Cuando hay muchos resultados, la lista mantiene un tamano visual limitado y permite navegar mediante scroll.",
                  "Los textos de ayuda se han simplificado para indicar claramente que la busqueda se realiza por nombre.",
                  "El editor de encuentros del bestiario usa ahora este mismo comportamiento en la lista de criaturas."
                ]
              }
            ]
          }
        ]
      },
      "en": {
        "heading": "Version 1.1",
        "modifiedLabel": "Last modified",
        "sidebarModifiedLabel": "Notes modified",
        "summary": "Fixes bugs B.1 and B.2, and implements suggestions S.1, S.2, and S.3.",
        "groups": [
          {
            "title": "New Features",
            "sections": [
              {
                "title": "Combat",
                "changes": [
                  "Added a search field on the combat screen to filter creatures by name, side, active conditions, or encounter.",
                  "The turn counter can now be clicked to manually choose the current turn.",
                  "Added the Jump Turn To button, which lets you jump directly to any initiative participant's turn."
                ]
              },
              {
                "title": "Area Effects",
                "changes": [
                  "Area effects no longer require rows to be selected beforehand.",
                  "When using effects such as damage, healing, necrotic damage, temporary hit points, or area experience, a window opens so you can choose exactly which creatures are affected.",
                  "Targets can now be selected more comfortably by clicking directly on each creature card."
                ]
              },
              {
                "title": "Diary",
                "changes": [
                  "Added text search for notes.",
                  "Search shows which notes contain the text and filters the list to display only matching notes.",
                  "Long tags can be created with #, for example #RAINY DAY#, and are displayed as visual chips.",
                  "Clicking a tag automatically fills the search field with that text.",
                  "Right-clicking a tag opens the color picker directly.",
                  "The selected color for a tag is applied to all appearances of that tag.",
                  "Added editor toolbar buttons that visually explain how to use # and @.",
                  "Characters, items, and creatures can be mentioned with @.",
                  "Mention suggestions appear while typing, making mentions faster to complete.",
                  "Completed mentions are underlined and open the corresponding sheet with left click.",
                  "Added a button to import and export diary notes and folders.",
                  "Added an expanded Harptos calendar view with seasons, moon cycles, and labels on specific days.",
                  "The calendar marks days that have an associated diary note.",
                  "Clicking a note chip opens that note directly in the editor.",
                  "Short notes can also be added from the calendar itself and edited with left click."
                ]
              }
            ]
          },
          {
            "title": "Bug Fixes",
            "sections": [
              {
                "title": "Combat",
                "changes": [
                  "Necrotic damage now correctly reduces both current hit points and maximum hit points, reflecting its effect immediately."
                ]
              },
              {
                "title": "General Improvements",
                "changes": [
                  "Fixed several visual and behavioral details in lists, popovers, and search fields.",
                  "Improved overall interface consistency.",
                  "Improved usability on screens with many results or many combat participants."
                ]
              },
              {
                "title": "Bestiary, Spells, and Items",
                "changes": [
                  "Creature, spell, and item search fields now show more comfortable and readable lists.",
                  "When there are many results, lists keep a limited visual size and can be navigated with scrolling.",
                  "Help text has been simplified to clearly indicate that search is performed by name.",
                  "The bestiary encounter editor now uses this same behavior for its creature list."
                ]
              }
            ]
          }
        ]
      }
    }
  }
]);

function compareVersionNumbers(left, right) {
  const leftParts = String(left || "").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "").split(".").map((part) => Number(part) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
}

export function getSortedReleaseNotes() {
  return [...releaseNotes].sort((left, right) => compareVersionNumbers(left.versionNumber, right.versionNumber));
}
