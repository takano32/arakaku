import { escapeHtml } from "./html-utils.js";

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

    window.scrollTo({ top: 0, behavior: "smooth" });
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
