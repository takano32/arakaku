/**
 * 動画・記事にアーカイブのメタデータ (youtube_archives / note_archives) を重ねる規則 (純関数)。
 * アーカイブは表示・検索用で、勝敗や選手の同定は変えない (AGENTS.md)。
 */

/** YouTube アーカイブ (yt-dlp の info JSON) の題名・チャンネル・投稿日を動画に重ねる。 */
export function applyVideoArchive(video, archive) {
  return {
    ...video,
    title: archive?.fulltitle ?? video.title,
    channel_name: archive?.uploader ?? video.channel_name,
    published_at: archive?.upload_date ?? video.published_at,
    archive_description: archive?.description,
    archive_metadata: archive,
  };
}

/**
 * 関連 bout (階級 + 団体) / event (団体) から絞り込み用フィールドを導出する (動画は単一値。
 * 既にある値は保ち、最初に見つかった値を採る)。rich を書き換えて返す。
 */
export function deriveVideoFilterFields(rich, links, { findBout, findEvent }) {
  for (const link of links) {
    if (link.entity_type === "bout") {
      const bout = findBout(link.entity_id);
      if (bout) {
        rich.promotion_id ??= bout.promotion_id;
        rich.division ??= bout.division;
      }
    } else if (link.entity_type === "event") {
      const event = findEvent(link.entity_id);
      if (event) rich.promotion_id ??= event.promotion_id;
    }
  }
  return rich;
}

/** note アーカイブの題名・説明を記事に重ねる。 */
export function applyArticleArchive(article, archive) {
  return {
    ...article,
    title: archive?.title ?? article.title,
    archive_description: archive?.description,
  };
}
