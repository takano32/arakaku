/**
 * 出典本文 (source_documents) の引き当て。note 記事・動画に対応する文書を source_type 別に
 * ref_id / source_id / url から引く (DOM・fetch に依存しない純粋なインデックス)。
 *
 * 各 Map は配列順で最初に現れた文書を保持し、各エントリには元配列の添字 (idx) を添えておく。
 * 複数キーがヒットしても「元配列で最初の文書」を選び直せるようにするため
 * (線形 find が OR 条件全体で配列順最初の文書を返すのと同じ結果になる)。
 * キーは === と同じ照合になるよう値そのもので登録する。ただし空のキー (null/undefined/"") は登録しない (remember を参照)。
 */
export class SourceDocumentLookup {
  #tables = new Map(); // source_type → { refId, sourceId, url } (各 Map: key → { doc, idx })

  constructor(documents) {
    (documents ?? []).forEach((doc, idx) => {
      const table = this.#tableFor(doc.source_type);
      remember(table.refId, doc.source_ref_id, doc, idx);
      remember(table.sourceId, doc.source_id, doc, idx);
      remember(table.url, doc.url, doc, idx);
    });
  }

  #tableFor(sourceType) {
    let table = this.#tables.get(sourceType);
    if (!table) {
      table = { refId: new Map(), sourceId: new Map(), url: new Map() };
      this.#tables.set(sourceType, table);
    }
    return table;
  }

  /** note 記事 (article_id) の本文。source_ref_id または source_id "note:<article_id>" で引く。 */
  forArticle(articleId) {
    const table = this.#tables.get("note_article");
    if (!table) return undefined;
    return firstDocument(
      table.refId.get(articleId),
      table.sourceId.get(`note:${articleId}`),
    );
  }

  /** 動画の YouTube 概要欄。source_ref_id / source_id "youtube_description:<video_id>" / url で引く。 */
  forVideo(video) {
    const table = this.#tables.get("youtube_description");
    if (!table) return undefined;
    return firstDocument(
      table.refId.get(video.video_id),
      table.sourceId.get(`youtube_description:${video.video_id}`),
      video.url ? table.url.get(video.url) : undefined,
    );
  }
}

function remember(map, key, doc, idx) {
  // 空のキーは登録しない。以前は url の無い動画が url の無い最初の文書に当たっていた (undefined === undefined。T.112.4.20)。
  if (key == null || key === "") return;
  if (!map.has(key)) map.set(key, { doc, idx });
}

/** 候補エントリ ({doc, idx}) のうち元配列で最初に現れた文書を返す。 */
function firstDocument(...entries) {
  let best;
  for (const entry of entries) {
    if (entry && (!best || entry.idx < best.idx)) best = entry;
  }
  return best?.doc;
}
