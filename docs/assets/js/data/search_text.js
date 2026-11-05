/**
 * 各エンティティの検索対象テキスト。repo の読み取りだけに依存し、DOM・状態・キャッシュを持たない。
 * 値の配列で返し、QueryMatcher が filter(Boolean) → 空白連結 → 正規化して部分一致を評価する
 * (null/undefined は自動除外されるので、検索対象に項目を足すときは配列に追記するだけでよい)。
 */

// 出典候補 (source_*_references) 1 件の検索テキスト。試合・大会の検索と出典候補表示で共用する。
export function sourceReferenceSearchText(r) {
  return [r.candidate_id, r.source_id, r.source_type, r.source_ref_id, r.source_title, r.source_url, r.line_numbers, r.mention_types, r.matched_texts, r.content_preview, r.confidence, r.notes].filter(Boolean).join(" ");
}

export function fighterSearchText(repo, fighter) {
  const s = repo.fighterSnapshotsForFighter(fighter.fighter_id);
  return [
    fighter.display_name,
    fighter.aliases?.join(" "),
    fighter.main_division,
    fighter.main_promotion_id,
    repo.promotionName(fighter.main_promotion_id),
    fighter.profile?.height,
    fighter.profile?.age,
    fighter.profile?.gym,
    fighter.summary,
    fighter.source_article_ids?.join(" "),
    fighter.inferred_from_video_ids?.join(" "),
    fighter.inferred_confidence,
    ...s.flatMap(x => [x.snapshot_id, x.event_id, x.source_article_id, x.age, x.height, x.gym, x.record_text, x.main_promotion_id, x.titles_text, x.catchphrase]),
  ];
}

export function boutSearchText(repo, bout) {
  return [
    bout.bout_id, bout.matchup, bout.winner, bout.loser, bout.division, bout.weight_class_id, bout.bout_type, bout.source_article_id, bout.result_status, bout.inferred_from_video_id, bout.inferred_from_video_title, bout.inferred_confidence, bout.notes,
    ...(bout.fighters ?? []).map(f => f.name),
    bout.title?.title_id, bout.title?.title_result, bout.title?.note,
    repo.eventName(bout.event_id), repo.promotionName(bout.promotion_id),
    bout.result?.method_raw, bout.result?.method_normalized,
    ...repo.sourceReferencesForBout(bout).map(sourceReferenceSearchText),
  ];
}

export function eventSearchText(repo, event) {
  return [
    event.name, event.event_id, event.event_type, event.source_article_id,
    event.source_video_ids?.join(" "), event.inferred_from, event.inferred_confidence, event.summary,
    repo.promotionName(event.promotion_id),
    ...repo.sourceReferencesForEvent(event).map(sourceReferenceSearchText),
  ];
}

export function promotionSearchText(repo, promotion) {
  return [
    promotion.name, promotion.name_en, promotion.promotion_id, promotion.category,
    promotion.country_scope, promotion.summary, promotion.source_article_ids?.join(" "),
    ...repo.eventsForPromotion(promotion.promotion_id).map(e => `${e.event_id} ${e.name}`),
    ...repo.titlesForPromotion(promotion.promotion_id).map(t => repo.titleDisplayName(t)),
  ];
}

// 生の video でも rich な video でも受け、アーカイブ未適用なら 1 件だけ補完して検索対象にする
export function videoSearchText(repo, video) {
  const richVideo = video.archive_metadata ? video : repo.getRichVideoInfo(video);
  const { reference, document } = repo.sourceContextForVideo(richVideo);
  return [
    richVideo.title, richVideo.original_title, richVideo.video_id, richVideo.url,
    richVideo.channel_name, richVideo.published_at, richVideo.archive_description,
    richVideo.platform, richVideo.platform_video_id, richVideo.official_status,
    richVideo.video_type, richVideo.link_status, richVideo.notes,
    richVideo.duplicate_group_id, richVideo.duplicate_note, richVideo.source_article_ids?.join(" "),
    reference?.content_preview, reference?.matched_texts, document?.content_preview,
  ];
}

export function titleSearchText(repo, title) {
  return [
    title.title_id, title.division, repo.promotionName(title.promotion_id),
    ...(title.lineage ?? []).flatMap(r => [r.fighter_name, r.reign_label, r.won_at_event_id, r.lost_at_event_id, r.source_article_id, r.source_video_id]),
  ];
}

export function mentionSearchText(repo, mention) {
  const d = repo.sourceDocumentById(mention.source_id);
  return [
    mention.mention_type, mention.entity_type, mention.entity_hint, mention.matched_text,
    mention.context, mention.source_id, mention.source_ref_id, mention.confidence, mention.notes,
    d?.title, d?.url,
  ];
}

export function sourceDocumentSearchText(document) {
  return [
    document.title, document.url, document.source_type, document.source_ref_id,
    document.content_preview, document.content_text, document.notes,
  ];
}
