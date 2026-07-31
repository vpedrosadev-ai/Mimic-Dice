import { getToken } from "@auth/core/jwt";
import { HttpError } from "./http.js";

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
    'SELECT "id", "name", "email", "image" FROM "users" WHERE "id" = ? LIMIT 1'
  ).bind(userId).first();

  return user || null;
}

export async function requireAuthenticatedUser(context) {
  const user = await getAuthenticatedUser(context);

  if (!user) {
    throw new HttpError(401, "unauthorized", "Sign in required.");
  }

  return user;
}
