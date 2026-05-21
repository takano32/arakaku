var DATA_FILES = {
  metadata: "./data/metadata.json",
  articles: "./data/articles.json",
  promotions: "./data/promotions.json",
  events: "./data/events.json",
  bouts: "./data/bouts.json",
  fighters: "./data/fighters.json",
  titles: "./data/titles.json",
  videos: "./data/videos.json",
  videoLinks: "./data/video_links.json",
  fighterSnapshots: "./data/fighter_snapshots.json",
  aliases: "./data/aliases.json",
  sourceDocuments: "./data/source_documents.json",
  sourceMentions: "./data/source_mentions.json",
  sourceEventReferences: "./data/source_event_references.json",
  sourceBoutReferences: "./data/source_bout_references.json",
  sourceVideoReferences: "./data/source_video_references.json",
};

var TABS = [
  ["bouts", "試合"],
  ["fighters", "選手"],
  ["events", "大会"],
  ["promotions", "団体"],
  ["titles", "王座"],
  ["videos", "動画"],
  ["sources", "出典本文"],
  ["mentions", "出典言及"],
];

var MENTION_TYPE_ORDER = ["event", "matchup", "result", "note_url", "youtube_url"];

var state = {
  tab: "bouts",
  query: "",
  focusFighterId: "",
  focusEventId: "",
  titlePromotion: "",
  titleDivision: "",
  mentionType: "",
  data: null,
};
