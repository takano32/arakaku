/**
 * 選手名の正規化 (純関数)。data 層の名寄せ (公式選手の突合・重複選手の統合・発掘) が共有する。
 */

/**
 * 公式選手名と fighter の display_name を緩く突き合わせるための正規化キー。
 * 中黒・空白・ピリオドの有無や全半角差のみ異なる表記ゆれを吸収する
 * (例: 「ローリングJr」=「ローリングJr.」)。完全一致が取れなかった場合の
 * フォールバックにのみ用いる。
 */
export function normalizeFighterName(name) {
  let s = (name ?? "").normalize("NFKC");
  for (const ch of ["・", "　", " ", ".", "．"]) s = s.split(ch).join("");
  return s.toLowerCase();
}
