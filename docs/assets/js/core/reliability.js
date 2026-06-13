/**
 * 役割: 各エンティティの「データ信頼性ティア」を算出し、一覧の並びで低信頼を末尾へ寄せる。
 *   出典 (名鑑 / 公式 / 通信ノート / YouTube 推定 / 未登録) からティアを決める純粋関数群。
 * アーキ上の位置: DataRepository が rich 配列構築の最後に xxxReliability + lowReliabilityLast
 *   を呼んで安定パーティションする。isMinimalFighter は filters.js の forceOther 判定にも使う。
 * 不変条件 / 注意:
 *   - ティアの優先順位 (numbers > official > note > youtube > none) を変えると一覧並びと
 *     provenance 表示の前提が崩れる。AGENTS.md「Human-verified Apple Numbers data takes
 *     absolute precedence」に従い numbers を最上位に保つこと。
 *   - 各 xxxReliability の判定フィールド (numbers_data / official_data / source_article_id(s) /
 *     inferred_from_video_id(s) など) は生成 JSON のスキーマに依存する。skill: arakaku-reliability-layering。
 *
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

// 履歴のためだけの最小登録を示す summary マーカー
const MINIMAL_SUMMARY_MARKER = "最小登録";

/**
 * 名鑑・公式・YouTube・通信いずれの実データも持たない、履歴のための最小登録の選手か。
 * - YouTube 動画データ (inferred_from_video_ids) があれば最小登録ではない (YouTube tier)。
 * - ノート記事への言及 (source_article_ids) は本文データではないため、
 *   「最小登録」マーカーがある場合は最小登録のままとする。
 */
export function isMinimalFighter(f) {
  if (f.numbers_data || f.official_data) return false;
  if (has(f.inferred_from_video_ids)) return false;
  if (has(f.source_article_ids) && !(f.summary || "").includes(MINIMAL_SUMMARY_MARKER)) return false;
  return true;
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
