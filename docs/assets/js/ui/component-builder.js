import { escapeHtml, renderValue } from "./html-utils.js";

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
  relatedItem(innerHtml, className = "") {
    const extra = className ? ` ${className}` : "";
    return `<article class="related-item-card${extra}">${innerHtml}</article>`;
  }

  relatedGrid(itemsHtml) {
    return `<div class="related-item-grid">${itemsHtml}</div>`;
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

    return `
      <section class="primary-links">
        <h3>${escapeHtml(title)}</h3>
        <p>${renderArticleRefs(ids)}</p>
      </section>
    `;
  }

  primaryVideoRefs(renderVideoRefs, videoIds, title = "出典動画") {
    const ids = (videoIds ?? []).filter(Boolean);
    if (ids.length === 0) {
      return "";
    }

    return `
      <section class="primary-links">
        <h3>${escapeHtml(title)}</h3>
        <div class="video-ref-list">${renderVideoRefs(ids)}</div>
      </section>
    `;
  }

  recordList(itemsHtml) {
    return itemsHtml || emptyMessageFromFactory();
  }
}

function emptyMessageFromFactory() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}
