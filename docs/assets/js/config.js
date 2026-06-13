/** @typedef {import("./core/app-state.js").AppState} AppState */

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

export const ADMIN_TABS = [
  ["sources", "出典本文"],
  ["mentions", "出典言及"],
  ["numbersFighters", "名鑑選手"],
  ["numbersNameMatches", "名前対応"],
  ["numbersFightRecords", "名鑑記録"],
  ["officialPlayers", "公式選手"],
  ["officialMisc", "公式"],
];

export const TABS = [...PUBLIC_TABS, ...ADMIN_TABS];

export const MENTION_TYPE_ORDER = ["event", "matchup", "result", "note_url", "youtube_url"];

export const DEFAULT_TAB = "official";
export const DEFAULT_ADMIN_TAB = "sources";

// 初期タブ (公式) の表示に必要なデータ。初期画面を最速で描画するため、
// PRIMARY より先に Phase 0 で単独ロードする (合計 ~16KB)。
export const INITIAL_TAB_DATA_KEYS = ["officialPages", "officialNews"];

// ストリーミングでインクリメンタルに描画するファイル群 (表示に直結するもの)
// NOTE: aliases / titleReigns は viewer から参照されないため除外している。
// aliases は object 形式で、配列 SAX ストリームに通すと [] に誤パースされる
// (選手の別名は fighters.json の各レコードに焼き込み済み)。titleReigns の系譜は
// titles.json の lineage に焼き込み済み。再度必要になったら DATA_FILES から読める。
export const PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "videoLinks",
  "fighterSnapshots", "articles", "articleLinks",
];

// PRIMARY の後にロードしてエンリッチに使うファイル群
export const ENRICHMENT_DATA_KEYS = [
  "metadata",
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments", "sourceMentions",
  "officialPlayers",
  "officialTournaments",
  "officialMatches",
  "officialHistory",
];
