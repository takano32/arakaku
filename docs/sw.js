// 役割: docs/data/*.json 専用の Service Worker。stale-while-revalidate でキャッシュを即返ししつつ
//   裏で ETag/Last-Modified 条件付き再取得し、更新があればクライアントに DATA_UPDATED を通知する。
// アーキ上の位置: main.js が "./sw.js" を register する。DATA_UPDATED メッセージは main.js が受け取り
//   「再読み込み」バナーを表示する (メッセージ型名は main.js と同期必須)。GitHub Pages 静的配信が前提。
// 不変条件: fetch をフックするのは pathname に "/data/" を含み ".json" で終わる要求のみ — HTML/JS/CSS は
//   素通しさせる (古い viewer コードがキャッシュに固定されるのを防ぐ)。スキーマ非互換な変更時は CACHE 名の
//   バージョンを上げると activate 時に旧キャッシュが一掃される。上げるのは、新しい viewer JS が古い JSON を
//   読むと壊れる変更 (フィールドの改名・削除・型の変更) のとき。フィールドの追加や値の更新では上げなくてよい
//   (stale-while-revalidate が次の読み込みで新しい JSON に差し替え、DATA_UPDATED で再読み込みを促す)。
const CACHE = "arakaku-data-v2"; // v2: events.json の event_date を result_published_at に置き換え (T.77)

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // ナビゲーション要求 (HTML) は respondWith せず素通しさせる方針なので navigation preload は使わない。
      // 有効だと先行取得した preloadResponse を誰も消費せずキャンセルされ
      // 「navigation preload request was cancelled」警告が出るため、明示的に無効化しておく
      // (未対応ブラウザでは navigationPreload が undefined)。
      self.registration.navigationPreload?.disable(),
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    ]).then(() => self.clients.claim())
  );
});

function sameBytes(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

async function revalidate(cache, request, cached) {
  const headers = {};
  const etag = cached.headers.get("ETag");
  const lastModified = cached.headers.get("Last-Modified");
  if (etag) headers["If-None-Match"] = etag;
  else if (lastModified) headers["If-Modified-Since"] = lastModified;

  let response;
  try {
    response = await fetch(request, { headers });
  } catch {
    return;
  }

  // 304 (未変更) / 取得失敗 = 内容に変化なし。キャッシュ更新も通知もせず即抜けする
  // (ETag が一致するケースは下の newEtag 比較で別途弾く)。
  if (response.status === 304) return;
  if (!response.ok) return;

  const newEtag = response.headers.get("ETag");
  if (etag && newEtag && etag === newEtag) return;

  // GitHub Pages の ETag は「更新時刻-サイズ」で、Pages の CI は push のたびに docs/data を作り直すため、
  // 中身が同じでも ETag と Last-Modified が変わる。本文を比べ、違うときだけ通知する
  // (同じでも新しい検証子を残すためキャッシュは差し替える)。cached の本文はページへ返して読まれているので、
  // 比べる本文はキャッシュから取り直す。
  const stored = await cache.match(request);
  const [oldBody, newBody] = await Promise.all([stored ? stored.arrayBuffer() : null, response.clone().arrayBuffer()]);
  await cache.put(request, response);
  if (oldBody && sameBytes(oldBody, newBody)) return;

  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "DATA_UPDATED" });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes("/data/") || !url.pathname.endsWith(".json")) return;

  const { request } = event;
  const cacheOp = caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => ({ cache, cached }))
  );

  // キャッシュに無いときはネットワークの応答を返し、その複製を保存する。保存も waitUntil に入れて、
  // 応答を返した直後に Service Worker が止められても書き込みが途中で失われないようにする。
  const op = cacheOp.then(async ({ cache, cached }) => {
    if (cached) return { cache, cached, response: cached };
    const response = await fetch(request);
    return { cache, cached: null, response, copy: response.ok ? response.clone() : null };
  });

  event.respondWith(op.then(({ response }) => response));

  event.waitUntil(
    op.then(({ cache, cached, copy }) => {
      if (cached) return revalidate(cache, request, cached);
      return copy ? cache.put(request, copy) : undefined;
    }).catch(() => {})
  );
});
