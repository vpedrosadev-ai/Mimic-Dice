export const releaseNotesSourceDocument = "NOTAS DE VERSION.docx";

export const releaseNotes = Object.freeze([
  {
    "version": "v1.2",
    "versionNumber": "1.2",
    "contentHash": "curated-v1.2-users-cloud-community-catalog-guest-lazy-boot",
    "content": {
      "es": {
        "heading": "Version 1.2",
        "modifiedLabel": "Ultima modificacion",
        "sidebarModifiedLabel": "Notas modificadas",
        "summary": "Nuevo sistema de usuarios, campañas en la nube, autoguardado y catálogo de la comunidad.",
        "groups": [
          {
            "title": "Cuentas de usuario",
            "sections": [
              {
                "title": "Acceso y perfil",
                "changes": [
                  "Inicia sesión con Google desde el chip Invitado o desde Opciones > Tu cuenta. El código de invitación solo se solicita al registrar una cuenta nueva.",
                  "Desde Tu cuenta puedes cambiar tu nombre y foto de perfil. Las imágenes se convierten a WebP antes de guardarse.",
                  "El modo invitado sigue funcionando como antes mediante archivos JSON y no requiere cuenta."
                ]
              }
            ]
          },
          {
            "title": "Campañas en la nube",
            "sections": [
              {
                "title": "Guardar y recuperar",
                "changes": [
                  "Crea, carga y administra campañas desde Tu cuenta. Cada campaña privada solo puede verla su propietario.",
                  "El autoguardado sincroniza los cambios de la campaña activa después de una breve pausa y muestra cuándo está guardando o cuándo terminó.",
                  "Las imágenes pesadas se almacenan aparte en Cloudflare R2 para mantener ligeros los datos de campaña.",
                  "Al copiar una campaña pública se crea una copia privada independiente: tus cambios nunca sobrescriben el original de otra persona."
                ]
              }
            ]
          },
          {
            "title": "Catálogo de la comunidad",
            "sections": [
              {
                "title": "Cómo abrirlo y navegar",
                "changes": [
                  "Abre el catálogo desde Opciones > Catálogo de la comunidad o desde el botón destacado de Tu cuenta.",
                  "Usa las pestañas para explorar campañas, personajes, enemigos, encuentros, objetos, hechizos, diarios y tablas.",
                  "La primera sección muestra lo cargado en la campaña actual; la segunda muestra contenido tuyo guardado en otras campañas; Comunidad muestra publicaciones de otros usuarios.",
                  "Filtra por nombre, usuario o campaña; ordena por nombre o fecha; agrupa por campaña, usuario y carpetas; usa Ver detalle para revisar una ficha antes de copiarla."
                ]
              },
              {
                "title": "Importar, publicar y actualizar",
                "changes": [
                  "Con o sin cuenta, marca una casilla y el contenido se copia inmediatamente a la campaña actual; desmárcala para retirarlo. Los invitados conservan las copias al guardar su archivo JSON local.",
                  "Al abrir o refrescar la web como invitado se empieza sin campaña cargada. Carga tu JSON cuando quieras continuar; los compendios pesados se descargan solo cuando hacen falta.",
                  "Publica o vuelve privado tu contenido desde el propio catálogo. Publicar una campaña también ofrece sus entidades personalizadas en sus pestañas correspondientes.",
                  "Las copias importadas no cambian solas. Cuando existe una versión nueva, el catálogo ofrece Actualizar para elegir qué entidades refrescar.",
                  "Si publicas una alternativa basada en contenido ajeno, debes cambiar el nombre y modificar su contenido para evitar duplicados idénticos."
                ]
              }
            ]
          }
        ]
      },
      "en": {
        "heading": "Version 1.2",
        "modifiedLabel": "Last modified",
        "sidebarModifiedLabel": "Notes modified",
        "summary": "New user accounts, cloud campaigns, autosave, and Community Catalog.",
        "groups": [
          {
            "title": "User Accounts",
            "sections": [
              {
                "title": "Sign-in and profile",
                "changes": [
                  "Sign in with Google from the Guest chip or Options > Your account. Invitation code is requested only when registering a new account.",
                  "Your account lets you change display name and profile picture. Images are converted to WebP before storage.",
                  "Guest mode still works through JSON files and requires no account."
                ]
              }
            ]
          },
          {
            "title": "Cloud Campaigns",
            "sections": [
              {
                "title": "Save and restore",
                "changes": [
                  "Create, load, and manage campaigns from Your account. Private campaigns remain visible only to their owner.",
                  "Autosave syncs active-campaign changes after a short pause and shows saving and completion states.",
                  "Large images are stored separately in Cloudflare R2 to keep campaign data small.",
                  "Copying a public campaign creates an independent private copy; your changes never overwrite another person's original."
                ]
              }
            ]
          },
          {
            "title": "Community Catalog",
            "sections": [
              {
                "title": "Open and browse",
                "changes": [
                  "Open catalog from Options > Community Catalog or the featured button in Your account.",
                  "Use tabs to browse campaigns, characters, monsters, encounters, items, spells, diaries, and tables.",
                  "First section shows content loaded in current campaign; second shows your content stored under other campaigns; Community shows publications from other users.",
                  "Filter by name, user, or campaign; sort by name or date; group by campaign, user, and folders; use View details before copying."
                ]
              },
              {
                "title": "Import, publish, and update",
                "changes": [
                  "With or without an account, select a checkbox to copy content immediately into current campaign, or clear it to remove that copy. Guest imports remain available when the local JSON file is saved.",
                  "Opening or refreshing web app as Guest now starts without loaded campaign. Load your JSON when ready; large compendiums download only when needed.",
                  "Publish or make your content private from catalog. Publishing a campaign also exposes its custom entities in their matching tabs.",
                  "Imported copies do not change automatically. When a newer version exists, catalog offers Update so you choose what to refresh.",
                  "Publishing an alternative based on another person's content requires a new name and meaningful content changes, preventing identical duplicates."
                ]
              }
            ]
          }
        ]
      }
    },
    "modifiedDate": "2026-08-01"
  },
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
