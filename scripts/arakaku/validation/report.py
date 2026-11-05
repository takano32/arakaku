# 役割: 検証結果の入れ物。各検証関数は第 1 引数で Report を受け取り、致命的不整合を error に積む
#   (warning は互換のため残しているが、現状どの検証も使わない)。
# アーキ上の位置: validation/ の全モジュールが使う。グローバルな状態を持たないので、テストは
#   Report() を作って検証関数に渡し、errors を見るだけでよい。
# 不変条件: error のメッセージ形式 "<file>.json[<index>]: ..." は locate.py が CSV の行番号を
#   補うときの前提 (ERROR_ROW)。
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)

    @property
    def ok(self) -> bool:
        return not self.errors
