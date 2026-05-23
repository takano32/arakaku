import { DATA_FILES } from "./config.js";
import { DataRepository } from "./core/data-repository.js";
import { fallbackForDataKey, parseDataFileEntries } from "./core/data-parser.js";

async function fetchJsonText(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) return fallback;
  return response.text();
}

/** データ取得と Repository の組み立て */
export class DataLoader {
  /** @param {import("./core/app-state.js").AppState} state */
  constructor(state) {
    this.state = state;
  }

  async load() {
    const entries = await Promise.all(
      Object.entries(DATA_FILES).map(async ([key, path]) => {
        const fallback = JSON.stringify(fallbackForDataKey(key));
        return [key, await fetchJsonText(path, fallback)];
      })
    );

    const data = parseDataFileEntries(entries);
    this.state.data = data;
    this.state.repository = new DataRepository(data);
    this.state.patch({});
    return data;
  }
}
