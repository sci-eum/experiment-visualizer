#!/usr/bin/env python3
"""(관리자용) 그림 엔진(assets/labkit.js)을 읽어 부품마다 쓰는 속성 목록 references/parts.json을 만든다.

check_data.py가 이 목록으로 '없는 부품', '없는 속성(오타)'을 찾는다. 엔진을 고친 뒤 실행한다.
    python scripts/make_registry.py          # 만들기
    python scripts/make_registry.py --check  # 최신인지 확인만 (check_docs.py가 부른다)
표준 라이브러리만 쓴다.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "assets" / "labkit.js"
OUT = ROOT / "references" / "parts.json"

# 어느 부품에나 쓸 수 있는 속성 (배치·이름표·이어받기 관계)
COMMON = ["t", "id", "x", "y", "s", "tilt", "label", "labelSide", "on", "in", "over", "into", "at", "dx", "dy", "stand", "reach"]
# 그릇(SHAPES) 부품이 함께 쓰는 함수들
CONTAINER_FUNCS = ["cplace", "cgeo", "fillOf", "liquid", "solids", "drawC", "veil", "volMarks", "volText", "bubbles"]
# 엔진 코드에서 el.이름으로 읽지 않지만 쓰는 속성
EXTRA = {"rack": ["tubes", "n"], "circuit": ["parts"], "tube": ["tag"], "microtube": ["tag"], "pcrtube": ["tag"], "spincolumn": ["tag"]}  # tag: 꽂이(tubes)에 꽂힌 튜브


def chunks(js):
    """맨 앞 칸에서 시작하는 정의(T.이름 = {…}, function 이름(…) {…})를 나눈다."""
    out, cur, name, kind = {}, [], None, None
    for line in js.splitlines():
        m = re.match(r"^T\.(\w+) = \{", line) or re.match(r"^function (\w+)\(", line)
        if m:
            if name:
                out.setdefault((kind, name), []).extend(cur)
            name, kind, cur = m.group(1), ("T" if line.startswith("T.") else "fn"), [line]
            continue
        if name:
            cur.append(line)
            if line.startswith("}"):
                out.setdefault((kind, name), []).extend(cur)
                name, cur = None, []
    return {k: "\n".join(v) for k, v in out.items()}


def props(text):
    return set(re.findall(r"\bel\.([A-Za-z_]\w*)", text)) - {"_g", "_parent", "_slot", "_done", "_level"}


def build():
    js = ENGINE.read_text(encoding="utf-8")
    ch = chunks(js)
    fn = {n: t for (k, n), t in ch.items() if k == "fn"}
    fprops = {n: props(t) for n, t in fn.items()}
    shapes = re.findall(r"^  ([a-z]+): \{", re.search(r"const SHAPES = \{(.*?)\n\};", js, re.S).group(1), re.M)
    volspec = re.findall(r"^  ([a-z]+): \{", re.search(r"const VOLSPEC = \{(.*?)\n\};", js, re.S).group(1), re.M)
    container = set().union(*(fprops.get(f, set()) for f in CONTAINER_FUNCS))
    types = {}
    for t in shapes:
        types[t] = container
    for (k, n), text in ch.items():
        if k != "T" or n in ("_unknown", "generic"):
            continue
        ps = props(text)
        for f in fn:  # 부품이 부르는 도우미 함수(bplace, tipPlace …)의 속성도 넣는다
            if f in fprops and re.search(rf"\b{f}\(", text):
                ps |= fprops[f]
        types[n] = ps
    for group in re.findall(r"\[([^\]]*)\]\.forEach\(n => \{ T\[n\] = \{(.*?)\}; \}\);", js):
        names, body = group
        for n in re.findall(r"'([a-z]+)'", names):
            types[n] = props(body) | fprops.get("bplace", set())
    aliases = dict(re.findall(r"\bT\.([a-z]+) = T\.([a-z]+);", js))
    version = re.search(r"const VERSION = '([\d.]+)'", js).group(1)
    out = {
        "_": "자동 생성 파일 (scripts/make_registry.py). 손으로 고치지 않는다.",
        "engine": version,
        "common": COMMON,
        "vol": sorted(set(volspec) | {"burette"}),  # vol을 그림에 새기는 부품
        "aliases": dict(sorted(aliases.items())),
        "types": {t: sorted((ps | set(EXTRA.get(t, []))) - set(COMMON)) for t, ps in sorted(types.items())},
    }
    return json.dumps(out, ensure_ascii=False, indent=1) + "\n"


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    text = build()
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("references/parts.json: " + ("최신" if same else "엔진과 다릅니다. python scripts/make_registry.py 를 실행하세요."))
        return 0 if same else 1
    OUT.write_text(text, encoding="utf-8")
    n = len(json.loads(text)["types"])
    print(f"references/parts.json 갱신 (부품 {n}종)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
