import { labels } from "../../data/labels.js";
import { TAB_FILTERS, itemPassesFilters } from "../../data/filters.js";
import { escapeHtml, externalLink, formatDate, joinPresent } from "../html.js";
import { badge, badges, details, section } from "../parts/basic.js";
import { boutMatchup } from "../parts/bouts.js";
import { boutLink, eventLink, fighterLink } from "../parts/links.js";
import { articleRefList } from "../parts/sources.js";
import { videoBlock, videoDescriptionPreview } from "../parts/videos.js";

/** 動画タブ */
export const videosSection = {
  id: "videos",
  label: "動画",
  placeholder: "動画タイトル・概要欄で検索",
  empty: "該当する動画がありません。",
  build({ repo, state, query }) {
    const items = repo.richVideos.filter((v) => query.videoMatches(v) && itemPassesFilters(v, TAB_FILTERS.videos, state));
    const linkedEntityLabel = (link) => {
      const id = link.entity_id;
      if (link.entity_type === "event") return eventLink(repo, id, repo.eventName(id));
      if (link.entity_type === "bout") {
        const b = repo.findRichBout(id);
        return b ? boutLink(id, boutMatchup(repo, b)) : `<code>${escapeHtml(id)}</code>`;
      }
      if (link.entity_type === "fighter") return fighterLink(repo, id, repo.fighterName(id));
      if (link.entity_type === "promotion") return escapeHtml(repo.promotionName(id));
      return `<code>${escapeHtml(id)}</code>`;
    };
    const linkedEntities = (video) => {
      const l = repo.videoLinksForVideo(video.video_id);
      if (l.length === 0) return "";
      return section("紐づけ先", `<ul class="plain-list">${l.map((x) => `<li>${badge(labels.relationType(x.relation_type))} ${linkedEntityLabel(x)}${x.start_time || x.end_time ? ` <span class="muted small">${escapeHtml(joinPresent([x.start_time, x.end_time], " - "))}</span>` : ""}${x.notes ? ` <span class="muted small">${escapeHtml(x.notes)}</span>` : ""}</li>`).join("")}</ul>`, "sec-links");
    };
    const thumb = (v) => {
      if (v.platform !== "youtube" || !v.platform_video_id) return "";
      return `<img class="rec-thumb" src="https://i.ytimg.com/vi/${escapeHtml(v.platform_video_id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async">`;
    };
    return {
      items,
      keyOf: (v) => v.video_id,
      rowClass: () => "rec-video",
      renderHead: (v) => `
        ${thumb(v)}
        <div class="rec-text">
          <p class="rec-title">${escapeHtml(v.title ?? v.video_id)}</p>
          <p class="rec-sub">${escapeHtml(joinPresent([v.channel_name, formatDate(v.published_at), v.archive_metadata?.duration_string]))}</p>
          ${badges([
            badge(labels.videoType(v.video_type)),
            badge(labels.linkStatus(v.link_status), "soft"),
            v.official_status === "official" ? badge("公式", "official") : "",
          ])}
        </div>`,
      renderBody: (v) => `
        ${videoBlock(repo, v, v.title)}
        ${videoDescriptionPreview(repo, v, { mentionsLoaded: Boolean(state.loadedDataKeys?.has("sourceMentions")) })}
        ${articleRefList(repo, v.source_article_ids)}
        ${linkedEntities(v)}
        ${details([
          ["video_id", `<code>${escapeHtml(v.video_id)}</code>`],
          ["URL", externalLink(v.url, v.url)],
          ["原題", escapeHtml(v.original_title ?? "")],
          ["platform", escapeHtml(v.platform ?? "")],
          ["platform_video_id", escapeHtml(v.platform_video_id ?? "")],
          ["公式状態", escapeHtml(v.official_status ?? "")],
          ["動画種別", escapeHtml(labels.videoType(v.video_type))],
          ["紐づけ状態", escapeHtml(labels.linkStatus(v.link_status))],
          ["再生数 / 高評価", escapeHtml(joinPresent([v.archive_metadata?.view_count, v.archive_metadata?.like_count]))],
          ["重複候補", escapeHtml(v.duplicate_group_id ?? "")],
          ["重複メモ", escapeHtml(v.duplicate_note ?? "")],
          ["メモ", escapeHtml(v.notes ?? "")],
        ])}
      `,
    };
  },
};
