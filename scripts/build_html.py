#!/usr/bin/env python3
"""실험 데이터(EXPERIMENT)를 template.html에 끼워 넣어 완성 HTML을 만든다.

사용법:
    python build_html.py 데이터파일 결과.html [--light | --template 템플릿경로]

데이터파일은 다음 셋 중 하나다.
  1) JSON 객체:              { "title": "...", "steps": [...] }
  2) 자바스크립트 대입문:     window.EXPERIMENT = { title: '...', steps: [...] };
  3) 전에 만든 결과 HTML:     데이터는 그대로 두고 최신 엔진으로 다시 만든다 (가벼운 버전이면 가벼운 버전으로)
--light 를 주면 그림 엔진을 인터넷(jsDelivr)에서 불러오는 가벼운 HTML로 만든다.
템플릿에서 바뀌는 곳은 'EXPERIMENT DATA START'와 'EXPERIMENT DATA END' 사이뿐이다.
표준 라이브러리만 쓴다.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_data import find_block  # noqa: E402

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
    ap.add_argument("data", help="EXPERIMENT 데이터 파일 (.json, .js, 또는 전에 만든 결과 .html)")
    ap.add_argument("out", help="만들 HTML 파일 경로")
    ap.add_argument("--template", help="템플릿 경로 (기본: assets/template.html, 한 파일 버전)")
    ap.add_argument("--light", action="store_true", help="가벼운 버전으로 만든다 (assets/light.html)")
    a = ap.parse_args()
    text = Path(a.data).read_text(encoding="utf-8")
    light = a.light
    if Path(a.data).suffix.lower() in (".html", ".htm"):  # 전에 만든 결과 HTML
        block = find_block(text)
        if not block:
            print("이 HTML에서 EXPERIMENT 데이터를 찾지 못했습니다.")
            return 1
        light = light or (not a.template and "const LabKit" not in text)  # 가벼운 버전은 가벼운 버전으로
        print("전에 만든 HTML의 데이터를 그대로 넣고 최신 엔진으로 다시 만듭니다" + (" (가벼운 버전)" if light else ""))
        text = block
    template = a.template or str(here.parent / "assets" / ("light.html" if light else "template.html"))
    tpl = Path(template).read_text(encoding="utf-8")
    data_js = load_data(text)
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
