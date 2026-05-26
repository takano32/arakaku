export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "ja")
  );
}

export function renderValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return escapeHtml(value);
}

export function joinPresent(values, separator = " / ") {
  return (values ?? []).filter(Boolean).join(separator);
}

export function renderBooleanJa(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return value ? "あり" : "なし";
}

export function renderIdList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "";
  }
  return items.map((value) => `<code>${escapeHtml(value)}</code>`).join(", ");
}

export function renderTextList(values) {
  const items = (values ?? []).filter(Boolean);
  if (items.length === 0) {
    return "";
  }
  return items.map((value) => escapeHtml(value)).join(", ");
}

export function externalLink(url, label) {
  if (!url) {
    return `<code>${escapeHtml(label)}</code>`;
  }

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function emptyMessage() {
  return `<article class="card"><p>該当するデータがありません。</p></article>`;
}
