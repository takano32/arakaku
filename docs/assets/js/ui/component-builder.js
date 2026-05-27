import { escapeHtml } from "./html-utils.js";

/** Builder: definition list を段階的に組み立てる */
export class DefinitionListBuilder {
  #rows = [];
  row(label, value) {
    if (value !== null && value !== undefined && value !== "") this.#rows.push([label, value]);
    return this;
  }
  build() {
    if (this.#rows.length === 0) return "";
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

  primaryVideoRefs(renderVideoRefs, videoIds, title = "出典動画") {
    const ids = (videoIds ?? []).filter(Boolean);
    if (ids.length === 0) return "";
    return this.section(title, `<div class="video-ref-list">${renderVideoRefs(ids)}</div>`, "primary-links");
  }

}
