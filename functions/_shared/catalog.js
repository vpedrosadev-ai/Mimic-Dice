import { cleanText, HttpError } from "./http.js";

export const CATALOG_TYPES = new Set([
  "character",
  "encounter",
  "spell",
  "item",
  "monster",
  "diary",
  "table"
]);

const MAX_CATALOG_ENTRIES_PER_CAMPAIGN = 1000;

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value ?? {})).byteLength;
}

function selectionExportBase(category, payload) {
  return {
    schema: "mimic-dice-selection-export",
    version: 1,
    app: "Mimic Dice",
    exportedAt: new Date().toISOString(),
    campaign: {
      name: cleanText(payload?.campaign?.name, 120) || "Campaña"
    },
    category
  };
}

function getAutomaticDescriptors(payload) {
  const descriptors = [];
  const characters = Array.isArray(payload?.characters) ? payload.characters : [];
  const encounters = Array.isArray(payload?.encounterInventory?.encounters)
    ? payload.encounterInventory.encounters
    : [];
  const diaryFolders = Array.isArray(payload?.diary?.folders) ? payload.diary.folders : [];
  const diaryNotes = Array.isArray(payload?.diary?.notes) ? payload.diary.notes : [];

  characters.forEach((character) => {
    const entityId = cleanText(character?.id, 120);
    const name = cleanText(character?.name, 160);

    if (entityId && name) {
      descriptors.push({
        key: `character:${entityId}`,
        type: "character",
        name,
        description: "Personaje de campaña",
        groupName: "",
        imageUrl: cleanText(character?.tokenUrl, 600),
        entityKind: "character",
        entityId
      });
    }
  });

  encounters.forEach((encounter) => {
    const entityId = cleanText(encounter?.id, 120);
    const name = cleanText(encounter?.name, 160) || "Encuentro sin nombre";

    if (entityId) {
      const rowCount = Array.isArray(encounter?.rows) ? encounter.rows.length : 0;
      const folder = (Array.isArray(payload?.encounterInventory?.folders) ? payload.encounterInventory.folders : [])
        .find((entry) => cleanText(entry?.id, 120) === cleanText(encounter?.folderId, 120));
      descriptors.push({
        key: `encounter:${entityId}`,
        type: "encounter",
        name,
        description: `${rowCount} entidades`,
        groupName: cleanText(folder?.name, 160) || "Sin carpeta",
        imageUrl: cleanText(encounter?.rows?.[0]?.tokenUrl, 600),
        entityKind: "encounter",
        entityId
      });
    }
  });

  diaryNotes.forEach((note) => {
    const entityId = cleanText(note?.id, 120);
    const name = cleanText(note?.title, 160) || "Nota sin título";
    const folder = diaryFolders.find((entry) => cleanText(entry?.id, 120) === cleanText(note?.folderId, 120));

    if (entityId) {
      descriptors.push({
        key: `diary-note:${entityId}`,
        type: "diary",
        name,
        description: cleanText(folder?.name, 160) || "Nota sin carpeta",
        groupName: cleanText(folder?.name, 160) || "Sin carpeta",
        imageUrl: "",
        entityKind: "diary-note",
        entityId
      });
    }
  });

  return descriptors;
}

function normalizeDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const type = cleanText(value.type, 30).toLowerCase();
  const key = cleanText(value.key, 220);
  const name = cleanText(value.name, 160);

  if (!CATALOG_TYPES.has(type) || !key || !name) {
    return null;
  }

  return {
    key,
    type,
    name,
    description: cleanText(value.description, 500),
    groupName: cleanText(value.groupName, 160),
    imageUrl: cleanText(value.imageUrl, 600),
    entityKind: cleanText(value.entityKind, 50),
    entityId: cleanText(value.entityId, 120),
    payload: value.payload && typeof value.payload === "object" && !Array.isArray(value.payload)
      ? value.payload
      : null
  };
}

export function getCampaignCatalogDescriptors(payload) {
  const explicit = Array.isArray(payload?.cloudCatalog?.entries)
    ? payload.cloudCatalog.entries.map(normalizeDescriptor).filter(Boolean)
    : [];
  const merged = new Map();

  [...getAutomaticDescriptors(payload), ...explicit].forEach((descriptor) => {
    merged.set(descriptor.key, descriptor);
  });

  return [...merged.values()].slice(0, MAX_CATALOG_ENTRIES_PER_CAMPAIGN);
}

async function readCampaignPayload(db, campaignId) {
  const campaign = await db.prepare(`
    SELECT "id", "payloadVersion", "chunkCount"
    FROM "campaigns"
    WHERE "id" = ?
    LIMIT 1
  `).bind(campaignId).first();

  if (!campaign) {
    throw new HttpError(404, "campaign_not_found", "Campaign not found.");
  }

  const result = await db.prepare(`
    SELECT "payloadText"
    FROM "campaign_chunks"
    WHERE "campaignId" = ? AND "payloadVersion" = ?
    ORDER BY "chunkIndex" ASC
  `).bind(campaign.id, campaign.payloadVersion).all();
  const rows = Array.isArray(result.results) ? result.results : [];

  if (rows.length !== campaign.chunkCount) {
    throw new HttpError(503, "campaign_incomplete", "Campaign save is incomplete. Retry shortly.");
  }

  try {
    return JSON.parse(rows.map((row) => row.payloadText).join(""));
  } catch {
    throw new HttpError(500, "campaign_corrupt", "Campaign save could not be decoded.");
  }
}

function buildDescriptorPayload(payload, descriptor) {
  if (descriptor.payload) {
    return descriptor.payload;
  }

  if (descriptor.type === "character") {
    const character = (Array.isArray(payload?.characters) ? payload.characters : [])
      .find((entry) => cleanText(entry?.id, 120) === descriptor.entityId);

    if (!character) {
      return null;
    }

    return {
      ...selectionExportBase("characters", payload),
      characterSkills: payload.characterSkills || { definitions: [] },
      characters: [character]
    };
  }

  if (descriptor.type === "encounter") {
    const inventory = payload?.encounterInventory || {};
    const encounter = (Array.isArray(inventory.encounters) ? inventory.encounters : [])
      .find((entry) => cleanText(entry?.id, 120) === descriptor.entityId);

    if (!encounter) {
      return null;
    }

    const folder = (Array.isArray(inventory.folders) ? inventory.folders : [])
      .find((entry) => cleanText(entry?.id, 120) === cleanText(encounter.folderId, 120));
    return {
      ...selectionExportBase("encounters", payload),
      encounterInventory: {
        folders: folder ? [folder] : [],
        systemFolderExpanded: true,
        encounters: [encounter]
      }
    };
  }

  if (descriptor.type === "diary") {
    const diary = payload?.diary || {};
    const folders = Array.isArray(diary.folders) ? diary.folders : [];
    const notes = Array.isArray(diary.notes) ? diary.notes : [];
    const selectedNotes = notes.filter((entry) => cleanText(entry?.id, 120) === descriptor.entityId);
    const folder = folders.find((entry) => cleanText(entry?.id, 120) === cleanText(selectedNotes[0]?.folderId, 120));

    const isCalendar = descriptor.entityKind === "diary-calendar";

    if (selectedNotes.length === 0 && !isCalendar) {
      return null;
    }

    return {
      ...selectionExportBase("diary", payload),
      diary: {
        folders: folder ? [folder] : [],
        systemFolderExpanded: true,
        notes: selectedNotes,
        tagColors: diary.tagColors || {},
        harptosDayNotes: isCalendar ? diary.harptosDayNotes || {} : {},
        activeDiaryFolderId: "",
        activeNoteId: ""
      }
    };
  }

  if (descriptor.type === "table") {
    const tablesState = payload?.tables || {};
    const folders = Array.isArray(tablesState.folders) ? tablesState.folders : [];
    const tables = Array.isArray(tablesState.tables) ? tablesState.tables : [];
    const selectedTables = tables.filter((entry) => cleanText(entry?.id, 120) === descriptor.entityId);
    const folder = folders.find((entry) => cleanText(entry?.id, 120) === cleanText(selectedTables[0]?.folderId, 120));

    if (selectedTables.length === 0) {
      return null;
    }

    return {
      schema: "mimic-dice:table-entry",
      version: 1,
      tables: {
        folders: folder ? [folder] : [],
        tables: selectedTables
      }
    };
  }

  return null;
}

async function executeBatches(db, statements) {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

export async function syncCampaignCatalog(db, {
  campaignId,
  ownerId,
  payload,
  isPublic,
  forceVisibility = null
}) {
  const descriptors = getCampaignCatalogDescriptors(payload);
  const existingResult = await db.prepare(`
    SELECT * FROM "cloud_catalog_entries"
    WHERE "sourceCampaignId" = ? AND "ownerId" = ?
  `).bind(campaignId, ownerId).all();
  const existingRows = Array.isArray(existingResult.results) ? existingResult.results : [];
  const existingByKey = new Map(existingRows.map((row) => [row.sourceEntityKey, row]));
  const activeKeys = new Set();
  const now = new Date().toISOString();
  const statements = [];

  descriptors.forEach((descriptor) => {
    activeKeys.add(descriptor.key);
    const existing = existingByKey.get(descriptor.key);
    const descriptorPayload = buildDescriptorPayload(payload, descriptor);
    const payloadBytes = descriptorPayload ? byteLength(descriptorPayload) : 0;
    const nextVisibility = forceVisibility === null
      ? existing ? existing.isPublic : (isPublic ? 1 : 0)
      : forceVisibility ? 1 : 0;

    if (!existing) {
      statements.push(db.prepare(`
        INSERT INTO "cloud_catalog_entries" (
          "id", "ownerId", "sourceCampaignId", "sourceEntityKey", "type", "name",
          "description", "groupName", "imageUrl", "isPublic", "revision", "payloadBytes", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        ownerId,
        campaignId,
        descriptor.key,
        descriptor.type,
        descriptor.name,
        descriptor.description,
        descriptor.groupName,
        descriptor.imageUrl,
        nextVisibility,
        payloadBytes,
        now,
        now
      ));
      return;
    }

    if (
      existing.type !== descriptor.type
      || existing.name !== descriptor.name
      || (existing.description || "") !== descriptor.description
      || (existing.groupName || "") !== descriptor.groupName
      || (existing.imageUrl || "") !== descriptor.imageUrl
      || Number(existing.payloadBytes || 0) !== payloadBytes
      || Number(existing.isPublic || 0) !== Number(nextVisibility)
    ) {
      statements.push(db.prepare(`
        UPDATE "cloud_catalog_entries"
        SET "type" = ?, "name" = ?, "description" = ?, "groupName" = ?, "imageUrl" = ?, "isPublic" = ?,
            "payloadBytes" = ?, "revision" = "revision" + 1, "updatedAt" = ?
        WHERE "id" = ? AND "ownerId" = ?
      `).bind(
        descriptor.type,
        descriptor.name,
        descriptor.description,
        descriptor.groupName,
        descriptor.imageUrl,
        nextVisibility,
        payloadBytes,
        now,
        existing.id,
        ownerId
      ));
    }
  });

  existingRows.filter((row) => !activeKeys.has(row.sourceEntityKey)).forEach((row) => {
    statements.push(db.prepare(
      'DELETE FROM "cloud_catalog_entries" WHERE "id" = ? AND "ownerId" = ?'
    ).bind(row.id, ownerId));
  });

  if (descriptors.length > 0) {
    statements.push(db.prepare(`
      UPDATE "cloud_catalog_entries"
      SET "updatedAt" = ?
      WHERE "sourceCampaignId" = ? AND "ownerId" = ?
    `).bind(now, campaignId, ownerId));
  }

  if (statements.length > 0) {
    await executeBatches(db, statements);
  }
}

export async function syncStoredCampaignCatalog(db, {
  campaignId,
  ownerId,
  isPublic,
  forceVisibility
}) {
  return syncCampaignCatalog(db, {
    campaignId,
    ownerId,
    payload: await readCampaignPayload(db, campaignId),
    isPublic,
    forceVisibility
  });
}

export async function readCatalogEntryPayload(db, entry) {
  const payload = await readCampaignPayload(db, entry.sourceCampaignId);
  const descriptor = getCampaignCatalogDescriptors(payload)
    .find((candidate) => candidate.key === entry.sourceEntityKey);
  const result = descriptor ? buildDescriptorPayload(payload, descriptor) : null;

  if (!result) {
    throw new HttpError(404, "library_entry_not_found", "Catalog entry not found in campaign.");
  }

  return result;
}
