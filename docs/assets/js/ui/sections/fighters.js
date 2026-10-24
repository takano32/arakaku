import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { codeList, escapeHtml, joinPresent, recordText, textList } from "../html.js";
import { focusedOrFiltered } from "./common.js";

/** 選手タブ (名鑑掲載順。低信頼の選手は末尾) */
export const fightersSection = {
  id: "fighters",
  label: "選手",
  placeholder: "選手名・所属・階級で検索",
  empty: "該当する選手がいません。",
  build({ repo, parts, state, query }) {
    const items = focusedOrFiltered(
      state.focusFighterId,
      (id) => repo.findRichFighter(id),
      repo.richFighters,
      (f) => query.fighterMatches(f) && itemPassesFilters(f, TAB_FILTERS.fighters, state)
    );
    return {
      items,
      keyOf: (f) => f.fighter_id,
      rowClass: () => "rec-fighter",
      renderHead: (f) => {
        const r = f.profile?.record;
        const bouts = repo.relatedBoutsForFighter(f.fighter_id).length;
        return `<div class="rec-text">
          <p class="rec-title"><span class="name">${escapeHtml(f.display_name)}</span>${f.profile?.nickname ? ` <span class="nick">「${escapeHtml(f.profile.nickname)}」</span>` : ""}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([f.main_division, repo.promotionName(f.main_promotion_id), f.profile?.gym]))}</p>
          ${parts.badges([
            f.numbers_data ? parts.badge("名鑑", "numbers") : "",
            f.official_data ? parts.badge("公式", "official") : "",
            ...(f.profile?.achievements ?? []).map((a) => parts.badge(a, "gold")),
          ])}
        </div>
        <div class="rec-aside">
          ${r ? `<span class="result-line">${escapeHtml(recordText(r))}</span>` : ""}
          ${bouts ? `<span class="muted small">登録試合 ${bouts}</span>` : ""}
        </div>`;
      },
      renderBody: (f) => `
        ${f.summary ? `<p class="summary pre-line">${escapeHtml(f.summary)}</p>` : ""}
        ${parts.dl([
          ["所属", escapeHtml(f.profile?.gym ?? "")],
          ["身長・年齢", escapeHtml(joinPresent([f.profile?.height, f.profile?.age]))],
          ["国籍", escapeHtml(f.profile?.nationality ?? "")],
        ], "dl-inline")}
        ${parts.profileBlock(f)}
        ${parts.relatedBouts(f.fighter_id)}
        ${parts.fighterSnapshots(f.fighter_id)}
        ${parts.articleRefList(f.source_article_ids)}
        ${parts.details([
          ["fighter_id", `<code>${escapeHtml(f.fighter_id)}</code>`],
          ["統合した ID", (f.merged_fighter_ids?.length ?? 0) > 1 ? codeList(f.merged_fighter_ids) : ""],
          ["別名", textList(f.aliases)],
          ["主階級", escapeHtml(f.main_division ?? "")],
          ["主団体", escapeHtml(repo.promotionName(f.main_promotion_id) ?? "")],
          ["推定元動画", codeList(f.inferred_from_video_ids)],
          ["推定信頼度", escapeHtml(f.inferred_confidence ?? "")],
        ])}
      `,
    };
  },
};
