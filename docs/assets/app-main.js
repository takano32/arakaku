document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  state.focusFighterId = "";
  state.focusEventId = "";
  renderContent();
});

document.querySelector("#title-promotion-filter")?.addEventListener("change", (event) => {
  state.titlePromotion = event.target.value;
  renderContent();
});

document.querySelector("#title-division-filter")?.addEventListener("change", (event) => {
  state.titleDivision = event.target.value;
  renderContent();
});

document.querySelector("#mention-type-filter")?.addEventListener("change", (event) => {
  state.mentionType = event.target.value;
  renderContent();
});

document.querySelector("#content").addEventListener("click", (event) => {
  const fighterButton = event.target.closest(".fighter-link");
  if (fighterButton) {
    jumpToFighter(fighterButton.dataset.fighterId, fighterButton.dataset.fighterName);
    return;
  }

  const eventButton = event.target.closest(".event-link");
  if (eventButton) {
    jumpToEvent(eventButton.dataset.eventId, eventButton.dataset.eventName);
  }
});

document.querySelector(".tabs").addEventListener("click", (event) => {
  const button = event.target.closest(".tab");
  if (!button) return;

  const tab = button.dataset.tab;
  if (!tab) return;

  state.tab = tab;
  state.focusFighterId = "";
  state.focusEventId = "";
  render();
});

loadData().catch((error) => {
  document.querySelector("#content").innerHTML = `
    <article class="card">
      <h2>読み込みに失敗しました</h2>
      <p>${escapeHtml(error.message)}</p>
    </article>
  `;
});
