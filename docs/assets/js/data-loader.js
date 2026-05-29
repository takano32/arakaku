import { DATA_FILES, PRIMARY_DATA_KEYS, ENRICHMENT_DATA_KEYS } from "./config.js";
import { DataRepository } from "./core/data-repository.js";
import { fallbackForDataKey, parseDataFileEntries } from "./core/data-parser.js";

export const CORE_DATA_KEYS = [...PRIMARY_DATA_KEYS, ...ENRICHMENT_DATA_KEYS];

export const PUBLIC_REFERENCE_DATA_KEYS = [
  "sourceEventReferences",
  "sourceBoutReferences",
  "sourceVideoReferences",
];

export const TAB_DATA_KEYS = {
  tsushin: ["sourceDocumentBodies"],
  sources: ["sourceDocuments", "sourceDocumentBodies"],
  mentions: ["sourceDocuments", "sourceMentions"],
};

async function fetchJsonText(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) return fallback;
  return response.text();
}

// JSONParser の dynamic import を一度だけ行いキャッシュ (ブラウザのみ)
let jsonParserImportPromise = null;
function getJSONParser() {
  if (!jsonParserImportPromise) {
    if (typeof window === "undefined") {
      jsonParserImportPromise = Promise.resolve(null);
    } else {
      jsonParserImportPromise = import("https://esm.sh/@streamparser/json").then((m) => m.JSONParser);
    }
  }
  return jsonParserImportPromise;
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

  /**
   * 1つのキーをストリーミング SAX パースし、バッチごとに onBatch を呼ぶ。
   * @param {string} key
   * @param {(items: unknown[]) => void} onBatch
   */
  async #streamKey(key, onBatch) {
    const path = this.dataFiles[key];
    const JSONParser = await getJSONParser();

    let response;
    try {
      response = await fetch(path);
    } catch (err) {
      this.state.data[key] = fallbackForDataKey(key);
      this.state.dataLoadErrors[key] = err.message;
      this.state.loadedDataKeys.add(key);
      return;
    }

    if (!response.ok) {
      this.state.data[key] = fallbackForDataKey(key);
      this.state.dataLoadErrors[key] = `HTTP ${response.status}`;
      this.state.loadedDataKeys.add(key);
      return;
    }

    const accumulated = [];
    let lastFlush = Date.now();
    const BATCH_SIZE = 30;
    const BATCH_MS = 50;

    const flush = () => {
      this.state.data[key] = [...accumulated];
      this.state.repository = new DataRepository(this.state.data);
      this.state.patch({});
      onBatch(accumulated);
      lastFlush = Date.now();
    };

    let parser;
    try {
      parser = new JSONParser({ paths: ["$.*"], keepStack: false });
    } catch (err) {
      // フォールバック: 通常の fetch+parse
      try {
        const text = await response.text();
        const parsed = JSON.parse(text);
        this.state.data[key] = Array.isArray(parsed) ? parsed : fallbackForDataKey(key);
      } catch (_) {
        this.state.data[key] = fallbackForDataKey(key);
      }
      this.state.loadedDataKeys.add(key);
      return;
    }

    parser.onValue = ({ value, key: k }) => {
      if (typeof k === "number") {
        accumulated.push(value);
        if (accumulated.length % BATCH_SIZE === 0 || Date.now() - lastFlush >= BATCH_MS) {
          flush();
        }
      }
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.write(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      this.state.data[key] = fallbackForDataKey(key);
      this.state.dataLoadErrors[key] = err.message;
      this.state.loadedDataKeys.add(key);
      return;
    }

    // ストリーム完了: 確定値をセット
    this.state.data[key] = accumulated;
    delete this.state.dataLoadErrors[key];
    this.state.loadedDataKeys.add(key);
  }

  async load() {
    this.ensureStateData();

    // Phase 1: PRIMARY キーを並列ストリーミング
    await Promise.all(
      PRIMARY_DATA_KEYS.map((key) =>
        this.#streamKey(key, () => {}).catch((err) => {
          this.state.data[key] = fallbackForDataKey(key);
          this.state.dataLoadErrors[key] = err.message;
          this.state.loadedDataKeys.add(key);
        })
      )
    );

    // Phase 1 完了後に確定 patch
    this.state.repository = new DataRepository(this.state.data);
    this.state.patch({});

    // Phase 2: ENRICHMENT キーを通常ロード
    await this.#loadEnrichment();

    this.loadPublicReferences();
    return this.state.data;
  }

  async #loadEnrichment() {
    const keys = ENRICHMENT_DATA_KEYS.filter((key) => key in this.dataFiles);
    if (keys.length === 0) return;
    await Promise.all(keys.map((key) => this.#streamKey(key, () => {})));
  }

  loadPublicReferences() {
    this.ensureStateData();
    return Promise.all(
      PUBLIC_REFERENCE_DATA_KEYS
        .filter((key) => key in this.dataFiles && !this.state.loadedDataKeys.has(key))
        .map((key) => this.#streamKey(key, () => {}))
    );
  }

  loadForTab(tabId) {
    const keys = (TAB_DATA_KEYS[tabId] ?? []).filter(
      (key) => key in this.dataFiles && !this.state.loadedDataKeys?.has(key)
    );
    if (keys.length === 0) return Promise.resolve();
    this.ensureStateData();
    return Promise.all(keys.map((key) => this.#streamKey(key, () => {})));
  }

  loadAll() {
    return this.loadKeys(Object.keys(this.dataFiles), { required: true });
  }
}
