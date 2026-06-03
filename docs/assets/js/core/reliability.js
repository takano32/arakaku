/**
 * データ信頼性ティア。
 * 名鑑 > 公式 > 通信ノート > YouTube > 未登録 の順で信頼できる。
 * 一覧では各タブの既存ソートを保ったまま、低信頼 (YouTube のみ / 未登録) を末尾へ寄せる。
 */
export const RELIABILITY = {
  numbers: 5, // 選手名鑑 (人間検証済み)
  official: 4, // 団体公式サイト由来
  note: 3, // アラカク通信ノート由来
  youtube: 2, // YouTube 動画タイトル等からの推定
  none: 1, // 未登録
};

// このティア以下を「低信頼」とみなして末尾へ寄せる
const LOW_MAX = RELIABILITY.youtube;

const has = (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "");

export function fighterReliability(f) {
  if (f.numbers_data) return RELIABILITY.numbers;
  if (f.official_data) return RELIABILITY.official;
  if (has(f.source_article_ids)) return RELIABILITY.note;
  if (has(f.inferred_from_video_ids) || f.inferred_confidence === "medium") return RELIABILITY.youtube;
  return RELIABILITY.none;
}

export function boutReliability(b) {
  if (b.result_status === "numbers_verified" || has(b.numbers_records)) return RELIABILITY.numbers;
  if (has(b.source_article_id)) return RELIABILITY.note;
  if (has(b.inferred_from_video_id)) return RELIABILITY.youtube;
  return RELIABILITY.none;
}

export function eventReliability(e) {
  if (e.official_data) return RELIABILITY.official;
  if (has(e.source_article_id)) return RELIABILITY.note;
  if (e.inferred_from === "official_youtube_title" || has(e.source_video_ids)) return RELIABILITY.youtube;
  return RELIABILITY.none;
}

export function videoReliability(v) {
  if (has(v.source_article_ids)) return RELIABILITY.note;
  return RELIABILITY.youtube; // 動画は本質的に YouTube 由来
}

/** 入力順を保ったまま、低信頼の要素だけを末尾へ寄せる安定パーティション */
export function lowReliabilityLast(items, rank) {
  const reliable = [];
  const low = [];
  for (const item of items) {
    (rank(item) > LOW_MAX ? reliable : low).push(item);
  }
  return [...reliable, ...low];
}
