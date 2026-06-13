/**
 * data-parser — データキーごとの「空フォールバック形」決定と JSON テキストのパースを担う純関数群。
 *
 * アーキ上の位置 / 関係:
 *   data-loader.js (ブラウザ) と scripts/validate_json.js (Node テスト) の両方から共有される。
 *   両環境で同じフォールバック/パース規則を使うことで、欠損ファイルの扱いを一致させる。
 *
 * 不変条件 / 注意:
 *   - フォールバックの形 (配列 or オブジェクト) は各データキーの「空値」と一致させる必要がある。
 *     大半のコレクションは配列、aliases / metadata だけがオブジェクト。新キー追加時は
 *     オブジェクト型なら必ず OBJECT_DATA_KEYS へ登録すること (でないと空時に [] が返り消費側が壊れる)。
 *   関連スキル: .agents/skills/arakaku-viewer-ui
 */

// 空値がオブジェクト ({}) になるデータキー。これ以外は全て配列フォールバック。
const OBJECT_DATA_KEYS = new Set(["aliases", "metadata"]);

export function fallbackForDataKey(key) {
  return OBJECT_DATA_KEYS.has(key) ? {} : [];
}

export function parseJsonText(text, key) {
  if (text === null || text === undefined || text === "") {
    return fallbackForDataKey(key);
  }
  return JSON.parse(text);
}

export function parseDataFileEntries(entries) {
  return Object.fromEntries(
    entries.map(([key, text]) => [key, parseJsonText(text, key)])
  );
}
