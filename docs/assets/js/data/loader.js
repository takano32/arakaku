import {
  DATA_FILES,
  INITIAL_TAB_DATA_KEYS,
  PRIMARY_DATA_KEYS,
  ENRICHMENT_DATA_KEYS,
  PUBLIC_REFERENCE_DATA_KEYS,
  TAB_DATA_KEYS,
} from "../config.js";
import { DataRepository } from "./repository.js";
import { fallbackForDataKey, parseJsonText } from "./parser.js";

/**
 * docs/data/*.json を段階的に取得して state.data に流し込み、DataRepository を組み立てる。
 *
 * フェーズ:
 *   0. 初期タブ (公式) のデータを単独で取得して最初の描画を出す
 *   1. 公開タブに直結する PRIMARY キーを並列取得 (届いたファイルから順に反映)
 *   2. 補完データ (ENRICHMENT) と公開参照 (PUBLIC_REFERENCE) を 1 つの並列プールで取得
 *   タブ固有の重いデータは loadForTab() でタブを開いたときだけ取得する。
 *
 * 失敗はキー単位で封じ込める: fallback 値 + dataLoadErrors[key] + loadedDataKeys に追加
 * (1 ファイルの異常でアプリ全体を落とさない。HTTP エラーは握りつぶさず記録する)。
 *
 * constructor の依存注入 (dataFiles / fetchText) は scripts/validate_json.js が Node から
 * fs ベースの実装を差し込んでパイプラインを検証するために使う。fetchText(path, fallback) の
 * 引数順を変えないこと (ブラウザ実装は fallback を無視して失敗時に throw する)。
 */

/**
 * 取得した 1 ファイルのテキストを解析する (純関数)。配列のキーに配列以外が来たら壊れたファイルとして扱う
 * (消費側が .map/.filter 前提のため)。失敗したときは value に空のフォールバック、error に理由を入れる。
 * @returns {{ value: unknown, error: string|null }}
 */
export function applyLoadedText(key, text) {
  try {
    const parsed = parseJsonText(text, key);
    const fallbackIsArray = Array.isArray(fallbackForDataKey(key));
    if (fallbackIsArray && !Array.isArray(parsed)) throw new Error("配列 JSON ではありません");
    return { value: parsed, error: null };
  } catch (error) {
    return { value: fallbackForDataKey(key), error: error.message };
  }
}

async function fetchJsonText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export class DataLoader {
  #patchScheduled = false;

  constructor(state, { dataFiles = DATA_FILES, fetchText = fetchJsonText } = {}) {
    this.state = state;
    this.dataFiles = dataFiles;
    this.fetchText = fetchText;
  }

  // 並列取得中、キーごとに patch すると描画が多重に走るので 1 フレーム 1 回へまとめる。
  // requestAnimationFrame が無い環境 (Node/テスト) では即時 patch する。
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

  // 冪等な遅延初期化。どのロード経路から最初に入っても state.data / repository / 進捗用 Set が揃う。
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

  #pendingKeys(keys) {
    return keys.filter((key) =>
      key in this.dataFiles &&
      !this.state.loadedDataKeys.has(key) &&
      !this.state.loadingDataKeys.has(key)
    );
  }

  /**
   * 複数キーをまとめて取得し、全件揃ってから state に反映する (初期タブ・検証用)。
   * required=true のときは欠損を throw する。
   */
  async loadKeys(keys, { required = false, notifyStart = true } = {}) {
    this.ensureStateData();
    const nextKeys = this.#pendingKeys(keys);
    if (nextKeys.length === 0) return this.state.data;

    for (const key of nextKeys) this.state.loadingDataKeys.add(key);
    if (notifyStart) this.state.patch({});

    try {
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
      // 解析と形の検査は #loadKeyProgressive と同じ applyLoadedText で行う。以前はここに「配列 JSON か」の
      // 検査が無く、公式ページが {} だと読み込みエラーではなく描画エラーになった (T.112.4.16)。
      const results = entries.map(([key, text]) => [key, applyLoadedText(key, text)]);
      // required のときはすべてを検査してから書く。以前は壊れたファイルの手前のキーまで state.data に書いてから
      // throw していた (T.112.6.17)。
      if (required) {
        const broken = results.find(([, result]) => result.error !== null);
        if (broken) throw new Error(`${this.dataFiles[broken[0]]}: ${broken[1].error}`);
      }
      for (const [key, result] of results) {
        if (result.error !== null) failed[key] ??= result.error;
        this.state.data[key] = result.value;
      }
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
   * 1 キーを取得し、届き次第 state に反映して描画を予約する (並列プール用)。
   * 失敗しても reject せず、fallback + dataLoadErrors + loaded 扱いにする。
   */
  async #loadKeyProgressive(key) {
    this.state.loadingDataKeys.add(key);
    try {
      let result;
      try {
        result = applyLoadedText(key, await this.fetchText(this.dataFiles[key], JSON.stringify(fallbackForDataKey(key))));
      } catch (error) {
        result = { value: fallbackForDataKey(key), error: error.message }; // 取得の失敗 (HTTP エラーなど)
      }
      this.state.data[key] = result.value;
      if (result.error === null) delete this.state.dataLoadErrors[key];
      else this.state.dataLoadErrors[key] = result.error;
    } finally {
      this.state.loadingDataKeys.delete(key);
      this.state.loadedDataKeys.add(key);
      this.state.repository.invalidate();
      this.#schedulePatch();
    }
  }

  #loadPool(keys) {
    this.ensureStateData();
    return Promise.all(this.#pendingKeys(keys).map((key) => this.#loadKeyProgressive(key)));
  }

  async load() {
    this.ensureStateData();

    // Phase 0: 初期タブ (公式) のデータを最優先で取得して即描画する。
    await this.loadKeys(INITIAL_TAB_DATA_KEYS);

    // Phase 1: 公開タブに直結するデータを並列取得。届いたファイルから順に描画へ反映する。
    await this.#loadPool(PRIMARY_DATA_KEYS);
    this.state.repository.invalidate();
    this.state.patch({});

    // Phase 2: 補完データと公開参照 (~1.5MB) を 1 つの並列プールで取得する。
    // 参照は enricher の入力ではない独立データなので、補完の完了を待たせない。
    await this.#loadPool([...ENRICHMENT_DATA_KEYS, ...PUBLIC_REFERENCE_DATA_KEYS]);
    this.state.repository.invalidate();
    this.state.patch({});

    return this.state.data;
  }

  // タブ切替時に呼ばれ、そのタブ専用の重いデータを未ロードのときだけ取得する。
  async loadForTab(tabId) {
    const keys = TAB_DATA_KEYS[tabId] ?? [];
    if (keys.length === 0) return;
    this.ensureStateData();
    if (this.#pendingKeys(keys).length === 0) return;
    this.state.patch({}); // 読み込み中の表示を出す
    await this.#loadPool(keys);
    this.state.repository.invalidate();
    this.state.patch({});
  }

  // 全ファイルを required で一括ロード (フェーズ分割なし)。validate_json.js がパイプライン全体を検証する用途。
  loadAll() {
    return this.loadKeys(Object.keys(this.dataFiles), { required: true });
  }
}
