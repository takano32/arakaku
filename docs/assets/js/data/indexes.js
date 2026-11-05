/**
 * レコード配列の索引 (純粋。DOM・fetch に依存しない)。
 * - buildIndex: 1キー1レコードの Map。同名キーは後勝ち (set で上書き)。空キーの行は入れない。
 * - buildGroupIndex: 1キー → レコード配列 (1対多)。
 * - IndexCache: 名前付きで遅延構築してキャッシュする。DataRepository が invalidate() のたびに clear() する。
 */

export function buildIndex(records, keyForRecord) {
  const index = new Map();
  for (const record of records ?? []) {
    const key = keyForRecord(record);
    if (key) index.set(key, record);
  }
  return index;
}

export function buildGroupIndex(records, keyForRecord) {
  const index = new Map();
  for (const record of records ?? []) {
    const key = keyForRecord(record);
    if (!key) continue;
    const group = index.get(key) ?? [];
    group.push(record);
    index.set(key, group);
  }
  return index;
}

export class IndexCache {
  #indexes = new Map();

  /** 名前が同じなら最初に構築した Map を返す (records / keyForRecord は初回だけ使う)。 */
  unique(name, records, keyForRecord) {
    if (!this.#indexes.has(name)) this.#indexes.set(name, buildIndex(records, keyForRecord));
    return this.#indexes.get(name);
  }

  group(name, records, keyForRecord) {
    if (!this.#indexes.has(name)) this.#indexes.set(name, buildGroupIndex(records, keyForRecord));
    return this.#indexes.get(name);
  }

  clear() {
    this.#indexes.clear();
  }
}
