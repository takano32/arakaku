import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml } from "../html.js";

/** 王座タブ: 団体 → 階級で並べ、「団体 / 階級」の見出し行を挟む。各王座は歴代を開いた状態で見せる。 */
export const titlesSection = {
  id: "titles",
  label: "王座",
  placeholder: "王座・王者名で検索",
  empty: "該当する王座がありません。",
  build({ repo, parts, state, query }) {
    const list = repo.richTitles
      .filter((t) => query.titleMatches(t) && itemPassesFilters(t, TAB_FILTERS.titles, state))
      .sort(
        (a, b) =>
          repo.promotionName(a.promotion_id).localeCompare(repo.promotionName(b.promotion_id), "ja") ||
          String(a.division ?? "").localeCompare(String(b.division ?? ""), "ja")
      );

    const items = [];
    let prev = "";
    for (const t of list) {
      const g = `${repo.promotionName(t.promotion_id)} / ${t.division ?? "階級未設定"}`;
      if (g !== prev) {
        items.push({ _header: true, label: g });
        prev = g;
      }
      items.push(t);
    }

    const reignRow = (reign) => {
      const events = [
        reign.won_at_event_id ? `獲得: ${parts.eventLink(reign.won_at_event_id, repo.eventName(reign.won_at_event_id))}` : "",
        reign.lost_at_event_id ? `喪失: ${parts.eventLink(reign.lost_at_event_id, repo.eventName(reign.lost_at_event_id))}` : "",
        reign.end_reason === "vacated" ? "返上（空位）" : "",
      ].filter(Boolean);
      const source = reign.source_video_id
        ? `出典: ${parts.videoRefs([reign.source_video_id], { inline: true })}`
        : reign.source_article_id ? `出典: ${parts.articleRefs(reign.source_article_id)}` : "";
      return `<li class="reign">
        <span class="reign-label">${escapeHtml(reign.reign_label ?? `${reign.order}代`)}</span>
        <span class="reign-name">${parts.fighterLink(reign.fighter_id, reign.fighter_name)}</span>
        <span class="reign-meta muted small">${[...events, source].filter(Boolean).join(" / ")}</span>
      </li>`;
    };

    return {
      items,
      keyOf: (item) => (item._header ? `h:${item.label}` : item.title_id),
      isHeader: (item) => Boolean(item._header),
      defaultOpen: () => true,
      rowClass: () => "rec-title",
      renderHead: (item) => item._header
        ? `<h2 class="group-title">${escapeHtml(item.label)}</h2>`
        : `<div class="rec-text">
            <p class="rec-title">${escapeHtml(repo.titleDisplayName(item))}</p>
            <p class="rec-sub">${escapeHtml(item.lineage?.length ?? 0)} 代の変遷</p>
          </div>
          <div class="rec-aside">${item.lineage?.length ? `<span class="result-line">現王者: ${escapeHtml(item.lineage[item.lineage.length - 1].fighter_name)}</span>` : ""}</div>`,
      renderBody: (t) => {
        const lineage = [...(t.lineage ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return `
          ${lineage.length ? `<ol class="reigns">${lineage.map(reignRow).join("")}</ol>` : `<p class="muted">歴代王者はまだ登録されていません。</p>`}
          ${parts.details([
            ["title_id", `<code>${escapeHtml(t.title_id)}</code>`],
            ["団体", escapeHtml(repo.promotionName(t.promotion_id))],
            ["階級", escapeHtml(t.division ?? "")],
            ["変遷数", escapeHtml(lineage.length)],
          ])}
        `;
      },
    };
  },
};
