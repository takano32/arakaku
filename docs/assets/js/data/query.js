import {
  boutSearchText,
  eventSearchText,
  fighterSearchText,
  mentionSearchText,
  promotionSearchText,
  sourceDocumentSearchText,
  titleSearchText,
  videoSearchText,
} from "./search_text.js";

/**
 * フリーテキスト検索。各エンティティの検索対象テキスト (search_text.js) を正規化した連結文字列に対する
 * 部分一致で評価する。検索語は空白で区切り、すべての語を含むものを残す (AND)。
 * 正規化 (normalizeSearchText): NFKC (全角英数・半角カナを揃える)、小文字化、ひらがな→カタカナ、空白の圧縮。
 *
 * - キャッシュは repo.revision を世代キーにしており、repo.invalidate() で revision が進むと自動破棄される。
 */

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/\s+/g, " ")
    .trim();
}

/** 検索語を正規化して空白で分けた語の配列 (空なら [])。 */
export function queryTerms(query) {
  const q = normalizeSearchText(query);
  return q ? q.split(" ") : [];
}

/** 正規化済みテキストがすべての語を含むか (語が無ければ真)。 */
export function matchesTerms(text, terms) {
  return terms.every((term) => text.includes(term));
}

export class QueryMatcher {
  /**
   * @param {{query: string, mentionType: string}} state  検索語と言及種別を持つ状態
   * @param {() => import("./repository.js").DataRepository} getRepo
   */
  constructor(state, getRepo) {
    this.state = state;
    this.getRepo = getRepo;
    this.#repoRevision = null;
    this.#cache = new Map();
  }

  #repoRevision;
  #cache;

  get repo() { return this.getRepo(); }

  /** repo のデータが更新されたら (revision が進んだら) キャッシュをクリアし、テキストを1回だけ計算して返す */
  #cachedText(key, buildFn) {
    const revision = this.repo?.revision ?? null;
    if (revision !== this.#repoRevision) {
      this.#repoRevision = revision;
      this.#cache.clear();
    }
    if (!this.#cache.has(key)) {
      this.#cache.set(key, normalizeSearchText(buildFn().filter(Boolean).join(" ")));
    }
    return this.#cache.get(key);
  }

  #matchQuery(text) {
    return matchesTerms(text, queryTerms(this.state.query));
  }

  /** 任意の値の配列が検索語に一致するか (キャッシュしない。管理タブの一覧が使う) */
  includes(values) {
    const terms = queryTerms(this.state.query);
    if (terms.length === 0) return true;
    return matchesTerms(normalizeSearchText(values.filter(Boolean).join(" ")), terms);
  }

  fighterMatches(fighter) {
    return this.#matchQuery(this.#cachedText(`f:${fighter.fighter_id}`, () => fighterSearchText(this.repo, fighter)));
  }

  boutMatches(bout) {
    return this.#matchQuery(this.#cachedText(`b:${bout.bout_id}`, () => boutSearchText(this.repo, bout)));
  }

  eventMatches(event) {
    return this.#matchQuery(this.#cachedText(`e:${event.event_id}`, () => eventSearchText(this.repo, event)));
  }

  promotionMatches(promotion) {
    return this.#matchQuery(this.#cachedText(`p:${promotion.promotion_id}`, () => promotionSearchText(this.repo, promotion)));
  }

  videoMatches(video) {
    return this.#matchQuery(this.#cachedText(`v:${video.video_id}`, () => videoSearchText(this.repo, video)));
  }

  titleMatches(title) {
    return this.#matchQuery(this.#cachedText(`t:${title.title_id}`, () => titleSearchText(this.repo, title)));
  }

  mentionMatches(mention) {
    if (this.state.mentionType && mention.mention_type !== this.state.mentionType) return false;
    return this.#matchQuery(this.#cachedText(`m:${mention.mention_id}`, () => mentionSearchText(this.repo, mention)));
  }

  sourceDocumentMatches(document) {
    return this.#matchQuery(this.#cachedText(`sd:${document.source_id}`, () => sourceDocumentSearchText(document)));
  }
}
