import { getToken } from "@auth/core/jwt";
import { HttpError } from "./http.js";

const ADMIN_EMAILS = new Set(["vpedrosadev@gmail.com"]);

export function isAdministrator(user) {
  return ADMIN_EMAILS.has(String(user?.email || "").trim().toLowerCase());
}

export async function isUserBanned(db, userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return false;

  try {
    const row = await db.prepare(
      'SELECT 1 AS "banned" FROM "admin_user_bans" WHERE "userId" = ? LIMIT 1'
    ).bind(normalizedUserId).first();
    return row?.banned === 1;
  } catch (error) {
    if (/no such table.*admin_user_bans/i.test(String(error?.message || error))) {
      return false;
    }
    throw error;
  }
}

export function assertServerBindings(env, requiredKeys = []) {
  const missingKeys = ["DB", "AUTH_SECRET", ...requiredKeys].filter((key) => !env?.[key]);

  if (missingKeys.length > 0) {
    throw new HttpError(503, "server_not_configured", `Missing server binding: ${missingKeys.join(", ")}.`);
  }
}

export async function getAuthenticatedUser(context) {
  assertServerBindings(context.env);
  const secureCookie = new URL(context.request.url).protocol === "https:";
  const token = await getToken({
    req: context.request,
    secret: context.env.AUTH_SECRET,
    secureCookie
  });
  const userId = String(token?.sub || "").trim();

  if (!userId) {
    return null;
  }

  const user = await context.env.DB.prepare(
    'SELECT "id", "name", "email", "image", "masterCombatView" FROM "users" WHERE "id" = ? LIMIT 1'
  ).bind(userId).first();

  if (user && !isAdministrator(user) && await isUserBanned(context.env.DB, user.id)) {
    throw new HttpError(403, "account_banned", "This account has been banned from Mimic Dice Cloud.");
  }

  return user || null;
}

export async function requireAuthenticatedUser(context) {
  const user = await getAuthenticatedUser(context);

  if (!user) {
    throw new HttpError(401, "unauthorized", "Sign in required.");
  }

  return user;
}

export async function requireAdministrator(context) {
  const user = await requireAuthenticatedUser(context);

  if (!isAdministrator(user)) {
    throw new HttpError(403, "administrator_required", "Administrator access required.");
  }

  return user;
}
