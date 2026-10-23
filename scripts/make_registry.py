#!/usr/bin/env python3
"""(관리자용) 그림 엔진(assets/labkit.js)을 읽어 부품마다 쓰는 속성 목록 references/parts.json을 만든다.

check_data.py가 이 목록으로 '없는 부품', '없는 속성(오타)', '정해진 값이 아님'(kind 등)을 찾고,
준비물 이름 짐작(GUESS)으로 아이콘이 다른 기구 그림이 되는지 본다. 엔진을 고친 뒤 실행한다.
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
EXTRA = {"rack": ["tubes", "n"], "circuit": ["parts"], "wire": ["clip"], "tube": ["tag"], "microtube": ["tag"], "pcrtube": ["tag"], "spincolumn": ["tag"]}  # tag: 꽂이(tubes)에 꽂힌 튜브
# 정해진 값만 그림이 되는 속성. 글자면 엔진의 그 이름 객체(const SENSOR = {…})의 키, 목록이면 그 값들.
# '_common'은 모든 부품, '_container'는 그릇 모양(SHAPES) 부품. 값은 모두 엔진 코드에 있어야 한다 (build가 확인).
VALUES = {
    "_common": {"labelSide": ["left", "right"]},
    "_container": {"solid": ["powder", "precipitate", "crystals", "chips", "zinc", "magnesium", "nail", "block", "leaf", "egg", "potato", "liver", "ice", "icebath"]},
    "sensor": {"kind": "SENSOR"},
    "meter": {"kind": "METER", "dir": ["left", "right"]},
    "piece": {"kind": "PIECE"},
    "tweezers": {"piece": "PIECE"},
    "wellplate": {"kind": ["plastic", "white", "slide"]},
    "rock": {"kind": "ROCK"},
    "device": {"graph": "GRAPH", "display": ["graph", "camera", "blank"]},
    "lens": {"kind": ["convex", "concave"]},
    "mirror": {"kind": ["plane", "concave", "convex"]},
    "paper": {"kind": ["filter", "disk"]},
    "gasburner": {"flame": ["yellow", "blue"]},
    "mark": {"kind": ["ok", "no", "x"]},
    "note": {"icon": ["eye", "how", "tip", "time", "ok", "no", "warn", "idea", "result"]},
    "view": {"show": ["plantcells", "animalcells", "solid", "liquid", "gas", "crystals", "bubbles"]},
    "dish": {"items": ["seeds", "colony", "beans", "cells"]},
    "screen": {"image": ["inverted", "upright"]},
    "lightbox": {"dir": ["left", "right"]},
    "ramp": {"dir": ["left", "right"]},
    "pour": {"side": ["left", "right"]},
    "globe": {"night": ["left", "right"]},
    "track": {"dir": ["left", "right"], "support": ["block", "stand", "none"]},
    "camera": {"dir": ["left", "right"]},
    "weight": {"kind": ["hanger"]},
    "pulley": {"hang": ["hanger", "weight", "block"], "side": ["left", "right"]},
    "spring": {"hang": ["weight", "block", "hanger", "phone"]},
    "battery": {"kind": ["holder", "9v"]},
    "coil": {"kind": ["flat"]},
    "electrode": {"kind": ["plate", "rod"]},
    "wire": {"clip": ["from", "to"]},
    "glasspipette": {"kind": ["graduated", "volumetric"]},
    "tlc": {"kind": ["plate", "paper"]},
    "appliance": {"kind": "APPL"},
    "hose": {"clip": ["from", "to"]},
}
# 홈판(wellplate)의 wells 항목에 쓰는 속성. 엔진이 w.이름 / el.이름으로 읽는다 (build가 확인, id는 가리키는 이름)
WELL_PROPS = ["id", "at", "color", "fill", "solid", "solidColor", "strip", "bubbles", "cloudy", "label", "labelSide", "tag"]


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


def obj_keys(js, name):
    """엔진의 const NAME = { 키: … } 객체의 키 목록."""
    m = re.search(rf"^const {name} = \{{(.*?)\}};?$", js, re.S | re.M)
    if not m:
        raise ValueError(f"make_registry: 엔진에서 const {name} = {{…}} 를 찾지 못했어요 (VALUES를 고치세요)")
    return list(dict.fromkeys(re.findall(r"(?:^|[{,])\s*([a-z]\w*)\s*:", m.group(1), re.M)))


def values(js, shapes, types):
    """VALUES를 부품별로 펼친다. 엔진 코드에 없는 값이 있으면 ValueError (문서와 엔진이 어긋나지 않게)."""
    out = {}
    for part, props_ in VALUES.items():
        for prop, vs in props_.items():
            vs = obj_keys(js, vs) if isinstance(vs, str) else vs
            gone = [v for v in vs if not re.search(rf"['\"]{v}['\"]|\b{v}\s*:", js)]
            if gone:
                raise ValueError(f"make_registry: VALUES {part}.{prop}의 {gone}가 엔진 코드에 없어요")
            for t in (shapes if part == "_container" else [part]):
                if part.startswith("_") or t in types:
                    out.setdefault(t, {})[prop] = vs
    return dict(sorted(out.items()))


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
        if k != "T" or n.startswith("_") or n == "generic":  # _unknown·_well은 엔진 안에서만 쓴다
            continue
        ps = props(text)
        for f in fn:  # 부품이 부르는 도우미 함수(bplace, tipPlace …)의 속성도 넣는다
            if f in fprops and re.search(rf"\b{f}\(", text):
                ps |= fprops[f]
        types[n] = ps
    for group in re.findall(r"\[([^\]]*)\]\.forEach\(n => \{ T\[n\] = \{(.*?)\}; \}\);", js, re.S):
        names, body = group
        for n in re.findall(r"'([a-z]+)'", names):
            types[n] = props(body).union(*(fprops[f] for f in fprops if re.search(r"\b" + f + r"\(", body)))  # 부르는 도우미 함수(bplace, cellBox …)의 속성도
    aliases = dict(re.findall(r"\bT\.([a-z]+) = T\.([a-z]+);", js))
    plate = ch.get(("T", "wellplate"), "") + ch.get(("T", "_well"), "") + fn.get("wellPos", "")
    gone = [p for p in WELL_PROPS if p != "id" and not re.search(rf"\b(?:w|el)\??\.{p}\b", plate)]
    if gone:
        raise ValueError(f"make_registry: WELL_PROPS의 {gone}를 엔진 홈판 코드가 읽지 않아요")
    version = re.search(r"const VERSION = '([\d.]+)'", js).group(1)
    out = {
        "_": "자동 생성 파일 (scripts/make_registry.py). 손으로 고치지 않는다.",
        "engine": version,
        "common": COMMON,
        "vol": sorted(set(volspec) | {"burette", "glasspipette"}),  # vol을 그림에 새기는 부품
        "aliases": dict(sorted(aliases.items())),
        "types": {t: sorted((ps | set(EXTRA.get(t, []))) - set(COMMON)) for t, ps in sorted(types.items())},
        "values": values(js, shapes, types),
        "wells": {"props": WELL_PROPS, "values": {"solid": VALUES["_container"]["solid"]}},
        # 준비물 이름 → 아이콘 짐작 (엔진 GUESS 그대로, 앞에서부터 처음 맞는 것. '부품:1'은 이름이 그 낱말로 시작할 때만)
        "guess": dict(re.findall(r"\['([^']*)','([^']*)'\]", re.search(r"^const GUESS = (\[.*\]);$", js, re.M).group(1))),
    }
    return json.dumps(out, ensure_ascii=False, indent=1) + "\n"


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    try:
        text = build()
    except ValueError as e:
        print(e)
        return 1
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
