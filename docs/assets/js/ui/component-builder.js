import { escapeHtml } from "./html-utils.js";

// 役割: viewer 全体で再利用する HTML 文字列断片 (section / card / badge / dl / details など)
//   を生成する純粋なファクトリ。状態も DOM も持たず、文字列のみを返す。
// アーキ上の位置: main.js で単独 new され ViewContext.bindServices 経由で ctx.components として
//   サービス層 (source-renderers / related-renderers) と tab-renderers から呼ばれる。
//   出力 HTML は VirtualList が innerHTML として描画する。
// 不変条件: ラベルやクラス名など外部由来の文字列は必ず escapeHtml を通す。逆に「既に組み立て済みの
//   HTML 断片」(innerHtml / titleHtml / bodyHtml / value) は二重エスケープを避けるため通さない —
//   呼び出し側が安全な HTML を渡す契約。スタイルは docs/assets/style.css のクラス名に依存。
// 関連スキル: .agents/skills/arakaku-viewer-ui

/** Builder: definition list を段階的に組み立てる */
export class DefinitionListBuilder {
  #rows = [];
  row(label, value) {
    if (value !== null && value !== undefined && value !== "") this.#rows.push([label, value]);
    return this;
  }
  build() {
    if (this.#rows.length === 0) return "";
    // label (l) はエスケープするが value (v) はエスケープしない: 呼び出し側がリンク等の HTML を渡すため。
    return `<dl class="record-details">${this.#rows.map(([l, v]) => `<dt>${escapeHtml(l)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  }
}

/** Factory + Template Method: 共通カード・グリッド部品 */
export class ComponentFactory {
  section(title, innerHtml, className = "") {
    if (!innerHtml) return "";
    return `<section${className ? ` class="${escapeHtml(className)}"` : ""}><h3>${escapeHtml(title)}</h3>${innerHtml}</section>`;
  }

  recordCard(className, titleHtml, bodyHtml) {
    return `<article class="card record-card ${className}">${titleHtml}${bodyHtml}</article>`;
  }

  badge(label, className = "video-badge") {
    return `<span class="${escapeHtml(className)}">${escapeHtml(label)}</span>`;
  }

  meta(text) {
    return `<p class="meta">${escapeHtml(text)}</p>`;
  }

  relatedItem(innerHtml, className = "") {
    return `<article class="related-item-card ${className}">${innerHtml}</article>`;
  }

  relatedGrid(itemsHtml) {
    return `<div class="related-item-grid">${itemsHtml}</div>`;
  }

  relatedSection(title, items, renderItem, className = "related-source-mentions") {
    if (items.length === 0) return "";
    return this.section(title, this.relatedGrid(items.map(renderItem).join("")), className);
  }

  definitionList(rows) {
    const builder = new DefinitionListBuilder();
    for (const [l, v] of rows) builder.row(l, v);
    return builder.build();
  }

  detailDisclosure(rows, label = "詳細", options = {}) {
    const content = this.definitionList(rows);
    const open = options.open ? " open" : "";
    return content ? `<details class="record-detail-toggle"${open}><summary>${escapeHtml(label)}</summary>${content}</details>` : "";
  }

  primaryArticleRefs(renderArticleRefs, articleIds, title = "出典記事") {
    const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
    if (ids.length === 0) return "";
    return this.section(title, `<p>${renderArticleRefs(ids)}</p>`, "primary-links");
  }

  primaryArticleRefList(renderArticleRef, articleIds, title = "出典記事") {
    const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
    if (ids.length === 0) return "";
    const items = ids.map((id) => `<li>${renderArticleRef(id)}</li>`).join("");
    return this.section(title, `<ul class="article-ref-list">${items}</ul>`, "primary-links");
  }

}
