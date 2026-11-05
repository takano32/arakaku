import { DEFAULT_ADMIN_TAB, DEFAULT_TAB } from "../config.js";
import { TAB_FILTERS } from "../data/filters.js";
import { AlertsRenderer } from "./render/alerts.js";
import { FiltersRenderer } from "./render/filters.js";
import { ListView } from "./render/list_view.js";
import { NavRenderer } from "./render/nav.js";
import { StatsRenderer } from "./render/stats.js";
import { ToolbarRenderer } from "./render/toolbar.js";
import { SECTIONS } from "./sections/index.js";
import { ThemeToggle } from "./theme.js";
import { Toast } from "./toast.js";
import { activateVideoFacade } from "./video_embed.js";

/**
 * Shell — 画面全体の UI イベントの配線と状態遷移 (タブ切替・飛び先・検索クリア)、および描画の順序付け。
 *
 * - state.subscribe → render() が唯一の再描画経路。render() は冪等で、各レンダラ (ui/render/*.js) が
 *   変化した部分だけ DOM を触る (ナビは aria-current の更新だけ、絞り込みは指紋が変わったときだけ、
 *   一覧 (ListView) はタブ・repo.revision・指紋のいずれかが変わったときだけ build する)。
 * - 選手/大会/試合リンク (ui/parts/links.js の data-* 属性) と YouTube ファサードのクリックは
 *   #list-host への委譲で受ける。
 * - 検索欄 (ui/search_box.js)・配色 (ui/theme.js)・通知 (ui/toast.js) は部品として持つ。
 */
export class Shell {
  #state;
  #loader;
  #searchBox;
  #theme = new ThemeToggle();
  #toast = new Toast();
  #nav = new NavRenderer();
  #stats = new StatsRenderer();
  #alerts = new AlertsRenderer();
  #filters = new FiltersRenderer();
  #toolbar = new ToolbarRenderer();
  #listView;
  // 管理ビューの開閉 (ビュー切替) で、離れる前の各ビューの最後のタブへ戻すための記憶
  #prevPublicTab = DEFAULT_TAB;
  #prevAdminTab = DEFAULT_ADMIN_TAB;

  constructor({ state, loader, query, searchBox }) {
    this.#state = state;
    this.#loader = loader;
    this.#searchBox = searchBox;
    this.#listView = new ListView({ query });
  }

  get state() { return this.#state; }
  get repo() { return this.#state.repository; }

  // ── 配線 ───────────────────────────────────────────────────────────

  bind() {
    this.#searchBox.bind({
      onSearch: (value) => {
        this.#state.clearFocus();
        this.#state.patch({ query: value });
      },
      onClear: () => this.clearSearch(),
    });

    for (const selector of ["#nav", "#stats"]) {
      document.querySelector(selector)?.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-tab]");
        if (!link) return;
        // Ctrl/Cmd/Shift クリックや中クリックはブラウザに任せて新しいタブ・ウィンドウで開く (T.102)。
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        this.switchTab(link.dataset.tab);
      });
    }

    document.querySelector("#nav")?.addEventListener("toggle", (event) => {
      // 管理ビューの開閉 = ビュー切替。離れる前の各ビューの最後のタブへ戻す。
      if (this.#nav.syncing || !event.target.classList.contains("nav-admin")) return;
      const open = event.target.open;
      if (open && this.#state.viewMode === "public") this.switchTab(this.#prevAdminTab);
      else if (!open && this.#state.viewMode === "admin") this.switchTab(this.#prevPublicTab);
    }, true);

    document.querySelector("#filters")?.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-filter-type]");
      if (!btn) return;
      const group = TAB_FILTERS[this.#state.tab]?.find((g) => g.type === btn.dataset.filterType);
      if (!group) return;
      const val = btn.dataset.filterVal;
      this.#state.patch({ [group.stateKey]: this.#state[group.stateKey] === val ? "" : val });
    });

    document.querySelector("#filters")?.addEventListener("change", (event) => {
      if (event.target.id === "mention-type") this.#state.patch({ mentionType: event.target.value });
    });

    document.querySelector("#toolbar")?.addEventListener("click", (event) => {
      if (event.target.closest("#focus-clear")) {
        this.#state.clearFocus();
        this.#state.patch({});
      }
    });

    document.querySelector("#list-host")?.addEventListener("click", (event) => {
      const fighter = event.target.closest(".link-fighter");
      if (fighter) { this.jumpToFighter(fighter.dataset.fighterId); return; }
      const ev = event.target.closest(".link-event");
      if (ev) { this.jumpToEvent(ev.dataset.eventId); return; }
      const bout = event.target.closest(".link-bout");
      if (bout) { this.jumpToBout(bout.dataset.boutId); return; }
      const yt = event.target.closest(".yt");
      if (yt) activateVideoFacade(yt);
    });

    this.#theme.bind();

    this.#state.subscribe(() => this.render());
  }

  // ── 遷移 ───────────────────────────────────────────────────────────

  switchTab(tabId) {
    if (!SECTIONS[tabId]) tabId = DEFAULT_TAB;
    this.#state.clearFocus();
    this.#state.patch({ tab: tabId });
    this.#loader.loadForTab(tabId);
    window.scrollTo({ top: 0, behavior: "instant" });
    this.#focusHeading();
  }

  // タブ切り替え・飛び先への移動のあと、押したボタンが描き直しで消えてフォーカスが body に落ちるので、
  // 見出しへ移して新しい表示を支援技術に伝える (T.102)。
  #focusHeading() {
    document.querySelector("#toolbar .section-title")?.focus({ preventScroll: true });
  }

  #jump(patch) {
    this.#state.clearFocus();
    this.#state.patch({ ...patch, query: "" });
    this.#searchBox.setValue("");
    this.#loader.loadForTab(this.#state.tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    this.#focusHeading();
  }

  jumpToFighter(fighterId) { this.#jump({ tab: "fighters", focusFighterId: fighterId || "" }); }
  jumpToEvent(eventId) { this.#jump({ tab: "events", focusEventId: eventId || "" }); }
  jumpToBout(boutId) { this.#jump({ tab: "bouts", focusBoutId: boutId || "" }); }

  clearSearch() {
    this.#searchBox.setValue("");
    this.#searchBox.cancelPending();
    this.#state.clearFocus();
    this.#state.patch({ query: "" });
  }

  /** 現在のタブの RecordList (キーボード操作用。まだ描いていなければ null) */
  currentList() {
    return this.#listView.listFor(this.#state.tab);
  }

  toast(message) {
    this.#toast.show(message);
  }

  // ── 描画 ───────────────────────────────────────────────────────────

  render() {
    const state = this.#state;
    if (!state.data || !state.repository) return;
    if (state.viewMode === "admin") this.#prevAdminTab = state.tab;
    else this.#prevPublicTab = state.tab;

    this.#nav.render(state);
    this.#stats.render(state, this.repo);
    this.#alerts.render(state.dataLoadErrors);
    this.#filters.render(state, this.repo);
    this.#listView.render(state, this.repo);
    const section = SECTIONS[state.tab];
    this.#toolbar.render({ state, repo: this.repo, section, count: this.#listView.count });
    this.#searchBox.setPlaceholder(section?.placeholder);
  }
}
