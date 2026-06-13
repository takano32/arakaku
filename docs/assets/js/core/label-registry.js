/**
 * 役割: データ側のコード値 (video_type / link_status / result_status / source_type /
 *   mention_type / article_type) を、画面に出す日本語ラベルへ変換する純粋な辞書。
 * アーキ上の位置: Strategy。プロセス唯一の static instance を ViewContext.labels として
 *   公開し、各描画層 (tab-renderers / component-builder / services 等) が参照する。
 * 不変条件 / 注意:
 *   - ここのキー文字列は生成 JSON (docs/data/*.json) のコード値と一致していなければならない。
 *     値の追加はパイプライン側 (scripts/) の出力コードに追従する。skill: arakaku-viewer-ui。
 *   - 各メソッドは「辞書[コード] ?? コード ?? 既定文字列」の形。未知コードはまず素通しし、
 *     null/undefined のときだけ既定にフォールバックする (articleType の既定だけは空文字)。
 *     新コードに気付けるよう、安易に既定で握りつぶさず辞書へ追加するのが望ましい。
 */
/** Strategy: 表示ラベルを mention_type / source_type 等から解決する */
export class LabelRegistry {
  static #instance = new LabelRegistry();

  static get instance() {
    return LabelRegistry.#instance;
  }

  videoType(videoType) {
    return (
      {
        full_fight: "Full Fight",
        highlight: "ハイライト",
        short: "Short",
        stream_archive: "配信",
        preview: "煽り",
        interview: "インタビュー",
        commentary: "解説",
        reference: "参考",
      }[videoType] ?? videoType ?? "動画"
    );
  }

  relationType(relationType) {
    return this.videoType(relationType);
  }

  linkStatus(status) {
    return (
      {
        linked: "紐づけ済み",
        partially_linked: "一部紐づけ",
        unlinked: "未紐づけ",
        needs_review: "要確認",
      }[status] ?? status ?? "未設定"
    );
  }

  resultStatus(status) {
    return (
      {
        known: "確定",
        unknown: "不明",
        numbers_verified: "名鑑確認済み",
        needs_review: "要確認",
      }[status] ?? status ?? "未設定"
    );
  }

  sourceType(sourceType) {
    return (
      {
        note_article: "note本文",
        youtube_description: "YouTube概要欄",
      }[sourceType] ?? sourceType ?? "出典"
    );
  }

  mentionType(mentionType) {
    const labels = {
      event: "大会",
      matchup: "対戦カード",
      result: "結果",
      note_url: "note URL",
      youtube_url: "YouTube URL",
      match_result: "試合結果",
    };
    return labels[mentionType] ?? mentionType ?? "言及";
  }

  articleType(articleType) {
    return (
      {
        event_result: "試合結果",
        event_card: "対戦カード",
        promotion_profile: "団体情報",
        note_article: "ノート",
        youtube_description_source: "YouTube概要欄",
      }[articleType] ?? articleType ?? ""
    );
  }
}
