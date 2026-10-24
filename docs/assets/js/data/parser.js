/**
 * データキーごとの空フォールバック形と JSON テキストのパース。
 * data/loader.js（ブラウザ）と scripts/validate_json.js（Node）が共有する純関数。
 *
 * 空値がオブジェクト ({}) になるのは aliases / metadata だけで、他はすべて配列。
 * 新しいオブジェクト型キーを足すときは OBJECT_DATA_KEYS にも登録する（でないと空時に [] が返る）。
 */
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
