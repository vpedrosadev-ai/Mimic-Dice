import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import mime from "mime-types";

import { LocalD1Database } from "./d1.js";
import { FileBucket } from "./fileBucket.js";
import { NodeDurableNamespace } from "./nodeDurable.js";
import { installRealtimeServer } from "./realtime.js";
import { routeApiRequest } from "./router.js";
import { MonstersLeagueRoom, SharedCampaignRoom } from "../workers/monsters-league/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8788);
const distRoot = path.resolve(process.env.STATIC_ROOT || path.join(root, "dist"));
const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(root, ".runtime/data/mimic-dice.sqlite"));
const objectRoot = path.resolve(process.env.OBJECT_STORAGE_PATH || path.join(root, ".runtime/objects"));
const roomRoot = path.resolve(process.env.ROOM_STORAGE_PATH || path.join(root, ".runtime/rooms"));
const publicOrigin = String(process.env.PUBLIC_ORIGIN || "").replace(/\/$/, "");

if (!fs.existsSync(databasePath)) {
  throw new Error(`Database not found at ${databasePath}. Run npm run db:import:cloudflare first.`);
}

const database = new LocalD1Database(databasePath, { fileMustExist: true });
const bucket = new FileBucket(objectRoot);
const env = {
  DB: database,
  CLOUD_ASSETS: bucket,
  AUTH_SECRET: process.env.AUTH_SECRET || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  REGISTRATION_CODE: process.env.REGISTRATION_CODE || ""
};
env.MONSTERS_LEAGUE_ROOMS = new NodeDurableNamespace(
  MonstersLeagueRoom,
  path.join(roomRoot, "monsters-league"),
  () => env
);
env.SHARED_CAMPAIGN_ROOMS = new NodeDurableNamespace(
  SharedCampaignRoom,
  path.join(roomRoot, "shared-campaigns"),
  () => env
);

function requestOrigin(request) {
  if (publicOrigin) return publicOrigin;
  const protocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const authority = String(request.headers["x-forwarded-host"] || request.headers.host || `${host}:${port}`).split(",")[0].trim();
  return `${protocol}://${authority}`;
}

function createWebRequest(request) {
  const url = new URL(request.url || "/", requestOrigin(request));
  const headers = new Headers();
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    headers.append(request.rawHeaders[index], request.rawHeaders[index + 1]);
  }
  const options = { method: request.method, headers };
  if (!['GET', 'HEAD'].includes(String(request.method).toUpperCase())) {
    options.body = Readable.toWeb(request);
    options.duplex = "half";
  }
  return new Request(url, options);
}

function securityHeaders(headers, secure) {
  headers.set("Content-Security-Policy", "base-uri 'self'; frame-ancestors 'none'; object-src 'none'");
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (secure) headers.set("Strict-Transport-Security", "max-age=31536000");
}

async function sendWebResponse(nodeResponse, webResponse, method, secure) {
  nodeResponse.statusCode = webResponse.status;
  nodeResponse.statusMessage = webResponse.statusText || nodeResponse.statusMessage;
  const headers = new Headers(webResponse.headers);
  securityHeaders(headers, secure);
  for (const [name, value] of headers) {
    if (name.toLowerCase() !== "set-cookie") nodeResponse.setHeader(name, value);
  }
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (cookies.length > 0) nodeResponse.setHeader("Set-Cookie", cookies);
  if (method === "HEAD" || !webResponse.body) {
    nodeResponse.end();
    return;
  }
  Readable.fromWeb(webResponse.body).pipe(nodeResponse);
}

function resolveStaticPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(distRoot, relative || "index.html");
  return resolved === distRoot || resolved.startsWith(`${distRoot}${path.sep}`) ? resolved : null;
}

async function serveStatic(request, response, url, secure) {
  let filename = resolveStaticPath(url.pathname);
  if (!filename) {
    response.statusCode = 400;
    response.end("Bad request");
    return;
  }
  let stat;
  try {
    stat = await fsPromises.stat(filename);
    if (!stat.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
  } catch (error) {
    const acceptsHtml = String(request.headers.accept || "").includes("text/html");
    if (error?.code !== "ENOENT" || !acceptsHtml || path.extname(url.pathname)) {
      response.statusCode = error?.code === "ENOENT" ? 404 : 500;
      response.end(response.statusCode === 404 ? "Not found" : "Server error");
      return;
    }
    filename = path.join(distRoot, "index.html");
    try {
      stat = await fsPromises.stat(filename);
    } catch {
      response.statusCode = 503;
      response.end("Static build not found. Run npm run build.");
      return;
    }
  }
  const headers = new Headers({
    "Content-Type": mime.lookup(filename) || "application/octet-stream",
    "Content-Length": String(stat.size),
    "Last-Modified": stat.mtime.toUTCString()
  });
  if (filename.endsWith("index.html")) headers.set("Cache-Control", "no-cache");
  else if (filename.includes(`${path.sep}assets${path.sep}`)) headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (filename.includes(`${path.sep}images${path.sep}`)) headers.set("Cache-Control", "public, max-age=604800");
  else headers.set("Cache-Control", "public, max-age=3600");
  securityHeaders(headers, secure);
  response.writeHead(200, Object.fromEntries(headers));
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(filename).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const origin = requestOrigin(request);
    const url = new URL(request.url || "/", origin);
    const secure = url.protocol === "https:";
    if (url.pathname.startsWith("/api/")) {
      const webRequest = createWebRequest(request);
      const webResponse = await routeApiRequest(webRequest, env);
      if (webResponse) {
        await sendWebResponse(response, webResponse, request.method, secure);
        return;
      }
    }
    await serveStatic(request, response, url, secure);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "internal_error", message: "Unexpected server error." }));
  }
});

installRealtimeServer(server, env, { requestOrigin });

server.listen(port, host, () => {
  console.log(`Mimic Dice alternative server listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received; stopping server.`);
  server.close(() => {
    database.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
