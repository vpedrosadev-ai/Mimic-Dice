import { onRequest as adminRequest } from "../functions/api/admin/[[path]].js";
import { onRequest as assetRequest } from "../functions/api/assets/[[path]].js";
import { onRequest as authRequest } from "../functions/api/auth/[[path]].js";
import { onRequest as campaignRequest } from "../functions/api/campaigns/[[path]].js";
import { onRequestGet as healthRequest } from "../functions/api/health.js";
import { onRequest as libraryRequest } from "../functions/api/library/[[path]].js";
import { onRequest as multiplayerRequest } from "../functions/api/multiplayer/rooms/[[path]].js";
import { onRequest as profileRequest } from "../functions/api/profile.js";
import { onRequestPost as registrationRequest } from "../functions/api/registration/authorize.js";

const ROUTES = [
  { prefix: "/api/auth", handler: authRequest },
  { prefix: "/api/campaigns", handler: campaignRequest },
  { prefix: "/api/assets", handler: assetRequest },
  { prefix: "/api/library", handler: libraryRequest },
  { prefix: "/api/admin", handler: adminRequest },
  { prefix: "/api/multiplayer/rooms", handler: multiplayerRequest }
];

function pathParts(pathname, prefix) {
  const suffix = pathname.slice(prefix.length).replace(/^\/+/, "");
  if (!suffix) return [];
  return suffix.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}
function contextFor(request, env, params = {}) {
  const background = [];
  return {
    request,
    env,
    params,
    waitUntil(promise) {
      background.push(Promise.resolve(promise));
    },
    passThroughOnException() {},
    background
  };
}

export async function routeApiRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return healthRequest(contextFor(request, env));
  }

  if (url.pathname === "/api/profile") {
    return profileRequest(contextFor(request, env));
  }

  if (url.pathname === "/api/registration/authorize") {
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }
    return registrationRequest(contextFor(request, env));
  }

  const route = ROUTES.find(({ prefix }) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  if (!route) return null;
  const context = contextFor(request, env, { path: pathParts(url.pathname, route.prefix) });
  const response = await route.handler(context);
  if (context.background.length > 0) {
    Promise.allSettled(context.background).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") console.error("Background task failed.", result.reason);
      }
    });
  }
  return response;
}

