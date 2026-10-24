import { Store, readFromURL, writeToURL } from "./app/state.js";
import { DataLoader } from "./data/loader.js";
import { QueryMatcher } from "./data/query.js";
import { Parts } from "./ui/parts.js";
import { Shell } from "./ui/shell.js";
import { KeyboardNav } from "./ui/keyboard.js";
import { escapeHtml } from "./ui/html.js";

/**
 * ビューアの起動シーケンス (docs/index.html から module として読み込まれる)。
 *   URL から状態を復元 → UI を配線 → データを段階的に読み込む → Service Worker を登録。
 * 致命的な失敗 (load() 自体の reject) だけをここで表示する。個別ファイルの失敗は
 * DataLoader が吸収し、Shell が「データ読み込み失敗」として一覧の上に出す。
 */
const state = new Store();

const urlPatch = readFromURL();
if (Object.keys(urlPatch).length > 0) {
  state.patch(urlPatch);
  const searchInput = document.querySelector("#search");
  if (searchInput && urlPatch.query) searchInput.value = urlPatch.query;
  const clearButton = document.querySelector("#search-clear");
  if (clearButton && urlPatch.query) clearButton.hidden = false;
}
// URL への書き戻しは復元が終わってから購読する (復元中の patch をループさせない)
state.subscribe((s) => writeToURL(s));

const loader = new DataLoader(state);
const ctx = { state, get repo() { return state.repository; } };
const query = new QueryMatcher(state, () => state.repository);
const parts = new Parts(ctx);
const shell = new Shell({ state, loader, parts, query });
shell.bind();
new KeyboardNav({
  state,
  switchTab: (tabId) => shell.switchTab(tabId),
  list: () => shell.currentList(),
  clearSearch: () => shell.clearSearch(),
  toast: (message) => shell.toast(message),
}).bind();

loader
  .load()
  .then(() => loader.loadForTab(state.tab))
  .catch((error) => {
    console.error("viewer: data load failed", error);
    const host = document.querySelector("#list-host");
    if (host) {
      host.innerHTML = `<div class="alert" role="alert"><p class="alert-title">読み込みに失敗しました</p><p>${escapeHtml(error.message)}</p></div>`;
    }
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});

  // sw.js が新しい docs/data を検知すると DATA_UPDATED を postMessage する。
  // 再読み込みバナーは 1 セッション 1 回だけ。
  let updateBannerShown = false;
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "DATA_UPDATED" || updateBannerShown) return;
    updateBannerShown = true;
    const banner = document.createElement("div");
    banner.className = "update-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = 'データが更新されました。<button type="button" class="update-banner-button">再読み込み</button>';
    banner.querySelector("button").addEventListener("click", () => location.reload());
    document.body.appendChild(banner);
  });
}
