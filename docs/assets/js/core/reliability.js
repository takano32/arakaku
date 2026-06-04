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

// 最小登録 (履歴のためだけの登録 / YouTube 抽出で詳細未入力) を示す summary マーカー
const MINIMAL_SUMMARY_MARKERS = ["最小登録", "詳細未入力"];

/**
 * 名鑑・公式で補強されていない最小登録の選手か。
 * ノート記事への言及 (source_article_ids) があっても、プロフィール自体が
 * 最小登録なら最下位扱いとする。
 */
export function isMinimalFighter(f) {
  if (f.numbers_data || f.official_data) return false;
  if (f.inferred_confidence === "medium") return true;
  const summary = f.summary || "";
  return MINIMAL_SUMMARY_MARKERS.some((marker) => summary.includes(marker));
}

export function fighterReliability(f) {
  if (f.numbers_data) return RELIABILITY.numbers;
  if (f.official_data) return RELIABILITY.official;
  if (isMinimalFighter(f)) return RELIABILITY.none; // 最小登録は通信言及より優先して最下位
  if (has(f.source_article_ids)) return RELIABILITY.note;
  if (has(f.inferred_from_video_ids)) return RELIABILITY.youtube;
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
  if (v.official_status === "official") return RELIABILITY.official; // 団体公式チャンネル
  if (has(v.source_article_ids)) return RELIABILITY.note;
  return RELIABILITY.youtube;
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
