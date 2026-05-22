import { emptyMessage, escapeHtml } from "./html-utils.js";

/** Builder: definition list を段階的に組み立てる */
export class DefinitionListBuilder {
  #rows = [];

  row(label, value) {
    if (value !== null && value !== undefined && value !== "") {
      this.#rows.push([label, value]);
    }
    return this;
  }

  build() {
    if (this.#rows.length === 0) {
      return "";
    }

    return `
      <dl class="record-details">
        ${this.#rows
          .map(
            ([label, value]) => `
          <dt>${escapeHtml(label)}</dt>
          <dd>${value}</dd>
        `
          )
          .join("")}
      </dl>
    `;
  }
}

/** Factory + Template Method: 共通カード・グリッド部品 */
export class ComponentFactory {
  section(title, innerHtml, className = "") {
    if (!innerHtml) {
      return "";
    }

    const extra = className ? ` class="${escapeHtml(className)}"` : "";

    return `
      <section${extra}>
        <h3>${escapeHtml(title)}</h3>
        ${innerHtml}
      </section>
    `;
  }

  recordCard(className, titleHtml, bodyHtml) {
    const extra = className ? ` ${className}` : "";

    return `
      <article class="card record-card${extra}">
        ${titleHtml}
        ${bodyHtml}
      </article>
    `;
  }

  relatedItem(innerHtml, className = "") {
    const extra = className ? ` ${className}` : "";
    return `<article class="related-item-card${extra}">${innerHtml}</article>`;
  }

  relatedGrid(itemsHtml) {
    return `<div class="related-item-grid">${itemsHtml}</div>`;
  }

  relatedSection(title, items, renderItem, className = "related-source-mentions") {
    if (items.length === 0) {
      return "";
    }

    return this.section(title, this.relatedGrid(items.map((item) => renderItem(item)).join("")), className);
  }

  definitionList(rows) {
    const builder = new DefinitionListBuilder();
    for (const [label, value] of rows) {
      builder.row(label, value);
    }
    return builder.build();
  }

  detailDisclosure(rows, label = "詳細") {
    const content = this.definitionList(rows);
    if (!content) {
      return "";
    }

    return `
      <details class="record-detail-toggle">
        <summary>${escapeHtml(label)}</summary>
        ${content}
      </details>
    `;
  }

  primaryArticleRefs(renderArticleRefs, articleIds, title = "出典記事") {
    const ids = (Array.isArray(articleIds) ? articleIds : [articleIds]).filter(Boolean);
    if (ids.length === 0) {
      return "";
    }

    return this.section(title, `<p>${renderArticleRefs(ids)}</p>`, "primary-links");
  }

  primaryVideoRefs(renderVideoRefs, videoIds, title = "出典動画") {
    const ids = (videoIds ?? []).filter(Boolean);
    if (ids.length === 0) {
      return "";
    }

    return this.section(title, `<div class="video-ref-list">${renderVideoRefs(ids)}</div>`, "primary-links");
  }

  recordList(items, renderItem) {
    if (typeof renderItem === "function") {
      return items.length > 0 ? items.map(renderItem).join("") : emptyMessage();
    }

    return items || emptyMessage();
  }
}
