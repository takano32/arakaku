// 役割: viewer の描画層が依存する低レベルの純粋ヘルパ群 (HTML エスケープ、リスト整形、
//   外部リンク生成、bout 結果テキストの組み立て)。状態を持たず副作用もない。
// アーキ上の位置: component-builder / navigation / source-renderers / related-renderers /
//   tab-renderers が import する最下層ユーティリティ。ここを変えると viewer 全体の出力に波及する。
// 不変条件: escapeHtml は文字列を innerHTML に埋め込む際の唯一の防御線。順序 (& を最初に置換) を
//   崩すと二重エスケープになるため変更しないこと。uniqueSorted の localeCompare(..., "ja") は
//   日本語ラベルを読みやすい順に並べるためのロケール指定。
// 関連スキル: .agents/skills/arakaku-viewer-ui
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

// bout.result の round / time / method_raw を空欄を除いて空白連結する (例: "3R 4:21 KO")。
export function boutResultText(bout) {
  return [
    bout.result?.round ? `${bout.result.round}R` : "",
    bout.result?.time,
    bout.result?.method_raw,
  ].filter(Boolean).join(" ");
}
