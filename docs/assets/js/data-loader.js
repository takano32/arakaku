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
  constructor(state, { dataFiles = DATA_FILES, fetchText = fetchJsonText } = {}) {
    this.state = state;
    this.dataFiles = dataFiles;
    this.fetchText = fetchText;
  }

  async load() {
    const entries = await Promise.all(
      Object.entries(this.dataFiles).map(async ([key, path]) => {
        const fallback = JSON.stringify(fallbackForDataKey(key));
        return [key, await this.fetchText(path, fallback)];
      })
    );

    const data = parseDataFileEntries(entries);
    this.state.data = data;
    this.state.repository = new DataRepository(data);
    this.state.patch({});
    return data;
  }
}
