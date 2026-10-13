import {
  deleteAdminGroup,
  deleteAdminItem,
  deleteAdminR2Object,
  deleteAdminUser,
  fetchAuthSession,
  getAdminR2ObjectUrl,
  getAdminOverview,
  getAdminUserDetail,
  setAdminUserBan
} from "../cloud/cloudClient.js";
import { escapeHtml, normalizeSearchText } from "../shared/text.js";
import appIconUrl from "../../build-resources/icon.png";

const app = document.querySelector("#app");
const R2_FREE_BYTES = 10_000_000_000;
const D1_FREE_BYTES = 5_000_000_000;
const D1_FREE_DATABASE_BYTES = 500_000_000;
const TYPE_LABELS = Object.freeze({
  campaign: "Campaña",
  character: "Personaje",
  encounter: "Encuentro",
  spell: "Hechizo",
  item: "Objeto",
  monster: "Criatura",
  map: "Mapa",
  diary: "Diario",
  table: "Tabla",
  library: "Biblioteca",
  catalog: "Catálogo",
  asset: "Archivo R2"
});
const TYPE_ORDER = Object.keys(TYPE_LABELS);

const state = {
  status: "loading",
  session: null,
  overview: null,
  selectedUserId: new URLSearchParams(window.location.search).get("user") || "",
  userDetail: null,
  expandedStorage: new Set(),
  expandedContentGroups: new Set(),
  query: "",
  sort: "r2-desc",
  busy: "",
  error: "",
  confirmation: null,
  confirmationValue: "",
  confirmationReason: "",
  preview: null
};

document.title = "Administración · Mimic Dice";
document.body.classList.add("admin-page");
app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
app.addEventListener("keydown", handleKeydown);
window.addEventListener("popstate", handlePopState);
initialize();

async function initialize() {
  render();
  try {
    state.session = await fetchAuthSession();
    if (state.session?.user?.isAdmin !== true) {
      state.status = "forbidden";
      render();
      return;
    }
    await refreshOverview();
  } catch (error) {
    state.status = error?.status === 401 || error?.status === 403 ? "forbidden" : "error";
    state.error = error?.message || "No se pudo abrir el panel de administrador.";
    render();
  }
}

async function refreshOverview({ preserveDetail = true } = {}) {
  state.status = "loading";
  state.error = "";
  render();
  try {
    state.overview = await getAdminOverview();
    state.status = "ready";
    if (preserveDetail && state.selectedUserId) {
      await loadUserDetail(state.selectedUserId, { renderLoading: false });
      return;
    }
    render();
  } catch (error) {
    state.status = error?.status === 401 || error?.status === 403 ? "forbidden" : "error";
    state.error = error?.message || "No se pudieron cargar los datos administrativos.";
    render();
  }
}

async function loadUserDetail(userId, { renderLoading = true } = {}) {
  state.selectedUserId = userId;
  state.userDetail = null;
  state.error = "";
  if (renderLoading) {
    state.busy = `user:${userId}`;
    render();
  }
  try {
    state.userDetail = await getAdminUserDetail(userId);
    document.title = `${state.userDetail.user.name || state.userDetail.user.email || "Cuenta"} · Administración`;
  } catch (error) {
    state.error = error?.message || "No se pudo cargar la cuenta.";
  } finally {
    state.busy = "";
    render();
  }
}

async function navigateToUser(userId, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "admin");
  if (userId) url.searchParams.set("user", userId);
  else url.searchParams.delete("user");
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  state.selectedUserId = userId;
  state.userDetail = null;
  document.title = "Administración · Mimic Dice";
  if (userId) await loadUserDetail(userId);
  else render();
}

async function handlePopState() {
  const userId = new URLSearchParams(window.location.search).get("user") || "";
  state.selectedUserId = userId;
  state.userDetail = null;
  if (userId) await loadUserDetail(userId);
  else {
    document.title = "Administración · Mimic Dice";
    render();
  }
}

function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024) return `${value.toFixed(0)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(2)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function formatGigabytes(bytes) {
  return `${(Math.max(0, Number(bytes || 0)) / 1_000_000_000).toFixed(2)} GB`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getFilteredUsers() {
  const users = [...(state.overview?.users || [])];
  const query = normalizeSearchText(state.query);
  const filtered = query
    ? users.filter((user) => normalizeSearchText(`${user.name} ${user.email} ${user.id}`).includes(query))
    : users;
  return filtered.sort((left, right) => {
    if (state.sort === "name-asc") return String(left.name || left.email).localeCompare(String(right.name || right.email), "es");
    if (state.sort === "created-desc") return String(right.createdAt).localeCompare(String(left.createdAt));
    if (state.sort === "data-desc") return right.cloudDataBytes - left.cloudDataBytes;
    return right.r2Bytes - left.r2Bytes;
  });
}

function renderMetric(label, value, detail = "") {
  return `<article class="admin-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
}

function renderCapacityMetric(label, usedBytes, limitBytes, detail) {
  const percentage = Math.min(100, (Number(usedBytes || 0) / limitBytes) * 100);
  return `<article class="admin-metric admin-metric--capacity"><span>${escapeHtml(label)}</span><div><strong>${formatGigabytes(usedBytes)}</strong><i></i><b>${formatGigabytes(limitBytes)}</b></div><small>${escapeHtml(detail)}</small><span class="admin-capacity-bar"><i style="width:${percentage}%"></i></span></article>`;
}

function renderStorageItem(item) {
  const deleteAction = item.tracked ? "delete-item" : "delete-r2-object";
  const owner = item.ownerEmail || item.ownerName || item.ownerId || "Sin propietario";
  return `<article class="admin-storage-item" tabindex="0" data-admin-action="preview-r2-object" data-object-key="${escapeHtml(item.objectKey)}" data-mime-type="${escapeHtml(item.mimeType || "")}" data-label="${escapeHtml(item.name || item.objectKey)}"><div><strong>${escapeHtml(item.name || item.objectKey)}</strong><small>${escapeHtml(item.objectKey)}</small><small>${escapeHtml(owner)} · ${escapeHtml(item.mimeType || "formato desconocido")}</small></div><div><b>${formatBytes(item.bytes)}</b><time>${formatDate(item.createdAt)}</time><button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="${deleteAction}" data-kind="asset" data-item-id="${escapeHtml(item.id || "")}" data-object-key="${escapeHtml(item.objectKey)}" data-label="${escapeHtml(item.name || item.objectKey)}">Eliminar</button></div></article>`;
}

function renderStorageBreakdown() {
  const rows = state.overview?.storageByType || [];
  if (rows.length === 0) return `<p class="admin-empty">R2 no contiene objetos.</p>`;
  return `<div class="admin-storage-list">${rows.map((entry) => {
    const expanded = state.expandedStorage.has(entry.type);
    return `<article class="admin-storage-row ${expanded ? "is-expanded" : ""}">
      <button class="admin-storage-row__toggle" type="button" data-admin-action="toggle-storage" data-category="${escapeHtml(entry.type)}" aria-expanded="${expanded}">
        <div class="admin-storage-row__heading"><strong>${escapeHtml(entry.label)}</strong><span>${formatBytes(entry.bytes)} · ${entry.percentage.toFixed(1)}% · ${entry.count} archivos</span></div>
        <div class="admin-storage-bar"><i style="width:${Math.max(1, Math.min(100, entry.percentage))}%"></i></div><b aria-hidden="true">⌄</b>
      </button>
      <button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-group" data-kind="asset" data-category="${escapeHtml(entry.type)}" data-label="${escapeHtml(entry.label)}">Eliminar categoría</button>
      ${entry.type === "orphan" ? `<p class="admin-storage-note">Archivo registrado en R2, pero sin enlace activo encontrado en campañas, biblioteca o catálogo. Puede ser una subida antigua o pendiente; no implica que sea prescindible.</p>` : ""}
      ${expanded ? `<div class="admin-storage-items">${(entry.items || []).map(renderStorageItem).join("") || `<p class="admin-empty">Sin objetos.</p>`}</div>` : ""}
    </article>`;
  }).join("")}</div>`;
}

function renderUserRow(user) {
  const itemCount = Object.values(user.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  return `<tr class="admin-user-row" tabindex="0" data-admin-action="open-user" data-user-id="${escapeHtml(user.id)}" aria-label="Abrir cuenta de ${escapeHtml(user.name || user.email || user.id)}">
    <td><div class="admin-user-identity">${user.image ? `<img src="${escapeHtml(user.image)}" alt="">` : `<span>${escapeHtml((user.name || user.email || "?").slice(0, 1).toUpperCase())}</span>`}<div><strong>${escapeHtml(user.name || "Sin nombre")}</strong><small>${escapeHtml(user.email || user.id)}</small></div></div></td>
    <td>${user.isAdmin ? `<span class="admin-badge admin-badge--admin">Admin</span>` : user.isBanned ? `<span class="admin-badge admin-badge--danger">Baneada</span>` : `<span class="admin-badge admin-badge--ok">Activa</span>`}</td>
    <td>${formatBytes(user.r2Bytes)}</td><td>${formatBytes(user.cloudDataBytes)}</td><td>${itemCount}</td><td>${formatDate(user.createdAt)}</td>
    <td><div class="admin-row-actions">${user.isAdmin ? "" : `<button class="admin-button admin-button--compact ${user.isBanned ? "" : "admin-button--warning"}" type="button" data-admin-action="toggle-ban" data-user-id="${escapeHtml(user.id)}" data-banned="${user.isBanned}" data-user-label="${escapeHtml(user.email || user.name || user.id)}">${user.isBanned ? "Desbanear" : "Banear"}</button><button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}" data-user-label="${escapeHtml(user.email || user.name || user.id)}">Eliminar</button>`}</div></td>
  </tr>`;
}

function renderItemSection({ title, kind, items, type = "" }) {
  return `<section class="admin-detail-section">
    <header><div><h3>${escapeHtml(title)}</h3><span>${items.length}</span></div>${items.length ? `<button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-group" data-kind="${escapeHtml(kind)}" data-owner-id="${escapeHtml(state.selectedUserId)}" data-type="${escapeHtml(type)}" data-label="${escapeHtml(`${title} de esta cuenta`)}">Eliminar grupo</button>` : ""}</header>
    ${items.length ? `<div class="admin-item-list">${items.map((item) => {
      const itemType = kind === "campaign" ? "campaign" : item.type || item.category || kind;
      const size = kind === "asset" ? item.byteSize : item.payloadBytes;
      const detail = kind === "asset"
        ? `${item.categoryLabel || TYPE_LABELS[itemType] || itemType} · ${item.mimeType || "archivo"} · ${item.references?.length || 0} referencias${item.existsInR2 ? "" : " · NO EN R2"}`
        : `${TYPE_LABELS[itemType] || itemType}${item.isPublic === 1 ? " · Público" : " · Privado"}`;
      const deleteAction = kind === "asset" && item.tracked === false ? "delete-r2-object" : "delete-item";
      const previewAttributes = kind === "asset" && item.existsInR2
        ? ` tabindex="0" data-admin-action="preview-r2-object" data-object-key="${escapeHtml(item.objectKey || "")}" data-mime-type="${escapeHtml(item.mimeType || "")}" data-label="${escapeHtml(item.name || item.objectKey || item.id)}"`
        : "";
      return `<article class="admin-item-card${previewAttributes ? " admin-item-card--previewable" : ""}"${previewAttributes}><div><strong>${escapeHtml(item.name || item.objectKey || item.id)}</strong><small>${escapeHtml(detail)}</small><small>${escapeHtml(item.id || item.objectKey)}</small></div><div class="admin-item-card__meta"><b>${formatBytes(size)}</b><time>${formatDate(item.updatedAt || item.createdAt)}</time><button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="${deleteAction}" data-kind="${escapeHtml(kind)}" data-item-id="${escapeHtml(item.id)}" data-object-key="${escapeHtml(item.objectKey || "")}" data-label="${escapeHtml(item.name || item.objectKey || item.id)}">Eliminar</button></div></article>`;
    }).join("")}</div>` : `<p class="admin-empty">Sin elementos.</p>`}
  </section>`;
}

function groupItemsByType(items) {
  const groups = new Map();
  items.forEach((item) => {
    const type = item.type || "other";
    const group = groups.get(type) || [];
    group.push(item);
    groups.set(type, group);
  });
  return [...groups.entries()].sort(([left], [right]) => {
    const leftIndex = TYPE_ORDER.indexOf(left);
    const rightIndex = TYPE_ORDER.indexOf(right);
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex) || left.localeCompare(right);
  });
}

function renderGroupedCollection(items, { kind, title, eyebrow }) {
  const groups = groupItemsByType(items);
  return `<section class="admin-card admin-grouped-card"><header class="admin-card__header"><div><small>${escapeHtml(eyebrow)}</small><h2>${escapeHtml(title)}</h2></div><strong>${items.length} objetos</strong></header><div class="admin-type-groups">${groups.map(([type, group]) => {
    const groupKey = `${kind}:${type}`;
    const expanded = state.expandedContentGroups.has(groupKey);
    const bytes = group.reduce((sum, item) => sum + Number(item.payloadBytes || 0), 0);
    return `<article class="admin-content-group ${expanded ? "is-expanded" : ""}"><button type="button" data-admin-action="toggle-content-group" data-group-key="${escapeHtml(groupKey)}" aria-expanded="${expanded}"><span><strong>${escapeHtml(TYPE_LABELS[type] || type)}</strong><small>${group.length} objetos · ${formatBytes(bytes)}</small></span><b aria-hidden="true">⌄</b></button>${expanded ? renderItemSection({ title: "Elementos", kind, items: group, type }) : ""}</article>`;
  }).join("") || `<p class="admin-empty">Sin elementos.</p>`}</div></section>`;
}

function getUserTotals(detail) {
  const campaigns = detail.items.campaigns || [];
  const library = detail.items.library || [];
  const catalog = detail.items.catalog || [];
  const assets = detail.items.assets || [];
  return {
    d1Bytes: [...campaigns, ...library].reduce((sum, item) => sum + Number(item.payloadBytes || 0), 0),
    r2Bytes: assets.filter((item) => item.existsInR2).reduce((sum, item) => sum + Number(item.byteSize || 0), 0),
    objects: campaigns.length + library.length + catalog.length + assets.length
  };
}

function renderUserPage() {
  if (state.busy === `user:${state.selectedUserId}` || !state.userDetail?.user) {
    return `<main class="admin-main"><button class="admin-button admin-button--ghost admin-back-button" type="button" data-admin-action="admin-home">← Volver a cuentas</button>${state.error ? `<p class="admin-error">${escapeHtml(state.error)}</p>` : `<p class="admin-loading">Cargando cuenta…</p>`}</main>`;
  }
  const detail = state.userDetail;
  const user = detail.user;
  const totals = getUserTotals(detail);
  return `<main class="admin-main admin-user-page">
    <button class="admin-button admin-button--ghost admin-back-button" type="button" data-admin-action="admin-home">← Volver a cuentas</button>
    ${state.error ? `<p class="admin-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
    <section class="admin-card admin-account-hero"><div class="admin-user-identity">${user.image ? `<img src="${escapeHtml(user.image)}" alt="">` : `<span>${escapeHtml((user.name || user.email || "?").slice(0, 1).toUpperCase())}</span>`}<div><small>Detalle de cuenta</small><h2>${escapeHtml(user.name || "Sin nombre")}</h2><p>${escapeHtml(user.email || user.id)}</p></div></div><div class="admin-account-hero__actions"><span>${user.isAdmin ? "Administrador" : user.isBanned ? `Baneada · ${escapeHtml(user.banReason || "Sin motivo")}` : "Cuenta activa"}</span>${user.isAdmin ? "" : `<button class="admin-button ${user.isBanned ? "" : "admin-button--warning"}" type="button" data-admin-action="toggle-ban" data-user-id="${escapeHtml(user.id)}" data-banned="${user.isBanned}" data-user-label="${escapeHtml(user.email || user.name || user.id)}">${user.isBanned ? "Desbanear" : "Banear cuenta"}</button><button class="admin-button admin-button--danger" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}" data-user-label="${escapeHtml(user.email || user.name || user.id)}">Eliminar cuenta</button>`}</div></section>
    <section class="admin-metrics">${renderMetric("R2 de la cuenta", formatBytes(totals.r2Bytes), `${detail.items.assets?.length || 0} archivos`)}${renderMetric("Datos D1", formatBytes(totals.d1Bytes), "Payload de campañas + biblioteca")}${renderMetric("Objetos", String(totals.objects), "Todos los niveles")}${renderMetric("Registro", formatDate(user.createdAt), user.isBanned ? "Cuenta bloqueada" : "Cuenta disponible")}</section>
    ${renderItemSection({ title: "Campañas guardadas", kind: "campaign", items: detail.items.campaigns || [] })}
    ${renderGroupedCollection(detail.items.library || [], { kind: "library", title: "Biblioteca cloud por tipo", eyebrow: "Datos D1" })}
    ${renderGroupedCollection(detail.items.catalog || [], { kind: "catalog", title: "Catálogo de comunidad por tipo", eyebrow: "Comunidad" })}
    ${renderItemSection({ title: "Objetos físicos en R2", kind: "asset", items: detail.items.assets || [] })}
  </main>`;
}

function renderDashboard() {
  const totals = state.overview?.totals || {};
  const users = getFilteredUsers();
  return `<main class="admin-main">
    ${state.error ? `<p class="admin-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
    <section class="admin-metrics">${renderMetric("Cuentas", String(totals.accounts || 0), `${totals.bannedAccounts || 0} baneadas`)}${renderCapacityMetric("R2 total", totals.r2Bytes, R2_FREE_BYTES, `${totals.r2Objects || 0} objetos · cuota gratis mensual`)}${renderMetric("Datos D1", formatBytes(totals.cloudDataBytes), `Payload lógico · ${D1_FREE_DATABASE_BYTES / 1_000_000} MB por base · ${formatGigabytes(D1_FREE_BYTES)} total`)}${renderMetric("Activos registrados", String(totals.trackedAssets || 0), "Registros de archivos")}</section>
    <section class="admin-card"><header class="admin-card__header"><div><small>Cloudflare R2</small><h2>Distribución del almacenamiento</h2></div><strong>${formatGigabytes(totals.r2Bytes)} / 10.00 GB</strong></header>${renderStorageBreakdown()}</section>
    <section class="admin-card"><header class="admin-card__header"><div><small>Usuarios registrados</small><h2>Cuentas y consumo</h2></div><span>${users.length} resultados</span></header><div class="admin-filters"><input type="search" value="${escapeHtml(state.query)}" placeholder="Buscar nombre, email o ID" data-admin-query><select data-admin-sort><option value="r2-desc" ${state.sort === "r2-desc" ? "selected" : ""}>Mayor uso R2</option><option value="data-desc" ${state.sort === "data-desc" ? "selected" : ""}>Mayor uso D1</option><option value="created-desc" ${state.sort === "created-desc" ? "selected" : ""}>Más recientes</option><option value="name-asc" ${state.sort === "name-asc" ? "selected" : ""}>Nombre A–Z</option></select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Cuenta</th><th>Estado</th><th>R2</th><th>Datos D1</th><th>Objetos</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${users.map(renderUserRow).join("") || `<tr><td colspan="7"><p class="admin-empty">Sin resultados.</p></td></tr>`}</tbody></table></div></section>
  </main>`;
}

function renderConfirmation() {
  const confirmation = state.confirmation;
  if (!confirmation) return "";
  const ready = state.confirmationValue === confirmation.word;
  return `<div class="admin-confirm-backdrop" data-admin-action="dismiss-confirmation"><section class="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" data-admin-dialog><small>Confirmación obligatoria</small><h2 id="admin-confirm-title">${escapeHtml(confirmation.title)}</h2><p>${escapeHtml(confirmation.message)}</p>${confirmation.kind === "ban-user" ? `<label>Motivo opcional<textarea data-admin-confirm-reason>${escapeHtml(state.confirmationReason)}</textarea></label>` : ""}<label>Escribe <strong>${escapeHtml(confirmation.word)}</strong><input type="text" autocomplete="off" spellcheck="false" data-admin-confirm-value value="${escapeHtml(state.confirmationValue)}"></label><div><button class="admin-button admin-button--ghost" type="button" data-admin-action="cancel-confirmation">Cancelar</button><button class="admin-button admin-button--danger" type="button" data-admin-action="confirm-action" ${ready ? "" : "disabled"}>${escapeHtml(confirmation.word)}</button></div></section></div>`;
}

function renderPreview() {
  const preview = state.preview;
  if (!preview) return "";
  const sourceUrl = getAdminR2ObjectUrl(preview.objectKey);
  const downloadUrl = getAdminR2ObjectUrl(preview.objectKey, { download: true });
  const mimeType = String(preview.mimeType || "").toLowerCase();
  let content;
  if (mimeType.startsWith("image/")) {
    content = `<img class="admin-preview-media" src="${escapeHtml(sourceUrl)}" alt="${escapeHtml(preview.label)}">`;
  } else if (mimeType === "application/pdf") {
    content = `<iframe class="admin-preview-frame" src="${escapeHtml(sourceUrl)}" title="${escapeHtml(preview.label)}"></iframe>`;
  } else if (mimeType.startsWith("video/")) {
    content = `<video class="admin-preview-media" src="${escapeHtml(sourceUrl)}" controls></video>`;
  } else if (mimeType.startsWith("audio/")) {
    content = `<audio class="admin-preview-audio" src="${escapeHtml(sourceUrl)}" controls></audio>`;
  } else if (mimeType.startsWith("text/")) {
    content = `<iframe class="admin-preview-frame admin-preview-frame--text" src="${escapeHtml(sourceUrl)}" title="${escapeHtml(preview.label)}"></iframe>`;
  } else {
    content = `<div class="admin-preview-unsupported"><strong>Vista previa no disponible</strong><span>Formato: ${escapeHtml(preview.mimeType || "desconocido")}</span><p>Descarga el archivo para abrirlo con una aplicación compatible.</p></div>`;
  }
  return `<div class="admin-preview-backdrop" data-admin-action="dismiss-preview"><section class="admin-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-preview-title" data-admin-preview-dialog><header><div><small>Objeto R2</small><h2 id="admin-preview-title">${escapeHtml(preview.label)}</h2><p>${escapeHtml(preview.objectKey)}</p></div><button class="admin-icon-button" type="button" data-admin-action="close-preview" aria-label="Cerrar">×</button></header><div class="admin-preview-content">${content}</div><footer><a class="admin-button admin-button--ghost" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Abrir en otra pestaña</a><a class="admin-button" href="${escapeHtml(downloadUrl)}" download>Descargar archivo</a></footer></section></div>`;
}

function renderTopbar() {
  return `<header class="admin-topbar"><div class="admin-brand"><img src="${escapeHtml(appIconUrl)}" alt=""><div><small>Mimic Dice Cloud</small><h1>Panel de administrador</h1></div></div><div class="admin-topbar__actions"><span>${escapeHtml(state.session?.user?.email || "")}</span><button class="admin-button" type="button" data-admin-action="refresh">Actualizar</button><a class="admin-button admin-button--ghost" href="./">Volver a la app</a></div></header>`;
}

function renderReady() {
  return `<div class="admin-shell">${renderTopbar()}${state.selectedUserId ? renderUserPage() : renderDashboard()}${renderConfirmation()}${renderPreview()}</div>`;
}

function render() {
  if (state.status === "forbidden") {
    app.innerHTML = `<main class="admin-gate"><img src="${escapeHtml(appIconUrl)}" alt=""><p>Mimic Dice Cloud</p><h1>Acceso restringido</h1><span>Este panel solo está disponible para la cuenta administradora autorizada.</span><a class="admin-button" href="./">Volver a Mimic Dice</a></main>`;
    return;
  }
  if (state.status === "error") {
    app.innerHTML = `<main class="admin-gate"><img src="${escapeHtml(appIconUrl)}" alt=""><h1>No se pudo cargar el panel</h1><span>${escapeHtml(state.error)}</span><button class="admin-button" type="button" data-admin-action="retry">Reintentar</button></main>`;
    return;
  }
  if (state.status === "loading" && !state.overview) {
    app.innerHTML = `<main class="admin-gate"><img src="${escapeHtml(appIconUrl)}" alt=""><h1>Preparando administración</h1><span>Calculando cuentas y almacenamiento R2…</span><i class="admin-spinner"></i></main>`;
    return;
  }
  app.innerHTML = renderReady();
}

async function runAdminAction(key, action) {
  if (state.busy) return;
  state.busy = key;
  state.error = "";
  render();
  try {
    await action();
    await refreshOverview({ preserveDetail: Boolean(state.selectedUserId) });
  } catch (error) {
    state.error = error?.message || "La operación administrativa ha fallado.";
    state.status = "ready";
    render();
  } finally {
    state.busy = "";
  }
}

function openConfirmation(confirmation) {
  state.confirmation = confirmation;
  state.confirmationValue = "";
  state.confirmationReason = "";
  render();
  app.querySelector("[data-admin-confirm-value]")?.focus();
}

function closeConfirmation() {
  state.confirmation = null;
  state.confirmationValue = "";
  state.confirmationReason = "";
  render();
}

async function executeConfirmation() {
  const confirmation = state.confirmation;
  if (!confirmation || state.confirmationValue !== confirmation.word) return;
  const reason = state.confirmationReason;
  state.confirmation = null;
  state.confirmationValue = "";
  state.confirmationReason = "";
  if (confirmation.kind === "ban-user" || confirmation.kind === "unban-user") {
    await runAdminAction(`ban:${confirmation.userId}`, () => setAdminUserBan(confirmation.userId, { banned: confirmation.kind === "ban-user", reason }));
    return;
  }
  if (confirmation.kind === "delete-user") {
    await runAdminAction(`delete-user:${confirmation.userId}`, async () => {
      await deleteAdminUser(confirmation.userId);
      if (state.selectedUserId === confirmation.userId) await navigateToUser("", { replace: true });
    });
    return;
  }
  if (confirmation.kind === "delete-item") {
    await runAdminAction(`delete-item:${confirmation.itemId}`, () => deleteAdminItem(confirmation.itemKind, confirmation.itemId));
    return;
  }
  if (confirmation.kind === "delete-r2-object") {
    await runAdminAction(`delete-r2:${confirmation.objectKey}`, () => deleteAdminR2Object(confirmation.objectKey));
    return;
  }
  if (confirmation.kind === "delete-group") {
    await runAdminAction(`delete-group:${confirmation.label}`, () => deleteAdminGroup(confirmation.group));
  }
}

function handleInput(event) {
  if (event.target.matches("[data-admin-query]")) {
    state.query = event.target.value;
    render();
    const input = app.querySelector("[data-admin-query]");
    input?.focus();
    input?.setSelectionRange(state.query.length, state.query.length);
    return;
  }
  if (event.target.matches("[data-admin-confirm-value]")) {
    state.confirmationValue = event.target.value;
    const submit = app.querySelector('[data-admin-action="confirm-action"]');
    if (submit) submit.disabled = state.confirmationValue !== state.confirmation?.word;
    return;
  }
  if (event.target.matches("[data-admin-confirm-reason]")) state.confirmationReason = event.target.value;
}

function handleChange(event) {
  if (!event.target.matches("[data-admin-sort]")) return;
  state.sort = event.target.value;
  render();
}

function handleKeydown(event) {
  if (event.key === "Escape" && state.confirmation) {
    closeConfirmation();
    return;
  }
  if (event.key === "Escape" && state.preview) {
    state.preview = null;
    render();
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-admin-action="open-user"]')) {
    event.preventDefault();
    navigateToUser(event.target.dataset.userId);
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-admin-action="preview-r2-object"]')) {
    event.preventDefault();
    state.preview = { objectKey: event.target.dataset.objectKey, mimeType: event.target.dataset.mimeType, label: event.target.dataset.label };
    render();
  }
}

async function handleClick(event) {
  const trigger = event.target.closest("[data-admin-action]");
  if (!trigger) return;
  const action = trigger.dataset.adminAction;
  if (action === "dismiss-confirmation" && event.target.closest("[data-admin-dialog]")) return;
  if (action === "dismiss-preview" && event.target.closest("[data-admin-preview-dialog]")) return;
  if (action === "refresh" || action === "retry") { await refreshOverview(); return; }
  if (action === "open-user") { await navigateToUser(trigger.dataset.userId); return; }
  if (action === "admin-home") { await navigateToUser(""); return; }
  if (action === "toggle-storage") {
    const category = trigger.dataset.category;
    if (state.expandedStorage.has(category)) state.expandedStorage.delete(category);
    else state.expandedStorage.add(category);
    render();
    return;
  }
  if (action === "toggle-content-group") {
    const groupKey = trigger.dataset.groupKey;
    if (state.expandedContentGroups.has(groupKey)) state.expandedContentGroups.delete(groupKey);
    else state.expandedContentGroups.add(groupKey);
    render();
    return;
  }
  if (action === "preview-r2-object") {
    state.preview = { objectKey: trigger.dataset.objectKey, mimeType: trigger.dataset.mimeType, label: trigger.dataset.label };
    render();
    return;
  }
  if (action === "close-preview" || action === "dismiss-preview") {
    state.preview = null;
    render();
    return;
  }
  if (action === "cancel-confirmation" || action === "dismiss-confirmation") { closeConfirmation(); return; }
  if (action === "confirm-action") { await executeConfirmation(); return; }
  if (action === "toggle-ban") {
    const banned = trigger.dataset.banned === "true";
    openConfirmation({
      kind: banned ? "unban-user" : "ban-user",
      word: banned ? "DESBANEAR" : "BANEAR",
      title: banned ? "Desbanear cuenta" : "Banear cuenta",
      message: banned ? `Se restaurará el acceso cloud de ${trigger.dataset.userLabel}.` : `Se bloqueará el acceso cloud de ${trigger.dataset.userLabel}.`,
      userId: trigger.dataset.userId
    });
    return;
  }
  if (action === "delete-user") {
    openConfirmation({ kind: "delete-user", word: "ELIMINAR", title: "Eliminar cuenta", message: `Se eliminarán ${trigger.dataset.userLabel}, todos sus datos D1 y todos sus objetos R2. Esta acción no se puede deshacer.`, userId: trigger.dataset.userId });
    return;
  }
  if (action === "delete-item") {
    openConfirmation({ kind: "delete-item", word: "ELIMINAR", title: "Eliminar elemento", message: `Se eliminará definitivamente “${trigger.dataset.label}”.`, itemKind: trigger.dataset.kind, itemId: trigger.dataset.itemId });
    return;
  }
  if (action === "delete-r2-object") {
    openConfirmation({ kind: "delete-r2-object", word: "ELIMINAR", title: "Eliminar objeto R2", message: `Se eliminará definitivamente “${trigger.dataset.label}”.`, objectKey: trigger.dataset.objectKey });
    return;
  }
  if (action === "delete-group") {
    const label = trigger.dataset.label || "este grupo";
    openConfirmation({
      kind: "delete-group",
      word: "ELIMINAR",
      title: "Eliminar grupo",
      message: `Se eliminarán definitivamente todos los elementos de ${label}.`,
      label,
      group: { kind: trigger.dataset.kind, ownerId: trigger.dataset.ownerId || "", type: trigger.dataset.type || "", category: trigger.dataset.category || "" }
    });
  }
}
