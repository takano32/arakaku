/**
 * ビューアの静的な設定（データファイル一覧・タブ定義・読み込みフェーズ）。
 * 他の viewer モジュールを import しない葉モジュール。
 *
 * - DATA_FILES のキーは docs/data/*.json と 1:1。新しい JSON を増やしたらここへ追加する
 *   （data/loader.js はこのキー集合しか取得しない）。
 * - PUBLIC_TABS の順序はキーボードショートカット 1〜8 の割り当て順。
 * - 読み込みフェーズのキーはすべて DATA_FILES に存在する文字列であること。
 */
export const DATA_FILES = {
  metadata: "./data/metadata.json",
  articles: "./data/articles.json",
  articleLinks: "./data/article_links.json",
  promotions: "./data/promotions.json",
  events: "./data/events.json",
  bouts: "./data/bouts.json",
  boutParticipants: "./data/bout_participants.json",
  fighters: "./data/fighters.json",
  titles: "./data/titles.json",
  titleReigns: "./data/title_reigns.json",
  videos: "./data/videos.json",
  videoLinks: "./data/video_links.json",
  fighterSnapshots: "./data/fighter_snapshots.json",
  aliases: "./data/aliases.json",
  sourceDocuments: "./data/source_documents.json",
  sourceDocumentBodies: "./data/source_document_bodies.json",
  sourceMentions: "./data/source_mentions.json",
  numbersFighters: "./data/numbers_fighters.json",
  numbersNameMatches: "./data/numbers_name_matches.json",
  numbersFightRecords: "./data/numbers_fight_records.json",
  youtubeArchives: "./data/youtube_archives.json",
  noteArchives: "./data/note_archives.json",
  sourceEventReferences: "./data/source_event_references.json",
  sourceBoutReferences: "./data/source_bout_references.json",
  sourceVideoReferences: "./data/source_video_references.json",
  officialPlayers: "./data/official_players.json",
  officialTournaments: "./data/official_tournaments.json",
  officialMatches: "./data/official_matches.json",
  officialHistory: "./data/official_history.json",
  officialPages: "./data/official_pages.json",
  officialNews: "./data/official_news.json",
};

// 通常ビューのタブ [id, ラベル]。表示順 = キーボード 1〜8。
export const PUBLIC_TABS = [
  ["official", "公式"],
  ["tsushin", "通信"],
  ["bouts", "試合"],
  ["fighters", "選手"],
  ["events", "大会"],
  ["promotions", "団体"],
  ["titles", "王座"],
  ["videos", "動画"],
];

// 管理ビューのタブ [id, ラベル]。
export const ADMIN_TABS = [
  ["sources", "出典本文"],
  ["mentions", "出典言及"],
  ["numbersFighters", "名鑑選手"],
  ["numbersNameMatches", "名前対応"],
  ["numbersFightRecords", "名鑑記録"],
  ["officialPlayers", "公式選手"],
  ["officialMisc", "公式"],
];

export const DEFAULT_TAB = "official";
export const DEFAULT_ADMIN_TAB = "sources";

export const ADMIN_TAB_IDS = new Set(ADMIN_TABS.map(([id]) => id));

// 「出典言及」の種別セレクトの並び順。
export const MENTION_TYPE_ORDER = ["event", "matchup", "result", "note_url", "youtube_url"];

// Phase 0: 初期タブ（公式）のデータ。合計 ~16KB なので最初に単独で取得して即描画する。
export const INITIAL_TAB_DATA_KEYS = ["officialPages", "officialNews"];

// Phase 1: 公開タブの一覧に直結するデータ。並列に取得し、届いたファイルから順に描画へ反映する。
// aliases / metadata は viewer から参照しないため含めない（別名は fighters.json に焼き込み済み）。
export const PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "videoLinks",
  "fighterSnapshots", "articles", "articleLinks",
];

// Phase 2: 補完（名鑑・公式・アーカイブ）に使うデータ。公開タブが実際に参照するものだけ eager にする。
// sourceMentions (~1MB) は管理「出典言及」タブ専用なので TAB_DATA_KEYS で遅延ロードする。
export const ENRICHMENT_DATA_KEYS = [
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments",
  "officialPlayers",
  "officialTournaments",
  "officialMatches",
  "officialHistory",
];

// Phase 2 と同じ並列プールで取得する公開参照（試合・大会・動画の出典候補）。
export const PUBLIC_REFERENCE_DATA_KEYS = [
  "sourceEventReferences",
  "sourceBoutReferences",
  "sourceVideoReferences",
];

// load() が完了したとき loadedDataKeys に揃っていることを保証するキー。
export const CORE_DATA_KEYS = [...INITIAL_TAB_DATA_KEYS, ...PRIMARY_DATA_KEYS, ...ENRICHMENT_DATA_KEYS];

// タブを開いたときだけ取得する重いデータ。
export const TAB_DATA_KEYS = {
  tsushin: ["sourceDocumentBodies"],
  sources: ["sourceDocuments", "sourceDocumentBodies"],
  mentions: ["sourceDocuments", "sourceMentions"],
};

// タブ本体を描く前に揃っている必要があるキー（描画ゲート）。通信タブは本文 (~557KB) を待たず、
// source_documents のプレビューで先に描画し、本文は届き次第差し替える。
export const REQUIRED_TAB_DATA_KEYS = {
  tsushin: ["sourceDocuments"],
  sources: ["sourceDocuments"],
  mentions: ["sourceDocuments", "sourceMentions"],
};
