/**
 * YouTube ファサード (ui/parts/videos.js videoFacade の <div class="yt" data-yt-id>) を、クリックされた
 * ときだけ iframe に差し替える。ファサードのままなら動画は読み込まれない。
 */
export function activateVideoFacade(el) {
  const id = el.dataset.ytId;
  if (!id || el.querySelector("iframe")) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  iframe.title = el.querySelector(".yt-play")?.getAttribute("aria-label") ?? "YouTube";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  el.replaceChildren(iframe);
  el.classList.add("is-active");
}
