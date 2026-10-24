#!/usr/bin/env python3
"""실험 데이터(EXPERIMENT)를 HTML로 만들기 전에 검사한다. 브라우저 없이 돌아간다.

사용법:
    python check_data.py experiment.json      (전에 만든 결과 .html도 된다)

오류 (고쳐야 함): 필수 항목·자료형, 없는 부품 이름, 없는 속성(오타), 정해진 값이 아님(kind·solid …),
    같은 장면의 id 중복, 가리키는 id가 없음, 부피를 읽지 못함, 넣은 양이 용량보다 많음, 잘못된 장면 이어받기, 남은 _demo
확인 (볼 것): 좌표가 장면 밖, 준비물에 용량이 적혔는데 장면·아이콘에 vol/fromVol이 없음,
    설명·그림의 수치(양·온도·시간·농도 …)가 원문 근거 문장(origin.quote)에 없음,
    준비물 아이콘이 이름 짐작으로 다른 기구 그림이 됨('피펫' → 스포이트), 몇 시간짜리 타이머가 생김 등
오류가 있으면 종료 코드 1.

부품 목록은 스크립트 옆의 ../references/parts.json을 쓰고, 없으면 저장소에서 내려받는다.
표준 라이브러리만 쓴다.
"""
import argparse
import difflib
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
# 부품 목록: 그림 엔진과 같은 고정 배포판을 먼저, 막히면 같은 태그의 저장소 원본
VERSION = "1.22.0"
RAW = [f"https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@{VERSION}/references/parts.json",
       f"https://raw.githubusercontent.com/sci-eum/experiment-visualizer/v{VERSION}/references/parts.json"]
W, H = 480, 300
TOP = {"title", "subject", "unit", "duration", "group", "goal", "materials", "safety", "tips", "cover", "steps", "results",
       "source", "notes", "id", "_demo"}
STEP = {"title", "text", "time", "timer", "point", "observe", "tip", "warn", "predict", "reveal", "scene", "section", "no", "bench", "id", "origin", "sketch"}
ORIGIN = {"where", "quote", "check", "unsure", "added"}
ADDED = {"tip", "warn", "point", "predict", "observe", "reveal", "scene", "text", "time"}
RESULTS = {"expect", "conclusion", "table", "tables", "questions", "sketches"}
SKETCH = {"id", "title", "shape", "n", "labels", "write", "note", "range"}  # 그림 칸 (range: 스펙트럼 띠의 파장 범위)
SKETCH_SHAPES = ("circle", "box", "polar", "spectrum")
CELL = {"text", "span", "rowspan", "off"}  # 표 칸 객체 (합친 칸·쓰지 않는 칸)
# 이어받기에서 앞 단계 것이 그대로 남기 쉬운 동작 부품. add로 같은 부품을 또 놓으면 둘이 된다
MOVERS = {"ball", "cart", "block", "dropper", "pipette", "spatula", "spoon", "splint", "swab", "capillary", "tweezers", "rod",
          "glasspipette", "micropipette", "syringe", "magnet", "meter"}
INHERIT = {"from", "remove", "change", "add"}
REVEAL = {"text", "scene", "remove", "change", "add"}
FRESH = {"note", "text", "arrow", "mark", "eye", "label", "view", "zoom", "pour"}  # 이어받지 않는 설명·동작 부품
REFS = ["on", "in", "over", "into", "hold", "link", "to", "from"]
RACKS = {"rack": "tube", "tuberack": "microtube"}  # tubes를 꽂는 부품과 t를 생략한 튜브의 종류
PORTS = {"power", "geltank", "electrophoresis", "meter", "coil", "battery", "bulb", "switch", "ammeter", "voltmeter", "resistor", "motor", "led"}  # 'id:+'·'id:-' 단자가 있는 부품
METER_PORTS = {"multi", "galvano", "ammeter", "voltmeter"}  # 단자가 있는 meter kind
KIDS = {"rack": "tubes", "tuberack": "tubes", "wellplate": "wells"}  # 안에 든 것(시험관·튜브·홈)에도 id를 주어 가리킨다
TEXT_FIELDS = ["text", "point", "observe", "tip", "warn", "predict"]
# 준비물 이름 → 부품 (용량 확인용)
NAME_T = [("눈금실린더", "cylinder"), ("눈금 실린더", "cylinder"), ("메스실린더", "cylinder"), ("부피 플라스크", "volumetric"),
          ("부피플라스크", "volumetric"), ("둥근바닥", "roundflask"), ("삼각 플라스크", "flask"), ("삼각플라스크", "flask"),
          ("비커", "beaker"), ("시험관", "tube"), ("시약병", "bottle"), ("뷰렛", "burette"), ("컵", "cup"), ("주사기", "syringe"), ("수조", "trough"), ("눈금 피펫", "glasspipette"), ("메스 피펫", "glasspipette"), ("홀 피펫", "glasspipette"), ("부피 피펫", "glasspipette"),
          ("마이크로튜브", "microtube"), ("마이크로 튜브", "microtube"), ("E-tube", "microtube"), ("PCR 튜브", "pcrtube"), ("PCR튜브", "pcrtube")]
# 준비물 아이콘이 이름 짐작(엔진 GUESS)으로 다른 기구 그림이 되는 경우: (이름 무늬, 짐작한 부품이 이것이면, 그림 이름)
MISGUESS = [
    (re.compile(r"피펫"), {"dropper"}, "스포이트"),
    (re.compile(r"(물|용액|수용액|액)\s*$"), {"powder"}, "가루 더미"),
    (re.compile(r"(디지털|적외선|탐침|레이저|전자)\s*온도계"), {"thermometer"}, "유리 막대 온도계"),
    (re.compile(r"(시험관|비커|플라스크|뷰렛|깔때기|실린더|수조)\s*(집게|홀더|솔|받침)"),
     {"tube", "beaker", "flask", "roundflask", "burette", "funnel", "cylinder", "trough"}, None),
]
GENERIC = {"t", "text"}  # 준비물 아이콘 전용 { "t": "generic", "text": … }: 맞는 그림이 없을 때 첫 글자 상자
TIMER_MAX = 2 * 3600  # 이보다 긴 시간('24시간')은 수업 모드 타이머로 쓸 일이 거의 없다

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
    "전류": {"mA": .001, "A": 1},
    "전압": {"mV": .001, "V": 1},
    "저항": {"Ω": 1, "kΩ": 1000},
    "전력": {"mW": .001, "W": 1},
    "진동수": {"Hz": 1, "kHz": 1000},
    "압력": {"Pa": 1, "kPa": 1000, "MPa": 1e6},
}
_UNIT = {u: (dim, k) for dim, us in QUNITS.items() for u, k in us.items()}
_NUM = r"[+−-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+−-]?\d+)?"
_QTY = re.compile(r"(?<![\d.,])(" + _NUM + r"(?:\s*(?:,|~|∼|〜|-|–|와|과|또는|및)\s*" + _NUM + r")*)\s*("
                  + "|".join(re.escape(u) for u in sorted(_UNIT, key=len, reverse=True)) + r")(?![A-Za-z])")
# 표 머리처럼 숫자 없이 적힌 단위: 괄호 안 '온도 (°C)' '시간(sec)' '(단위: mL)', 또는 기호 단위 '℃' '㎖'
_HEAD = re.compile(r"[(（\[]([^()（）\[\]]*)[)）\]]")
_SYM = re.compile(r"℃|[°˚]C|[㎖㎕㎗㎎㎏㎜㎝ℓ]")
_ALIAS = {"s": "sec", "secs": "sec", "second": "sec", "seconds": "sec", "mins": "min", "minute": "min", "minutes": "min"}
_LOW = {}
for _u in _UNIT:
    if len(_u) > 1:
        _LOW.setdefault(_u.lower(), set()).add(_UNIT[_u])
_LOW = {u: v.pop() for u, v in _LOW.items() if len(v) == 1}  # 'ML' 'Sec'도 읽되, 'mm'(길이·몰농도)처럼 겹치면 대소문자대로만
_COUNT = re.compile(r"\s*(?:개|회|번|배|쪽|단계|명|차|가지|마리)")  # '45회' '1단계'는 맨 숫자가 아니다


def _raw(n, unit):
    return f"{n} {unit}" if unit[0].isascii() and unit[0].isalpha() else f"{n}{unit}"


def head_units(text):
    """숫자 없이 적힌 단위 → {종류: (배수, 단위)}. 수치에 붙은 단위('5 mL')는 빼고 본다.
    'tube(s)'처럼 영어 낱말에 붙은 괄호 속 한 글자는 단위로 보지 않는다."""
    rest = _QTY.sub(" ", text)
    words = _SYM.findall(rest)
    for m in _HEAD.finditer(rest):
        glued = re.match(r"[A-Za-z]", rest[m.start() - 1:m.start()])
        words += [w.strip() for w in re.split(r"[,/·;]", re.sub(r"^\s*단위\s*[:：]?", "", m.group(1))) if not (glued and len(w.strip()) == 1)]
    out = {}
    for w in words:
        hit = _UNIT.get(w) or _LOW.get(w.lower()) or _UNIT.get(_ALIAS.get(w.lower(), ""))
        if hit:
            out.setdefault(hit[0], (hit[1], w))
    return out


def quantities(text, header=False):
    """글에서 단위가 붙은 수치를 뽑는다 → [(종류, 값, 원래 글자)]. '5, 10 mL' '30~40 mL'은 수마다 하나씩.
    '3분의 1'(분수)은 시간이 아니다. header=True(근거 문장)면 표처럼 단위가 머리에만 있을 때
    ('온도 (°C) / 시간(sec): 95 / 300') 맨 숫자를 그 단위의 수치로도 친다 ('300' → 300 sec = 5분)."""
    out, text = [], str(text or "")
    for m in _QTY.finditer(text):
        unit = m.group(2)
        if unit == "분" and text[m.end():m.end() + 1] == "의":
            continue
        dim, k = _UNIT[unit]
        # '5-10'의 붙임표는 범위 구분자, '-5~-2'의 빼기표는 부호다.
        nums = re.sub(r"(?<=\d)\s*[-–]\s*(?=\d)", "~", m.group(1))
        for n in re.findall(_NUM, nums):
            out.append((dim, float(n.replace(",", "").replace("−", "-")) * k, _raw(n, unit)))
    heads = head_units(text) if header else {}
    if heads:
        rest = _QTY.sub(" ", text)
        bare = [m.group() for m in re.finditer(r"(?<![\d.A-Za-z])" + _NUM, rest) if not _COUNT.match(rest, m.end())]
        for dim, (k, unit) in heads.items():
            for n in dict.fromkeys(bare):
                out.append((dim, float(n.replace(",", "").replace("−", "-")) * k, _raw(n, unit)))
    return out


def missing_quantities(text, pool):
    """text의 수치 가운데 pool(수치 목록)에 같은 종류·같은 값이 없는 것 → [(종류, 원래 글자)]."""
    miss = []
    for dim, v, raw in quantities(text):
        if not any(d == dim and abs(v - w) <= 1e-6 * max(abs(v), abs(w)) for d, w, _ in pool) and (dim, raw) not in miss:
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
        for k in ("amount", "label", "text", "hangText"):
            if isinstance(el.get(k), str):
                out.append(el[k])
        out += [k[f] for k in kids(el) for f in ("amount", "label", "tag") if isinstance(k.get(f), str)]
    return " / ".join(out)


# ---------------------------------------------------------------- 검사
class Report:
    def __init__(self, strict_source=False):
        self.errors, self.warns = [], []
        self.strict_source = strict_source

    def err(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warns.append(f"{where}: {msg}")

    def source(self, where, msg):
        (self.err if self.strict_source else self.warn)(where, msg)


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
                hint = (" — 용량을 그림에 새기지 않는 부품이에요. 용량은 label로 적으세요 (예: '50 mL 주사기')"
                        if k in ("vol", "amount") else suggest(k, allowed))
                rep.err(f"{where} ({name_of(el)})", f"'{t}'에 없는 속성 '{k}'{hint}")
        vals = {**reg.get("values", {}).get("_common", {}), **reg.get("values", {}).get(real, {})}
        for k, opts in vals.items():
            v = el.get(k)
            if isinstance(v, str) and v not in opts:
                more = " — 그 밖의 센서는 kind 'other'에 text로 이름을 적으세요 (예: 'CO₂')" if real == "sensor" and k == "kind" else ""
                rep.err(f"{where} ({name_of(el)})", f"'{t}'의 {k} '{v}'는 정해진 값이 아니에요 ({', '.join(opts)}){suggest(v, opts)}{more}")
        if real == "svg" and el.get("y") is None and not where.endswith(".icon") and not any(el.get(k) for k in ("on", "in", "over")):  # 준비물 아이콘은 위치와 상관없다
            rep.warn(f"{where} ({name_of(el)})", "svg에 y가 없어요. 실험대 위에 세우려면 y: 268 (markup은 0,0에서 위쪽(음수 y)으로 그린다)")
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
    z = el.get("z")  # 입체 보기에서만 앞뒤로 옮기는 거리 (v1.21)
    if z is not None and (isinstance(z, bool) or not isinstance(z, (int, float))):
        rep.err(f"{where} ({name_of(el)})", f"z는 숫자여야 해요 ('{z}')")
    elif isinstance(z, (int, float)) and abs(z) > 110:
        rep.warn(f"{where} ({name_of(el)})", f"z = {z}는 실험대 깊이(−110~110)를 넘어요. 입체 보기에서 실험대 밖으로 나가요")
    if el.get("t") == "wellplate" and reg and "wells" in reg:
        wp, wv = set(reg["wells"]["props"]), reg["wells"]["values"]
        for j, w in enumerate(el.get("wells") or []):
            if not isinstance(w, dict):
                rep.err(f"{where}.wells[{j}]", "홈은 객체({ \"id\": …, \"at\": \"A1\" })여야 해요")
                continue
            for k in w:
                if k not in wp:
                    rep.err(f"{where}.wells[{j}]", f"홈에 없는 속성 '{k}'{suggest(k, wp)}")
            for k, opts in wv.items():
                if isinstance(w.get(k), str) and w[k] not in opts:
                    rep.err(f"{where}.wells[{j}]", f"홈의 {k} '{w[k]}'는 정해진 값이 아니에요 ({', '.join(opts)}){suggest(w[k], opts)}")
            if "at" in w and not (isinstance(w["at"], str) and re.fullmatch(r"\s*[A-Za-z]\s*\d+\s*", w["at"])):
                rep.err(f"{where}.wells[{j}]", f"홈 자리 at '{w['at']}'는 'B3'처럼 줄 글자와 칸 번호로 써요")
    if el.get("t") in RACKS:
        for j, tb in enumerate(el.get("tubes") or []):
            if isinstance(tb, dict):
                check_part({"t": tb.get("t", RACKS[el["t"]]), **{k: v for k, v in tb.items() if k != "t"}}, f"{where}.tubes[{j}]", reg, rep)


def guess_icon(name, reg):
    """준비물 이름 → 엔진이 짐작하는 아이콘 부품 (엔진 guess와 같은 규칙). 맞는 것이 없으면 'generic'."""
    n = re.sub(r"\(.*?\)", "", str(name)).strip()
    for k, v in (reg or {}).get("guess", {}).items():
        t, _, flag = v.partition(":")
        if flag == "1":
            if n == k or n.startswith(k + " "):
                return t
        elif k in n:
            return t
    return "generic"


def kids(el):
    """시험관대·튜브 꽂이의 tubes, 홈판의 wells (객체만)."""
    return [k for k in (el.get(KIDS[el["t"]]) or []) if isinstance(k, dict)] if isinstance(el, dict) and el.get("t") in KIDS else []


def check_table(tb, where, rep):
    """결과 표: 칸 객체 { text, span, rowspan, off }, 머리 칸 { text, span }. 합친 칸까지 세어 줄마다 칸 수가 머리 줄과 같은지 본다."""
    def span_of(c, k, w):
        if not isinstance(c, dict) or k not in c:
            return 1
        v = c[k]
        if not (isinstance(v, int) and not isinstance(v, bool) and v >= 1):
            rep.err(w, f"{k}는 1 이상의 정수여야 해요 ('{v}')")
            return 1
        return v
    width = 0
    for hi, h in enumerate(tb["head"]):
        if isinstance(h, dict):
            for k in h:
                if k not in ("text", "span"):
                    rep.err(f"{where}.head[{hi}]", f"머리 칸에 없는 항목 '{k}'{suggest(k, ('text', 'span'))}")
        width += span_of(h, "span", f"{where}.head[{hi}]")
    down = {}
    for ri, row in enumerate(tb.get("rows") or []):
        w = f"{where}.rows[{ri}]"
        if not isinstance(row, list):
            rep.err(w, "줄은 배열이어야 해요")
            continue
        vc = 0

        def skip():
            nonlocal vc
            while down.get(vc, 0) > 0:
                down[vc] -= 1
                vc += 1
        for ci, c in enumerate(row):
            skip()
            if isinstance(c, dict):
                for k in c:
                    if k not in CELL:
                        rep.err(f"{w}[{ci}]", f"표 칸에 없는 항목 '{k}'{suggest(k, CELL)}")
            elif c is not None and not isinstance(c, (str, int, float)):
                rep.err(f"{w}[{ci}]", "표 칸은 글자, \"\"(적는 칸), 또는 { text, span, rowspan, off } 객체여야 해요")
            span, rs = span_of(c, "span", f"{w}[{ci}]"), span_of(c, "rowspan", f"{w}[{ci}]")
            for k in range(span):
                if rs > 1:
                    down[vc + k] = rs - 1
            vc += span
        skip()
        if vc != width:
            rep.warn(w, f"칸 수({vc}, 합친 칸 포함)가 머리 줄({width})과 달라요")
    if any(v > 0 for v in down.values()):
        rep.warn(where, "세로로 합친 칸(rowspan)이 표의 줄 수보다 길어요")


def check_sketches(v, where, rep):
    """그림 칸(단계의 sketch, results.sketches): 객체 또는 객체 배열 → 저장 이름(id 또는 제목) 목록."""
    keys = []
    for j, sk in enumerate(v if isinstance(v, list) else [v]):
        w = f"{where}[{j}]" if isinstance(v, list) else where
        if not isinstance(sk, dict):
            rep.err(w, "그림 칸은 { title, shape, … } 객체여야 해요")
            continue
        for k in sk:
            if k not in SKETCH:
                rep.err(w, f"그림 칸에 없는 항목 '{k}'{suggest(k, SKETCH)}")
        if sk.get("shape") is not None and sk["shape"] not in SKETCH_SHAPES:
            rep.err(w, f"shape '{sk['shape']}'는 정해진 값이 아니에요 ({', '.join(SKETCH_SHAPES)}){suggest(str(sk['shape']), SKETCH_SHAPES)}")
        n = sk.get("n")
        if n is not None and not (isinstance(n, int) and not isinstance(n, bool) and 1 <= n <= 6):
            rep.err(w, "n(칸 수)은 1~6 정수여야 해요")
        rg = sk.get("range")
        if rg is not None and not (isinstance(rg, list) and len(rg) == 2 and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in rg) and rg[0] < rg[1]):
            rep.err(w, "range는 [작은 값, 큰 값] 두 숫자여야 해요 (예: [400, 700])")
        if "labels" in sk and not (isinstance(sk["labels"], list) and all(isinstance(x, str) for x in sk["labels"])):
            rep.err(w, "labels는 글자 배열이어야 해요")
        for k in ("title", "write", "note"):
            if k in sk and not isinstance(sk[k], str):
                rep.err(w, f"{k}는 글자여야 해요")
        if not sk.get("title") and sk.get("id") is None:
            rep.warn(w, "그림 칸에 title(무엇을 그리는지)을 적어 주세요")
        keys.append(str(sk["id"]) if sk.get("id") is not None else sk.get("title"))
    return keys


def scene_ids(items, where, rep):
    ids = {}
    for el in items:
        if not isinstance(el, dict):
            continue
        group = [el] + kids(el)
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
                elif ids[m.group(1)].get("t") not in PORTS or (ids[m.group(1)].get("t") == "meter" and ids[m.group(1)].get("kind") not in METER_PORTS):
                    rep.err(f"{where} ({name_of(el)})", f"{k}: '{r}' → {name_of(ids[m.group(1)])}에는 (+)·(−) 단자가 없어요 (power·geltank·coil·회로 낱개 부품, meter kind {'·'.join(sorted(METER_PORTS))}에 있어요)")


def main_check(data, reg, strict_source=False):
    rep = Report(strict_source)
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
    if strict_source and not str(data.get("source") or "").strip():
        rep.err("source", "엄격 원문 검사에는 원문 이름(source)이 필요해요")
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
        if isinstance(icon, dict) and icon.get("t") == "generic":
            for k in icon:
                if k not in GENERIC:
                    rep.err(f"{where}.icon", f"generic 아이콘에 없는 속성 '{k}' (text만 써요)")
        elif isinstance(icon, dict):
            check_part(icon, f"{where}.icon", reg, rep)
        elif icon == "generic":
            rep.warn(f"{where}.icon", "글자가 없으면 '?' 상자로 나와요. {\"t\": \"generic\", \"text\": \"…\"}로 주세요")
        elif isinstance(icon, str) and reg and reg["aliases"].get(icon, icon) not in reg["types"]:
            rep.err(f"{where}.icon", f"없는 부품 '{icon}'{suggest(icon, reg['types'])}")
        if icon is None and reg:
            n = re.sub(r"\(.*?\)", "", m["name"])
            g = guess_icon(m["name"], reg)
            for rx, bad, what in MISGUESS:
                hit = rx.search(n)
                if hit and g in bad:
                    rep.warn(where, f"준비물 '{m['name']}'의 아이콘이 이름 짐작으로 {what or repr(hit.group(1))}({g}) 그림이 돼요. "
                                    "다른 기구면 icon을 주세요 — 비슷한 부품이나 {\"t\": \"generic\", \"text\": \"…\"}(첫 글자 상자)")
                    break
        t = icon.get("t") if isinstance(icon, dict) else icon if isinstance(icon, str) else next((v for k, v in NAME_T if k in m["name"]), None)
        vol = parse_volume(m["name"]) if re.search(r"\d\s*(m[lL]|L|ℓ|cc)\b", m["name"]) else None
        if t and vol and (reg is None or t in reg["vol"]):
            vol_named.setdefault(t, m["name"])
            if not (isinstance(icon, dict) and icon.get("vol")):
                rep.warn(where, f"'{m['name']}'처럼 용량이 적힌 준비물은 아이콘에도 vol을 주세요: {{\"t\": \"{t}\", \"vol\": \"…\"}}")

    # 단계와 장면 (이어받기는 엔진과 같은 규칙으로 풀어서 검사)
    resolved = {}
    sk_keys = []

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
                for tb in kids(e):
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
        if "from" in sc:  # 앞 단계의 공·스포이트 같은 동작 부품은 그대로 이어지므로, 같은 부품을 add하면 둘이 된다
            have = {e.get("t") for e in base}
            for t in sorted({a.get("t") for a in add if isinstance(a, dict)} & have & MOVERS):
                rep.warn(where, f"이어받은 장면에 '{t}'가 이미 있어요 (앞 단계에서 이어짐). 옮기려면 change, 새로 놓으려면 remove로 앞 것을 빼세요")
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
        if "sketch" in st:
            sk_keys += check_sketches(st["sketch"], f"{where}.sketch", rep)
        if "bench" in st and not isinstance(st["bench"], bool):
            rep.err(f"{where}.bench", "true 또는 false여야 해요")
        if "timer" in st and not (st["timer"] is False or (isinstance(st["timer"], (int, float)) and not isinstance(st["timer"], bool) and st["timer"] > 0)):
            rep.err(f"{where}.timer", "초(양수) 또는 false여야 해요")
        if "timer" not in st and isinstance(st.get("time"), str):  # 엔진 timerOf와 같은 규칙으로 타이머 길이를 읽는다
            sec = sum(float(n) * {"시간": 3600, "분": 60, "초": 1}[u] for n, u in re.findall(r"(\d+(?:\.\d+)?)\s*(시간|분|초)", st["time"]))
            if sec > TIMER_MAX:
                rep.warn(f"{where}.time", f"'{st['time']}'(으)로 수업 모드에 {sec / 3600:g}시간짜리 타이머가 생겨요. 수업 중에 재는 시간이 아니면 \"timer\": false를 주세요")
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
                    rep.source(where, f"원문 확인 필요: {og.get('unsure') or og.get('quote') or '판독 불확실'} — 만들기 전에 사용자에게 확인했나요?")
                if not og.get("where") or not og.get("quote"):
                    rep.source(f"{where}.origin", "원문 위치(where)와 근거 문장(quote)을 모두 적어 주세요")
                if strict_source and og.get("check") != "ok" and og.get("check") != "unsure":
                    rep.err(f"{where}.origin.check", "엄격 원문 검사에는 판독 상태 check가 필요해요")
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

    # 원문 숫자 대조: 설명·그림의 수치가 근거 문장(origin.quote)에 있는지. 준비물·앞 단계 근거 문장의 수치도 근거로 친다.
    # 근거 문장이 표라서 단위가 머리에만 있으면('온도 (°C)') 칸의 맨 숫자를 그 단위로 읽는다
    mats = data.get("materials") if isinstance(data.get("materials"), list) else []
    material_pool = quantities(" ".join(f"{m.get('name', '')} {m.get('qty', '')}" for m in mats if isinstance(m, dict)))
    pool = list(material_pool)
    for i, st in enumerate(steps):
        og = st.get("origin") if isinstance(st, dict) else None
        if not isinstance(og, dict) or not isinstance(og.get("quote"), str):
            continue
        where, added, own = f"steps[{i}] ({i + 1}단계)", og.get("added") or [], quantities(og["quote"], header=True)
        evidence = own if strict_source else own + pool
        if og.get("check") != "unsure":  # 판독 불확실은 이미 알렸다
            fields = [("title", "제목", st.get("title"))] + [(k, n, st.get(k)) for k, n in (("text", "설명"), ("time", "시간")) if k not in added]
            for k, name, v in fields:
                for dim, raw in missing_quantities(flat_text(v), evidence):
                    same = sorted({r for d, _, r in own if d == dim})
                    hint = f" (근거 문장에는 {', '.join(same)})" if same else ""
                    rep.source(f"{where}.{k}", f"{name}의 '{raw}'가 원문 근거 문장에 없어요{hint} — 원문과 맞는지 확인해 주세요")
            if "scene" not in added:
                said = quantities(" ".join(flat_text(st.get(k)) for k in ("title", "text", "time")))
                for _, raw in missing_quantities(scene_text(st.get("scene")), evidence + said):
                    rep.source(f"{where}.scene", f"그림의 '{raw}'가 원문 근거 문장·설명·준비물에 없어요 — 원문과 맞는지 확인해 주세요")
        pool += own

    # 원문에서 만든 자료(source가 있음)는 단계마다 원문 대응 기록(origin)을 남긴다
    if (data.get("source") or strict_source) and steps:
        miss = [str(i + 1) for i, st in enumerate(steps) if isinstance(st, dict) and not isinstance(st.get("origin"), dict)]
        if miss:
            rep.source("steps", f"원문 대응 기록(origin)이 없는 단계: {', '.join(miss)} (원문 위치와 근거 문장을 남겨 주세요)")
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
            if "sketches" in res:
                sk_keys += check_sketches(res["sketches"], "results.sketches", rep)
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
                check_table(tb, f"results.table[{ti}]", rep)
    for d in sorted({k for k in sk_keys if k and sk_keys.count(k) > 1}):
        rep.err("그림 칸", f"id·제목 '{d}'가 여러 번 나와요 (그린 그림이 엇갈려요. id를 따로 주세요)")
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
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+", help="검사할 JSON 또는 HTML")
    ap.add_argument("--strict-source", action="store_true", help="핵심 수치 불일치·원문 근거 누락·미확인을 오류로 처리 (앞 단계 숫자로 대신 통과하지 않음)")
    args = ap.parse_args()
    reg = load_registry()
    if reg is None:
        print("주의: 부품 목록(parts.json)을 찾지 못해 부품·속성 이름은 검사하지 않았어요.")
    bad = 0
    for path in args.files:
        try:
            data = load(path)
        except Exception as e:
            print(f"오류  {path}: 읽지 못했어요 ({e})")
            bad += 1
            continue
        rep = main_check(data, reg, strict_source=args.strict_source)
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
