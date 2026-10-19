#!/usr/bin/env python3
"""(관리자용) examples/recipes.json 의 장면 예시로 references/scenes.md 를 만든다.

장면 예시의 원본은 recipes.json 하나다. 예시를 고치거나 더하면 이 스크립트를 실행한다.
(recipes.html 은 build_html.py 로 같은 파일에서 그린다. 그래서 문서의 예시는 늘 실제로 그려 본 장면이다.)
표준 라이브러리만 쓴다.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "examples" / "recipes.json"
OUT = ROOT / "references" / "scenes.md"

HEAD = """# 장면 예시 (그대로 고쳐 쓰기)

> experiment-visualizer 스킬의 참고 문서다. 작업 순서와 규칙은 SKILL.md에 있다.
> 이 예시들은 모두 실제로 그려 본 장면이다: https://sci-eum.github.io/experiment-visualizer/examples/recipes.html
> 부품 이름과 속성은 parts.md를 본다.

비슷한 장면이 있으면 여기서 가져와 좌표·색·양만 원문에 맞게 고친다. 블록 하나가 단계의 `scene` 값이다.
"""


def scene_text(sc):
    item = lambda v: json.dumps(v, ensure_ascii=False, separators=(", ", ": "))
    if isinstance(sc, list):
        return "[" + ",\n ".join(item(e) for e in sc) + "]"
    lines = [f'  "{k}": {item(v)}' for k, v in sc.items()]
    return "{\n" + ",\n".join(lines) + "\n}"


def build():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    out, section = [HEAD], None
    for i, st in enumerate(data.get("steps", []), 1):
        sec = st.get("section") or "기본 장면"
        if sec != section:
            out.append(f"\n## {sec}\n")
            section = sec
        out.append(f"\n### {i}. {st.get('title', '')}\n")
        if st.get("text"):
            out.append(f"\n{st['text']}\n")
        out.append("\n```json\n" + scene_text(st.get("scene", [])) + "\n```\n")
        extra = {k: st[k] for k in ("time", "predict", "reveal") if k in st}  # 수업 기능 (단계 속성)
        if extra:
            out.append("\n단계에 함께 쓴 속성:\n\n```json\n" + json.dumps(extra, ensure_ascii=False) + "\n```\n")
    return "".join(out)


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    text = build()
    if "--check" in sys.argv:  # 문서가 recipes.json과 같은지 확인만 한다
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("references/scenes.md: " + ("최신" if same else "recipes.json과 다릅니다. make_scenes_doc.py를 실행하세요."))
        return 0 if same else 1
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"references/scenes.md 갱신 ({len(data_steps())}개 장면, {len(text.splitlines())}줄)")
    return 0


def data_steps():
    return json.loads(SRC.read_text(encoding="utf-8")).get("steps", [])


if __name__ == "__main__":
    sys.exit(main())
