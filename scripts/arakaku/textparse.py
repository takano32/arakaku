"""複数スクリプトで挙動が完全に一致するテキスト解析パターン/関数の置き場。

語彙が意図的に異なるパターン (METHOD_PATTERNS, ROUND_RE, EVENT_RE,
RESULT_RE など) は各スクリプト側に残すこと。
"""
import re

NOTE_URL_RE = re.compile(r"https?://note\.com/[^\s)）]+")
YOUTUBE_URL_RE = re.compile(r"https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s)）]+")
VS_RE = re.compile(r"(?i)\bvs\.?\b|ＶＳ|ｖｓ|対")

TIME_RE = re.compile(r"([0-9０-９]+)\s*分\s*([0-9０-９]+)\s*秒|([0-9０-９]+):([0-9０-９]{2})")


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))


def find_method(text: str, patterns: list[tuple[str, re.Pattern[str]]]) -> tuple[str, str]:
    for method, pattern in patterns:
        match = pattern.search(text)
        if match:
            return method, match.group(0)
    return "", ""


def infer_time(text: str) -> str:
    match = TIME_RE.search(text)
    if not match:
        return ""
    if match.group(1) and match.group(2):
        return f"{normalize_digits(match.group(1))}分{normalize_digits(match.group(2))}秒"
    if match.group(3) and match.group(4):
        return f"{normalize_digits(match.group(3))}分{normalize_digits(match.group(4))}秒"
    return ""
