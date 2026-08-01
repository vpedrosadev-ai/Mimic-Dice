import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCX_PATH = path.join(REPO_ROOT, "NOTAS DE VERSION.docx");
const OUTPUT_PATH = path.join(REPO_ROOT, "src", "data", "releaseNotes.js");
const TODAY = new Date().toISOString().slice(0, 10);

const CURATED_RELEASES = [
  {
    version: "v1.2",
    versionNumber: "1.2",
    contentHash: "curated-v1.2-users-cloud-community-catalog-guest-imports",
    content: {
      es: {
        heading: "Version 1.2",
        modifiedLabel: "Ultima modificacion",
        sidebarModifiedLabel: "Notas modificadas",
        summary: "Nuevo sistema de usuarios, campañas en la nube, autoguardado y catálogo de la comunidad.",
        groups: [
          {
            title: "Cuentas de usuario",
            sections: [
              {
                title: "Acceso y perfil",
                changes: [
                  "Inicia sesión con Google desde el chip Invitado o desde Opciones > Tu cuenta. El código de invitación solo se solicita al registrar una cuenta nueva.",
                  "Desde Tu cuenta puedes cambiar tu nombre y foto de perfil. Las imágenes se convierten a WebP antes de guardarse.",
                  "El modo invitado sigue funcionando como antes mediante archivos JSON y no requiere cuenta."
                ]
              }
            ]
          },
          {
            title: "Campañas en la nube",
            sections: [
              {
                title: "Guardar y recuperar",
                changes: [
                  "Crea, carga y administra campañas desde Tu cuenta. Cada campaña privada solo puede verla su propietario.",
                  "El autoguardado sincroniza los cambios de la campaña activa después de una breve pausa y muestra cuándo está guardando o cuándo terminó.",
                  "Las imágenes pesadas se almacenan aparte en Cloudflare R2 para mantener ligeros los datos de campaña.",
                  "Al copiar una campaña pública se crea una copia privada independiente: tus cambios nunca sobrescriben el original de otra persona."
                ]
              }
            ]
          },
          {
            title: "Catálogo de la comunidad",
            sections: [
              {
                title: "Cómo abrirlo y navegar",
                changes: [
                  "Abre el catálogo desde Opciones > Catálogo de la comunidad o desde el botón destacado de Tu cuenta.",
                  "Usa las pestañas para explorar campañas, personajes, enemigos, encuentros, objetos, hechizos, diarios y tablas.",
                  "La primera sección muestra lo cargado en la campaña actual; la segunda muestra contenido tuyo guardado en otras campañas; Comunidad muestra publicaciones de otros usuarios.",
                  "Filtra por nombre, usuario o campaña; ordena por nombre o fecha; agrupa por campaña, usuario y carpetas; usa Ver detalle para revisar una ficha antes de copiarla."
                ]
              },
              {
                title: "Importar, publicar y actualizar",
                changes: [
                  "Con o sin cuenta, marca una casilla y el contenido se copia inmediatamente a la campaña actual; desmárcala para retirarlo. Los invitados conservan las copias al guardar su archivo JSON local.",
                  "Publica o vuelve privado tu contenido desde el propio catálogo. Publicar una campaña también ofrece sus entidades personalizadas en sus pestañas correspondientes.",
                  "Las copias importadas no cambian solas. Cuando existe una versión nueva, el catálogo ofrece Actualizar para elegir qué entidades refrescar.",
                  "Si publicas una alternativa basada en contenido ajeno, debes cambiar el nombre y modificar su contenido para evitar duplicados idénticos."
                ]
              }
            ]
          }
        ]
      },
      en: {
        heading: "Version 1.2",
        modifiedLabel: "Last modified",
        sidebarModifiedLabel: "Notes modified",
        summary: "New user accounts, cloud campaigns, autosave, and Community Catalog.",
        groups: [
          {
            title: "User Accounts",
            sections: [
              {
                title: "Sign-in and profile",
                changes: [
                  "Sign in with Google from the Guest chip or Options > Your account. Invitation code is requested only when registering a new account.",
                  "Your account lets you change display name and profile picture. Images are converted to WebP before storage.",
                  "Guest mode still works through JSON files and requires no account."
                ]
              }
            ]
          },
          {
            title: "Cloud Campaigns",
            sections: [
              {
                title: "Save and restore",
                changes: [
                  "Create, load, and manage campaigns from Your account. Private campaigns remain visible only to their owner.",
                  "Autosave syncs active-campaign changes after a short pause and shows saving and completion states.",
                  "Large images are stored separately in Cloudflare R2 to keep campaign data small.",
                  "Copying a public campaign creates an independent private copy; your changes never overwrite another person's original."
                ]
              }
            ]
          },
          {
            title: "Community Catalog",
            sections: [
              {
                title: "Open and browse",
                changes: [
                  "Open catalog from Options > Community Catalog or the featured button in Your account.",
                  "Use tabs to browse campaigns, characters, monsters, encounters, items, spells, diaries, and tables.",
                  "First section shows content loaded in current campaign; second shows your content stored under other campaigns; Community shows publications from other users.",
                  "Filter by name, user, or campaign; sort by name or date; group by campaign, user, and folders; use View details before copying."
                ]
              },
              {
                title: "Import, publish, and update",
                changes: [
                  "With or without an account, select a checkbox to copy content immediately into current campaign, or clear it to remove that copy. Guest imports remain available when the local JSON file is saved.",
                  "Publish or make your content private from catalog. Publishing a campaign also exposes its custom entities in their matching tabs.",
                  "Imported copies do not change automatically. When a newer version exists, catalog offers Update so you choose what to refresh.",
                  "Publishing an alternative based on another person's content requires a new name and meaningful content changes, preventing identical duplicates."
                ]
              }
            ]
          }
        ]
      }
    }
  }
];

const MANUAL_ENGLISH_BY_HASH = {
  c2590f80f085ec4e18769294e67adabe66d7acab73606ae03cb1f914a3dfd109: {
    heading: "Version 1.0",
    modifiedLabel: "Last modified",
    sidebarModifiedLabel: "Notes modified",
    summary: "First published version of the application, with 5000 features that I will list here later.",
    groups: []
  },
  b30e1b68a22b3e528a1930770fc22178bc2fac764c8999489f5b5056e866b9d0: {
    heading: "Version 1.1",
    modifiedLabel: "Last modified",
    sidebarModifiedLabel: "Notes modified",
    summary: "Fixes bugs B.1 and B.2, and implements suggestions S.1, S.2, and S.3.",
    groups: [
      {
        title: "New Features",
        sections: [
          {
            title: "Combat",
            changes: [
              "Added a search field on the combat screen to filter creatures by name, side, active conditions, or encounter.",
              "The turn counter can now be clicked to manually choose the current turn.",
              "Added the Jump Turn To button, which lets you jump directly to any initiative participant's turn."
            ]
          },
          {
            title: "Area Effects",
            changes: [
              "Area effects no longer require rows to be selected beforehand.",
              "When using effects such as damage, healing, necrotic damage, temporary hit points, or area experience, a window opens so you can choose exactly which creatures are affected.",
              "Targets can now be selected more comfortably by clicking directly on each creature card."
            ]
          },
          {
            title: "Diary",
            changes: [
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
        title: "Bug Fixes",
        sections: [
          {
            title: "Combat",
            changes: [
              "Necrotic damage now correctly reduces both current hit points and maximum hit points, reflecting its effect immediately."
            ]
          },
          {
            title: "General Improvements",
            changes: [
              "Fixed several visual and behavioral details in lists, popovers, and search fields.",
              "Improved overall interface consistency.",
              "Improved usability on screens with many results or many combat participants."
            ]
          },
          {
            title: "Bestiary, Spells, and Items",
            changes: [
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
};

function readUInt(buffer, offset, size) {
  return size === 2 ? buffer.readUInt16LE(offset) : buffer.readUInt32LE(offset);
}

function readZipEntry(buffer, entryName) {
  const signature = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("DOCX zip end marker not found.");
  }

  const centralDirectorySize = readUInt(buffer, eocdOffset + 12, 4);
  const centralDirectoryOffset = readUInt(buffer, eocdOffset + 16, 4);
  let cursor = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (cursor < end) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      break;
    }

    const compressionMethod = readUInt(buffer, cursor + 10, 2);
    const compressedSize = readUInt(buffer, cursor + 20, 4);
    const fileNameLength = readUInt(buffer, cursor + 28, 2);
    const extraLength = readUInt(buffer, cursor + 30, 2);
    const commentLength = readUInt(buffer, cursor + 32, 2);
    const localHeaderOffset = readUInt(buffer, cursor + 42, 4);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);

    if (name === entryName) {
      const localNameLength = readUInt(buffer, localHeaderOffset + 26, 2);
      const localExtraLength = readUInt(buffer, localHeaderOffset + 28, 2);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);

      if (compressionMethod === 0) {
        return compressedData.toString("utf8");
      }

      if (compressionMethod === 8) {
        return inflateRawSync(compressedData).toString("utf8");
      }

      throw new Error(`Unsupported DOCX zip compression method: ${compressionMethod}`);
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`DOCX entry not found: ${entryName}`);
}

function decodeXml(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractParagraphs(documentXml) {
  const paragraphs = [];
  const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
  const styleRegex = /<w:pStyle[^>]*w:val="([^"]+)"/;
  const textRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

  for (const paragraphMatch of documentXml.matchAll(paragraphRegex)) {
    const paragraphXml = paragraphMatch[0];
    const style = paragraphXml.match(styleRegex)?.[1] || "";
    const text = [...paragraphXml.matchAll(textRegex)].map((match) => decodeXml(match[1])).join("").trim();

    if (text) {
      paragraphs.push({ style, text });
    }
  }

  return paragraphs;
}

function toAscii(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/á/gi, (match) => match === "Á" ? "A" : "a");
}

function normalizeVersionHeading(text) {
  const match = String(text).match(/^Version\s+([0-9]+(?:\.[0-9]+)*)/i);
  return match ? match[1] : "";
}

function parseVersions(paragraphs) {
  const releases = [];
  let currentRelease = null;
  let currentGroup = null;
  let currentSection = null;

  function flushRelease() {
    if (currentRelease) {
      releases.push(currentRelease);
    }
  }

  for (const paragraph of paragraphs) {
    const versionNumber = paragraph.style === "Heading1" ? normalizeVersionHeading(paragraph.text) : "";

    if (versionNumber) {
      flushRelease();
      currentRelease = {
        version: `v${versionNumber}`,
        versionNumber,
        heading: toAscii(paragraph.text),
        summary: "",
        groups: [],
        rawLines: [`${paragraph.style}|${paragraph.text}`]
      };
      currentGroup = null;
      currentSection = null;
      continue;
    }

    if (!currentRelease) {
      continue;
    }

    currentRelease.rawLines.push(`${paragraph.style}|${paragraph.text}`);

    if (paragraph.style === "Heading2") {
      currentGroup = {
        title: toAscii(paragraph.text),
        sections: []
      };
      currentRelease.groups.push(currentGroup);
      currentSection = null;
      continue;
    }

    if (paragraph.style === "Heading3") {
      if (!currentGroup) {
        currentGroup = { title: "", sections: [] };
        currentRelease.groups.push(currentGroup);
      }

      currentSection = {
        title: toAscii(paragraph.text),
        changes: []
      };
      currentGroup.sections.push(currentSection);
      continue;
    }

    if (!currentGroup) {
      currentRelease.summary = currentRelease.summary
        ? `${currentRelease.summary} ${toAscii(paragraph.text)}`
        : toAscii(paragraph.text);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        title: currentGroup.title || "Cambios",
        changes: []
      };
      currentGroup.sections.push(currentSection);
    }

    currentSection.changes.push(toAscii(paragraph.text));
  }

  flushRelease();
  return releases.map((release) => ({
    ...release,
    contentHash: createHash("sha256").update(release.rawLines.join("\n"), "utf8").digest("hex")
  }));
}

async function loadExistingReleaseNotes() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    return [];
  }

  const moduleUrl = `${pathToFileURL(OUTPUT_PATH).href}?cacheBust=${Date.now()}`;
  const module = await import(moduleUrl);
  return Array.isArray(module.releaseNotes) ? module.releaseNotes : [];
}

function getModifiedDate(release, existingRelease) {
  if (existingRelease?.contentHash === release.contentHash && existingRelease.modifiedDate) {
    return existingRelease.modifiedDate;
  }

  return TODAY;
}

function buildSpanishContent(release) {
  return {
    heading: release.heading,
    modifiedLabel: "Ultima modificacion",
    sidebarModifiedLabel: "Notas modificadas",
    summary: release.summary,
    groups: release.groups
  };
}

function buildEnglishContent(release, existingRelease) {
  const manual = MANUAL_ENGLISH_BY_HASH[release.contentHash];

  if (manual) {
    return manual;
  }

  if (existingRelease?.contentHash === release.contentHash && existingRelease.content?.en) {
    return existingRelease.content.en;
  }

  return {
    heading: release.heading,
    modifiedLabel: "Last modified",
    sidebarModifiedLabel: "Notes modified",
    summary: release.summary,
    groups: release.groups
  };
}

function serialize(value) {
  return JSON.stringify(value, null, 2);
}

async function main() {
  const existingReleaseNotes = await loadExistingReleaseNotes();
  const docxBuffer = fs.readFileSync(DOCX_PATH);
  const documentXml = readZipEntry(docxBuffer, "word/document.xml");
  const releases = parseVersions(extractParagraphs(documentXml));
  const existingByVersion = new Map(existingReleaseNotes.map((release) => [release.version, release]));
  const curatedVersions = new Set(CURATED_RELEASES.map((release) => release.version));
  const nextReleaseNotes = [
    ...CURATED_RELEASES.map((release) => {
      const existingRelease = existingByVersion.get(release.version);
      return {
        ...release,
        modifiedDate: getModifiedDate(release, existingRelease)
      };
    }),
    ...releases.filter((release) => !curatedVersions.has(release.version)).map((release) => {
      const existingRelease = existingByVersion.get(release.version);

      return {
        version: release.version,
        versionNumber: release.versionNumber,
        contentHash: release.contentHash,
        modifiedDate: getModifiedDate(release, existingRelease),
        content: {
          es: buildSpanishContent(release),
          en: buildEnglishContent(release, existingRelease)
        }
      };
    })
  ];

  const output = `export const releaseNotesSourceDocument = "NOTAS DE VERSION.docx";

export const releaseNotes = Object.freeze(${serialize(nextReleaseNotes)});

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
`;

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`Generated ${nextReleaseNotes.length} release note entries from ${path.basename(DOCX_PATH)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
