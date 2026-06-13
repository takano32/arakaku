import { BaseRepository } from "./base-repository.js";
import { DataEnricher, normalizeFighterName } from "./data-enricher.js";
import {
  boutReliability,
  eventReliability,
  fighterReliability,
  lowReliabilityLast,
  videoReliability,
} from "./reliability.js";

/**
 * DataRepository — ビューワのデータアクセス中枢。BaseRepository の素アクセサの上に
 * 「Rich 変換 (enrich) + 信頼性ソート + 関係解決 + 重複選手統合」を載せた読み取り専用ファサード。
 *
 * アーキ上の位置 / 関係:
 *   data-loader.js が state.data を共有しつつ 1 インスタンスを生成し、ロードのたびに invalidate() を呼ぶ。
 *   DataEnricher (合成) と reliability.js (ティア/ソート) に依存。rich* ゲッターや関連メソッドが返す
 *   「表示用の確定データ」を view-controller / tab-renderers / query-matcher 等が消費する。
 *
 * 不変条件 / 注意:
 *   - rich* ゲッターは全て遅延構築 + #フィールドにキャッシュ。data 差し替え後は必ず invalidate()
 *     を通すこと (キャッシュ・indexes・enricher を一括破棄し revision を進める)。
 *   - 一覧系ゲッターは CSV 昇順 (古い順) を .reverse() で降順 (新しい順) にして返す約束
 *     (arakaku-sorting-strategy)。さらに lowReliabilityLast で低信頼を末尾へ寄せる。
 *   - findRichFighter / 関連解決は #mergeDuplicateFighters が作る merged_fighter_ids と
 *     #fighterAliasIndex に依存。統合後の survivor 1 件に元 fighter_id 群を解決させる契約。
 *   関連スキル: .agents/skills/arakaku-reliability-layering, arakaku-sorting-strategy, arakaku-viewer-ui
 */

// invalidate() のたびに進む世代番号。インスタンスを作り直しても重複しないよう
// モジュールレベルで単調増加させる。外部キャッシュ (tab-registry, query-matcher)
// は repo の同一性ではなく revision の変化でデータ更新を検知する。
let nextRevision = 1;

/** Repository: JSON データへの参照・検索を集約。Rich Data への変換とキャッシュを管理。 */
export class DataRepository extends BaseRepository {
  constructor(data) {
    super(data);
    this.enricher = new DataEnricher(this);
    this.revision = nextRevision++;
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

  /**
   * this.data の中身が更新された後に全キャッシュを破棄する。
   * data オブジェクトの同一性は維持されるため、Repository を作り直さずに
   * Rich 変換・インデックス・enricher のキャッシュだけを無効化できる。
   */
  invalidate() {
    this.revision = nextRevision++;
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
    this.indexes.clear();
    this.enricher.reset();
  }

  // Collection Accessors (Overriding with Rich and Sorted logic)
  // CSV は昇順 (古い順)。ビューワは降順表示なので .reverse() で新しい順にする
  // (rich 系も同じ約束。arakaku-sorting-strategy)。
  get events() { return [...super.events].reverse(); }
  get richEvents() {
    if (this.#richEvents) return this.#richEvents;
    const enriched = super.events.map(e => this.enricher.enrichEvent(e)).reverse();
    this.#richEvents = lowReliabilityLast(enriched, eventReliability);
    return this.#richEvents;
  }

  get promotions() { return super.promotions; }
  get richPromotions() {
    if (this.#richPromotions) return this.#richPromotions;
    this.#richPromotions = super.promotions.map(p => this.enricher.enrichPromotion(p));
    return this.#richPromotions;
  }

  get fighters() { return super.fighters; } // Base fighters list

  get richFighters() {
    if (this.#richFighters) return this.#richFighters;

    const canonical = this.fighters;
    const fighterIds = new Set(canonical.map(f => f.fighter_id));

    // Discover fighters that only exist in Numbers matches
    const discovered = [];
    for (const match of this.numbersNameMatches) {
      const fid = match.matched_fighter_id || match.candidate_fighter_id;
      if (fid && !fighterIds.has(fid)) {
        discovered.push({ fighter_id: fid, display_name: match.numbers_name || fid });
        fighterIds.add(fid);
      }
    }

    // Discover official-site players who have no canonical/Numbers fighter yet.
    // enrichFighter は display_name で公式データを突き合わせるため、合成行の
    // display_name を公式名にしておけば official_data が付与される。
    const knownNames = new Set([...canonical, ...discovered].map(f => normalizeFighterName(f.display_name)));
    for (const op of this.officialPlayers) {
      if (!op.name || knownNames.has(normalizeFighterName(op.name))) continue;
      const fid = fighterIds.has(op.id) ? `official_${op.id}` : op.id;
      if (fighterIds.has(fid)) continue;
      discovered.push({ fighter_id: fid, display_name: op.name });
      fighterIds.add(fid);
      knownNames.add(normalizeFighterName(op.name));
    }

    // Build numbers order: numbers_fighter_id sequence → fighter_id rank
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

  get bouts() { return super.bouts; }
  get richBouts() {
    if (this.#richBouts) return this.#richBouts;
    const enriched = super.bouts.map(b => this.enricher.enrichBout(b)).reverse();
    this.#richBouts = lowReliabilityLast(enriched, boutReliability);
    return this.#richBouts;
  }

  get videos() { return super.videos; }
  get richVideos() {
    if (this.#richVideos) return this.#richVideos;
    const enriched = super.videos.map(v => this.enricher.enrichVideo(v)).reverse();
    this.#richVideos = lowReliabilityLast(enriched, videoReliability);
    return this.#richVideos;
  }

  get articles() { return super.articles; }
  get richArticles() {
    if (this.#richArticles) return this.#richArticles;
    this.#richArticles = super.articles.map(a => this.enricher.enrichArticle(a)).reverse();
    return this.#richArticles;
  }

  get sourceDocuments() {
    if (this.#sourceDocuments) return this.#sourceDocuments;
    const docs = [...super.sourceDocuments].reverse();
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

  get sourceMentions() { return [...super.sourceMentions].reverse(); }
  get richSourceMentions() {
    if (this.#richSourceMentions) return this.#richSourceMentions;
    this.#richSourceMentions = super.sourceMentions.map(m => this.enricher.enrichSourceMention(m)).reverse();
    return this.#richSourceMentions;
  }

  get fighterSnapshots() { return super.fighterSnapshots; }
  get boutParticipants() { return super.boutParticipants; }
  get videoLinks() { return super.videoLinks; }
  get articleLinks() { return super.articleLinks; }
  get sourceEventReferences() { return super.sourceEventReferences; }
  get sourceBoutReferences() { return super.sourceBoutReferences; }
  get sourceVideoReferences() { return super.sourceVideoReferences; }

  // Rich Finders
  findRichEvent(id) { return this.index("richEvents:event_id", this.richEvents, e => e.event_id).get(id); }
  findRichPromotion(id) { return this.index("richPromotions:promotion_id", this.richPromotions, p => p.promotion_id).get(id); }
  findRichBout(id) { return this.index("richBouts:bout_id", this.richBouts, b => b.bout_id).get(id); }
  findRichFighter(id) {
    if (!id) return undefined;
    void this.richFighters; // alias index を構築させる
    return this.#fighterAliasIndex.get(id);
  }
  findRichArticle(id) { return this.index("richArticles:article_id", this.richArticles, a => a.article_id).get(id); }
  richVideoById(id) { return this.index("richVideos:video_id", this.richVideos, v => v.video_id).get(id); }

  // Legacy/Compatibility Wrapper for Enriched Info
  getRichVideoInfo(video) { return this.enricher.enrichVideo(video); }
  getRichArticleInfo(article) { return this.enricher.enrichArticle(article); }

  // Label Methods
  eventName(id) { return this.findEvent(id)?.name ?? id; }
  promotionName(id) { return this.findPromotion(id)?.name ?? id; }

  // 団体名 → promotion_id (中黒・空白を無視した正規化照合)
  promotionIdByName(name) {
    if (!name) return undefined;
    const norm = (s) => String(s).replace(/[・·\s]/g, "");
    const index = this.index("promotions:normName", this.promotions, (p) => norm(p.name));
    return index.get(norm(name))?.promotion_id;
  }
  fighterName(id) { return this.findRichFighter(id)?.display_name ?? id; }

  // Relationship Methods

  /**
   * source_type 別に ref_id / source_id / url → 文書を引くインデックスを構築する。
   * 各 Map は配列順で最初に現れた文書を保持し、各エントリには元配列の添字 (idx) を
   * 添えておく。これにより複数キーがヒットしても「元配列で最初の文書」を選び直せる。
   * （線形 find が OR 条件全体で配列順最初の文書を返すのと同じ結果になるよう、
   *   lookup 側で候補のうち idx 最小の文書を選ぶ。）
   *
   * キーは === と同じ照合になるよう値そのもの (undefined/"" 含む) で登録する。
   * 線形版は `d.url === video.url` を url が falsy 同士でも真と評価するため、
   * falsy キーを捨てずに保持する必要がある。Map のキー一致 (SameValueZero) は
   * 文字列・undefined では === と一致する。
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

  videosForEntity(type, id) {
    return this.videoLinks
      .filter(l => l.entity_type === type && l.entity_id === id)
      .map(l => ({ link: l, video: this.richVideoById(l.video_id) }))
      .filter(i => i.video);
  }

  videoIdsLinkedToEventBouts(eventId) {
    const boutIds = new Set(this.richBouts.filter(b => b.event_id === eventId).map(b => b.bout_id));
    return new Set(this.videoLinks.filter(l => l.entity_type === "bout" && boutIds.has(l.entity_id)).map(l => l.video_id));
  }

  eventSourceVideoIdsWithoutBoutCoverage(event) {
    const covered = this.videoIdsLinkedToEventBouts(event.event_id);
    return (event.source_video_ids ?? []).filter(vid => vid && !covered.has(vid));
  }

  sourceReferencesForBout(bout) { return this.findManyByField("sourceBoutReferences", "bout_id", bout.bout_id); }
  sourceReferencesForEvent(event) { return this.findManyByField("sourceEventReferences", "event_id", event.event_id); }
  sourceReferenceForVideo(video) {
    return this.sourceVideoReferences.find(r => r.video_id === video.video_id);
  }

  sourceContextForVideo(video) {
    return {
      reference: this.sourceReferenceForVideo(video),
      document: this.sourceDocumentForVideo(video),
    };
  }

  fighterSnapshotsForFighter(fighterId) {
    const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
    return this.fighterSnapshots
      .filter(s => ids.has(s.fighter_id))
      .sort((a, b) => String(b.event_id ?? "").localeCompare(String(a.event_id ?? ""), "ja"));
  }

  eventsForPromotion(promotionId) {
    return [...this.findManyByField("events", "promotion_id", promotionId)]
      .sort((a, b) => String(b.published_at ?? b.event_date ?? "").localeCompare(String(a.published_at ?? a.event_date ?? ""), "ja"));
  }

  titlesForPromotion(promotionId) { return this.richTitles.filter(t => t.promotion_id === promotionId); }
  videoLinksForVideo(videoId) { return this.findManyByField("videoLinks", "video_id", videoId); }

  // Statistics Methods
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
    const ids = new Set(this.findRichFighter(fighterId)?.merged_fighter_ids ?? [fighterId]);
    return this.richBouts.filter(b => (b.fighters ?? []).some(f => ids.has(f.fighter_id)));
  }

  boutsForEvent(eventId) {
    return this.richBouts
      .filter(b => b.event_id === eventId)
      .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
  }

  get richTitles() {
    if (this.#richTitles) return this.#richTitles;

    // Build source_video_id → event_id map from bouts.inferred_from_video_id
    const videoEventMap = new Map();
    for (const bout of super.bouts) {
      if (bout.inferred_from_video_id && bout.event_id) {
        videoEventMap.set(bout.inferred_from_video_id, bout.event_id);
      }
    }

    this.#richTitles = this.titles.map((title) => {
      const lineage = (title.lineage ?? []).map((r) => ({ ...r }));

      // Derive won_at from source_video_id via bouts cross-reference
      for (const reign of lineage) {
        if (!reign.won_at_event_id && reign.source_video_id) {
          const eventId = videoEventMap.get(reign.source_video_id);
          if (eventId) reign.won_at_event_id = eventId;
        }
      }

      // Forward pass: derive lost_at from next reign's won_at
      for (let i = 0; i < lineage.length - 1; i++) {
        if (!lineage[i].lost_at_event_id && lineage[i + 1].won_at_event_id) {
          lineage[i].lost_at_event_id = lineage[i + 1].won_at_event_id;
        }
      }
      // Backward pass: derive won_at from previous reign's lost_at
      for (let i = lineage.length - 1; i > 0; i--) {
        if (!lineage[i].won_at_event_id && lineage[i - 1].lost_at_event_id) {
          lineage[i].won_at_event_id = lineage[i - 1].lost_at_event_id;
        }
      }

      return { ...title, lineage };
    });
    return this.#richTitles;
  }

  titleDisplayName(title) {
    const p = this.promotionName(title.promotion_id);
    const d = title.division ?? "階級未設定";
    if (title.title_id?.includes("tournament")) return `${p} ${d}トーナメント`;
    if (title.promotion_id === "max_bout") return `${p} ${d}`;
    return `${p} ${d}王座`;
  }
}
