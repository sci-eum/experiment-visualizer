#!/usr/bin/env python3
"""실험 데이터(EXPERIMENT)를 HTML로 만들기 전에 검사한다. 브라우저 없이 돌아간다.

사용법:
    python check_data.py experiment.json      (전에 만든 결과 .html도 된다)

오류 (고쳐야 함): 필수 항목·자료형, 없는 부품 이름, 없는 속성(오타), 같은 장면의 id 중복,
    가리키는 id가 없음, 부피를 읽지 못함, 넣은 양이 용량보다 많음, 잘못된 장면 이어받기, 남은 _demo
확인 (볼 것): 좌표가 장면 밖, 준비물에 용량이 적혔는데 장면·아이콘에 vol/fromVol이 없음,
    설명·그림의 수치(양·온도·시간·농도 …)가 원문 근거 문장(origin.quote)에 없음 등
오류가 있으면 종료 코드 1.

부품 목록은 스크립트 옆의 ../references/parts.json을 쓰고, 없으면 저장소에서 내려받는다.
표준 라이브러리만 쓴다.
"""
import difflib
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
# 부품 목록: 그림 엔진과 같은 배포판(@1)을 먼저, 막히면 저장소 원본
RAW = ["https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/references/parts.json",
       "https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/references/parts.json"]
W, H = 480, 300
TOP = {"title", "subject", "unit", "duration", "group", "goal", "materials", "safety", "tips", "cover", "steps", "results",
       "source", "notes", "id", "_demo"}
STEP = {"title", "text", "time", "timer", "point", "observe", "tip", "warn", "predict", "reveal", "scene", "section", "no", "bench", "id", "origin"}
ORIGIN = {"where", "quote", "check", "unsure", "added"}
ADDED = {"tip", "warn", "point", "predict", "observe", "reveal", "scene", "text", "time"}
RESULTS = {"expect", "conclusion", "table", "tables", "questions"}
INHERIT = {"from", "remove", "change", "add"}
REVEAL = {"text", "scene", "remove", "change", "add"}
FRESH = {"note", "text", "arrow", "mark", "eye", "label", "view", "zoom", "pour"}  # 이어받지 않는 설명·동작 부품
REFS = ["on", "in", "over", "into", "hold", "link", "to", "from"]
RACKS = {"rack": "tube", "tuberack": "microtube"}  # tubes를 꽂는 부품과 t를 생략한 튜브의 종류
PORTS = {"power", "geltank", "electrophoresis"}  # 'id:+'·'id:-'로 단자를 가리킬 수 있는 부품
TEXT_FIELDS = ["text", "point", "observe", "tip", "warn", "predict"]
# 준비물 이름 → 부품 (용량 확인용)
NAME_T = [("눈금실린더", "cylinder"), ("눈금 실린더", "cylinder"), ("메스실린더", "cylinder"), ("부피 플라스크", "volumetric"),
          ("부피플라스크", "volumetric"), ("둥근바닥", "roundflask"), ("삼각 플라스크", "flask"), ("삼각플라스크", "flask"),
          ("비커", "beaker"), ("시험관", "tube"), ("시약병", "bottle"), ("뷰렛", "burette"), ("컵", "cup"),
          ("마이크로튜브", "microtube"), ("마이크로 튜브", "microtube"), ("E-tube", "microtube"), ("PCR 튜브", "pcrtube"), ("PCR튜브", "pcrtube")]

# ---------------------------------------------------------------- 부피 읽기 (엔진 parseVol과 같은 규칙)
VUNIT = {"ml": 1, "㎖": 1, "cc": 1, "cm3": 1, "cm³": 1, "l": 1000, "ℓ": 1000, "dl": 100, "㎗": 100,
         "μl": .001, "µl": .001, "ul": .001, "㎕": .001}
_U = r"(μl|µl|ul|㎕|ml|㎖|cc|cm3|cm³|dl|㎗|l|ℓ)"
_VOL = re.compile(rf"(\d+(?:\.\d+)?)\s*{_U}?(?:\s*[~∼〜]\s*(\d+(?:\.\d+)?)\s*{_U}?)?", re.I)


def parse_volume(v):
    """'100 mL' '1,000 mL' '0.5 L' '30~40 mL'(가운데) '0.5~1 L' '500 μL' → mL 숫자. 읽지 못하면 None."""
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v) if v >= 0 else None
    s = re.sub(r"(\d),(?=\d{3}(?!\d))", r"\1", str(v))
    m = _VOL.search(s)
    if not m:
        return None
    unit = (m.group(4) or m.group(2) or "").lower()
    if not unit and re.match(r"^\s*[a-zA-Zµμ]", s[m.end():]):
        return None
    k = VUNIT[unit] if unit else 1
    a = float(m.group(1)) * (VUNIT[m.group(2).lower()] if m.group(2) else k)
    b = float(m.group(3)) * k if m.group(3) else None
    return a if b is None else (a + b) / 2


# ---------------------------------------------------------------- 원문 숫자 대조
# 단위가 붙은 수치를 뽑아 같은 종류끼리 값으로 비교한다 ('1 L' = '1,000 mL', '15분' = '약 15 분')
QUNITS = {
    "부피": {"μL": .001, "µL": .001, "uL": .001, "㎕": .001, "mL": 1, "ml": 1, "㎖": 1, "cc": 1, "cm3": 1, "cm³": 1,
             "dL": 100, "dl": 100, "㎗": 100, "L": 1000, "ℓ": 1000},
    "질량": {"mg": .001, "㎎": .001, "g": 1, "kg": 1000, "㎏": 1000},
    "온도": {"℃": 1, "°C": 1, "˚C": 1},
    "시간": {"초": 1, "sec": 1, "분": 60, "min": 60, "시간": 3600},
    "길이": {"nm": 1e-9, "mm": .001, "㎜": .001, "cm": .01, "㎝": .01, "m": 1, "km": 1000},
    "백분율": {"%": 1},
    "몰농도": {"mM": .001, "M": 1, "mol/L": 1},
    "물질량": {"mol": 1},
    "방울": {"방울": 1},
    "전기": {"mA": .001, "A": 1, "V": 1, "Ω": 1, "W": 1, "Hz": 1},
}
_UNIT = {u: (dim, k) for dim, us in QUNITS.items() for u, k in us.items()}
_NUM = r"(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?"
_QTY = re.compile(r"(?<![\d.,])(" + _NUM + r"(?:\s*(?:,|~|∼|〜|-|–|와|과|또는|및)\s*" + _NUM + r")*)\s*("
                  + "|".join(re.escape(u) for u in sorted(_UNIT, key=len, reverse=True)) + r")(?![A-Za-z])")


def quantities(text):
    """글에서 단위가 붙은 수치를 뽑는다 → [(종류, 값, 원래 글자)]. '5, 10 mL' '30~40 mL'은 수마다 하나씩.
    '3분의 1'(분수)은 시간이 아니다."""
    out = []
    for m in _QTY.finditer(str(text or "")):
        unit = m.group(2)
        if unit == "분" and text[m.end():m.end() + 1] == "의":
            continue
        dim, k = _UNIT[unit]
        for n in re.findall(_NUM, m.group(1)):
            out.append((dim, float(n.replace(",", "")) * k, f"{n} {unit}" if unit[0].isascii() and unit[0].isalpha() else f"{n}{unit}"))
    return out


def missing_quantities(text, pool):
    """text의 수치 가운데 pool(수치 목록)에 같은 종류·같은 값이 없는 것 → [(종류, 원래 글자)]."""
    miss = []
    for dim, v, raw in quantities(text):
        if not any(d == dim and abs(v - w) <= 1e-6 * max(1, abs(v), abs(w)) for d, w, _ in pool) and (dim, raw) not in miss:
            miss.append((dim, raw))
    return miss


def flat_text(v):
    return " ".join(flat_text(x) for x in v) if isinstance(v, list) else (v if isinstance(v, str) else "")


def scene_text(scene):
    """단계가 직접 쓴 장면의 수치가 든 글자 (넣은 양, 이름표, 표시 글). 이어받은 기구는 앞 단계에서 이미 본다."""
    items = scene if isinstance(scene, list) else []
    if isinstance(scene, dict):
        items = list(scene.get("add") or []) + [v for v in (scene.get("change") or {}).values() if isinstance(v, dict)]
    out = []
    for el in items:
        if not isinstance(el, dict):
            continue
        for k in ("amount", "label", "text"):
            if isinstance(el.get(k), str):
                out.append(el[k])
        out += [tb.get("amount") for tb in el.get("tubes") or [] if isinstance(tb, dict) and isinstance(tb.get("amount"), str)]
    return " / ".join(out)


# ---------------------------------------------------------------- 검사
class Report:
    def __init__(self):
        self.errors, self.warns = [], []

    def err(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warns.append(f"{where}: {msg}")


def load_registry():
    local = HERE.parent / "references" / "parts.json"
    try:
        return json.loads(local.read_text(encoding="utf-8"))
    except Exception:
        pass
    for url in RAW:
        try:
            return json.loads(urllib.request.urlopen(url, timeout=20).read().decode("utf-8"))
        except Exception:
            pass
    return None


def suggest(word, options):
    m = difflib.get_close_matches(word, sorted(options), n=1, cutoff=.6)
    return f" ('{m[0]}'인가요?)" if m else ""


def is_text(v):
    return isinstance(v, str) or (isinstance(v, list) and all(isinstance(x, str) for x in v))


def name_of(el):
    return f"{el.get('t')}#{el['id']}" if el.get("id") else str(el.get("t"))


def check_part(el, where, reg, rep):
    if not isinstance(el, dict):
        rep.err(where, "부품은 객체({ \"t\": … })여야 해요")
        return
    t = el.get("t")
    if not isinstance(t, str) or not t:
        rep.err(where, "부품 이름 t가 없어요")
        return
    if reg:
        types, aliases = reg["types"], reg["aliases"]
        real = aliases.get(t, t)
        if real not in types:
            rep.err(where, f"없는 부품 '{t}'{suggest(t, list(types) + list(aliases))}")
            return
        allowed = set(reg["common"]) | set(types[real])
        for k in el:
            if k not in allowed:
                rep.err(f"{where} ({name_of(el)})", f"'{t}'에 없는 속성 '{k}'{suggest(k, allowed)}")
        if el.get("vol") is not None and real not in reg["vol"] and real in types and "vol" in types[real]:
            rep.warn(f"{where} ({name_of(el)})", f"'{t}'에는 vol이 그림에 새겨지지 않아요. 용량은 label로 적으세요")
    for k in ("vol", "amount", "fromVol"):
        v = el.get(k)
        if v not in (None, "") and parse_volume(v) is None:
            rep.err(f"{where} ({name_of(el)})", f"{k} '{v}'를 부피로 읽지 못해요 (예: '100 mL', '1,000 mL', '0.5 L')")
    vv, aa = parse_volume(el.get("vol")), parse_volume(el.get("amount"))
    if vv is not None and aa is not None and aa > vv:
        rep.err(f"{where} ({name_of(el)})", f"넣은 양 amount '{el['amount']}'이 그릇 용량 vol '{el['vol']}'보다 많아요")
    for k in ("x", "y"):
        v = el.get(k)
        if v is not None and not isinstance(v, (int, float)):
            rep.err(f"{where} ({name_of(el)})", f"{k}는 숫자여야 해요 ('{v}')")
        elif isinstance(v, (int, float)) and not (0 <= v <= (W if k == "x" else H)):
            rep.warn(f"{where} ({name_of(el)})", f"{k} = {v}이(가) 장면(x 0~{W}, y 0~{H}) 밖이에요")
    if el.get("t") in RACKS:
        for j, tb in enumerate(el.get("tubes") or []):
            if isinstance(tb, dict):
                check_part({"t": tb.get("t", RACKS[el["t"]]), **{k: v for k, v in tb.items() if k != "t"}}, f"{where}.tubes[{j}]", reg, rep)


def scene_ids(items, where, rep):
    ids = {}
    for el in items:
        if not isinstance(el, dict):
            continue
        group = [el] + [tb for tb in (el.get("tubes") or []) if isinstance(tb, dict)] if el.get("t") in RACKS else [el]
        for g in group:
            if g.get("id"):
                if g["id"] in ids:
                    rep.err(where, f"id '{g['id']}'가 한 장면에 두 번 있어요")
                ids[g["id"]] = g
    return ids


def check_refs(items, ids, where, rep):
    for el in items:
        if not isinstance(el, dict):
            continue
        for k in REFS:
            if k == "from" and el.get("t") == "pour":
                continue
            refs = el.get(k)
            for r in (refs if isinstance(refs, list) else [refs]):
                if not isinstance(r, str) or r in ids:
                    continue
                m = re.match(r"^(.+):([+\-−])$", r)  # 'id:+' 단자 (전원 장치·전기 영동 장치)
                if not m or m.group(1) not in ids:
                    rep.err(f"{where} ({name_of(el)})", f"{k}: '{r}' → 이 장면에 그런 id가 없어요")
                elif ids[m.group(1)].get("t") not in PORTS:
                    rep.err(f"{where} ({name_of(el)})", f"{k}: '{r}' → {name_of(ids[m.group(1)])}에는 (+)·(−) 단자가 없어요 ({', '.join(sorted(PORTS))}에 있어요)")


def main_check(data, reg):
    rep = Report()
    if not isinstance(data, dict):
        rep.err("데이터", "맨 바깥은 객체({ … })여야 해요")
        return rep
    for k in data:
        if k not in TOP:
            rep.err("맨 바깥", f"알 수 없는 항목 '{k}'{suggest(k, TOP)}")
    if data.get("_demo"):
        rep.err("맨 바깥", "템플릿 예시 표시 _demo가 남아 있어요")
    if not isinstance(data.get("title"), str) or not data.get("title", "").strip():
        rep.err("title", "실험 제목(title)이 필요해요")
    steps = data.get("steps")
    if not isinstance(steps, list) or not steps:
        rep.err("steps", "단계(steps)가 한 개 이상 필요해요")
        steps = []
    for k in ("goal", "subject", "unit", "duration", "group", "source", "notes"):
        if k in data and not isinstance(data[k], str):
            rep.err(k, "글자여야 해요")
    for k in ("safety", "tips"):
        if k in data and not is_text(data[k]):
            rep.err(k, "글자 또는 글자 배열이어야 해요")

    # 준비물: 용량이 적힌 그릇 (예: '눈금실린더 (10 mL)')
    vol_named = {}
    for i, m in enumerate(data.get("materials") or []):
        where = f"materials[{i}]"
        if isinstance(m, str):
            m = {"name": m}
        if not isinstance(m, dict) or not m.get("name"):
            rep.err(where, "준비물에는 name이 필요해요")
            continue
        icon = m.get("icon")
        if isinstance(icon, dict):
            check_part(icon, f"{where}.icon", reg, rep)
        elif isinstance(icon, str) and reg and reg["aliases"].get(icon, icon) not in reg["types"]:
            rep.err(f"{where}.icon", f"없는 부품 '{icon}'{suggest(icon, reg['types'])}")
        t = icon.get("t") if isinstance(icon, dict) else icon if isinstance(icon, str) else next((v for k, v in NAME_T if k in m["name"]), None)
        vol = parse_volume(m["name"]) if re.search(r"\d\s*(m[lL]|L|ℓ|cc)\b", m["name"]) else None
        if t and vol and (reg is None or t in reg["vol"]):
            vol_named.setdefault(t, m["name"])
            if not (isinstance(icon, dict) and icon.get("vol")):
                rep.warn(where, f"'{m['name']}'처럼 용량이 적힌 준비물은 아이콘에도 vol을 주세요: {{\"t\": \"{t}\", \"vol\": \"…\"}}")

    # 단계와 장면 (이어받기는 엔진과 같은 규칙으로 풀어서 검사)
    resolved = {}

    def resolve(i, sc, where, chain):
        if sc is None:
            return []
        if isinstance(sc, list):
            return sc
        if not isinstance(sc, dict):
            rep.err(where, "scene은 부품 배열이거나 이어받기 객체여야 해요")
            return []
        for k in sc:
            if k not in INHERIT:
                rep.err(where, f"이어받기에 없는 키 '{k}'{suggest(k, INHERIT)}")
        base = []
        if "from" in sc:
            f = sc["from"]
            k = i - 1 if f == "prev" else i if f == "self" else (f - 1 if isinstance(f, int) else -99)
            if not (0 <= k < len(steps)) or (k == i and f != "self"):
                rep.err(where, f"scene.from {json.dumps(f, ensure_ascii=False)} → 이어받을 단계가 없어요")
            elif k in chain:
                rep.err(where, f"scene.from이 돌고 돌아 {k + 1}단계를 다시 가리켜요")
            else:
                base = [json.loads(json.dumps(e)) for e in get_scene(k, chain) if isinstance(e, dict) and e.get("t") not in FRESH]
        for r in sc.get("remove") or []:
            n = len(base)
            base = [e for e in base if e.get("id") != r]
            if len(base) == n:
                base = [e for e in base if e.get("t") != r]
            if len(base) == n:
                rep.err(where, f"remove: '{r}' → 이어받은 장면에 그런 id나 부품이 없어요")
        def find(id_):
            for e in base:
                if e.get("id") == id_:
                    return e
                for tb in (e.get("tubes") or []) if e.get("t") in RACKS else []:
                    if isinstance(tb, dict) and tb.get("id") == id_:
                        return tb
            return None
        for id_, ch in (sc.get("change") or {}).items():
            e = find(id_)
            if e is None:
                rep.err(where, f"change: '{id_}' → 이어받은 장면에 그런 id가 없어요")
                continue
            for k, v in (ch or {}).items():
                if v is None:
                    e.pop(k, None)
                else:
                    e[k] = v
        add = sc.get("add") or []
        if not isinstance(add, list):
            rep.err(where, "add는 부품 배열이어야 해요")
            add = []
        return base + add

    def get_scene(k, chain=()):
        if k not in resolved:
            resolved[k] = resolve(k, steps[k].get("scene") if isinstance(steps[k], dict) else None, f"steps[{k}].scene", list(chain) + [k])
        return resolved[k]

    for i, st in enumerate(steps):
        where = f"steps[{i}] ({i + 1}단계)"
        if not isinstance(st, dict):
            rep.err(where, "단계는 객체여야 해요")
            continue
        for k in st:
            if k not in STEP:
                rep.err(where, f"알 수 없는 항목 '{k}'{suggest(k, STEP)}")
        if not st.get("title"):
            rep.warn(where, "단계 제목(title)이 없어요")
        for k in TEXT_FIELDS:
            if k in st and not is_text(st[k]):
                rep.err(f"{where}.{k}", "글자 또는 글자 배열이어야 해요")
        if "bench" in st and not isinstance(st["bench"], bool):
            rep.err(f"{where}.bench", "true 또는 false여야 해요")
        if "timer" in st and not (st["timer"] is False or (isinstance(st["timer"], (int, float)) and not isinstance(st["timer"], bool) and st["timer"] > 0)):
            rep.err(f"{where}.timer", "초(양수) 또는 false여야 해요")
        items = get_scene(i)
        for j, el in enumerate(items):
            check_part(el, f"{where}.scene[{j}]", reg, rep)
        ids = scene_ids(items, f"{where}.scene", rep)
        check_refs(items, ids, f"{where}.scene", rep)
        # 준비물에 용량이 적힌 그릇이 장면에 vol 없이 나오면 알린다
        for el in items:
            if not isinstance(el, dict):
                continue
            if el.get("t") in vol_named and not el.get("vol"):
                rep.warn(f"{where} ({name_of(el)})", f"준비물 '{vol_named[el['t']]}'의 용량을 vol로 주세요")
            if el.get("t") == "pour" and el.get("from", "beaker") in vol_named and not el.get("fromVol"):
                rep.warn(f"{where} (pour)", f"붓는 그릇 '{vol_named[el.get('from', 'beaker')]}'의 용량을 fromVol로 주세요")
        og = st.get("origin")
        if og is not None:
            if not isinstance(og, dict):
                rep.err(f"{where}.origin", "{ where, quote, check, unsure, added } 객체여야 해요")
            else:
                for k in og:
                    if k not in ORIGIN:
                        rep.err(f"{where}.origin", f"알 수 없는 항목 '{k}'{suggest(k, ORIGIN)}")
                for k in ("where", "quote", "unsure"):
                    if k in og and not isinstance(og[k], str):
                        rep.err(f"{where}.origin.{k}", "글자여야 해요")
                if og.get("check") not in (None, "ok", "unsure"):
                    rep.err(f"{where}.origin.check", "'ok'(확인함) 또는 'unsure'(판독 불확실)여야 해요")
                added = og.get("added", [])
                if not isinstance(added, list) or any(a not in ADDED for a in added):
                    rep.err(f"{where}.origin.added", f"원문에 없이 더한 항목 이름의 배열이어야 해요 ({', '.join(sorted(ADDED))})")
                if og.get("check") == "unsure":
                    rep.warn(where, f"원문 확인 필요: {og.get('unsure') or og.get('quote') or '판독 불확실'} — 만들기 전에 사용자에게 확인했나요?")
                if not og.get("where") and not og.get("quote"):
                    rep.warn(f"{where}.origin", "원문 위치(where)나 근거 문장(quote)을 적어 주세요")
        rv = st.get("reveal")
        if rv is not None:
            if isinstance(rv, dict):
                for k in rv:
                    if k not in REVEAL:
                        rep.err(f"{where}.reveal", f"알 수 없는 항목 '{k}'{suggest(k, REVEAL)}")
                if "text" in rv and not is_text(rv["text"]):
                    rep.err(f"{where}.reveal.text", "글자여야 해요")
                if any(k in rv for k in ("scene", "remove", "change", "add")):
                    sc = rv.get("scene") if "scene" in rv else {"from": "self", **{k: rv[k] for k in ("remove", "change", "add") if k in rv}}
                    ritems = resolve(i, sc, f"{where}.reveal", [])
                    for j, el in enumerate(ritems):
                        check_part(el, f"{where}.reveal[{j}]", reg, rep)
                    check_refs(ritems, scene_ids(ritems, f"{where}.reveal", rep), f"{where}.reveal", rep)
            elif not isinstance(rv, str):
                rep.err(f"{where}.reveal", "글자 또는 { text, change, … } 객체여야 해요")

    # 원문 숫자 대조: 설명·그림의 수치가 근거 문장(origin.quote)에 있는지. 준비물·앞 단계 근거 문장의 수치도 근거로 친다
    mats = data.get("materials") if isinstance(data.get("materials"), list) else []
    pool = quantities(" ".join(f"{m.get('name', '')} {m.get('qty', '')}" for m in mats if isinstance(m, dict)))
    for i, st in enumerate(steps):
        og = st.get("origin") if isinstance(st, dict) else None
        if not isinstance(og, dict) or not isinstance(og.get("quote"), str):
            continue
        where, added, own = f"steps[{i}] ({i + 1}단계)", og.get("added") or [], quantities(og["quote"])
        if og.get("check") != "unsure":  # 판독 불확실은 이미 알렸다
            fields = [("title", "제목", st.get("title"))] + [(k, n, st.get(k)) for k, n in (("text", "설명"), ("time", "시간")) if k not in added]
            for k, name, v in fields:
                for dim, raw in missing_quantities(flat_text(v), own + pool):
                    same = sorted({r for d, _, r in own if d == dim})
                    hint = f" (근거 문장에는 {', '.join(same)})" if same else ""
                    rep.warn(f"{where}.{k}", f"{name}의 '{raw}'가 원문 근거 문장에 없어요{hint} — 원문과 맞는지 확인해 주세요")
            if "scene" not in added:
                said = quantities(" ".join(flat_text(st.get(k)) for k in ("title", "text", "time")))
                for _, raw in missing_quantities(scene_text(st.get("scene")), own + pool + said):
                    rep.warn(f"{where}.scene", f"그림의 '{raw}'가 원문 근거 문장·설명·준비물에 없어요 — 원문과 맞는지 확인해 주세요")
        pool += own

    # 원문에서 만든 자료(source가 있음)는 단계마다 원문 대응 기록(origin)을 남긴다
    if data.get("source") and steps:
        miss = [str(i + 1) for i, st in enumerate(steps) if isinstance(st, dict) and not isinstance(st.get("origin"), dict)]
        if miss:
            rep.warn("steps", f"원문 대응 기록(origin)이 없는 단계: {', '.join(miss)} (원문 위치와 근거 문장을 남겨 주세요)")
    sids = [str(st["id"]) for st in steps if isinstance(st, dict) and st.get("id") not in (None, "")]
    for d in sorted({i for i in sids if sids.count(i) > 1}):
        rep.err("steps", f"단계 id '{d}'가 여러 번 나와요 (예상 칸의 학생 답이 엇갈려요)")

    # 표지
    if "cover" in data:
        items = resolve(-1, data["cover"], "cover", [])
        for j, el in enumerate(items):
            check_part(el, f"cover[{j}]", reg, rep)
        check_refs(items, scene_ids(items, "cover", rep), "cover", rep)

    # 결과
    res = data.get("results")
    if res is not None:
        if not isinstance(res, dict):
            rep.err("results", "객체여야 해요")
        else:
            for k in res:
                if k not in RESULTS:
                    rep.err("results", f"알 수 없는 항목 '{k}'{suggest(k, RESULTS)}")
            for k in ("expect", "conclusion"):
                if k in res and not isinstance(res[k], str):
                    rep.err(f"results.{k}", "글자여야 해요")
            qs = res.get("questions")
            if qs is not None and not (isinstance(qs, list) and all(isinstance(q, str) or (isinstance(q, dict) and isinstance(q.get("text"), str) and set(q) <= {"id", "text"}) for q in qs)):
                rep.err("results.questions", "글자 또는 { id, text } 의 배열이어야 해요")
            tables = res.get("tables") or ([res["table"]] if "table" in res else [])
            # 학생 답은 질문 id(없으면 물음 글)·표 id(없으면 제목)로 저장된다. 같으면 답이 섞이지 않게 번호가 붙지만 고치면 어긋나기 쉽다
            for what, ids in (("질문 id", [q.get("id") for q in (qs or []) if isinstance(q, dict) and q.get("id")]),
                              ("표 id", [tb.get("id") for tb in tables if isinstance(tb, dict) and tb.get("id")])):
                for d in sorted({str(i) for i in ids if ids.count(i) > 1}):
                    rep.err("results", f"{what} '{d}'가 여러 번 나와요 (학생 답이 엇갈려요)")
            for ti, tb in enumerate(tables):
                if not isinstance(tb, dict) or not isinstance(tb.get("head"), list):
                    rep.err(f"results.table[{ti}]", "head(머리 줄 배열)가 필요해요")
                    continue
                for ri, row in enumerate(tb.get("rows") or []):
                    if not isinstance(row, list):
                        rep.err(f"results.table[{ti}].rows[{ri}]", "줄은 배열이어야 해요")
                    elif len(row) != len(tb["head"]):
                        rep.warn(f"results.table[{ti}].rows[{ri}]", f"칸 수({len(row)})가 머리 줄({len(tb['head'])})과 달라요")
    return rep


def load(path):
    p = Path(path)
    text = p.read_text(encoding="utf-8-sig")
    if p.suffix.lower() in (".html", ".htm"):
        sys.path.insert(0, str(HERE))
        from extract_data import find_block, to_object
        block = find_block(text)
        if not block:
            raise ValueError("HTML에서 EXPERIMENT 데이터를 찾지 못했어요")
        return to_object(block)
    if re.match(r"^\s*(window\.)?EXPERIMENT\s*=", text):
        raise ValueError("자바스크립트 형식(window.EXPERIMENT = …)은 검사하지 못해요. JSON으로 저장해 주세요")
    return json.loads(text)


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    reg = load_registry()
    if reg is None:
        print("주의: 부품 목록(parts.json)을 찾지 못해 부품·속성 이름은 검사하지 않았어요.")
    bad = 0
    for path in sys.argv[1:]:
        try:
            data = load(path)
        except Exception as e:
            print(f"오류  {path}: 읽지 못했어요 ({e})")
            bad += 1
            continue
        rep = main_check(data, reg)
        status = "오류" if rep.errors else "확인" if rep.warns else "OK"
        print(f"{status}  {path}  (오류 {len(rep.errors)}, 확인 {len(rep.warns)})")
        for m in rep.errors:
            print("  [오류]", m)
        for m in rep.warns:
            print("  [확인]", m)
        bad += bool(rep.errors)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
