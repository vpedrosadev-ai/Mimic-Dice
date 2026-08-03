import { requireAuthenticatedUser } from "../_shared/auth.js";
import {
  assertSameOrigin,
  cleanText,
  errorResponse,
  HttpError,
  jsonResponse,
  methodNotAllowed,
  readJsonBody
} from "../_shared/http.js";

const PROFILE_ASSET_PATTERN = /^\/api\/assets\/([0-9a-f-]{36})$/i;

async function updateProfile(context, user) {
  const body = await readJsonBody(context.request, 2048);
  const hasImage = Object.prototype.hasOwnProperty.call(body, "image");
  const hasName = Object.prototype.hasOwnProperty.call(body, "name");

  if (!hasImage && !hasName) {
    throw new HttpError(400, "invalid_profile_update", "Profile update is empty.");
  }

  let normalizedImage = cleanText(user.image, 600);
  let normalizedName = cleanText(user.name, 80);

  if (hasName) {
    normalizedName = cleanText(body.name, 80);

    if (normalizedName.length < 2) {
      throw new HttpError(400, "invalid_profile_name", "Profile name must contain at least two characters.");
    }
  }

  if (hasImage) {
    const image = cleanText(body.image, 600);
    const match = image.match(PROFILE_ASSET_PATTERN);

    if (!match) {
      throw new HttpError(400, "invalid_profile_image", "Profile image must be an uploaded cloud image.");
    }

    const assetId = match[1].toLowerCase();
    const asset = await context.env.DB.prepare(`
      SELECT "id"
      FROM "cloud_assets"
      WHERE "id" = ? AND "ownerId" = ? AND "mimeType" = 'image/webp'
      LIMIT 1
    `).bind(assetId, user.id).first();

    if (!asset) {
      throw new HttpError(404, "asset_not_found", "Cloud image not found.");
    }

    normalizedImage = `/api/assets/${assetId}`;
  }

  await context.env.DB.prepare(
    'UPDATE "users" SET "name" = ?, "image" = ? WHERE "id" = ?'
  ).bind(normalizedName, normalizedImage, user.id).run();

  return jsonResponse({
    user: {
      id: user.id,
      name: normalizedName,
      email: user.email,
      image: normalizedImage
    }
  });
}

export async function onRequest(context) {
  try {
    const method = context.request.method.toUpperCase();

    if (method !== "PATCH") {
      return methodNotAllowed(["PATCH"]);
    }

    assertSameOrigin(context.request);
    return await updateProfile(context, await requireAuthenticatedUser(context));
  } catch (error) {
    return errorResponse(error);
  }
}
