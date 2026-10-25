import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { booleanJa, escapeHtml, joinPresent } from "../html.js";

const CATEGORY_LABELS = {
  major: "主要",
  special_event_series: "特別大会シリーズ",
  minor: "マイナー",
  event_series: "イベントシリーズ",
  unclassified: "未分類",
};

/** 団体タブ */
export const promotionsSection = {
  id: "promotions",
  label: "団体",
  placeholder: "団体名で検索",
  empty: "該当する団体がありません。",
  build({ repo, parts, state, query }) {
    const items = repo.richPromotions.filter((p) => query.promotionMatches(p) && itemPassesFilters(p, TAB_FILTERS.promotions, state));
    const ruleRows = (p) => [
      ["会場", escapeHtml(p.rules?.venue ?? "")],
      ["ラウンド", escapeHtml(p.rules?.rounds ?? "")],
      ["判定", escapeHtml(p.rules?.judging ?? "")],
      ["グローブ", escapeHtml(p.rules?.glove ?? "")],
      ["肘", booleanJa(p.rules?.elbows)],
      ["サッカーボールキック", booleanJa(p.rules?.soccer_kicks)],
      ["踏みつけ", booleanJa(p.rules?.stomps)],
      ["4点頭部キック", booleanJa(p.rules?.four_point_head_kicks)],
      ["4点頭部膝", booleanJa(p.rules?.four_point_head_knees)],
    ];
    const eventsBlock = (p) => {
      const e = repo.eventsForPromotion(p.promotion_id);
      if (e.length === 0) return "";
      const shown = e.slice(0, 12);
      return parts.section(`大会（${e.length}）`, `<ul class="plain-list cols">${shown.map((x) => `<li>${parts.eventLink(x.event_id, x.name)} <span class="muted small">${escapeHtml(joinPresent([x.result_published_at || x.published_at]))}</span></li>`).join("")}</ul>${e.length > shown.length ? `<p class="muted small">ほか ${e.length - shown.length} 件</p>` : ""}`, "sec-events");
    };
    const titlesBlock = (p) => {
      const t = repo.titlesForPromotion(p.promotion_id);
      if (t.length === 0) return "";
      return parts.section("王座", `<ul class="plain-list">${t.map((x) => `<li>${escapeHtml(repo.titleDisplayName(x))} <span class="muted small">${escapeHtml(x.lineage?.length ?? 0)} 代</span></li>`).join("")}</ul>`, "sec-titles");
    };
    return {
      items,
      keyOf: (p) => p.promotion_id,
      rowClass: () => "rec-promotion",
      renderHead: (p) => `<div class="rec-text">
          <p class="rec-title">${escapeHtml(p.name)}${p.name_en ? ` <span class="nick">${escapeHtml(p.name_en)}</span>` : ""}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([CATEGORY_LABELS[p.category] ?? p.category, p.rules?.rounds, p.rules?.venue]))}</p>
        </div>
        <div class="rec-aside"><span class="muted small">大会 ${repo.eventsForPromotion(p.promotion_id).length}</span></div>`,
      renderBody: (p) => `
        <p class="summary">${escapeHtml(p.summary || "概要未入力")}</p>
        ${parts.dl(ruleRows(p), "dl-inline")}
        ${parts.articleRefList(p.source_article_ids)}
        ${parts.videoLinks("promotion", p.promotion_id)}
        ${eventsBlock(p)}
        ${titlesBlock(p)}
        ${parts.details([
          ["promotion_id", `<code>${escapeHtml(p.promotion_id)}</code>`],
          ["英字名", escapeHtml(p.name_en ?? "")],
          ["カテゴリ", escapeHtml(p.category ?? "")],
          ["範囲", escapeHtml(p.country_scope ?? "")],
        ])}
      `,
    };
  },
};
