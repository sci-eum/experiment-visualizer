#!/usr/bin/env python3
"""이미 만든 결과 HTML에서 EXPERIMENT 데이터를 꺼낸다 (다시 고칠 때 쓴다).

사용법:
    python extract_data.py 결과.html [experiment.json]

- 데이터가 JSON이면 experiment.json(들여쓰기)으로 저장한다. 고친 뒤 build_html.py로 다시 만든다.
- 자바스크립트 객체라 JSON으로 읽지 못하면 experiment.js로 저장한다 (build_html.py는 .js도 받는다).
- 결과 HTML에 데이터 표시(EXPERIMENT DATA START/END)가 없어도 window.EXPERIMENT = … 를 찾아 꺼낸다.
표준 라이브러리만 쓴다.
"""
import json
import re
import sys
from pathlib import Path

START = "/* ===== EXPERIMENT DATA START"
END = "/* ===== EXPERIMENT DATA END ===== */"


def find_block(html: str):
    """HTML 안의 `window.EXPERIMENT = …;` 글자를 돌려준다. 없으면 None."""
    i = html.find(START)
    if i >= 0:
        j = html.find(END, i)
        if j > i:
            return html[html.find("\n", i) + 1:j].strip()
    m = re.search(r"window\.EXPERIMENT\s*=\s*", html)
    if not m:
        return None
    try:  # JSON이면 끝을 정확히 찾는다
        _, end = json.JSONDecoder().raw_decode(html, m.end())
        return "window.EXPERIMENT = " + html[m.end():end] + ";"
    except ValueError:  # 자바스크립트 객체면 스크립트 끝까지
        k = html.find("</script>", m.end())
        return html[m.start():k].strip() if k > 0 else None


def to_object(block: str):
    """`window.EXPERIMENT = {…};`를 JSON으로 읽는다. 자바스크립트 객체면 ValueError."""
    text = re.sub(r"^\s*(?:window\.)?EXPERIMENT\s*=\s*", "", block).strip().rstrip(";").strip()
    obj = json.loads(text)
    if not isinstance(obj, dict):
        raise ValueError("데이터가 객체({ … })가 아닙니다.")
    return obj


def describe(html: str):
    if "const LabKit" in html:
        m = re.search(r"LabKit v(\d+\.\d+\.\d+)", html)
        return f"한 파일 버전 (엔진 v{m.group(1) if m else '?'} 포함)"
    if "labkit.min.js" in html or "labkit.js" in html:
        return "가벼운 버전 (엔진은 열 때 인터넷에서 최신으로 불러옴)"
    return "엔진을 찾지 못함"


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    html = src.read_text(encoding="utf-8", errors="replace")
    block = find_block(html)
    if not block:
        print("이 HTML에서 EXPERIMENT 데이터를 찾지 못했습니다. experiment-visualizer로 만든 파일인지 확인하세요.")
        return 1
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_name("experiment.json")
    try:
        data = to_object(block)
        out = out.with_suffix(".json")
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        steps = data.get("steps") or []
        print(f"꺼냄: {out}  (제목: {data.get('title', '-')}, 단계 {len(steps)}개, {describe(html)})")
        if data.get("_demo"):
            print("주의: 템플릿 예시 데이터(_demo)가 남아 있습니다.")
    except ValueError:
        out = out.with_suffix(".js")
        out.write_text(block.rstrip() + "\n", encoding="utf-8")
        print(f"꺼냄: {out}  (자바스크립트 객체라 JSON으로 바꾸지 않았습니다. 이 파일을 고쳐 build_html.py에 그대로 주면 됩니다. {describe(html)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
