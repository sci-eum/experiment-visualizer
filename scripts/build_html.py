#!/usr/bin/env python3
"""실험 데이터(EXPERIMENT)를 template.html에 끼워 넣어 완성 HTML을 만든다.

사용법:
    python build_html.py 데이터파일 결과.html [--light | --template 템플릿경로]

데이터파일은 다음 셋 중 하나다.
  1) JSON 객체:              { "title": "...", "steps": [...] }
  2) 자바스크립트 대입문:     window.EXPERIMENT = { title: '...', steps: [...] };
  3) 전에 만든 결과 HTML:     데이터는 그대로 두고 최신 엔진으로 다시 만든다 (가벼운 버전이면 가벼운 버전으로)
--light 를 주면 그림 엔진을 인터넷(jsDelivr)에서 불러오는 가벼운 HTML로 만든다.
--3d 를 주면 입체 보기 엔진(assets/labkit3d.js)도 파일 안에 넣는다. 주지 않으면 '3D' 버튼을 누를 때 인터넷에서 불러온다.
템플릿에서 바뀌는 곳은 'EXPERIMENT DATA START'와 'EXPERIMENT DATA END' 사이뿐이다 (--3d면 입체 엔진 한 덩어리가 더 붙는다).
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


LK3D_TAG = '<script id="lk3d">'


def add3d(html: str, engine3d: str) -> str:
    """입체 보기 엔진(labkit3d.js)을 </body> 바로 앞에 넣는다. 이미 들어 있으면 새 것으로 바꾼다."""
    if re.search(r"</script", engine3d, re.I):
        raise ValueError("labkit3d.js 안에 </script 문자열이 있어 넣을 수 없습니다.")
    html = re.sub(r'<script id="lk3d">.*?</script>\n?', "", html, flags=re.S)
    k = html.rfind("</body>")
    if k < 0:
        raise ValueError("HTML에서 </body>를 찾지 못했습니다.")
    return html[:k] + LK3D_TAG + "\n" + engine3d.rstrip() + "\n</script>\n" + html[k:]


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
    ap.add_argument("--3d", dest="three", action="store_true", help="입체 보기 엔진도 파일 안에 넣는다 (인터넷 없이 3D까지)")
    a = ap.parse_args()
    text = Path(a.data).read_text(encoding="utf-8")
    light, three = a.light, a.three
    if Path(a.data).suffix.lower() in (".html", ".htm"):  # 전에 만든 결과 HTML
        block = find_block(text)
        if not block:
            print("이 HTML에서 EXPERIMENT 데이터를 찾지 못했습니다.")
            return 1
        light = light or (not a.template and "const LabKit" not in text)  # 가벼운 버전은 가벼운 버전으로
        three = three or (LK3D_TAG in text and not light)  # 3D를 넣은 버전은 3D를 넣은 버전으로
        print("전에 만든 HTML의 데이터를 그대로 넣고 최신 엔진으로 다시 만듭니다" + (" (가벼운 버전)" if light else " (3D 포함)" if three else ""))
        text = block
    if three and light:
        print("가벼운 버전은 입체 엔진도 인터넷에서 불러옵니다. --3d는 한 파일 버전에만 씁니다 (--light를 빼세요).")
        return 1
    template = a.template or str(here.parent / "assets" / ("light.html" if light else "template.html"))
    tpl = Path(template).read_text(encoding="utf-8")
    data_js = load_data(text)
    html = build(tpl, data_js)
    if three:
        engine3d = here.parent / "assets" / "labkit3d.js"
        if not engine3d.exists():
            print(f"입체 엔진이 없습니다: {engine3d} (스킬 폴더의 assets/labkit3d.js)")
            return 1
        html = add3d(html, engine3d.read_text(encoding="utf-8"))
    title = re.search(r"title\s*:\s*['\"]([^'\"]+)", data_js) or re.search(r'"title"\s*:\s*"([^"]+)', data_js)
    if title:
        html = re.sub(r"<title>.*?</title>", "<title>" + title.group(1).replace("<", "") + " · 실험 과정 그림 안내</title>", html, count=1)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(html, encoding="utf-8")
    print(f"완성: {a.out} ({len(html):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
