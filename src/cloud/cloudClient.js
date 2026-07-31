const JSON_HEADERS = Object.freeze({
  Accept: "application/json",
  "Content-Type": "application/json"
});

export class CloudApiError extends Error {
  constructor(message, status = 0, code = "cloud_error") {
    super(message);
    this.name = "CloudApiError";
    this.status = status;
    this.code = code;
  }
}

export function canUseCloudAccounts() {
  return typeof window !== "undefined" && /^https?:$/i.test(window.location?.protocol || "");
}

async function parseResponse(response) {
  const contentType = response.headers.get("Content-Type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    throw new CloudApiError(
      String(body.message || `Cloud request failed (${response.status}).`),
      response.status,
      String(body.error || "cloud_error")
    );
  }

  return body;
}

async function requestJson(url, options = {}) {
  if (!canUseCloudAccounts()) {
    throw new CloudApiError("Cloud accounts require web version.", 0, "cloud_unavailable");
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: options.body
      ? { ...JSON_HEADERS, ...(options.headers || {}) }
      : { Accept: "application/json", ...(options.headers || {}) }
  });
  return parseResponse(response);
}

export async function fetchAuthSession() {
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new CloudApiError("Account service unavailable.", response.status, "auth_unavailable");
  }

  const session = await response.json().catch(() => null);
  return session?.user?.id ? session : null;
}

async function fetchCsrfToken() {
  const response = await requestJson("/api/auth/csrf");

  if (!response.csrfToken) {
    throw new CloudApiError("Could not start secure login.", 500, "csrf_unavailable");
  }

  return response.csrfToken;
}

export async function beginGoogleAuth({ registrationCode = "", register = false } = {}) {
  if (register) {
    await requestJson("/api/registration/authorize", {
      method: "POST",
      body: JSON.stringify({ code: registrationCode })
    });
  }

  const csrfToken = await fetchCsrfToken();
  const callbackUrl = `${window.location.origin}/?cloud=choose`;
  const response = await fetch("/api/auth/signin/google", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1"
    },
    body: new URLSearchParams({ csrfToken, callbackUrl })
  });
  const result = await parseResponse(response);

  if (!result.url) {
    throw new CloudApiError("Google login URL unavailable.", 500, "login_url_missing");
  }

  window.location.assign(result.url);
}

export async function signOutAccount() {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1"
    },
    body: new URLSearchParams({ csrfToken, callbackUrl: window.location.origin })
  });
  return parseResponse(response);
}

export async function listCloudCampaigns() {
  return requestJson("/api/campaigns");
}

export async function listPublicCloudCampaigns() {
  return requestJson("/api/campaigns/public");
}

export async function getCloudCampaign(campaignId) {
  return requestJson(`/api/campaigns/${encodeURIComponent(campaignId)}`);
}

export async function createCloudCampaign({ name, isPublic = false, payload }) {
  return requestJson("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ name, isPublic, payload })
  });
}

export async function updateCloudCampaign(campaignId, { name, isPublic = false, baseRevision, payload }) {
  return requestJson(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PUT",
    body: JSON.stringify({ name, isPublic, baseRevision, payload })
  });
}

export async function setCloudCampaignVisibility(campaignId, { isPublic, baseRevision }) {
  return requestJson(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PATCH",
    body: JSON.stringify({ isPublic, baseRevision })
  });
}

export async function deleteCloudCampaign(campaignId) {
  const response = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    return parseResponse(response);
  }

  return null;
}

export async function cloneCloudCampaign(campaignId) {
  return requestJson(`/api/campaigns/${encodeURIComponent(campaignId)}/clone`, {
    method: "POST",
    body: "{}"
  });
}

export async function uploadCloudImage(blob, { width = 0, height = 0 } = {}) {
  if (!(blob instanceof Blob) || blob.type !== "image/webp") {
    throw new CloudApiError("Cloud image must be WebP.", 0, "invalid_asset_type");
  }

  const response = await fetch("/api/assets", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "image/webp",
      "X-Image-Width": String(Math.max(0, Number(width) || 0)),
      "X-Image-Height": String(Math.max(0, Number(height) || 0))
    },
    body: blob
  });
  return parseResponse(response);
}

export async function listCloudLibraryEntries() {
  return requestJson("/api/library");
}

export async function listPublicCloudLibraryEntries(type = "") {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return requestJson(`/api/library/public${query}`);
}

export async function getCloudLibraryEntry(entryId) {
  return requestJson(`/api/library/${encodeURIComponent(entryId)}`);
}

export async function createCloudLibraryEntry({ type, name, description = "", isPublic = false, payload }) {
  return requestJson("/api/library", {
    method: "POST",
    body: JSON.stringify({ type, name, description, isPublic, payload })
  });
}

export async function setCloudLibraryEntryVisibility(entryId, { isPublic, baseRevision }) {
  return requestJson(`/api/library/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    body: JSON.stringify({ isPublic, baseRevision })
  });
}

export async function deleteCloudLibraryEntry(entryId) {
  const response = await fetch(`/api/library/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    return parseResponse(response);
  }

  return null;
}
