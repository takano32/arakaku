import { labels } from "../../data/labels.js";
import { escapeHtml, externalLink, formatDate, joinPresent } from "../html.js";
import { badge, badges, grid, item, section, textFold } from "./basic.js";
import { referenceMentionBadges } from "./sources.js";

/**
 * 動画の HTML 部品 (ファサード・動画ブロック・関連動画・概要欄プレビュー)。文字列だけを返す。
 * YouTube ファサードのクリック (iframe 差し替え) は ui/shell.js の委譲ハンドラが行う。
 */

/**
 * YouTube の埋め込みファサード。クリックするまで iframe を作らず、サムネイル画像だけを置く。
 * サムネイルは archives の thumbnail_sizes から確実に存在するサイズを選ぶ
 * (maxres → sddefault → hqdefault。hqdefault は全動画にある) ので 404 を出さない。
 */
export function videoFacade(v) {
  if (v.platform !== "youtube" || !v.platform_video_id) return "";
  const id = escapeHtml(v.platform_video_id);
  const sizes = (v.thumbnail_sizes || "").split(" ").filter(Boolean);
  const file = sizes.includes("maxres") ? "maxresdefault.jpg" : sizes.includes("standard") ? "sddefault.jpg" : "hqdefault.jpg";
  const title = escapeHtml(v.title || v.video_id || "動画");
  return `<div class="yt" data-yt-id="${id}">
      <img class="yt-thumb" src="https://i.ytimg.com/vi/${id}/${file}" alt="" loading="lazy" decoding="async">
      <button type="button" class="yt-play" aria-label="再生: ${title}"><span class="yt-play-icon" aria-hidden="true"></span></button>
    </div>`;
}

/** 動画ブロック: タイトルリンク + 概要欄の折りたたみ + ファサード */
export function videoBlock(repo, v, label = null) {
  const video = v ? (v.archive_metadata ? v : repo.getRichVideoInfo(v)) : v;
  const displayLabel = label || video?.title || video?.video_id || "動画";
  if (!video?.url) return `<code>${escapeHtml(video?.video_id || displayLabel)}</code>`;
  const d = repo.sourceDocumentForVideo(video);
  const meta = joinPresent([video.channel_name, formatDate(video.published_at)]);
  return `<div class="vblock">
      <p class="vblock-title">${externalLink(video.url, displayLabel)}</p>
      ${meta ? `<p class="muted small">${escapeHtml(meta)}</p>` : ""}
      ${videoFacade(video)}
      ${textFold("概要欄を表示", d?.content_text, { className: "fold-inline" })}
    </div>`;
}

/** エンティティ (bout/event/promotion/fighter) に紐づく動画のセクション */
export function videoLinks(repo, type, id, excludeVideoIds = new Set(), title = "動画") {
  const excluded = excludeVideoIds instanceof Set ? excludeVideoIds : new Set(excludeVideoIds);
  const items = repo.videosForEntity(type, id).filter(({ video }) => !excluded.has(video.video_id));
  if (items.length === 0) return "";
  const cards = items.map(({ link, video }) => item(`
      ${videoBlock(repo, video)}
      ${badges([badge(labels.relationType(link.relation_type || video.video_type))])}
      ${link.notes ? `<p class="muted small">${escapeHtml(link.notes)}</p>` : ""}
    `, "item-video")).join("");
  return section(title, grid(cards), "sec-videos");
}

/** 動画 ID の参照 (インラインリンク、または動画ブロック) */
export function videoRefs(repo, vids, { inline = false } = {}) {
  const ids = (vids ?? []).filter(Boolean);
  if (ids.length === 0) return "未入力";
  return ids.map((id) => {
    const rv = repo.richVideoById(id);
    if (inline) return rv?.url ? externalLink(rv.url, rv.title || id) : `<code>${escapeHtml(id)}</code>`;
    return rv ? videoBlock(repo, rv, rv.title || id) : `<code>${escapeHtml(id)}</code>`;
  }).join(inline ? ", " : "");
}

/**
 * 動画の YouTube 概要欄プレビュー (出典参照 → 本文の順。言及バッジ付き)。
 * mentionsLoaded は source_mentions がロード済みかどうか (管理「出典言及」タブを開いた後だけ真)。
 */
export function videoDescriptionPreview(repo, v, { mentionsLoaded = false } = {}) {
  const { reference: r, document: d } = repo.sourceContextForVideo(v);
  if (!r && !d) return "";
  const preview = r?.content_preview || d?.content_preview || "プレビュー未入力";
  // 言及件数バッジは source_mentions に依存する。出典参照 (r) があればそれを優先し、
  // 無い場合は source_mentions がロード済みのときだけ件数を出す (0 件の誤表示を避ける)。
  let mentionBadges = "";
  if (r) {
    mentionBadges = referenceMentionBadges(r);
  } else if (d && mentionsLoaded) {
    mentionBadges = mentionCountBadges(repo.countSourceMentions(d.source_id, ["note_url", "matchup", "result"]));
  }
  return section("YouTube概要欄", `<p class="pre-line">${escapeHtml(preview)}</p>${badges([mentionBadges])}`, "sec-description");
}

export function mentionCountBadges(counts) {
  return [
    `note URL ${counts.note_url ?? 0}`,
    `対戦カード ${counts.matchup ?? 0}`,
    `結果 ${counts.result ?? 0}`,
  ].map((label) => badge(label)).join("");
}
