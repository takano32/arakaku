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
}
