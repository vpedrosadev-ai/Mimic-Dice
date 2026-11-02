import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function safeObjectPath(root, key) {
  const cleanKey = String(key || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!cleanKey || cleanKey.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid object key.");
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...cleanKey.split("/"));
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Object key escapes storage root.");
  }
  return { cleanKey, resolved };
}
async function readMetadata(filename) {
  try {
    return JSON.parse(await fs.readFile(`${filename}.meta.json`, "utf8"));
  } catch {
    return {};
  }
}

export class FileBucket {
  constructor(root) {
    this.root = path.resolve(root);
  }

  async put(key, value, options = {}) {
    const { resolved } = safeObjectPath(this.root, key);
    const bytes = Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    const temporary = `${resolved}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, resolved);
    const httpEtag = `"${crypto.createHash("sha256").update(bytes).digest("hex")}"`;
    await fs.writeFile(`${resolved}.meta.json`, JSON.stringify({
      httpEtag,
      httpMetadata: options.httpMetadata || {},
      customMetadata: options.customMetadata || {},
      uploaded: new Date().toISOString()
    }));
    return { key: String(key), size: bytes.byteLength, etag: httpEtag.replaceAll('"', "") };
  }

  async get(key) {
    let target;
    try {
      target = safeObjectPath(this.root, key);
    } catch {
      return null;
    }
    try {
      const [body, stat, metadata] = await Promise.all([
        fs.readFile(target.resolved),
        fs.stat(target.resolved),
        readMetadata(target.resolved)
      ]);
      const httpEtag = metadata.httpEtag || `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`;
      return {
        key: target.cleanKey,
        body,
        size: stat.size,
        uploaded: metadata.uploaded ? new Date(metadata.uploaded) : stat.mtime,
        httpEtag,
        httpMetadata: metadata.httpMetadata || {},
        customMetadata: metadata.customMetadata || {},
        writeHttpMetadata(headers) {
          if (this.httpMetadata.contentType) headers.set("Content-Type", this.httpMetadata.contentType);
          if (this.httpMetadata.contentLanguage) headers.set("Content-Language", this.httpMetadata.contentLanguage);
          if (this.httpMetadata.cacheControl) headers.set("Cache-Control", this.httpMetadata.cacheControl);
          if (this.httpMetadata.contentDisposition) headers.set("Content-Disposition", this.httpMetadata.contentDisposition);
        }
      };
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      let target;
      try {
        target = safeObjectPath(this.root, key);
      } catch {
        continue;
      }
      await Promise.all([
        fs.rm(target.resolved, { force: true }),
        fs.rm(`${target.resolved}.meta.json`, { force: true })
      ]);
    }
  }

  async list(options = {}) {
    const objects = [];
    const walk = async (directory) => {
      let entries = [];
      try {
        entries = await fs.readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (error?.code === "ENOENT") return;
        throw error;
      }
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(absolute);
        } else if (!entry.name.endsWith(".meta.json") && !entry.name.endsWith(".tmp")) {
          const stat = await fs.stat(absolute);
          const key = path.relative(this.root, absolute).split(path.sep).join("/");
          if (options.prefix && !key.startsWith(options.prefix)) continue;
          const metadata = await readMetadata(absolute);
          objects.push({
            key,
            size: stat.size,
            uploaded: metadata.uploaded ? new Date(metadata.uploaded) : stat.mtime,
            httpMetadata: metadata.httpMetadata || {},
            customMetadata: metadata.customMetadata || {}
          });
        }
      }
    };
    await walk(this.root);
    objects.sort((left, right) => left.key.localeCompare(right.key));
    const limit = Math.max(1, Math.min(1000, Number(options.limit) || 1000));
    const offset = Math.max(0, Number(options.cursor) || 0);
    const page = objects.slice(offset, offset + limit);
    const truncated = offset + limit < objects.length;
    return { objects: page, truncated, cursor: truncated ? String(offset + limit) : undefined };
  }
}

