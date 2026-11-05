/**
 * Service Worker (docs/sw.js) の登録と、データ更新の通知の受け取り。
 * sw.js が新しい docs/data を検知すると { type: "DATA_UPDATED" } を postMessage する。
 * 通知は 1 セッションに 1 回だけ onDataUpdated に渡し、再読み込みバナーを出す。
 */

// docs/sw.js の postMessage と同じ型名にすること。
export const DATA_UPDATED = "DATA_UPDATED";

/** message イベントの処理。DATA_UPDATED を最初に受け取ったときだけ onDataUpdated() を呼ぶ。 */
export function dataUpdatedHandler(onDataUpdated) {
  let notified = false;
  return (event) => {
    if (event.data?.type !== DATA_UPDATED || notified) return;
    notified = true;
    onDataUpdated();
  };
}

/** Service Worker を登録する (対応していないブラウザでは何もしない。登録の失敗は無視する)。 */
export function registerServiceWorker({ onDataUpdated }) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", dataUpdatedHandler(onDataUpdated));
}

/** 「データが更新されました。再読み込み」のバナーを出す。 */
export function showUpdateBanner() {
  const banner = document.createElement("div");
  banner.className = "update-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = 'データが更新されました。<button type="button" class="update-banner-button">再読み込み</button>';
  banner.querySelector("button").addEventListener("click", () => location.reload());
  document.body.appendChild(banner);
}
