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
