import { DATA_FILES } from "./config.js";
import { DataRepository } from "./core/data-repository.js";

async function fetchJson(path, fallback) {
  const response = await fetch(path);
  if (!response.ok) return fallback;
  return response.json();
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
        const fallback = key === "aliases" || key === "metadata" ? {} : [];
        return [key, await fetchJson(path, fallback)];
      })
    );

    const data = Object.fromEntries(entries);
    this.state.data = data;
    this.state.repository = new DataRepository(data);
    this.state.patch({});
    return data;
  }
}
