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

dataLoader
  .load()
  .then(() => dataLoader.loadForTab(state.tab))
  .catch((error) => {
    renderLoadError(error);
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});

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
