import { escapeHtml } from "../html.js";

/**
 * 画面内遷移のリンク (選手・大会・試合)。<button data-fighter-id|data-event-id|data-bout-id> で、
 * クリックは ui/shell.js の #list-host への委譲ハンドラが拾う。属性名を変えるときは shell.js と同期する。
 * 名前の解決に repo を使うだけで、状態も DOM も持たない。
 */

export function fighterLink(repo, fighterId, fallbackName) {
  const name = repo.fighterName(fighterId) || fallbackName || fighterId;
  if (!fighterId) return `<span class="name">${escapeHtml(name)}</span>`;
  return `<button type="button" class="link link-fighter" data-fighter-id="${escapeHtml(fighterId)}" data-fighter-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
}

export function eventLink(repo, eventId, fallbackName) {
  const name = repo.eventName(eventId) || fallbackName || eventId;
  if (!eventId) return `<span class="name">${escapeHtml(name)}</span>`;
  return `<button type="button" class="link link-event" data-event-id="${escapeHtml(eventId)}" data-event-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
}

/** labelHtml は組み立て済み HTML (エスケープしない) */
export function boutLink(boutId, labelHtml) {
  return `<button type="button" class="link link-bout" data-bout-id="${escapeHtml(boutId)}">${labelHtml}</button>`;
}
