function relatedBoutsForFighter(fighterId) {
  if (!fighterId) return [];

  return state.data.bouts
    .filter((bout) =>
      (bout.fighters ?? []).some((fighter) => fighter.fighter_id === fighterId)
    )
    .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
}

function renderRelatedBouts(fighterId) {
  const bouts = relatedBoutsForFighter(fighterId);

  if (bouts.length === 0) {
    return `<p class="meta">関連試合はまだ登録されていません。</p>`;
  }

  return `
    <section class="related-bouts">
      <h3>関連試合</h3>
      <ul>
        ${bouts.map((bout) => `
          <li>
            <span class="meta">${eventLink(bout.event_id, eventName(bout.event_id))}</span>
            <span>${boutMatchup(bout)}</span>
            <span class="meta">${renderBoutResultSummary(bout)}</span>
            <span class="meta">
              ${escapeHtml(bout.result?.round ? `${bout.result.round}R` : "")}
              ${escapeHtml(bout.result?.time ?? "")}
              ${escapeHtml(bout.result?.method_raw ?? "")}
            </span>
            ${renderVideoLinks("bout", bout.bout_id)}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderEventBouts(eventId) {
  const bouts = state.data.bouts
    .filter((bout) => bout.event_id === eventId)
    .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));

  if (bouts.length === 0) {
    return `<p class="meta">関連試合はまだ登録されていません。</p>`;
  }

  return `
    <section class="related-bouts">
      <h3>関連試合</h3>
      <div class="related-bout-grid">
        ${bouts.map((bout) => `
          <article class="related-bout-card">
            <p class="meta">第${escapeHtml(bout.bout_order ?? "?")}試合</p>
            <h4>${boutMatchup(bout)}</h4>
            <p>${renderBoutResultSummary(bout)}</p>
            <p class="meta">
              ${escapeHtml(bout.result?.round ? `${bout.result.round}R` : "")}
              ${escapeHtml(bout.result?.time ?? "")}
              ${escapeHtml(bout.result?.method_raw ?? "")}
            </p>
            ${renderVideoLinks("bout", bout.bout_id)}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
