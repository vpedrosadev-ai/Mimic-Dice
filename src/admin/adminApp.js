import {
  deleteAdminGroup,
  deleteAdminItem,
  deleteAdminR2Object,
  deleteAdminUser,
  fetchAuthSession,
  getAdminOverview,
  getAdminUserDetail,
  setAdminUserBan
} from "../cloud/cloudClient.js";
import { escapeHtml, normalizeSearchText } from "../shared/text.js";
import appIconUrl from "../../build-resources/icon.png";

const app = document.querySelector("#app");
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

const state = {
  status: "loading",
  session: null,
  overview: null,
  selectedUserId: "",
  userDetail: null,
  query: "",
  sort: "r2-desc",
  busy: "",
  error: ""
};

document.title = "Administración · Mimic Dice";
document.body.classList.add("admin-page");
app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
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
  state.error = "";
  if (renderLoading) {
    state.busy = `user:${userId}`;
    render();
  }
  try {
    state.userDetail = await getAdminUserDetail(userId);
  } catch (error) {
    state.error = error?.message || "No se pudo cargar la cuenta.";
    state.userDetail = null;
  } finally {
    state.busy = "";
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

function renderStorageBreakdown() {
  const rows = state.overview?.storageByType || [];
  if (rows.length === 0) return `<p class="admin-empty">R2 no contiene objetos.</p>`;
  return `<div class="admin-storage-list">${rows.map((entry) => `
    <article class="admin-storage-row">
      <div class="admin-storage-row__heading"><strong>${escapeHtml(entry.label)}</strong><span>${formatBytes(entry.bytes)} · ${entry.percentage.toFixed(1)}% · ${entry.count} archivos</span></div>
      <div class="admin-storage-bar"><i style="width:${Math.max(1, Math.min(100, entry.percentage))}%"></i></div>
      <button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-group" data-kind="asset" data-category="${escapeHtml(entry.type)}" data-label="${escapeHtml(entry.label)}">Eliminar categoría</button>
    </article>
  `).join("")}</div>`;
}

function renderUserRow(user) {
  const itemCount = Object.values(user.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  return `<tr class="${state.selectedUserId === user.id ? "is-selected" : ""}">
    <td><div class="admin-user-identity">${user.image ? `<img src="${escapeHtml(user.image)}" alt="">` : `<span>${escapeHtml((user.name || user.email || "?").slice(0, 1).toUpperCase())}</span>`}<div><strong>${escapeHtml(user.name || "Sin nombre")}</strong><small>${escapeHtml(user.email || user.id)}</small></div></div></td>
    <td>${user.isAdmin ? `<span class="admin-badge admin-badge--admin">Admin</span>` : user.isBanned ? `<span class="admin-badge admin-badge--danger">Baneada</span>` : `<span class="admin-badge admin-badge--ok">Activa</span>`}</td>
    <td>${formatBytes(user.r2Bytes)}</td>
    <td>${formatBytes(user.cloudDataBytes)}</td>
    <td>${itemCount}</td>
    <td>${formatDate(user.createdAt)}</td>
    <td><div class="admin-row-actions"><button class="admin-button admin-button--compact" type="button" data-admin-action="view-user" data-user-id="${escapeHtml(user.id)}">Ver</button>${user.isAdmin ? "" : `<button class="admin-button admin-button--compact ${user.isBanned ? "" : "admin-button--warning"}" type="button" data-admin-action="toggle-ban" data-user-id="${escapeHtml(user.id)}" data-banned="${user.isBanned}">${user.isBanned ? "Desbanear" : "Banear"}</button><button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}" data-email="${escapeHtml(user.email)}">Eliminar</button>`}</div></td>
  </tr>`;
}

function renderItemSection({ title, kind, items, typeFilter = false }) {
  return `<section class="admin-detail-section">
    <header><div><h3>${escapeHtml(title)}</h3><span>${items.length}</span></div>${items.length ? `<button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="delete-group" data-kind="${escapeHtml(kind)}" data-owner-id="${escapeHtml(state.selectedUserId)}" data-label="${escapeHtml(`${title} de esta cuenta`)}">Eliminar grupo</button>` : ""}</header>
    ${items.length ? `<div class="admin-item-list">${items.map((item) => {
      const type = kind === "campaign" ? "campaign" : item.type || item.category || kind;
      const size = kind === "asset" ? item.byteSize : item.payloadBytes;
      const detail = kind === "asset"
        ? `${item.categoryLabel || TYPE_LABELS[type] || type} · ${item.mimeType || "archivo"} · ${item.references?.length || 0} referencias${item.existsInR2 ? "" : " · NO EN R2"}`
        : `${TYPE_LABELS[type] || type}${item.isPublic === 1 ? " · Público" : " · Privado"}`;
      const deleteAction = kind === "asset" && item.tracked === false ? "delete-r2-object" : "delete-item";
      return `<article class="admin-item-card"><div><strong>${escapeHtml(item.name || item.objectKey || item.id)}</strong><small>${escapeHtml(detail)}</small><small>${escapeHtml(item.id || item.objectKey)}</small></div><div class="admin-item-card__meta"><b>${formatBytes(size)}</b><time>${formatDate(item.updatedAt || item.createdAt)}</time><button class="admin-button admin-button--danger admin-button--compact" type="button" data-admin-action="${deleteAction}" data-kind="${escapeHtml(kind)}" data-item-id="${escapeHtml(item.id)}" data-object-key="${escapeHtml(item.objectKey || "")}" data-label="${escapeHtml(item.name || item.objectKey || item.id)}">Eliminar</button></div></article>`;
    }).join("")}</div>` : `<p class="admin-empty">Sin elementos.</p>`}
  </section>`;
}

function renderUserDetail() {
  if (!state.selectedUserId) return "";
  if (state.busy === `user:${state.selectedUserId}`) return `<aside class="admin-detail"><p class="admin-loading">Cargando cuenta…</p></aside>`;
  const detail = state.userDetail;
  if (!detail?.user) return "";
  const user = detail.user;
  return `<aside class="admin-detail">
    <header class="admin-detail__header"><div><span>Detalle de cuenta</span><h2>${escapeHtml(user.name || "Sin nombre")}</h2><p>${escapeHtml(user.email || user.id)}</p></div><button class="admin-icon-button" type="button" data-admin-action="close-user" aria-label="Cerrar">×</button></header>
    <div class="admin-detail__account"><span>${user.isAdmin ? "Administrador" : user.isBanned ? `Baneada · ${escapeHtml(user.banReason || "Sin motivo")}` : "Cuenta activa"}</span><small>Registro: ${formatDate(user.createdAt)}</small>${user.isAdmin ? "" : `<div><button class="admin-button ${user.isBanned ? "" : "admin-button--warning"}" type="button" data-admin-action="toggle-ban" data-user-id="${escapeHtml(user.id)}" data-banned="${user.isBanned}">${user.isBanned ? "Desbanear" : "Banear cuenta"}</button><button class="admin-button admin-button--danger" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}" data-email="${escapeHtml(user.email)}">Eliminar cuenta</button></div>`}</div>
    ${renderItemSection({ title: "Campañas guardadas", kind: "campaign", items: detail.items.campaigns || [] })}
    ${renderItemSection({ title: "Biblioteca cloud", kind: "library", items: detail.items.library || [], typeFilter: true })}
    ${renderItemSection({ title: "Catálogo de comunidad", kind: "catalog", items: detail.items.catalog || [], typeFilter: true })}
    ${renderItemSection({ title: "Objetos físicos en R2", kind: "asset", items: detail.items.assets || [] })}
  </aside>`;
}

function renderReady() {
  const totals = state.overview?.totals || {};
  const users = getFilteredUsers();
  return `<div class="admin-shell">
    <header class="admin-topbar"><div class="admin-brand"><img src="${escapeHtml(appIconUrl)}" alt=""><div><small>Mimic Dice Cloud</small><h1>Panel de administrador</h1></div></div><div class="admin-topbar__actions"><span>${escapeHtml(state.session?.user?.email || "")}</span><button class="admin-button" type="button" data-admin-action="refresh">Actualizar</button><a class="admin-button admin-button--ghost" href="./">Volver a la app</a></div></header>
    <main class="admin-main">
      ${state.error ? `<p class="admin-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
      <section class="admin-metrics">${renderMetric("Cuentas", String(totals.accounts || 0), `${totals.bannedAccounts || 0} baneadas`)}${renderMetric("R2 total", formatBytes(totals.r2Bytes), `${totals.r2Objects || 0} objetos`)}${renderMetric("Datos cloud", formatBytes(totals.cloudDataBytes), "Campañas + biblioteca")}${renderMetric("Activos registrados", String(totals.trackedAssets || 0), "Registros de archivos")}</section>
      <section class="admin-card"><header class="admin-card__header"><div><small>Cloudflare R2</small><h2>Distribución del almacenamiento</h2></div><strong>${formatBytes(totals.r2Bytes)}</strong></header>${renderStorageBreakdown()}</section>
      <section class="admin-card"><header class="admin-card__header"><div><small>Usuarios registrados</small><h2>Cuentas y consumo</h2></div><span>${users.length} resultados</span></header><div class="admin-filters"><input type="search" value="${escapeHtml(state.query)}" placeholder="Buscar nombre, email o ID" data-admin-query><select data-admin-sort><option value="r2-desc" ${state.sort === "r2-desc" ? "selected" : ""}>Mayor uso R2</option><option value="data-desc" ${state.sort === "data-desc" ? "selected" : ""}>Mayor uso de datos</option><option value="created-desc" ${state.sort === "created-desc" ? "selected" : ""}>Más recientes</option><option value="name-asc" ${state.sort === "name-asc" ? "selected" : ""}>Nombre A–Z</option></select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Cuenta</th><th>Estado</th><th>R2</th><th>Datos</th><th>Objetos</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${users.map(renderUserRow).join("") || `<tr><td colspan="7"><p class="admin-empty">Sin resultados.</p></td></tr>`}</tbody></table></div></section>
    </main>${renderUserDetail()}
  </div>`;
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

function handleInput(event) {
  if (!event.target.matches("[data-admin-query]")) return;
  state.query = event.target.value;
  render();
  app.querySelector("[data-admin-query]")?.focus();
}

function handleChange(event) {
  if (!event.target.matches("[data-admin-sort]")) return;
  state.sort = event.target.value;
  render();
}

async function handleClick(event) {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;
  const action = button.dataset.adminAction;
  if (action === "refresh" || action === "retry") { await refreshOverview(); return; }
  if (action === "view-user") { await loadUserDetail(button.dataset.userId); return; }
  if (action === "close-user") { state.selectedUserId = ""; state.userDetail = null; render(); return; }
  if (action === "toggle-ban") {
    const banned = button.dataset.banned === "true";
    const reason = banned ? "" : window.prompt("Motivo del baneo (opcional):", "") ?? null;
    if (reason === null || !window.confirm(banned ? "¿Desbanear esta cuenta?" : "¿Banear esta cuenta y bloquear su acceso cloud?")) return;
    await runAdminAction(`ban:${button.dataset.userId}`, () => setAdminUserBan(button.dataset.userId, { banned: !banned, reason }));
    return;
  }
  if (action === "delete-user") {
    const expected = button.dataset.email || button.dataset.userId;
    if (window.prompt(`Esta acción elimina la cuenta, sus datos D1 y sus objetos R2. Escribe exactamente:\n${expected}`) !== expected) return;
    await runAdminAction(`delete-user:${button.dataset.userId}`, async () => {
      await deleteAdminUser(button.dataset.userId);
      state.selectedUserId = "";
      state.userDetail = null;
    });
    return;
  }
  if (action === "delete-item") {
    if (!window.confirm(`¿Eliminar definitivamente “${button.dataset.label}”?`)) return;
    await runAdminAction(`delete-item:${button.dataset.itemId}`, () => deleteAdminItem(button.dataset.kind, button.dataset.itemId));
    return;
  }
  if (action === "delete-r2-object") {
    if (!window.confirm(`¿Eliminar definitivamente el objeto R2 “${button.dataset.label}”?`)) return;
    await runAdminAction(`delete-r2:${button.dataset.objectKey}`, () => deleteAdminR2Object(button.dataset.objectKey));
    return;
  }
  if (action === "delete-group") {
    const label = button.dataset.label || "este grupo";
    if (window.prompt(`Eliminación masiva: ${label}. Escribe ELIMINAR para confirmar.`) !== "ELIMINAR") return;
    await runAdminAction(`delete-group:${label}`, () => deleteAdminGroup({
      kind: button.dataset.kind,
      ownerId: button.dataset.ownerId || "",
      type: button.dataset.type || "",
      category: button.dataset.category || ""
    }));
  }
}
