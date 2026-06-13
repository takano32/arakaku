import { AppState } from "./core/app-state.js";
import { ViewContext } from "./core/view-context.js";
import { readFromURL, writeToURL } from "./core/url-sync.js";
import { ComponentFactory } from "./ui/component-builder.js";
import { Navigator } from "./ui/navigation.js";
import { SourceRenderers } from "./services/source-renderers.js";
import { RelatedRenderers } from "./services/related-renderers.js";
import { TabRenderers } from "./tabs/tab-renderers.js";
import { TabRendererRegistry } from "./tabs/tab-registry.js";
import { ViewController } from "./view-controller.js";
import { DataLoader } from "./data-loader.js";
import { EventController, renderLoadError } from "./event-controller.js";
import { KeyboardNav } from "./ui/keyboard-nav.js";

/**
 * 役割: viewer の composition root / ブラウザ実行のエントリポイント。
 *   AppState を起点に全サービス (Navigator/各 Renderer/ViewController/DataLoader/
 *   EventController/KeyboardNav) を生成・結線し、URL 復元 → イベント束ね →
 *   データロード → Service Worker 登録までの起動シーケンスを 1 回実行する。
 * アーキ上の位置: docs/index.html から module として読み込まれる末端 (誰も import しない)。
 *   状態は AppState シングルトン、描画契約は EventController.bind() が登録する
 *   state.subscribe → ViewController.render (ここ main.js では writeToURL の購読のみ登録)、
 *   データ取得は DataLoader。生成順 = 依存順なので結線ブロックの並び替えは要注意。
 * 不変条件:
 *   - 副作用は import 時に即実行される (関数で包まれていない)。テストから import しない想定。
 *   - URL からの初期状態復元は state.subscribe(writeToURL) の登録より前に行うこと
 *     (復元中の patch を URL へ書き戻してループ/上書きしないため)。
 *   - DOM 要素 (#search 等) と index.html の id は同期が必要。
 * 関連スキル: .agents/skills/arakaku-viewer-ui
 */

// lite-youtube-embed はカスタム要素の登録のみ。静的 import だと esm.sh の応答まで
// boot 全体 (Phase 0 含む) がブロックされるため、await せず動的 import する。
// 失敗しても <lite-youtube> が未登録のまま表示されるだけで viewer 本体は動く。
import("https://esm.sh/lite-youtube-embed").catch(() => {});

const state = AppState.getInstance();

// URL から初期状態を復元
const urlPatch = readFromURL();
if (Object.keys(urlPatch).length > 0) {
  state.patch(urlPatch);
  const searchInput = document.querySelector("#search");
  if (searchInput && urlPatch.query) searchInput.value = urlPatch.query;
  const clearButton = document.querySelector("#search-clear");
  if (clearButton && urlPatch.query) clearButton.hidden = false;
}

state.subscribe((s) => writeToURL(s));

const ctx = new ViewContext(state);

const components = new ComponentFactory();
const navigation = new Navigator(ctx);
const sources = new SourceRenderers(ctx);
const related = new RelatedRenderers(ctx);
const tabs = new TabRenderers(ctx);

ctx.bindServices({ sources, related, navigation, components, tabs });

const tabRegistry = new TabRendererRegistry(tabs, ctx);
const viewController = new ViewController(ctx, tabRegistry);
const dataLoader = new DataLoader(state);
const eventController = new EventController(state, navigation, viewController, dataLoader);

eventController.bind();
new KeyboardNav(tabRegistry, state, dataLoader).bind();

// 起動ロード: フェーズ別 load() の後、復元された初期タブ固有の遅延データを取りに行く。
// 致命的失敗のみ renderLoadError (個別キーの失敗は DataLoader 内で吸収されエラーカード表示)。
dataLoader
  .load()
  .then(() => dataLoader.loadForTab(state.tab))
  .catch((error) => {
    renderLoadError(error);
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});

  // sw.js が新しい docs/data を検知すると DATA_UPDATED を postMessage する。
  // 再読み込みバナーは 1 セッション 1 回だけ (フラグでガード)。
  let updateBannerShown = false;
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "DATA_UPDATED" || updateBannerShown) return;
    updateBannerShown = true;

    const banner = document.createElement("div");
    banner.className = "update-banner";
    banner.innerHTML =
      'データが更新されました。<button class="update-banner-btn">再読み込み</button>';
    banner.querySelector("button").addEventListener("click", () => location.reload());
    document.body.appendChild(banner);
  });
}
