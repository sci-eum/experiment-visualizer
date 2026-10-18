#!/usr/bin/env python3
"""실험 데이터(EXPERIMENT)를 template.html에 끼워 넣어 완성 HTML을 만든다.

사용법:
    python build_html.py 데이터파일 결과.html [--template 템플릿경로]

데이터파일은 다음 둘 중 하나다.
  1) JSON 객체:              { "title": "...", "steps": [...] }
  2) 자바스크립트 대입문:     window.EXPERIMENT = { title: '...', steps: [...] };
템플릿에서 바뀌는 곳은 'EXPERIMENT DATA START'와 'EXPERIMENT DATA END' 사이뿐이다.
표준 라이브러리만 쓴다.
"""
import argparse
import json
import re
import sys
from pathlib import Path

START = "/* ===== EXPERIMENT DATA START"
END = "/* ===== EXPERIMENT DATA END ===== */"


def load_data(text: str) -> str:
    body = text.strip()
    if body.startswith("﻿"):
        body = body[1:]
    if re.match(r"^(window\.)?EXPERIMENT\s*=", body):
        if not body.startswith("window."):
            body = "window." + body
        if not body.rstrip().endswith(";"):
            body += ";"
        return body
    obj = json.loads(body)
    if not isinstance(obj, dict):
        raise ValueError("데이터는 객체({ ... })여야 합니다.")
    return "window.EXPERIMENT = " + json.dumps(obj, ensure_ascii=False, indent=2) + ";"


def build(template: str, data_js: str) -> str:
    i = template.find(START)
    j = template.find(END)
    if i < 0 or j < 0 or j < i:
        raise ValueError("템플릿에서 EXPERIMENT DATA 표시를 찾지 못했습니다.")
    line_end = template.find("\n", i)
    safe = re.sub(r"</(script)", r"<\\/\1", data_js, flags=re.I)
    return template[: line_end + 1] + safe + "\n" + template[j:]


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("data", help="EXPERIMENT 데이터 파일 (.json 또는 .js)")
    ap.add_argument("out", help="만들 HTML 파일 경로")
    ap.add_argument("--template", default=str(here.parent / "assets" / "template.html"))
    a = ap.parse_args()
    tpl = Path(a.template).read_text(encoding="utf-8")
    data_js = load_data(Path(a.data).read_text(encoding="utf-8"))
    html = build(tpl, data_js)
    title = re.search(r"title\s*:\s*['\"]([^'\"]+)", data_js) or re.search(r'"title"\s*:\s*"([^"]+)', data_js)
    if title:
        html = re.sub(r"<title>.*?</title>", "<title>" + title.group(1).replace("<", "") + " · 실험 과정 그림 안내</title>", html, count=1)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(html, encoding="utf-8")
    print(f"완성: {a.out} ({len(html):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
