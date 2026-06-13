import { escapeHtml } from "./html-utils.js";

// 役割: エンティティ間遷移の中核。fighter/event へのリンクボタン HTML を生成し、クリック時の
//   実遷移 (jumpToFighter / jumpToEvent) で state を patch する。bout の対戦カードと結果サマリ
//   HTML もここで組み立てる。
// アーキ上の位置: main.js で new され ctx.navigation として related-renderers / tab-renderers から
//   呼ばれる。表示名は ctx.repo (DataRepository) の fighterName/eventName で解決。生成ボタンの
//   data-* 属性 (data-fighter-id 等) は event-controller のクリック委譲が読むので、属性名は
//   event-controller と同期必須。
// 不変条件: data-id / 表示名はすべて escapeHtml を通す。jump* は #search の input.value も手動で
//   同期させる (state.query だけでは DOM に反映されないため)。
// 関連スキル: .agents/skills/arakaku-viewer-ui
/** Command の実行先: タブ・フォーカス・検索を遷移 */
export class Navigator {
  /** @param {import("../core/view-context.js").ViewContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }

  eventLink(eventId, fallbackName) {
    const name = this.ctx.repo.eventName(eventId) || fallbackName || eventId;

    return `
      <button type="button" class="link-button event-link" data-event-id="${escapeHtml(eventId)}" data-event-name="${escapeHtml(name)}">
        ${escapeHtml(name)}
      </button>
    `;
  }

  fighterLink(fighterId, fallbackName) {
    const name = this.ctx.repo.fighterName(fighterId) || fallbackName || fighterId;

    return `
      <button type="button" class="link-button fighter-link" data-fighter-id="${escapeHtml(fighterId)}" data-fighter-name="${escapeHtml(name)}">
        ${escapeHtml(name)}
      </button>
    `;
  }

  jumpToEvent(eventId, eventNameValue) {
    this.ctx.state.patch({
      viewMode: "public",
      tab: "events",
      focusEventId: eventId || "",
      focusFighterId: "",
      query: eventNameValue || "",
    });

    const searchInput = document.querySelector("#search");
    if (searchInput) {
      searchInput.value = this.ctx.state.query;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  jumpToFighter(fighterId, fighterNameValue) {
    this.ctx.state.patch({
      viewMode: "public",
      tab: "fighters",
      focusFighterId: fighterId || "",
      focusEventId: "",
      query: fighterNameValue || "",
    });

    const searchInput = document.querySelector("#search");
    if (searchInput) {
      searchInput.value = this.ctx.state.query;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // 対戦カード表記を組み立てる。enrich 済み bout.fighters[] を最優先し、無ければ
  // fighter_a/b、勝者敗者ペア、生 matchup 文字列、最後に bout_id とフォールバックする。
  // この優先順位は data-enricher の出力スキーマに依存するため変更時は要確認。
  boutMatchup(bout) {
    const fighterA = bout.fighters?.[0];
    const fighterB = bout.fighters?.[1];

    const fighterAName = fighterA?.name ?? bout.fighter_a ?? "";
    const fighterBName = fighterB?.name ?? bout.fighter_b ?? "";
    const fighterAId = fighterA?.fighter_id ?? bout.fighter_a_id ?? "";
    const fighterBId = fighterB?.fighter_id ?? bout.fighter_b_id ?? "";

    if (fighterAName && fighterBName) {
      return `${this.fighterLink(fighterAId, fighterAName)} vs ${this.fighterLink(fighterBId, fighterBName)}`;
    }

    if (bout.winner && bout.loser) {
      return `${this.fighterLink(bout.winner_id, bout.winner)} vs ${this.fighterLink(bout.loser_id, bout.loser)}`;
    }

    if (bout.matchup) {
      return escapeHtml(bout.matchup);
    }

    return escapeHtml(bout.bout_id);
  }

  renderBoutResultSummary(bout) {
    const resultStatus = bout.result_status ?? "known";

    if (resultStatus === "unknown") {
      return "";
    }

    if (bout.winner && bout.loser) {
      return `${this.fighterLink(bout.winner_id, bout.winner)} def. ${this.fighterLink(bout.loser_id, bout.loser)}`;
    }

    return "";
  }
}
