/** @typedef {import("./core/app-state.js").AppState} AppState */

export const DATA_FILES = {
  metadata: "./data/metadata.json",
  database: "./data/database.json",
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
  sourceMentions: "./data/source_mentions.json",
  numbersFighters: "./data/numbers_fighters.json",
  numbersNameMatches: "./data/numbers_name_matches.json",
  numbersFightRecords: "./data/numbers_fight_records.json",
  youtubeArchives: "./data/youtube_archives.json",
  noteArchives: "./data/note_archives.json",
  sourceEventReferences: "./data/source_event_references.json",
  sourceBoutReferences: "./data/source_bout_references.json",
  sourceVideoReferences: "./data/source_video_references.json",
};

export const PUBLIC_TABS = [
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
];

export const TABS = [...PUBLIC_TABS, ...ADMIN_TABS];

export const MENTION_TYPE_ORDER = ["event", "matchup", "result", "note_url", "youtube_url"];

export const DEFAULT_TAB = "bouts";
export const DEFAULT_ADMIN_TAB = "sources";

// ストリーミングでインクリメンタルに描画するファイル群 (表示に直結するもの)
export const PRIMARY_DATA_KEYS = [
  "bouts", "boutParticipants", "fighters", "events", "promotions",
  "videos", "titles", "titleReigns", "videoLinks", "aliases",
  "fighterSnapshots", "articles", "articleLinks",
];

// PRIMARY の後にロードしてエンリッチに使うファイル群
export const ENRICHMENT_DATA_KEYS = [
  "metadata",
  "numbersFighters", "numbersNameMatches", "numbersFightRecords",
  "youtubeArchives", "noteArchives",
  "sourceDocuments", "sourceMentions",
];
