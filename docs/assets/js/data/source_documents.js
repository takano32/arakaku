/**
 * 出典本文 (source_documents) と本文 (source_document_bodies) の結合 (純関数)。
 */

/**
 * 本文がある文書には content_text を足したコピーを、無い文書はそのまま返す (並びは docs のまま)。
 * @param {object[]} docs
 * @param {Map<string, { content_text: string }>} bodyById  source_id → 本文の行
 */
export function withBodies(docs, bodyById) {
  return docs.map(d => {
    const body = bodyById.get(d.source_id);
    return body ? { ...d, content_text: body.content_text } : d;
  });
}
