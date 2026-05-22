function relatedBoutsForFighter(fighterId) {
  if (!fighterId) return [];

  return state.data.bouts
    .filter((bout) =>
      (bout.fighters ?? []).some((fighter) => fighter.fighter_id === fighterId)
    )
    .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));
}

function renderBoutResultMeta(bout) {
  return `
    <p class="meta">
      ${escapeHtml(bout.result?.round ? `${bout.result.round}R` : "")}
      ${escapeHtml(bout.result?.time ?? "")}
      ${escapeHtml(bout.result?.method_raw ?? "")}
    </p>
  `;
}

function renderBoutCard(bout, { showEvent = false, showOrder = false } = {}) {
  const headerParts = [];

  if (showOrder) {
    headerParts.push(`<p class="meta bout-order">第${escapeHtml(bout.bout_order ?? "?")}試合</p>`);
  }

  if (showEvent) {
    headerParts.push(`<p class="meta">${eventLink(bout.event_id, eventName(bout.event_id))}</p>`);
  }

  return renderRelatedItemCard(`
    ${headerParts.join("")}
    <h4 class="related-bout-title">${boutMatchup(bout)}</h4>
    <p>${renderBoutResultSummary(bout)}</p>
    ${renderBoutResultMeta(bout)}
    ${renderVideoLinks("bout", bout.bout_id)}
  `, "bout-card");
}

function renderRelatedBoutsSection(title, bouts, options = {}) {
  if (bouts.length === 0) {
    return `<p class="meta">関連試合はまだ登録されていません。</p>`;
  }

  return `
    <section class="related-bouts">
      <h3>${escapeHtml(title)}</h3>
      ${renderRelatedItemGrid(bouts.map((bout) => renderBoutCard(bout, options)).join(""))}
    </section>
  `;
}

function renderRelatedBouts(fighterId) {
  return renderRelatedBoutsSection("関連試合", relatedBoutsForFighter(fighterId), {
    showEvent: true,
  });
}

function renderEventBouts(eventId) {
  const bouts = state.data.bouts
    .filter((bout) => bout.event_id === eventId)
    .sort((a, b) => (a.bout_order ?? 0) - (b.bout_order ?? 0));

  return renderRelatedBoutsSection("関連試合", bouts, {
    showOrder: true,
  });
}
