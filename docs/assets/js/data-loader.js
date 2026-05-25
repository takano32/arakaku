import { DATA_FILES } from "./config.js";
import { DataRepository } from "./core/data-repository.js";
import { fallbackForDataKey, parseDataFileEntries } from "./core/data-parser.js";

export const CORE_DATA_KEYS = [
  "metadata",
  "articles",
  "articleLinks",
  "promotions",
  "events",
  "bouts",
  "boutParticipants",
  "fighters",
  "titles",
  "titleReigns",
  "videos",
  "videoLinks",
  "fighterSnapshots",
  "aliases",
  "numbersFighters",
  "numbersNameMatches",
  "numbersFightRecords",
  "youtubeArchives",
  "noteArchives",
];

export const PUBLIC_REFERENCE_DATA_KEYS = [
  "sourceEventReferences",
  "sourceBoutReferences",
  "sourceVideoReferences",
];

export const ADMIN_DATA_KEYS = [
  "sourceDocuments",
  "sourceMentions",
];

export const TAB_DATA_KEYS = {
  sources: ["sourceDocuments"],
  mentions: ["sourceDocuments", "sourceMentions"],
};

async function fetchJsonText(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) return fallback;
  return response.text();
}

/** データ取得と Repository の組み立て */
export class DataLoader {
  /** @param {import("./core/app-state.js").AppState} state */
  constructor(state, { dataFiles = DATA_FILES, fetchText = fetchJsonText } = {}) {
    this.state = state;
    this.dataFiles = dataFiles;
    this.fetchText = fetchText;
  }

  ensureStateData() {
    if (!this.state.data) {
      this.state.data = Object.fromEntries(
        Object.keys(this.dataFiles).map((key) => [key, fallbackForDataKey(key)])
      );
    }
    this.state.loadedDataKeys ??= new Set();
    this.state.loadingDataKeys ??= new Set();
    this.state.dataLoadErrors ??= {};
    this.state.repository = new DataRepository(this.state.data);
  }

  async fetchEntries(keys) {
    const entries = await Promise.all(
      keys.map(async (key) => {
        const path = this.dataFiles[key];
        const fallback = JSON.stringify(fallbackForDataKey(key));
        return [key, await this.fetchText(path, fallback)];
      })
    );
    return parseDataFileEntries(entries);
  }

  async loadKeys(keys, { required = false, notifyStart = true } = {}) {
    this.ensureStateData();
    const nextKeys = keys.filter((key) =>
      key in this.dataFiles &&
      !this.state.loadedDataKeys.has(key) &&
      !this.state.loadingDataKeys.has(key)
    );
    if (nextKeys.length === 0) return this.state.data;

    for (const key of nextKeys) this.state.loadingDataKeys.add(key);
    if (notifyStart) this.state.patch({});

    try {
      const parsed = await this.fetchEntries(nextKeys);
      Object.assign(this.state.data, parsed);
      for (const key of nextKeys) {
        this.state.loadedDataKeys.add(key);
        delete this.state.dataLoadErrors[key];
      }
    } catch (error) {
      if (required) throw error;
      for (const key of nextKeys) this.state.dataLoadErrors[key] = error.message;
    } finally {
      for (const key of nextKeys) this.state.loadingDataKeys.delete(key);
      this.state.repository = new DataRepository(this.state.data);
      this.state.patch({});
    }

    return this.state.data;
  }

  async load() {
    await this.loadKeys(CORE_DATA_KEYS, { required: true, notifyStart: false });
    this.loadPublicReferences();
    return this.state.data;
  }

  loadPublicReferences() {
    return this.loadKeys(PUBLIC_REFERENCE_DATA_KEYS);
  }

  loadForTab(tabId) {
    return this.loadKeys(TAB_DATA_KEYS[tabId] ?? []);
  }

  loadAll() {
    return this.loadKeys(Object.keys(this.dataFiles), { required: true });
  }
}
