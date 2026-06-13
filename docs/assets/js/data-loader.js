import { DATA_FILES, INITIAL_TAB_DATA_KEYS, PRIMARY_DATA_KEYS, ENRICHMENT_DATA_KEYS } from "./config.js";
import { DataRepository } from "./core/data-repository.js";
import { fallbackForDataKey, parseDataFileEntries } from "./core/data-parser.js";

export const CORE_DATA_KEYS = [...INITIAL_TAB_DATA_KEYS, ...PRIMARY_DATA_KEYS, ...ENRICHMENT_DATA_KEYS];

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

async function fetchJsonText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
  #patchScheduled = false;

  constructor(state, { dataFiles = DATA_FILES, fetchText = fetchJsonText } = {}) {
    this.state = state;
    this.dataFiles = dataFiles;
    this.fetchText = fetchText;
  }

  // ストリーミング中、13 並列キーが flush ごとに patch すると render が多重に走る。
  // patch 通知だけを 1 フレームに 1 回へまとめる (invalidate はフラッシュ毎に必要なので残す)。
  // requestAnimationFrame が無い環境 (Node/テスト) では即時 patch して従来挙動を保つ。
  #schedulePatch() {
    if (typeof requestAnimationFrame === "undefined") {
      this.state.patch({});
      return;
    }
    if (this.#patchScheduled) return;
    this.#patchScheduled = true;
    requestAnimationFrame(() => {
      this.#patchScheduled = false;
      this.state.patch({});
    });
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
    this.state.repository ??= new DataRepository(this.state.data);
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
      // キーごとに失敗を捕捉し、#streamKey と同じく「fallback + dataLoadErrors 記録 +
      // loaded 扱い」に揃える (失敗をエラーカードに表示するため)。required 時は即 throw。
      const failed = {};
      const entries = await Promise.all(
        nextKeys.map(async (key) => {
          const fallback = JSON.stringify(fallbackForDataKey(key));
          try {
            return [key, await this.fetchText(this.dataFiles[key], fallback)];
          } catch (error) {
            if (required) throw error;
            failed[key] = error.message;
            return [key, fallback];
          }
        })
      );
      Object.assign(this.state.data, parseDataFileEntries(entries));
      for (const key of nextKeys) {
        this.state.loadedDataKeys.add(key);
        if (failed[key]) this.state.dataLoadErrors[key] = failed[key];
        else delete this.state.dataLoadErrors[key];
      }
    } catch (error) {
      if (required) throw error;
      for (const key of nextKeys) this.state.dataLoadErrors[key] = error.message;
    } finally {
      for (const key of nextKeys) this.state.loadingDataKeys.delete(key);
      this.state.repository.invalidate();
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
    // CDN import 失敗時は null → 下の parser 生成が throw して通常 fetch+parse に
    // フォールバックする (パーサ CDN 障害でアプリ全体を落とさない)
    const JSONParser = await getJSONParser().catch(() => null);

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
    const FLUSH_MS = 200;
    let firstFlushDone = false;
    let pendingFlush = false;
    let flushTimer = null;

    const flush = () => {
      pendingFlush = false;
      this.state.data[key] = [...accumulated];
      this.state.repository.invalidate();
      this.#schedulePatch();
      onBatch(accumulated);
    };

    // 最初の flush は即時、以降は最大約 FLUSH_MS に 1 回へスロットル。
    const scheduleFlush = () => {
      if (!firstFlushDone) {
        firstFlushDone = true;
        flush();
        return;
      }
      if (flushTimer !== null) {
        pendingFlush = true;
        return;
      }
      flush();
      flushTimer = setTimeout(() => {
        flushTimer = null;
        if (pendingFlush) flush();
      }, FLUSH_MS);
    };

    const cancelFlush = () => {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      pendingFlush = false;
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
        scheduleFlush();
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
      cancelFlush();
      this.state.data[key] = fallbackForDataKey(key);
      this.state.dataLoadErrors[key] = err.message;
      this.state.loadedDataKeys.add(key);
      return;
    }

    // ストリーム完了: 確定値をセット
    cancelFlush();
    this.state.data[key] = accumulated;
    delete this.state.dataLoadErrors[key];
    this.state.loadedDataKeys.add(key);
  }

  // #streamKey を per-key の失敗封じ込めでラップする。1 ファイルの異常 (body=null や
  // CDN/parse 例外) が Promise.all 全体を reject して load() を落とすのを防ぎ、
  // 失敗キーは fallback + dataLoadErrors + loaded 扱いに統一する。
  #streamKeySafe(key) {
    return this.#streamKey(key, () => {}).catch((err) => {
      this.state.data[key] = fallbackForDataKey(key);
      this.state.dataLoadErrors[key] = err.message;
      this.state.loadedDataKeys.add(key);
    });
  }

  async load() {
    this.ensureStateData();

    // Phase 0: 初期タブ (公式) のデータを最優先でロード。
    // 合計 ~16KB と小さいのでストリーミングせず、CDN パーサの import 完了も待たない。
    // 後続フェーズが使う CDN パーサの import だけ裏で温めておく
    // (.catch は Phase 0 中の unhandled rejection 防止。失敗の処理は #streamKey 側)。
    getJSONParser().catch(() => {});
    await this.loadKeys(INITIAL_TAB_DATA_KEYS);

    // Phase 1: PRIMARY キーを並列ストリーミング
    await Promise.all(PRIMARY_DATA_KEYS.map((key) => this.#streamKeySafe(key)));

    // Phase 1 完了後に確定 patch
    this.state.repository.invalidate();
    this.state.patch({});

    // Phase 2: ENRICHMENT と公開参照を 1 つの並列プールでロードする。
    // 旧実装は enrichment 完了を待ってから参照をロードしていたため、公開タブの
    // 試合/大会/動画カードが使う source*References (~1.5MB) の開始が遅れていた。
    // 参照は enricher の入力ではない独立データなので並列化して到着を早める。
    // 両ヘルパーとも #streamKeySafe でキー単位の失敗を封じ込める。
    await Promise.all([this.#loadEnrichment(), this.loadPublicReferences()]);

    // 全てのデータロード完了後に確定 patch
    this.state.repository.invalidate();
    this.state.patch({});

    return this.state.data;
  }

  async #loadEnrichment() {
    const keys = ENRICHMENT_DATA_KEYS.filter((key) => key in this.dataFiles);
    if (keys.length === 0) return;
    await Promise.all(keys.map((key) => this.#streamKeySafe(key)));
  }

  loadPublicReferences() {
    this.ensureStateData();
    return Promise.all(
      PUBLIC_REFERENCE_DATA_KEYS
        .filter((key) => key in this.dataFiles && !this.state.loadedDataKeys.has(key))
        .map((key) => this.#streamKeySafe(key))
    );
  }

  async loadForTab(tabId) {
    const keys = (TAB_DATA_KEYS[tabId] ?? []).filter(
      (key) => key in this.dataFiles && !this.state.loadedDataKeys?.has(key)
    );
    if (keys.length === 0) return;
    this.ensureStateData();
    await Promise.all(keys.map((key) => this.#streamKeySafe(key)));
    this.state.repository.invalidate();
    this.state.patch({});
  }

  loadAll() {
    return this.loadKeys(Object.keys(this.dataFiles), { required: true });
  }
}
