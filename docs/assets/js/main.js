import { HistorySync } from "./app/history_sync.js";
import { Store } from "./app/state.js";
import { readFromURL } from "./app/url_params.js";
import { DataLoader } from "./data/loader.js";
import { QueryMatcher } from "./data/query.js";
import { Shell } from "./ui/shell.js";
import { KeyboardNav } from "./ui/keyboard.js";
import { SearchBox } from "./ui/search_box.js";
import { escapeHtml } from "./ui/html.js";

/**
 * ビューアの起動シーケンス (docs/index.html から module として読み込まれる)。
 *   URL から状態を復元 → UI を配線 → データを段階的に読み込む → Service Worker を登録。
 * 致命的な失敗 (load() 自体の reject) だけをここで表示する。個別ファイルの失敗は
 * DataLoader が吸収し、Shell が「データ読み込み失敗」として一覧の上に出す。
 */
const state = new Store();
const historySync = new HistorySync();
const searchBox = new SearchBox();

const urlPatch = readFromURL();
if (Object.keys(urlPatch).length > 0) {
  state.patch(urlPatch);
  if (urlPatch.query) searchBox.setValue(urlPatch.query);
}
// URL への書き戻しは復元が終わってから購読する (復元中の patch をループさせない)
state.subscribe((s) => historySync.write(s));

const loader = new DataLoader(state);
const query = new QueryMatcher(state, () => state.repository);
const shell = new Shell({ state, loader, query, searchBox });
shell.bind();
new KeyboardNav({
  state,
  switchTab: (tabId) => shell.switchTab(tabId),
  list: () => shell.currentList(),
  clearSearch: () => shell.clearSearch(),
  focusSearch: () => searchBox.focus(),
  toast: (message) => shell.toast(message),
}).bind();

// ブラウザの「戻る」「進む」: URL の状態に戻し、検索欄と遅延データも合わせる。
window.addEventListener("popstate", (event) => {
  const patch = historySync.restore();
  state.patch(patch);
  // 離れたときのスクロール位置に戻す。一覧は最初 30 行しか描かないので、必要なら全行を描いてから。
  const scrollY = event.state?.scrollY ?? 0;
  requestAnimationFrame(() => {
    if (scrollY > document.documentElement.scrollHeight - window.innerHeight) shell.currentList()?.renderAll();
    window.scrollTo({ top: scrollY, behavior: "instant" });
  });
  searchBox.setValue(patch.query);
  loader.loadForTab(state.tab);
});

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
