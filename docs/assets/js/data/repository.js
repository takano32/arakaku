import { DataEnricher, normalizeFighterName } from "./enricher.js";
import {
  boutReliability,
  eventReliability,
  fighterReliability,
  lowReliabilityLast,
  videoReliability,
} from "./reliability.js";

/**
 * DataRepository — ビューアのデータアクセス中枢。生 JSON (state.data) への素のアクセサの上に
 * 「Rich 変換 (enrich) + 信頼性ソート + 関係解決 + 重複選手統合」を載せた読み取り専用ファサード。
 *
 * - data/loader.js が state.data を共有しつつ 1 インスタンスを生成し、ロードのたびに invalidate() を呼ぶ。
 * - rich* ゲッターは遅延構築 + キャッシュ。data 差し替え後は必ず invalidate() を通すこと
 *   (キャッシュ・indexes・enricher を一括破棄し revision を進める)。
 * - 一覧系ゲッターは CSV 昇順 (古い順) を .reverse() で降順 (新しい順) にして返す。
 *   さらに lowReliabilityLast で低信頼を末尾へ寄せる。
 * - findRichFighter / 関連解決は #mergeDuplicateFighters が作る merged_fighter_ids と
 *   #fighterAliasIndex に依存する。
 */

// findById が使う「コレクション名 → 主キー列名」対応表。
const COLLECTION_FIELDS = {
  events: "event_id",
  promotions: "promotion_id",
  bouts: "bout_id",
  fighters: "fighter_id",
  articles: "article_id",
  videos: "video_id",
  sourceDocuments: "source_id",
  numbersFighters: "numbers_fighter_id",
};

// invalidate() のたびに進む世代番号。インスタンスを作り直しても重複しないようモジュールレベルで
// 単調増加させる。外部キャッシュ (query / 一覧) は repo の同一性ではなく revision の変化で更新を検知する。
let nextRevision = 1;

export class DataRepository {
  constructor(data) {
    this.data = data;
    this.indexes = new Map();
    this.enricher = new DataEnricher(this);
    this.revision = nextRevision++;
    this.#memo = new Map();
    this.#resetCaches();
  }

  #richEvents;
  #richPromotions;
  #richFighters;
  #fighterAliasIndex;
  #richBouts;
  #richVideos;
  #richArticles;
  #richTitles;
  #sourceDocuments;
  #richSourceMentions;
  #sourceDocLookup;
  #numbersOnly;
  #memo;

  #resetCaches() {
    this.#richEvents = null;
    this.#richPromotions = null;
    this.#richFighters = null;
    this.#fighterAliasIndex = null;
    this.#richBouts = null;
    this.#richVideos = null;
    this.#richArticles = null;
    this.#richTitles = null;
    this.#sourceDocuments = null;
    this.#richSourceMentions = null;
    this.#sourceDocLookup = null;
    this.#numbersOnly = null;
  }

  /**
   * this.data の中身が更新された後に全キャッシュを破棄する。data オブジェクトの同一性は
   * 維持されるため、Repository を作り直さずに Rich 変換・インデックス・enricher のキャッシュだけを無効化できる。
   */
  invalidate() {
    this.revision = nextRevision++;
    this.#resetCaches();
    this.#memo.clear();
    this.indexes.clear();
    this.enricher.reset();
  }

  // ── 低レベル: 素のコレクションとインデックス ─────────────────────────

  // 1キー1レコードの Map を遅延構築してキャッシュ。同名キーは後勝ち (set で上書き)。
  index(name, records, keyForRecord) {
    if (this.indexes.has(name)) return this.indexes.get(name);
    const index = new Map();
    if (records) {
      for (const record of records) {
        const key = keyForRecord(record);
        if (key) index.set(key, record);
      }
    }
    this.indexes.set(name, index);
    return index;
  }

  // findById / findManyByField はコレクションのゲッター (this[collectionName]) を引く。
  // events / sourceMentions は降順、sourceDocuments は本文結合済みの配列が対象になる
  // (sourceDocumentById が content_text 付きの文書を返す契約)。
  findById(collectionName, id) {
    const idField = COLLECTION_FIELDS[collectionName];
    const records = this[collectionName];
    if (!records) return undefined;
    return this.index(`${collectionName}:${idField}`, records, (record) => record[idField]).get(id);
  }

  // index と同様だが 1キー → レコード配列 (1対多) を構築する遅延キャッシュ。
  groupIndex(name, records, keyForRecord) {
    if (this.indexes.has(name)) return this.indexes.get(name);
    const index = new Map();
    if (records) {
      for (const record of records) {
        const key = keyForRecord(record);
        if (!key) continue;
        const group = index.get(key) ?? [];
        group.push(record);
        index.set(key, group);
      }
    }
    this.indexes.set(name, index);
    return index;
  }

  findManyByField(collectionName, fieldName, value) {
    const records = this[collectionName] ?? [];
    return this.groupIndex(`${collectionName}:${fieldName}:many`, records, (r) => r[fieldName]).get(value) ?? [];
  }

  /** 生 JSON の配列をそのまま (整形・enrich せず) 返す */
  raw(key) { return this.data[key] ?? []; }

  get promotions() { return this.raw("promotions"); }
  get fighters() { return this.raw("fighters"); }
  get bouts() { return this.raw("bouts"); }
  get videos() { return this.raw("videos"); }
  get articles() { return this.raw("articles"); }
  get sourceDocumentBodies() { return this.raw("sourceDocumentBodies"); }
  get articleLinks() { return this.raw("articleLinks"); }
  get boutParticipants() { return this.raw("boutParticipants"); }
  get titles() { return this.raw("titles"); }
  get titleReigns() { return this.raw("titleReigns"); }
  get videoLinks() { return this.raw("videoLinks"); }
  get fighterSnapshots() { return this.raw("fighterSnapshots"); }
  get numbersFighters() { return this.raw("numbersFighters"); }
  get numbersNameMatches() { return this.raw("numbersNameMatches"); }
  get numbersFightRecords() { return this.raw("numbersFightRecords"); }
  get sourceEventReferences() { return this.raw("sourceEventReferences"); }
  get sourceBoutReferences() { return this.raw("sourceBoutReferences"); }
  get sourceVideoReferences() { return this.raw("sourceVideoReferences"); }
  get youtubeArchives() { return this.raw("youtubeArchives"); }
  get noteArchives() { return this.raw("noteArchives"); }
  get officialPlayers() { return this.raw("officialPlayers"); }
  get officialTournaments() { return this.raw("officialTournaments"); }
  get officialMatches() { return this.raw("officialMatches"); }
  get officialHistory() { return this.raw("officialHistory"); }
  get officialPages() { return this.raw("officialPages"); }
  get officialNews() { return this.raw("officialNews"); }

  // CSV は昇順 (古い順)。ビューアは降順表示なので .reverse() で新しい順にする。
  get events() { return [...this.raw("events")].reverse(); }
  get sourceMentions() { return [...this.raw("sourceMentions")].reverse(); }

  findPromotion(id) { return this.findById("promotions", id); }
  findFighter(id) { return this.findById("fighters", id); }
  findArticle(id) { return this.findById("articles", id); }
  videoById(id) { return this.findById("videos", id); }
  sourceDocumentById(id) { return this.findById("sourceDocuments", id); }
  numbersFighterById(id) { return this.findById("numbersFighters", id); }
  // 名鑑のみの大会・試合も ID で引けるようにする (enrichBout の大会解決やリンクが使う)
  findEvent(id) { return this.findById("events", id) ?? this.#numbersOnlyData().eventById.get(id); }
  findBout(id) { return this.findById("bouts", id) ?? this.#numbersOnlyData().boutById.get(id); }

  findYoutubeArchive(displayId) { return this.index("youtubeArchives:display_id", this.youtubeArchives, (r) => r.display_id).get(displayId); }
  findNoteArchive(url) { return this.index("noteArchives:webpage_url", this.noteArchives, (r) => r.webpage_url).get(url); }

  // ── Rich コレクション ───────────────────────────────────────────────

  get richEvents() {
    if (this.#richEvents) return this.#richEvents;
    // 名鑑のみの大会は開催日が分からないので、昇順リストの先頭に置いて reverse で同じ信頼度の末尾に回す
    const enriched = [...this.numbersOnlyEvents, ...this.raw("events")].map(e => this.enricher.enrichEvent(e)).reverse();
    this.#richEvents = lowReliabilityLast(enriched, eventReliability);
    return this.#richEvents;
  }

  get richPromotions() {
    if (this.#richPromotions) return this.#richPromotions;
    this.#richPromotions = this.promotions.slice();
    return this.#richPromotions;
  }

  get richFighters() {
    if (this.#richFighters) return this.#richFighters;

    const canonical = this.fighters;
    const discovered = this.#discoverFighters(canonical);
    const numbersOrder = this.#computeNumbersOrder();

    const raw = [...canonical, ...discovered];
    const originalIndex = new Map(raw.map((f, idx) => [f.fighter_id, idx]));
    raw.sort((a, b) => {
      const ai = numbersOrder.has(a.fighter_id) ? numbersOrder.get(a.fighter_id) : Infinity;
      const bi = numbersOrder.has(b.fighter_id) ? numbersOrder.get(b.fighter_id) : Infinity;
      if (ai === Infinity && bi === Infinity) {
        return originalIndex.get(a.fighter_id) - originalIndex.get(b.fighter_id);
      }
      if (ai === Infinity) return 1;
      if (bi === Infinity) return -1;
      return ai - bi;
    });
    const enriched = raw.map(f => this.enricher.enrichFighter(f));
    const merged = this.#mergeDuplicateFighters(enriched, new Set(canonical.map(f => f.fighter_id)));
    this.#richFighters = lowReliabilityLast(merged, fighterReliability);
    return this.#richFighters;
  }

  // canonical fighters.csv に存在しない選手を Numbers 突合・公式サイト選手一覧から発掘する。
  // 発掘した合成行は fighter_id/display_name のみ持ち、enrichFighter が肉付けする。
  #discoverFighters(canonical) {
    const fighterIds = new Set(canonical.map(f => f.fighter_id));
    const discovered = [];

    // Numbers の対応表にだけ現れる選手
    for (const match of this.numbersNameMatches) {
      const fid = match.matched_fighter_id || match.candidate_fighter_id;
      if (fid && !fighterIds.has(fid)) {
        discovered.push({ fighter_id: fid, display_name: match.numbers_name || fid });
        fighterIds.add(fid);
      }
    }

    // 公式サイトにだけいる選手。enrichFighter は display_name で公式データを突き合わせるため、
    // 合成行の display_name を公式名にしておけば official_data が付与される。
    const knownNames = new Set([...canonical, ...discovered].map(f => normalizeFighterName(f.display_name)));
    for (const op of this.officialPlayers) {
      if (!op.name || knownNames.has(normalizeFighterName(op.name))) continue;
      const fid = fighterIds.has(op.id) ? `official_${op.id}` : op.id;
      if (fighterIds.has(fid)) continue;
      discovered.push({ fighter_id: fid, display_name: op.name });
      fighterIds.add(fid);
      knownNames.add(normalizeFighterName(op.name));
    }

    return discovered;
  }

  // Numbers 名鑑掲載順 (numbers_fighter_id の並び) を fighter_id → rank の Map にする。
  #computeNumbersOrder() {
    const matchByNumbersId = new Map();
    for (const m of this.numbersNameMatches) {
      if (m.numbers_fighter_id && !matchByNumbersId.has(m.numbers_fighter_id)) {
        matchByNumbersId.set(m.numbers_fighter_id, m);
      }
    }
    const numbersOrder = new Map();
    for (const nf of this.numbersFighters) {
      const match = matchByNumbersId.get(nf.numbers_fighter_id);
      const fid = match?.matched_fighter_id || match?.candidate_fighter_id;
      if (fid && !numbersOrder.has(fid)) numbersOrder.set(fid, numbersOrder.size);
    }
    return numbersOrder;
  }

  /**
   * 表記ゆれだけが異なる重複選手 (例: 「ビル・ジャガー」と「ビルジャガー」) を 1 人に統合する。
   * 関連グラフ (試合/動画/記事) を保持する canonical 行を survivor とし、
   * 他行の numbers/official データ・動画/記事 ID・別名を吸収する。統合された fighter_id は
   * `merged_fighter_ids` と `#fighterAliasIndex` で survivor に解決できるようにする。
   * 団体が矛盾する組は誤統合を避けて統合しない。
   */
  #mergeDuplicateFighters(fighters, canonicalIds) {
    const groups = new Map();
    for (const f of fighters) {
      const key = normalizeFighterName(f.display_name);
      (groups.get(key) ?? groups.set(key, []).get(key)).push(f);
    }

    this.#fighterAliasIndex = new Map();
    const survivors = [];
    for (const group of groups.values()) {
      const promotions = new Set(group.map(f => f.main_promotion_id).filter(Boolean));
      // 1 人だけ、または団体が矛盾する組は統合しない
      if (group.length === 1 || promotions.size > 1) {
        for (const f of group) {
          f.merged_fighter_ids = [f.fighter_id];
          this.#fighterAliasIndex.set(f.fighter_id, f);
          survivors.push(f);
        }
        continue;
      }
      survivors.push(this.#mergeFighterGroup(group, canonicalIds));
    }
    return survivors;
  }

  #mergeFighterGroup(group, canonicalIds) {
    const relCount = f => (f.inferred_from_video_ids?.length ?? 0) + (f.source_article_ids?.length ?? 0);
    // survivor: canonical 優先 → 関連が多い → 名鑑あり
    const [primary, ...rest] = [...group].sort((a, b) =>
      (canonicalIds.has(b.fighter_id) - canonicalIds.has(a.fighter_id)) ||
      (relCount(b) - relCount(a)) ||
      ((b.numbers_data ? 1 : 0) - (a.numbers_data ? 1 : 0))
    );

    const survivor = { ...primary, profile: { ...(primary.profile ?? {}) } };
    const union = (a, b) => [...new Set([...(a ?? []), ...(b ?? [])])];
    for (const other of rest) {
      survivor.numbers_data ??= other.numbers_data;
      survivor.official_data ??= other.official_data;
      survivor.summary ||= other.summary;
      survivor.main_division ||= other.main_division;
      survivor.main_promotion_id ||= other.main_promotion_id;
      survivor.inferred_from_video_ids = union(survivor.inferred_from_video_ids, other.inferred_from_video_ids);
      survivor.source_article_ids = union(survivor.source_article_ids, other.source_article_ids);
      survivor.aliases = union(survivor.aliases, [...(other.aliases ?? []), other.display_name]);
      for (const [k, v] of Object.entries(other.profile ?? {})) survivor.profile[k] ??= v;
    }
    survivor.aliases = (survivor.aliases ?? []).filter(a => a && a !== survivor.display_name);
    survivor.merged_fighter_ids = group.map(f => f.fighter_id);

    for (const member of group) this.#fighterAliasIndex.set(member.fighter_id, survivor);
    this.#fighterAliasIndex.set(survivor.fighter_id, survivor);
    return survivor;
  }

  get richBouts() {
    if (this.#richBouts) return this.#richBouts;
    const enriched = [...this.numbersOnlyBouts, ...this.raw("bouts")].map(b => this.enricher.enrichBout(b)).reverse();
    this.#richBouts = lowReliabilityLast(enriched, boutReliability);
    return this.#richBouts;
  }

  get richVideos() {
    if (this.#richVideos) return this.#richVideos;
    const enriched = this.raw("videos").map(v => this.enricher.enrichVideo(v)).reverse();
    this.#richVideos = lowReliabilityLast(enriched, videoReliability);
    return this.#richVideos;
  }

  get richArticles() {
    if (this.#richArticles) return this.#richArticles;
    this.#richArticles = this.raw("articles").map(a => this.enricher.enrichArticle(a)).reverse();
    return this.#richArticles;
  }

  // 出典本文は降順にし、本文 (source_document_bodies) が届いていれば content_text を結合する。
  get sourceDocuments() {
    if (this.#sourceDocuments) return this.#sourceDocuments;
    const docs = [...this.raw("sourceDocuments")].reverse();
    const bodies = this.data.sourceDocumentBodies;
    if (!bodies?.length) {
      this.#sourceDocuments = docs;
      return docs;
    }
    const bodyMap = this.index("sourceDocumentBodies:source_id", bodies, b => b.source_id);
    this.#sourceDocuments = docs.map(d => {
      const body = bodyMap.get(d.source_id);
      return body ? { ...d, content_text: body.content_text } : d;
    });
    return this.#sourceDocuments;
  }

  get richSourceMentions() {
    if (this.#richSourceMentions) return this.#richSourceMentions;
    this.#richSourceMentions = this.raw("sourceMentions").slice().reverse();
    return this.#richSourceMentions;
  }

  get numbersOnlyEvents() { return this.#numbersOnlyData().events; }
  get numbersOnlyBouts() { return this.#numbersOnlyData().bouts; }

  /**
   * Numbers の個人成績にだけある大会と試合 (events.csv に「団体 + 興行番号」が無いもの) を合成する。
   * CSV には足さず、表示用に重ねるだけ。合成行は numbers_only を持つ。
   * events.csv の大会とは「団体 + 興行番号」(numbers_event_number があればそれ) で照合する。
   * 興行番号が数字でない記録で、どの大会とも対応しないものは除く。
   * 個人成績は 1 試合を両選手の側から 2 行持つので、選手の組で 1 試合にまとめる。
   */
  #numbersOnlyData() {
    if (this.#numbersOnly) return this.#numbersOnly;
    const rawEvents = this.raw("events");
    const known = new Set(rawEvents.map(e => `${e.promotion_id}:${e.numbers_event_number || e.event_number}`));
    // 大会名は同じ団体の既存の「…No.N」大会名の番号を差し替えて作る
    const sampleNames = new Map();
    for (const e of rawEvents) {
      if (/No\.\d+$/.test(e.name ?? "") && !sampleNames.has(e.promotion_id)) sampleNames.set(e.promotion_id, e.name);
    }
    const events = new Map();
    const bouts = new Map();
    const flip = { win: "loss", loss: "win" };
    for (const r of this.numbersFightRecords) {
      const num = r.event_number_normalized;
      if (!/^\d+$/.test(num ?? "") || known.has(`${r.promotion_id}:${num}`)) continue;
      const eventId = `numbers-${r.promotion_id}-${num}`;
      if (!events.has(eventId)) {
        const sample = sampleNames.get(r.promotion_id);
        events.set(eventId, {
          event_id: eventId,
          name: sample ? sample.replace(/No\.\d+$/, `No.${num}`) : `${this.promotionName(r.promotion_id)}No.${num}`,
          promotion_id: r.promotion_id,
          event_number: Number(num),
          event_type: "numbered_event",
          summary: "名鑑（Numbers）の個人成績にだけ記録がある大会。動画・note は未確認。",
          numbers_only: true,
        });
      }
      const fighterId = r.matched_fighter_id || r.candidate_fighter_id || null;
      const opponentId = r.opponent_matched_fighter_id || r.opponent_candidate_fighter_id || null;
      const pairKey = `${eventId}:${[fighterId || r.fighter_name, opponentId || r.opponent_name].sort().join("|")}`;
      if (bouts.has(pairKey)) {
        // 相手側の行。両側の勝敗が食い違う (両者勝ち・両者負け) なら、どちらかに決めず不明にする (T.89)。
        const bout = bouts.get(pairKey);
        bout.numbers_records.push(r);
        const own = bout.fighters.find(f => (fighterId && f.fighter_id === fighterId) || f.name === r.fighter_name);
        if (own && r.result && own.result !== "unknown" && own.result !== r.result) {
          for (const f of bout.fighters) f.result = "unknown";
          Object.assign(bout, { winner_id: null, winner: null, loser_id: null, loser: null, result_status: "unknown" });
          bout.notes = "名鑑（Numbers）の個人成績にだけある試合。両側の記録の勝敗が食い違うため不明。";
        }
        continue;
      }
      const fighters = [
        { fighter_id: fighterId, name: r.fighter_name, side: null, corner: null, result: r.result || "unknown" },
        { fighter_id: opponentId, name: r.opponent_name, side: null, corner: null, result: flip[r.result] ?? "unknown" },
      ];
      const winner = fighters.find(f => f.result === "win");
      const loser = fighters.find(f => f.result === "loss");
      bouts.set(pairKey, {
        // ID は 2 人の組から作る (Numbers の記録の並びが変わっても共有リンクがずれない)。試合順は
        // Numbers に無いので持たない (以前は記録の並びを「第N試合」と表示していた。T.90)。
        bout_id: `${eventId}--${[fighterId || r.fighter_name, opponentId || r.opponent_name].sort().join("--")}`,
        event_id: eventId,
        promotion_id: r.promotion_id,
        bout_order: null,
        matchup: `${r.fighter_name} vs ${r.opponent_name}`,
        division: r.division || null,
        bout_type: null,
        fighters,
        winner_id: winner?.fighter_id ?? null,
        winner: winner?.name ?? null,
        loser_id: loser?.fighter_id ?? null,
        loser: loser?.name ?? null,
        result_status: winner ? "numbers_verified" : "unknown",
        result: { method_raw: r.detail_raw || "" },
        numbers_records: [r],
        notes: "名鑑（Numbers）の個人成績にだけある試合。",
        numbers_only: true,
      });
    }
    const byNumber = (a, b) => a.promotion_id.localeCompare(b.promotion_id) || a.event_number - b.event_number;
    const eventList = [...events.values()].sort(byNumber);
    // 大会 (団体・興行番号) → 対戦の名前の順に並べる。記録の並びのままだと試合タブで大会が混ざる (T.90)。
    const eventOrder = new Map(eventList.map((e, i) => [e.event_id, i]));
    const boutList = [...bouts.values()].sort((a, b) =>
      (eventOrder.get(a.event_id) ?? 0) - (eventOrder.get(b.event_id) ?? 0) || a.matchup.localeCompare(b.matchup, "ja"));
    this.#numbersOnly = {
      events: eventList,
      bouts: boutList,
      eventById: new Map(eventList.map(e => [e.event_id, e])),
      boutById: new Map(boutList.map(b => [b.bout_id, b])),
    };
    return this.#numbersOnly;
  }

  // ── Rich finders ──────────────────────────────────────────────────

  findRichEvent(id) { return this.index("richEvents:event_id", this.richEvents, e => e.event_id).get(id); }
  findRichBout(id) { return this.index("richBouts:bout_id", this.richBouts, b => b.bout_id).get(id); }
  findRichFighter(id) {
    if (!id) return undefined;
    void this.richFighters; // alias index を構築させる
    return this.#fighterAliasIndex.get(id);
  }
  findRichArticle(id) { return this.index("richArticles:article_id", this.richArticles, a => a.article_id).get(id); }
  richVideoById(id) { return this.index("richVideos:video_id", this.richVideos, v => v.video_id).get(id); }

  // 単発の enrich (一覧キャッシュを作らずに 1 件だけ補完する)
  getRichVideoInfo(video) { return this.enricher.enrichVideo(video); }
  getRichArticleInfo(article) { return this.enricher.enrichArticle(article); }

  // ── 名前解決 ────────────────────────────────────────────────────────

  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }
  fighterName(id) { return this.findRichFighter(id)?.display_name ?? id; }

  // 団体名 → promotion_id (中黒・空白を無視した正規化照合)
  promotionIdByName(name) {
    if (!name) return undefined;
    const norm = (s) => String(s).replace(/[・·\s]/g, "");
    const index = this.index("promotions:normName", this.promotions, (p) => norm(p.name));
    return index.get(norm(name))?.promotion_id;
  }

  titleDisplayName(title) {
    const p = this.promotionName(title.promotion_id);
    const d = title.division ?? "階級未設定";
    if (title.title_id?.includes("tournament")) return `${p} ${d}トーナメント`;
    if (title.promotion_id === "max_bout") return `${p} ${d}`;
    return `${p} ${d}王座`;
  }

  // ── 出典本文の引き当て ──────────────────────────────────────────────

  /**
   * source_type 別に ref_id / source_id / url → 文書を引くインデックスを構築する。
   * 各 Map は配列順で最初に現れた文書を保持し、各エントリには元配列の添字 (idx) を添えておく。
   * 複数キーがヒットしても「元配列で最初の文書」を選び直せるようにするため
   * (線形 find が OR 条件全体で配列順最初の文書を返すのと同じ結果になる)。
   * キーは === と同じ照合になるよう値そのもの (undefined/"" 含む) で登録する。
   */
  #sourceDocumentLookup() {
    if (this.#sourceDocLookup) return this.#sourceDocLookup;
    const lookup = new Map();
    const tableFor = (sourceType) => {
      let table = lookup.get(sourceType);
      if (!table) {
        table = { refId: new Map(), sourceId: new Map(), url: new Map() };
        lookup.set(sourceType, table);
      }
      return table;
    };
    const remember = (map, key, doc, idx) => {
      if (!map.has(key)) map.set(key, { doc, idx });
    };
    const docs = this.sourceDocuments ?? [];
    docs.forEach((doc, idx) => {
      const table = tableFor(doc.source_type);
      remember(table.refId, doc.source_ref_id, doc, idx);
      remember(table.sourceId, doc.source_id, doc, idx);
      remember(table.url, doc.url, doc, idx);
    });
    this.#sourceDocLookup = lookup;
    return lookup;
  }

  /** 候補エントリ ({doc, idx}) のうち元配列で最初に現れた文書を返す。 */
  #firstSourceDoc(...entries) {
    let best;
    for (const entry of entries) {
      if (entry && (!best || entry.idx < best.idx)) best = entry;
    }
    return best?.doc;
  }

  sourceDocumentForArticle(articleId) {
    const table = this.#sourceDocumentLookup().get("note_article");
    if (!table) return undefined;
    return this.#firstSourceDoc(
      table.refId.get(articleId),
      table.sourceId.get(`note:${articleId}`),
    );
  }

  sourceDocumentForVideo(video) {
    const table = this.#sourceDocumentLookup().get("youtube_description");
    if (!table) return undefined;
    return this.#firstSourceDoc(
      table.refId.get(video.video_id),
      table.sourceId.get(`youtube_description:${video.video_id}`),
      table.url.get(video.url),
    );
  }

  // ── 関係ヘルパ ─────────────────────────────────────────────────────

  videosForEntity(type, id) {
    return (this.groupIndex("videoLinks:entity", this.videoLinks, l => `${l.entity_type}\0${l.entity_id}`).get(`${type}\0${id}`) ?? [])
      .map(l => ({ link: l, video: this.richVideoById(l.video_id) }))
      .filter(i => i.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(this.richBouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
    return new Set(this.videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
  }

  sourceReferencesForBout(bout) { return this.findManyByField("sourceBoutReferences", "bout_id", bout.bout_id); }
  sourceReferencesForEvent(event) { return this.findManyByField("sourceEventReferences", "event_id", event.event_id); }
  sourceReferenceForVideo(video) {
    return this.findManyByField("sourceVideoReferences", "video_id", video.video_id)[0];
  }

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
  }

  // 同じ引数の結果を invalidate() まで使い回す (検索のキー入力ごとの再フィルタ・再ソートを避ける)
  #memoized(key, compute) {
    if (!this.#memo.has(key)) this.#memo.set(key, compute());
    return this.#memo.get(key);
  }

  fighterSnapshotsForFighter(fighterId) {
    return this.#memoized(`fighterSnapshots:${fighterId}`, () => {
      const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
      return this.fighterSnapshots
        .filter(s => ids.has(s.fighter_id))
        .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
    });
  }

  eventsForPromotion(promotionId) {
    return this.#memoized(`eventsForPromotion:${promotionId}`, () =>
      [...this.findManyByField("events", "promotion_id", promotionId), ...this.numbersOnlyEvents.filter(e => e.promotion_id === promotionId)]
        .sort((a, b) => String(b.result_published_at ?? b.published_at ?? "").localeCompare(String(a.result_published_at ?? a.published_at ?? ""), "ja")));
  }

  titlesForPromotion(promotionId) { return this.richTitles.filter(t => t.promotion_id === promotionId); }
  videoLinksForVideo(videoId) { return this.findManyByField("videoLinks", "video_id", videoId); }

  countSourceReferences(sourceId) {
    const count = (name, records) =>
      (this.groupIndex(`${name}:source_id`, records, r => r.source_id).get(sourceId)?.length ?? 0);
    return {
      events: count("sourceEventReferences", this.sourceEventReferences),
      bouts: count("sourceBoutReferences", this.sourceBoutReferences),
      videos: count("sourceVideoReferences", this.sourceVideoReferences),
    };
  }

  countSourceMentions(sourceId, mentionTypes) {
    const counts = Object.fromEntries(mentionTypes.map(t => [t, 0]));
    const mentions = this.groupIndex("sourceMentions:source_id", this.sourceMentions, m => m.source_id).get(sourceId) ?? [];
    for (const m of mentions) {
      if (m.mention_type in counts) counts[m.mention_type]++;
    }
    return counts;
  }

  relatedBoutsForFighter(fighterId) {
    if (!fighterId) return [];
    return this.#memoized(`relatedBouts:${fighterId}`, () => {
      const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
      return this.richBouts.filter(b => (b.fighters ?? []).some(f => ids.has(f.fighter_id)));
    });
  }

  // 大会内の試合は試合順の昇順 (第1試合 → メインイベント) のまま返す
  boutsForEvent(eventId) {
    // 大会の行ごとに呼ばれるので、全試合の走査ではなく event_id の索引から引く (T.85)。
    return [...(this.groupIndex("richBouts:event_id", this.richBouts, b => b.event_id).get(eventId) ?? [])]
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  // ── 王座 ───────────────────────────────────────────────────────────

  get richTitles() {
    if (this.#richTitles) return this.#richTitles;

    // 出典動画 (source_video_id) から獲得大会は導かない。王座の出典動画は防衛戦のこともあり、
    // そうした 4 王座で獲得・喪失の大会が誤っていた (T.89)。獲得大会は title_reigns.csv に明示されたものだけ。
    this.#richTitles = this.titles.map((title) => {
      const lineage = (title.lineage ?? []).map((r) => ({ ...r }));

      // 前進パス: 次代の獲得大会を喪失大会に
      // (返上して空位になった王者は、次の王者が王座決定戦で獲得しても負けていない)
      for (let i = 0; i < lineage.length - 1; i++) {
        if (lineage[i].end_reason === "vacated") continue;
        if (!lineage[i].lost_at_event_id && lineage[i + 1].won_at_event_id) {
          lineage[i].lost_at_event_id = lineage[i + 1].won_at_event_id;
        }
      }
      // 後退パス: 前代の喪失大会を獲得大会に
      for (let i = lineage.length - 1; i > 0; i--) {
        if (!lineage[i].won_at_event_id && lineage[i - 1].lost_at_event_id) {
          lineage[i].won_at_event_id = lineage[i - 1].lost_at_event_id;
        }
      }

      return { ...title, lineage };
    });
    return this.#richTitles;
  }
}
