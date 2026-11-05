// 各タブの build() を DOM なしで確かめるための小さな手書きデータ (tests/js/test_section_*.mjs が使う)。
// 中身は架空の最小例で、実データの網羅は scripts/validate_json.js に任せる。
//
// 本物の DataRepository にこの生データを渡す (enrich・重複選手の統合・名鑑だけの大会と試合の合成は
// 本物の規則のまま動く)。手書きの偽物でリポジトリを真似ると、タブが使う約 45 のメンバーの約束を
// テストの側で二重に持つことになるため。
//
// 中身: 2 団体、3 大会 (1 つは名鑑だけ)、4 試合 (1 つは名鑑だけ)、4 選手 (1 組は統合して 3 人)、
// 2 王座、3 動画、3 文書、4 言及、名鑑・公式の行。
import { FILTER_STATE_KEYS } from "../../../docs/assets/js/data/filters.js";
import { QueryMatcher } from "../../../docs/assets/js/data/query.js";
import { DataRepository } from "../../../docs/assets/js/data/repository.js";

const NOTE_URL = "https://note.com/example/n/target1";

/** 生データ (docs/data/*.json と同じ形)。呼ぶたびに新しいオブジェクトを返す。 */
export function fakeData() {
  return {
    promotions: [
      {
        promotion_id: "target", name: "ターゲット", name_en: "TARGET", category: "major", country_scope: "japan",
        summary: "日本のメジャー団体。", rules: { venue: "リング", rounds: "1R5分3R", elbows: false }, source_article_ids: ["note-target-1"],
      },
      { promotion_id: "emperor", name: "エンペラー", name_en: "EMPEROR", category: "minor", summary: "", rules: {}, source_article_ids: [] },
    ],
    // 昇順 (古い順)
    events: [
      {
        event_id: "emperor-lightweight-gp", name: "エンペラーライト級GP", promotion_id: "emperor", event_number: null,
        event_type: "tournament", published_at: "2024-06-01", summary: "エンペラーのトーナメント。",
      },
      {
        event_id: "target-1", name: "ターゲットNo.1", promotion_id: "target", event_number: 1, event_type: "numbered_event",
        result_published_at: "2025-01-10", source_article_id: "note-target-1", summary: "ターゲットの第 1 回大会。",
      },
    ],
    bouts: [
      {
        bout_id: "emperor-lightweight-gp-01", event_id: "emperor-lightweight-gp", promotion_id: "emperor", bout_order: 1,
        matchup: "アイス・トロン vs コルト・アプロー", division: "ライト級", bout_type: "tournament_bout",
        fighters: [
          { fighter_id: "ice_tron", name: "アイス・トロン", side: "red", result: "win" },
          { fighter_id: "colt_apro", name: "コルト・アプロー", side: "blue", result: "loss" },
        ],
        winner_id: "ice_tron", winner: "アイス・トロン", loser_id: "colt_apro", loser: "コルト・アプロー",
        result_status: "known", result: { round: 2, time: "", method_raw: "判定", method_normalized: "decision" },
        title: { is_title_bout: false, title_id: "" },
      },
      {
        bout_id: "target-1-01", event_id: "target-1", promotion_id: "target", bout_order: 1,
        matchup: "かべい vs コルト・アプロー", division: "ライト級", bout_type: "one_match",
        fighters: [
          { fighter_id: "kabei", name: "かべい", side: "red", result: "win" },
          { fighter_id: "colt_apro", name: "コルト・アプロー", side: "blue", result: "loss" },
        ],
        winner_id: "kabei", winner: "かべい", loser_id: "colt_apro", loser: "コルト・アプロー",
        result_status: "known", result: { round: 1, time: "1:00", method_raw: "KO", method_normalized: "ko", technique: "パンチ" },
        title: { is_title_bout: false, title_id: "" },
      },
      {
        bout_id: "target-1-02", event_id: "target-1", promotion_id: "target", bout_order: 2,
        matchup: "かべい vs アイス・トロン", division: "ライト級", bout_type: "title_match",
        fighters: [
          { fighter_id: "kabei", name: "かべい", side: "red", result: "unknown" },
          { fighter_id: "ice_tron", name: "アイス・トロン", side: "blue", result: "unknown" },
        ],
        winner_id: null, winner: null, loser_id: null, loser: null, result_status: "unknown", result: {},
        title: { is_title_bout: true, title_id: "target-lightweight", note: "王座決定戦" },
      },
    ],
    fighters: [
      {
        fighter_id: "kabei", display_name: "かべい", aliases: ["かべい"], main_division: "ライト級", main_promotion_id: "target",
        profile: { gym: "かべいジム", height: "175cm" }, summary: "ターゲットの選手。", source_article_ids: ["note-target-1"],
        inferred_from_video_ids: ["youtube_a"],
      },
      {
        fighter_id: "ice_tron", display_name: "アイス・トロン", aliases: [], main_division: "ライト級", main_promotion_id: "emperor",
        profile: {}, summary: "エンペラーの選手。", source_article_ids: ["note-emperor"], inferred_from_video_ids: ["youtube_b"],
      },
      // 中黒の有無だけが違う重複。ice_tron に統合される
      {
        fighter_id: "ice_tron_2", display_name: "アイストロン", aliases: [], main_division: "ライト級", main_promotion_id: "emperor",
        profile: { nationality: "外国" }, summary: "", source_article_ids: [], inferred_from_video_ids: [],
      },
      {
        fighter_id: "colt_apro", display_name: "コルト・アプロー", aliases: [], main_division: "ライト級", main_promotion_id: "emperor",
        profile: {}, summary: "", source_article_ids: [], inferred_from_video_ids: [],
      },
    ],
    titles: [
      {
        title_id: "target-lightweight", promotion_id: "target", division: "ライト級",
        lineage: [{ reign_id: "target-lightweight-1", order: 1, fighter_id: "kabei", fighter_name: "かべい", reign_label: "初代", won_at_event_id: "target-1", source_article_id: "note-target-1" }],
      },
      {
        title_id: "emperor-lightweight-tournament", promotion_id: "emperor", division: "ライト級",
        lineage: [{ reign_id: "emperor-lightweight-tournament-1", order: 1, fighter_id: "ice_tron", fighter_name: "アイス・トロン", reign_label: "第1回", source_video_id: "youtube_b" }],
      },
    ],
    videos: [
      {
        video_id: "youtube_a", platform: "youtube", platform_video_id: "AAA", url: "https://www.youtube.com/watch?v=AAA",
        title: "ターゲットNo.1 かべい vs コルト・アプロー", channel_name: "アラカク通信", published_at: "20250111",
        official_status: "official", video_type: "full_fight", link_status: "linked", source_article_ids: ["note-target-1"],
      },
      {
        video_id: "youtube_b", platform: "youtube", platform_video_id: "BBB", url: "https://www.youtube.com/watch?v=BBB",
        title: "エンペラーライト級GP ダイジェスト", channel_name: "アラカク通信", published_at: "20240602",
        official_status: "official", video_type: "highlight", link_status: "linked", source_article_ids: [],
      },
      {
        video_id: "youtube_c", platform: "youtube", platform_video_id: "CCC", url: "https://www.youtube.com/watch?v=CCC",
        title: "ターゲット紹介", channel_name: "アラカク通信", published_at: "20230101",
        official_status: "unofficial", video_type: "reference", link_status: "unlinked", source_article_ids: [],
      },
    ],
    videoLinks: [
      { video_id: "youtube_a", entity_type: "bout", entity_id: "target-1-01", relation_type: "full_fight" },
      { video_id: "youtube_a", entity_type: "fighter", entity_id: "kabei", relation_type: "full_fight" },
      { video_id: "youtube_b", entity_type: "event", entity_id: "emperor-lightweight-gp", relation_type: "highlight", start_time: "0:00", end_time: "5:00" },
      { video_id: "youtube_c", entity_type: "promotion", entity_id: "target", relation_type: "reference" },
    ],
    youtubeArchives: [
      { display_id: "AAA", webpage_url: "https://www.youtube.com/watch?v=AAA", fulltitle: "ターゲットNo.1 かべい vs コルト・アプロー", duration_string: "10:00", view_count: "100", like_count: "5", description: "かべいの KO 勝ち" },
    ],
    articles: [
      { article_id: "note-target-1", title: "ターゲットNo.1 結果", url: NOTE_URL, source_type: "official_note", article_type: "event_result", promotion_id: "target", published_at: "2025-01-10" },
      { article_id: "note-emperor", title: "エンペラー", url: "https://note.com/example/n/emperor", source_type: "official_note", article_type: "promotion_profile", promotion_id: "emperor", published_at: "2024-01-01" },
    ],
    articleLinks: [
      { link_id: "l1", article_id: "note-target-1", entity_type: "bout", entity_id: "target-1-01", relation_type: "source" },
      { link_id: "l2", article_id: "note-target-1", entity_type: "event", entity_id: "target-1", relation_type: "source" },
    ],
    noteArchives: [
      { webpage_url: NOTE_URL, title: "ターゲットNo.1 結果｜アラカク通信のーと", description: "アーカイブの説明", published_at: "2025-01-10" },
    ],
    fighterSnapshots: [
      { snapshot_id: "kabei-target-1", fighter_id: "kabei", event_id: "target-1", source_article_id: "note-target-1", age: "30", height: "175cm", gym: "かべいジム", record_text: "5勝1敗" },
    ],
    sourceDocuments: [
      {
        source_id: "note:note-target-1", source_type: "note_article", source_ref_id: "note-target-1", title: "ターゲットNo.1 結果",
        url: NOTE_URL, published_at: "2025-01-10", content_hash: "abc", content_preview: "かべいが KO で勝利",
      },
      {
        source_id: "note:note-emperor", source_type: "note_article", source_ref_id: "note-emperor", title: "エンペラー",
        url: "https://note.com/example/n/emperor", published_at: "", content_preview: "2024年1月1日 10:00\nエンペラーの紹介",
      },
      {
        source_id: "youtube_description:youtube_a", source_type: "youtube_description", source_ref_id: "youtube_a",
        title: "ターゲットNo.1 かべい vs コルト・アプロー", url: "https://www.youtube.com/watch?v=AAA", published_at: "2025-01-11",
        content_preview: "かべいの KO 勝ち",
      },
    ],
    sourceDocumentBodies: [
      { source_id: "note:note-target-1", content_text: "ターゲットNo.1 結果\n2025年1月10日 12:00\nターゲットNo.1 結果\n\nかべいが 1R KO で勝利。\nいいなと思ったら応援しよう！\nフッタ" },
    ],
    // 昇順 (古い順)
    sourceMentions: [
      { mention_id: "m1", source_id: "note:note-target-1", source_type: "note_article", source_ref_id: "note-target-1", line_number: "3", mention_type: "event", entity_type: "event", entity_hint: "ターゲットNo.1", matched_text: "ターゲットNo.1", context: "ターゲットNo.1 結果", confidence: "high" },
      { mention_id: "m2", source_id: "note:note-target-1", source_type: "note_article", source_ref_id: "note-target-1", line_number: "4", mention_type: "match_result", entity_type: "bout", entity_hint: "", matched_text: "かべいが 1R KO で勝利", context: "かべいが 1R KO で勝利。", confidence: "medium" },
      { mention_id: "m3", source_id: "note:note-emperor", source_type: "note_article", source_ref_id: "note-emperor", line_number: "2", mention_type: "matchup", entity_type: "bout", entity_hint: "アイス・トロン vs コルト・アプロー", matched_text: "アイス・トロン vs コルト・アプロー", context: "", confidence: "low" },
      { mention_id: "m4", source_id: "youtube_description:youtube_a", source_type: "youtube_description", source_ref_id: "youtube_a", line_number: "1", mention_type: "note_url", entity_type: "article", entity_hint: "", matched_text: NOTE_URL, context: NOTE_URL, confidence: "high" },
    ],
    sourceEventReferences: [
      { candidate_id: "er1", event_id: "target-1", source_id: "note:note-target-1", source_type: "note_article", source_ref_id: "note-target-1", source_title: "ターゲットNo.1 結果", source_url: NOTE_URL, mention_types: "event:1", matched_texts: "ターゲットNo.1", confidence: "high" },
    ],
    sourceBoutReferences: [
      { candidate_id: "br1", bout_id: "target-1-01", event_id: "target-1", source_id: "note:note-target-1", source_type: "note_article", source_ref_id: "note-target-1", source_title: "ターゲットNo.1 結果", source_url: NOTE_URL, mention_types: "match_result:1", matched_texts: "かべいが 1R KO で勝利", confidence: "medium" },
    ],
    sourceVideoReferences: [
      { candidate_id: "vr1", video_id: "youtube_a", source_id: "youtube_description:youtube_a", source_type: "youtube_description", source_ref_id: "youtube_a", source_title: "ターゲットNo.1 かべい vs コルト・アプロー", source_url: "https://www.youtube.com/watch?v=AAA", mention_types: "note_url:1", matched_texts: NOTE_URL, content_preview: "かべいの KO 勝ち" },
    ],
    numbersFighters: [
      {
        numbers_fighter_id: "nf_001", source_sheet: "全体", source_row: 3, display_name: "かべい", main_division: "ライト級", main_promotion_raw: "ターゲット",
        main_promotion_id: "target", profile: { gym: "かべいジム", age: "30" }, stats: { fight_count: 6, wins: 5, losses: 1, win_rate: "0.833" },
        achievements: { white_glove_count: 2, tournament_win_marker: null, tournament_entry_raw: "第1回", belt_marker: "🏆" }, catchphrase: "KO の申し子", notes: "", source_confidence: "numbers",
      },
      {
        numbers_fighter_id: "nf_002", source_sheet: "全体", source_row: 4, display_name: "コルト・アプロー", main_division: "ライト級", main_promotion_raw: "エンペラー",
        main_promotion_id: "emperor", profile: {}, stats: { fight_count: 3, wins: 1, losses: 2, win_rate: "0.333" }, achievements: {}, catchphrase: null, notes: "", source_confidence: "numbers",
      },
    ],
    numbersNameMatches: [
      { numbers_fighter_id: "nf_001", numbers_name: "かべい", matched_fighter_id: "kabei", matched_display_name: "かべい", candidate_fighter_id: "kabei", match_method: "exact_display_name", match_confidence: "high", notes: "" },
      { numbers_fighter_id: "nf_002", numbers_name: "コルト・アプロー", matched_fighter_id: "colt_apro", matched_display_name: "コルト・アプロー", candidate_fighter_id: "colt_apro", match_method: "exact_display_name", match_confidence: "high", notes: "" },
    ],
    // ターゲットの興行番号 2 は events に無いので、名鑑だけの大会と試合になる (両側の 2 行で 1 試合)
    numbersFightRecords: [
      {
        record_id: "nr_001", source_sheet: "個人成績", source_row: "2", numbers_fighter_id: "nf_001", fighter_name: "かべい", matched_fighter_id: "kabei", candidate_fighter_id: "kabei",
        division: "ライト級", promotion_raw: "ターゲット", promotion_id: "target", event_number_raw: "2.0", event_number_normalized: "2", bout_format: "ワンマッチ",
        opponent_name: "コルト・アプロー", opponent_numbers_fighter_id: "nf_002", opponent_matched_fighter_id: "colt_apro", opponent_candidate_fighter_id: "colt_apro",
        result_mark: "○", result: "win", detail_raw: "1R KO",
      },
      {
        record_id: "nr_002", source_sheet: "個人成績", source_row: "3", numbers_fighter_id: "nf_002", fighter_name: "コルト・アプロー", matched_fighter_id: "colt_apro", candidate_fighter_id: "colt_apro",
        division: "ライト級", promotion_raw: "ターゲット", promotion_id: "target", event_number_raw: "2.0", event_number_normalized: "2", bout_format: "ワンマッチ",
        opponent_name: "かべい", opponent_numbers_fighter_id: "nf_001", opponent_matched_fighter_id: "kabei", opponent_candidate_fighter_id: "kabei",
        result_mark: "●", result: "loss", detail_raw: "1R KO",
      },
    ],
    officialPlayers: [
      { id: "aisu-toron", name: "アイス・トロン", name_kana: "あいす・とろん", nickname: "ミスターエンペラー", organization: "エンペラー", weight_class: "ライト級", age: 49, height: 173, wins: 45, losses: 14, draws: 0, nationality: "外国", gym: "パーフェクトジム", bio: "エンペラーの王者" },
      { id: "kabei", name: "かべい", name_kana: "かべい", organization: "ターゲット", weight_class: "ライト級", wins: 5, losses: 1, draws: 0 },
    ],
    officialTournaments: [
      { id: "emperor-light", name: "エンペラー ライト級GP", date: "2024-06-01", video_id: "BBB", champion: "アイス・トロン", runner_up: "コルト・アプロー" },
    ],
    officialMatches: [
      { id: "match-001", event: "アラカク グランプリ Vol.1", date: "1995-07-15", fighter1: "荒木好之", fighter2: "デーモンキング", result: "荒木好之 判定勝利", method: "判定（3-0）", round: "5R", weight_class: "ヘビー級", notes: "最初の試合" },
    ],
    officialHistory: [
      { year: 1995, era: "創世期", month: "春", title: "アラカク誕生", description: "アラカクの世界が誕生。" },
    ],
    officialPages: [
      { slug: "about", title: "アラカクとは", description: "アラカクの世界観", body_html: '<p><img src="/logos/logo.png"><a href="/history">沿革</a></p>' },
    ],
    officialNews: [
      { slug: "old-news", title: "古いお知らせ", date: "2026-01-01", category: "お知らせ", summary: "古い", body_md: "古い本文" },
      { slug: "new-news", title: "ライブ情報", date: "2026-05-29", category: "ライブ情報", summary: "新しい", body_md: "## 告知\n\n新しい本文" },
    ],
  };
}

/** 本物の DataRepository に fakeData() を渡したもの。 */
export function fakeRepo(data = fakeData()) {
  return new DataRepository(data);
}

/** タブが読む UI 状態。絞り込みはすべて未選択、データはすべて読み込み済み。 */
export function fakeState(overrides = {}) {
  const state = {
    tab: "official",
    query: "",
    mentionType: "",
    focusFighterId: "",
    focusEventId: "",
    focusBoutId: "",
    loadedDataKeys: new Set(Object.keys(fakeData())),
  };
  for (const key of FILTER_STATE_KEYS) state[key] = "";
  return Object.assign(state, overrides);
}

/** build(ctx) に渡す ctx ({ state, repo, query })。query は本物の QueryMatcher。 */
export function sectionCtx(stateOverrides = {}, repo = fakeRepo()) {
  const state = fakeState(stateOverrides);
  return { state, repo, query: new QueryMatcher(state, () => repo) };
}

/** descriptor の items のキー列。 */
export function keysOf(desc) {
  return desc.items.map((item) => desc.keyOf(item));
}
