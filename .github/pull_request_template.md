# PULL_REQUEST_TEMPLATE.md

## 概要

この PR で何を変更したかを書いてください。

---

## 変更内容

- 
- 
- 

---

## 対象ファイル

- 
- 

---

## 確認したこと

- [ ] `make check` が通る
- [ ] `make clean-generated` を実行した
- [ ] `docs/data/*.json` をコミットしていない
- [ ] `tmp/note-html/*.html` をコミットしていない
- [ ] `tmp/youtube-api/*.json` をコミットしていない
- [ ] 不明な試合結果を推測で確定していない
- [ ] 自動抽出結果をレビューなしで大量反映していない

---

## viewer 変更がある場合

- [ ] 公式・通信・試合・選手・大会・動画 view を確認した
- [ ] 出典本文・出典言及 view を確認した
- [ ] スマートフォン幅（390px）で横スクロールが出ない
- [ ] Browser Console に viewer JS（`docs/assets/js/`）由来のエラーがない

---

## data-src 変更がある場合

- [ ] ID 重複がない
- [ ] 参照先 ID が存在する
- [ ] `result_status=unknown` を不当に確定していない
- [ ] `winner` / `loser` は出典で確認済み

---

## 備考

