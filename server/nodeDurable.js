import fs from "node:fs/promises";
import path from "node:path";

class JsonDurableStorage {
  constructor(filename) {
    this.filename = filename;
    this.values = {};
    this.alarmTimer = null;
    this.owner = null;
    this.writeQueue = Promise.resolve();
    this.loaded = this.load();
  }

  async load() {
    try {
      this.values = JSON.parse(await fs.readFile(this.filename, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      this.values = {};
    }
  }

  async persist() {
    const serialized = JSON.stringify(this.values);
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const temporary = `${this.filename}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporary, serialized);
      await fs.rename(temporary, this.filename);
    });
    await this.writeQueue;
  }

  async get(keys) {
    await this.loaded;
    if (Array.isArray(keys)) return new Map(keys.map((key) => [key, this.values[key]]));
    return this.values[keys];
  }

  async put(keyOrEntries, value) {
    await this.loaded;
    if (typeof keyOrEntries === "string") this.values[keyOrEntries] = value;
    else Object.assign(this.values, keyOrEntries || {});
    await this.persist();
  }

  async deleteAll() {
    await this.loaded;
    this.values = {};
    await this.writeQueue;
    await fs.rm(this.filename, { force: true });
  }

  async setAlarm(timestamp) {
    this.deleteAlarm();
    const delay = Math.max(1, Math.min(2_147_000_000, Number(timestamp) - Date.now()));
    this.alarmTimer = setTimeout(() => {
      this.alarmTimer = null;
      Promise.resolve(this.owner?.alarm?.()).catch((error) => console.error("Room alarm failed.", error));
    }, delay);
    this.alarmTimer.unref?.();
  }

  async deleteAlarm() {
    if (this.alarmTimer) clearTimeout(this.alarmTimer);
    this.alarmTimer = null;
  }
}
class NodeDurableContext {
  constructor(storage) {
    this.storage = storage;
    this.sockets = new Set();
  }

  blockConcurrencyWhile(callback) {
    return callback();
  }

  acceptWebSocket(socket) {
    this.sockets.add(socket);
  }

  removeWebSocket(socket) {
    this.sockets.delete(socket);
  }

  getWebSockets() {
    return [...this.sockets];
  }
}

export class NodeDurableNamespace {
  constructor(RoomClass, root, envProvider) {
    this.RoomClass = RoomClass;
    this.root = path.resolve(root);
    this.envProvider = envProvider;
    this.instances = new Map();
  }

  idFromName(name) {
    return String(name);
  }

  get(id) {
    return {
      fetch: async (input, init) => {
        const { instance } = await this.getInstance(id);
        const request = input instanceof Request ? input : new Request(input, init);
        return instance.fetch(request);
      }
    };
  }

  async getInstance(id) {
    const key = String(id);
    if (!this.instances.has(key)) {
      const filename = path.join(this.root, `${encodeURIComponent(key)}.json`);
      const storage = new JsonDurableStorage(filename);
      const context = new NodeDurableContext(storage);
      const instance = new this.RoomClass(context, this.envProvider());
      storage.owner = instance;
      this.instances.set(key, { instance, context, storage });
    }
    const result = this.instances.get(key);
    await result.instance.ready;
    return result;
  }
}

export class NodeSocketAdapter {
  constructor(socket, attachment = {}) {
    this.socket = socket;
    this.attachment = attachment;
  }

  serializeAttachment(value) {
    this.attachment = value;
  }

  deserializeAttachment() {
    return this.attachment;
  }

  send(value) {
    if (this.socket.readyState === 1) this.socket.send(value);
  }

  close(code, reason) {
    this.socket.close(code, reason);
  }
}

