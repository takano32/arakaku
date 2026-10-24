/**
 * データ側のコード値を画面に出す日本語ラベルへ変換する辞書。
 * キー文字列は生成 JSON (docs/data/*.json) のコード値と一致していなければならない。
 * 未知コードは素通しし、null/undefined のときだけ既定にフォールバックする（articleType の既定は空文字）。
 */
const VIDEO_TYPES = {
  full_fight: "Full Fight",
  highlight: "ハイライト",
  short: "Short",
  stream_archive: "配信",
  preview: "煽り",
  interview: "インタビュー",
  commentary: "解説",
  reference: "参考",
};

const LINK_STATUSES = {
  linked: "紐づけ済み",
  partially_linked: "一部紐づけ",
  unlinked: "未紐づけ",
  needs_review: "要確認",
};

const RESULT_STATUSES = {
  known: "確定",
  unknown: "不明",
  numbers_verified: "名鑑確認済み",
  needs_review: "要確認",
};

const SOURCE_TYPES = {
  note_article: "note本文",
  youtube_description: "YouTube概要欄",
};

const MENTION_TYPES = {
  event: "大会",
  matchup: "対戦カード",
  result: "結果",
  note_url: "note URL",
  youtube_url: "YouTube URL",
  match_result: "試合結果",
};

const ARTICLE_TYPES = {
  event_result: "試合結果",
  event_card: "対戦カード",
  promotion_profile: "団体情報",
  note_article: "ノート",
  youtube_description_source: "YouTube概要欄",
};

export const labels = {
  videoType: (v) => VIDEO_TYPES[v] ?? v ?? "動画",
  relationType: (v) => VIDEO_TYPES[v] ?? v ?? "動画",
  linkStatus: (v) => LINK_STATUSES[v] ?? v ?? "未設定",
  resultStatus: (v) => RESULT_STATUSES[v] ?? v ?? "未設定",
  sourceType: (v) => SOURCE_TYPES[v] ?? v ?? "出典",
  mentionType: (v) => MENTION_TYPES[v] ?? v ?? "言及",
  articleType: (v) => ARTICLE_TYPES[v] ?? v ?? "",
};
