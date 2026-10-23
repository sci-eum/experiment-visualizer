#!/usr/bin/env python3
"""(관리자용) 수치·수식 읽기와 데이터 검사기가 약속대로 동작하는지 확인한다. CI에서도 돈다.

1. 한글 수식 → 글자 (extract_text.eq_to_text): 묶음 괄호를 지키는지
2. 부피 읽기: 검사기(check_data.parse_volume)와 엔진(labkit.js parseVol)이 같은 값을 내는지 (node가 있으면)
3. 데이터 검사기: 일부러 틀린 데이터에서 오류를 찾는지, 원문 숫자 대조가 수치를 바르게 뽑고 비교하는지
   (근거가 표라서 단위가 머리에만 있을 때 포함), 정해진 값(kind·solid …)·준비물 아이콘 짐작·긴 타이머를 알리는지,
   홈판의 홈(속성·자리)과 멀티미터 단자를 검사하는지, 괜찮은 것(마이크로피펫, 시험관대, 홈 id 가리키기, timer false …)은 알리지 않는지
4. 학생 답 저장 이름 (헤드리스 Chrome/Edge가 있으면): v1.8까지의 순번 이름에서 옮기는지,
   단계·질문·표 줄을 끼워 넣거나 id 있는 물음 글을 고쳐도 답이 제 칸을 따라가는지
사용법:  python scripts/selftest.py      (실패가 있으면 종료 코드 1)
"""
import contextlib
import copy
import html
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from check_data import main_check, load_registry, parse_volume, quantities, missing_quantities  # noqa: E402
from extract_text import eq_to_text  # noqa: E402

EQ = {
    'rm CaCl _{2}': 'CaCl₂', 'TRIANGLE  T': 'ΔT', 'H _{2} O': 'H₂O', '10 ^{-3}': '10⁻³', '2 TIMES 10 ^{5}': '2×10⁵',
    '{a+b} over {c+d}': '(a+b)/(c+d)', '1 over 2': '1/2', '{1} over {2}': '1/2', 'sqrt {x+1}': '√(x+1)', 'sqrt 2': '√2',
    '{m} over {V}': 'm/V', '{TRIANGLE T} over {t}': 'ΔT/t', 'x _{2} over 3': 'x₂/3', '{a+b} ^{2}': '(a+b)²',
    'rm {CO} _{2}': 'CO₂', 'LEFT ( a+b RIGHT ) over 2': '(a+b)/2', '1 over {2 TIMES 3}': '1/(2×3)', 'v = {d} over {t}': 'v=d/t',
    'x _{max}': 'x_max', '30 `CELSIUS': '30 ℃',
}
VOL = {
    '100 mL': 100, '1,000 mL': 1000, '0.5~1 L': 750, '1 L': 1000, '30~40 mL': 35, '250mL': 250, '100 cc': 100,
    '500 μL': 0.5, '2 dL': 200, '약 100 mL 정도': 100, '0.5 L ~ 1 L': 750, '1,250.5 mL': 1250.5, '200 ml': 200,
    '5 mL씩': 5, '10': 10, '50 g': None, 'abc': None, '': None,
}
BAD = {
    "title": "검사기 시험", "steps": [
        {"title": "용량 초과", "scene": [{"t": "beaker", "id": "b", "vol": "100 mL", "amount": "200 mL"}]},
        {"title": "오타", "obsreve": "x", "scene": [{"t": "beaker", "amout": "10 mL"}, {"t": "bekaer"}]},
        {"title": "id", "scene": [{"t": "beaker", "id": "b"}, {"t": "flask", "id": "b"}, {"t": "dropper", "over": "c"}]},
        {"title": "부피", "scene": [{"t": "cylinder", "vol": "십 mL"}]},
        {"title": "이어받기", "scene": {"from": 99, "change": {"zz": {"color": "red"}}}},
        {"title": "원문 기록", "id": "s1", "origin": {"where": "1쪽", "check": "maybe", "added": ["tipp"]}, "scene": [{"t": "beaker"}]},
        {"title": "단계 id", "id": "s1", "scene": [{"t": "beaker"}]},
        {"title": "숫자", "text": "물 10 mL를 넣는다.", "origin": {"where": "1쪽", "quote": "물 5 mL를 넣는다.", "check": "ok"},
         "scene": [{"t": "beaker", "vol": "100 mL", "amount": "7 mL"}]},
        {"title": "정해진 값", "scene": [{"t": "sensor", "kind": "humidity"}, {"t": "lens", "kind": "concav"}, {"t": "beaker", "solid": "sand"}]},
        {"title": "용량 없는 부품", "scene": [{"t": "dropper", "vol": "5 mL"}]},
        {"title": "홈판", "scene": [{"t": "wellplate", "wells": [{"id": "h1", "colr": "red"}, {"at": "3B"}, {"at": "A2", "solid": "sand"}]},
                                  {"t": "meter", "id": "pm", "kind": "ph", "in": "h1"}, {"t": "wire", "from": "pm:+", "to": "h1"}]},
        {"title": "역학", "scene": [{"t": "track", "id": "tk", "support": "books"}, {"t": "pulley", "on": "tk", "from": "nocart", "hang": "bag"}]},
        {"title": "전기", "scene": [{"t": "beaker", "id": "bk"}, {"t": "battery", "id": "bt", "kind": "aa"}, {"t": "wire", "from": "bk:+", "to": "bt:-", "clip": "both"}]},
        {"title": "작은 기구", "scene": [{"t": "glasspipette", "kind": "mohr", "vol": "10 mL", "amount": "20 mL"}, {"t": "appliance", "kind": "oven"}, {"t": "tlc", "kind": "silica"}]},
        {"title": "그림 칸", "sketch": {"id": "d", "shape": "oval", "n": 9, "colr": "red"}, "scene": [{"t": "microscope"}]},
        {"title": "화면·svg", "scene": [{"t": "device", "display": "photo"}, {"t": "svg", "x": 100, "w": 40, "h": 40}]},
        {"title": "하룻밤 두기", "time": "24시간", "scene": [{"t": "beaker"}]},
        {"title": "공 놓기", "scene": [{"t": "table", "id": "tb"}, {"t": "ball", "id": "b1", "on": "tb", "at": 0.2}]},
        {"title": "공 또 놓기", "scene": {"from": "prev", "add": [{"t": "ball", "on": "tb", "at": 0.8}]}},
    ],
    "materials": [{"name": "설탕 녹인 물"}, {"name": "피펫"}, {"name": "적외선 온도계"}, {"name": "시험관 집게"}, {"name": "홈판", "icon": "generic"}],
    "results": {"questions": [{"id": "q1", "text": "가"}, {"id": "q1", "text": "나"}], "sketches": [{"id": "d", "title": "같은 id"}],
                "tables": [{"title": "합친 칸", "head": [{"text": "시간", "span": 0, "colour": "red"}, "1"],
                            "rows": [[{"txt": "가", "rowspan": 3}, ""], ["", "", ""]]}]},
}
BAD_EXPECT = ["넣은 양 amount", "없는 속성 'amout'", "알 수 없는 항목 'obsreve'", "없는 부품 'bekaer'",
              "id 'b'가 한 장면에 두 번", "over: 'c'", "부피로 읽지 못해요", "이어받을 단계가 없어요",
              "'ok'(확인함) 또는 'unsure'", "원문에 없이 더한 항목", "단계 id 's1'", "질문 id 'q1'",
              "kind 'humidity'는 정해진 값이 아니에요", "kind 'other'에 text로", "'concave'인가요?", "solid 'sand'", "용량은 label로 적으세요",
              "홈에 없는 속성 'colr'", "홈 자리 at '3B'", "홈의 solid 'sand'", "meter#pm에는 (+)·(−) 단자가 없어요",
              "support 'books'", "hang 'bag'", "from: 'nocart'",
              "beaker#bk에는 (+)·(−) 단자가 없어요", "kind 'aa'", "clip 'both'",
              "kind 'mohr'", "넣은 양 amount '20 mL'", "kind 'oven'", "kind 'silica'",
              "shape 'oval'", "n(칸 수)은 1~6", "그림 칸에 없는 항목 'colr'", "id·제목 'd'가 여러 번", "display 'photo'",
              "span는 1 이상의 정수", "머리 칸에 없는 항목 'colour'", "표 칸에 없는 항목 'txt'"]
BAD_WARN = ["설명의 '10 mL'가 원문 근거 문장에 없어요 (근거 문장에는 5 mL)", "그림의 '7 mL'",
            "'피펫'의 아이콘이 이름 짐작으로 스포이트", "'적외선 온도계'의 아이콘이 이름 짐작으로 유리 막대 온도계",
            "'시험관 집게'의 아이콘이 이름 짐작으로 '시험관'", "materials[4].icon: 글자가 없으면", "24시간짜리 타이머", "'설탕 녹인 물'의 아이콘이 이름 짐작으로 가루 더미", "svg에 y가 없어요",
            "이어받은 장면에 'ball'가 이미 있어요", "칸 수(4, 합친 칸 포함)가 머리 줄(2)과 달라요", "rowspan)이 표의 줄 수보다 길어요"]
# 알리지 않아야 하는 것: 맞게 짐작되는 준비물, 정해진 값, 그래프 숫자 배열, 꺼 둔 긴 타이머, 수업 안의 시간
MERGE_TABLE = {"id": "m", "title": "합친 표", "head": [{"text": "구분", "span": 2}, "1회", "2회"],
                "rows": [[{"text": "A 모둠", "rowspan": 2}, "길이", "5", ""], ["무게", {"off": True}, ""], [{"text": "B 모둠", "rowspan": 1}, "길이", "5", ""]]}
QUIET = {"title": "조용한 시험", "materials": [
    {"name": "마이크로피펫"}, {"name": "시험관대"}, {"name": "스탠드와 집게"}, {"name": "온도계"}, {"name": "pH 미터", "icon": {"t": "generic", "text": "pH"}},
    {"name": "디지털 온도계"}, {"name": "12홈판"}, {"name": "20 % 설탕물"}, {"name": "소금물"}, {"name": "설탕 용액"}, {"name": "스마트폰"}, {"name": "저마찰 트랙"}, {"name": "도르래"}, {"name": "추걸이"}, {"name": "용수철"}, {"name": "삼각대"}, {"name": "코일"}, {"name": "검류계"}, {"name": "건전지 끼우개"}, {"name": "9 V 건전지"}, {"name": "탄소 막대"}, {"name": "향"}, {"name": "면봉"}, {"name": "홀 피펫"}, {"name": "피펫 필러"}, {"name": "한천 배지"}, {"name": "TLC 판"}, {"name": "항온기"}, {"name": "눈금 피펫 (10 mL)", "icon": {"t": "glasspipette", "vol": "10 mL"}}, {"name": "주사기 (50 mL)", "icon": {"t": "syringe", "vol": "50 mL"}}],
    "steps": [
        {"title": "센서", "time": "1시간 30분", "scene": [{"t": "sensor", "kind": "other", "text": "CO₂"}, {"t": "device", "graph": [0.2, 0.5, 0.4]}]},
        {"title": "하룻밤", "time": "24시간", "timer": False, "scene": [{"t": "beaker", "solid": "icebath"}, {"t": "zoom", "show": "crystals"}]},
        {"title": "홈판", "scene": [{"t": "wellplate", "tags": True, "wells": [{"id": "h1", "at": "A1", "color": "red", "strip": "copper"}, {"id": "h2", "at": "B2", "label": "물 1 mL"}]},
                                  {"t": "dropper", "over": "h2"}, {"t": "meter", "id": "mm", "kind": "multi"}, {"t": "wire", "from": "mm:+", "to": "h1"},
                                  {"t": "syringe", "vol": "50 mL", "amount": "30 mL", "gas": "brown"}, {"t": "trough", "vol": "10 L", "amount": "8 L"}, {"t": "sensor", "kind": "co2"}]},
        {"title": "홈 색 바꾸기", "scene": {"from": "prev", "change": {"h2": {"color": "blue"}}}},
        {"title": "역학", "scene": [{"t": "table", "id": "tb"}, {"t": "track", "id": "tk", "on": "tb", "h": 30, "support": "stand"}, {"t": "cart", "id": "ca", "on": "tk", "at": 0.2, "load": 1},
                                  {"t": "photogate", "on": "tk", "at": 0.6}, {"t": "pulley", "on": "tk", "from": "ca", "hang": "hanger", "n": 2},
                                  {"t": "stand", "hold": "sp"}, {"t": "spring", "id": "sp", "hang": "phone", "osc": True}, {"t": "camera", "dir": "left", "to": "sp"}, {"t": "weight", "kind": "hanger"}]},
        {"title": "전기", "scene": [{"t": "coil", "id": "co"}, {"t": "magnet", "in": "co", "dx": 10}, {"t": "meter", "id": "gv", "kind": "galvano"},
                                  {"t": "wire", "from": "co:+", "to": "gv:+", "clip": True}, {"t": "battery", "id": "bh", "kind": "holder", "n": 2, "switch": True},
                                  {"t": "bulb", "id": "bu", "x": 200, "y": 150}, {"t": "wire", "from": "bh:+", "to": "bu:-", "clip": "to"},
                                  {"t": "beaker", "id": "bk"}, {"t": "electrode", "id": "el", "in": "bk", "kind": "rod"}, {"t": "battery", "id": "nv", "kind": "9v"},
                                  {"t": "wire", "from": "nv:-", "to": "el"}]},
        {"title": "작은 기구", "scene": [{"t": "tube", "id": "tb", "foam": True}, {"t": "splint", "over": "tb", "lit": True}, {"t": "agar", "id": "ag", "sectors": ["A", "B"], "disks": [{"zone": 0.3}]},
                                  {"t": "swab", "in": "ag"}, {"t": "tlc", "id": "tl", "kind": "paper", "spots": ["red"]}, {"t": "capillary", "over": "tl"},
                                  {"t": "glasspipette", "kind": "volumetric", "vol": "10 mL", "amount": "10 mL", "filler": True}, {"t": "filler"}, {"t": "paper", "kind": "disk"},
                                  {"t": "appliance", "id": "ap", "open": True, "reading": "30 ℃"}, {"t": "dish", "on": "ap"}]},
        {"title": "화면·svg", "scene": [{"t": "device", "display": "camera", "title": "촬영"}, {"t": "device", "display": "blank", "value": "0.0 s"}, {"t": "svg", "x": 100, "y": 268, "w": 40, "h": 40},
                                    {"t": "wellplate", "wells": [{"id": "lw", "label": "물질 가", "labelSide": "right"}]}]},
        {"title": "그림 칸", "sketch": [{"id": "s1", "title": "보이는 모습", "labels": ["가", "나"], "write": "배율"}], "scene": [{"t": "microscope"}]}],
    "results": {"sketches": [{"title": "궤적", "shape": "polar", "n": 2}, {"id": "s2", "title": "흐름", "shape": "box", "note": "화살표로"}],
                "tables": [MERGE_TABLE]}}
QUIET["steps"] += [
    {"title": "공 놓기", "scene": [{"t": "table", "id": "tb"}, {"t": "ball", "id": "b1", "on": "tb", "at": 0.2}]},
    {"title": "공 옮기기", "scene": {"from": "prev", "change": {"b1": {"at": 0.6}}}},
    {"title": "새 공", "scene": {"from": "prev", "remove": ["b1"], "add": [{"t": "ball", "on": "tb", "at": 0.9}]}}]
# 표에서 옮긴 단계: 단위가 머리에만 있어도 확인이 없어야 한다
TABLE_TEXT = '80°C 120초 → (60°C 30초 · 40°C 50초) 10회 → 25°C 90초'
TABLE_QUOTE = '[표] 단계 / 온도 (°C) / 시간(sec) / 반복: 데우기 80 / 120 / 1, 식히기 60 / 30 / 10, 기다리기 40 / 50 / 10, 마무리 25 / 90 / 1'
GOOD = {"title": "표 근거 시험", "source": "실험지", "steps": [
    {"title": "온도 순서", "text": TABLE_TEXT, "origin": {"where": "표 2", "quote": TABLE_QUOTE, "check": "ok"}, "scene": [{"t": "beaker"}]}]}
# 원문 숫자 대조: 글 → 뽑히는 수치 (설명 쪽. 숫자 없는 단위는 수치가 아니다)
QTY = {
    '물 **10 mL**를 넣는다': ['10 mL'], '0.5~1 L': ['0.5 L', '1 L'], '5, 10, 15 mL씩': ['5 mL', '10 mL', '15 mL'],
    '3분의 1 정도 채운다': [], '약 15분 동안': ['15분'], '2~3방울': ['2방울', '3방울'], '0.1 M 염산 20 mL': ['0.1 M', '20 mL'],
    '40 ℃로': ['40℃'], '시험관 A에': [], '3-1. 지시약 넣기': [], '1,000 mL 비커': ['1,000 mL'], '1.5 V 전지': ['1.5 V'],
    TABLE_TEXT: ['80°C', '120초', '60°C', '30초', '40°C', '50초', '25°C', '90초'],
    '온도 (°C) / 시간(sec): 80 / 120': [],
}
# (설명, 근거 문장) → 근거 문장에 없는 수치. 근거 문장은 표 머리 단위('온도 (°C)')로 맨 숫자도 읽는다
MISS = {
    ('1 L를 넣는다', '1,000 mL를 넣는다'): [], ('물 10 mL', '물 5 mL'): ['10 mL'], ('약 15분', '15 분 동안 가열'): [],
    ('5방울씩 떨어뜨린다', '2~3방울 떨어뜨린다'): ['5방울'], ('30 ℃에서', '30 °C로 맞춘다'): [], ('0.1 M 염산', '1 M 염산'): ['0.1 M'],
    (TABLE_TEXT, TABLE_QUOTE): [], ('70℃에서 5분', '[표] 온도 ℃ / 시간 (초): 70 / 300'): [], ('물 2 mL', '(단위: µL) 물 2,000'): [],
    ('물 10 mL', '[표] 용액 / 부피 (mL): 물 5, 식초 3'): ['10 mL'], ('120초', '[표] 온도 (°C): 80 / 120'): ['120초'],
    ('20초', '[표] 단계 / 시간(sec) / 횟수: 가열 30 / 20회'): ['20초'], ('3초', 'tube(s): 3'): ['3초'],
}
# 답 저장 이름 시험: v1에 예전 순번 이름으로 적힌 답 → 옮긴 뒤, 끼워 넣고 고친 v2에서도 제 칸에
KEYS_V1 = {"id": "selftest-keys", "title": "답 이름 시험", "steps": [
    {"title": "A", "predict": "색은 어떻게 변할까?", "scene": [{"t": "beaker"}]},
    {"title": "B", "id": "mix", "predict": ["왜 그럴까?"], "scene": [{"t": "beaker"}]}],
    "results": {"table": {"id": "rec", "title": "기록표", "head": ["용액", "색"], "rows": [["식초", ""], ["비눗물", ""]]},
                "questions": ["첫 질문?", {"id": "q2", "text": "둘째 질문?"}]}}
KEYS_OLD = {"p0.0": "예상A", "p1.0": "예상B", "t0.0.1": "식초색", "t0.1.1": "비눗물색", "q0": "답1", "q1": "답2"}
KEYS_SHOWN_V1 = ["예상A", "예상B", "식초색", "비눗물색", "답1", "답2"]
KEYS_SHOWN_V2 = ["", "예상A", "예상B", "", "식초색", "비눗물색", "답2", "", "답1"]
# 합친 칸 표: 저장 이름으로 넣어 둔 답이 제 칸에 나오는지 (A 모둠 길이·A 모둠 무게·B 모둠 길이의 2회 칸)
KEYS_MERGE = {"id": "selftest-merge", "title": "합친 표 시험", "steps": [{"title": "A", "scene": [{"t": "beaker"}]}], "results": {"table": MERGE_TABLE}}
KEYS_MERGE_SEED = {"t:m:A 모둠 길이:2회": "가", "t:m:A 모둠 무게:2회": "나", "t:m:B 모둠 길이:2회": "다"}
KEYS_MERGE_SHOWN = ["가", "나", "다"]


def keys_v2():
    d = copy.deepcopy(KEYS_V1)
    d["steps"].insert(0, {"title": "새 단계", "predict": "새로 넣은 예상?", "scene": [{"t": "beaker"}]})
    d["steps"][2]["predict"] = ["왜 그럴까요? (글을 고침)"]
    d["results"]["questions"] = [{"id": "q2", "text": "둘째 질문 (글을 고침)?"}, "새 질문?", "첫 질문?"]
    d["results"]["table"]["rows"].insert(0, ["물", ""])
    return d


def open_with_answers(exe, data, seed):
    """data로 만든 HTML을 seed(저장된 답)와 함께 헤드리스로 열어 → {shown: [[칸 이름, 글]…], stored: {…}}"""
    import check_render
    from build_html import build
    tpl = (HERE.parent / "assets" / "template.html").read_text(encoding="utf-8")
    page = build(tpl, "window.EXPERIMENT = " + json.dumps(data, ensure_ascii=False) + ";")
    pre = f"<script>localStorage.setItem('lk:{data['id']}', {json.dumps(json.dumps(seed))})</script>"
    post = ("<script>(function w(){if(!document.querySelector('[data-w]'))return setTimeout(w,50);"
            "var o=document.createElement('pre');o.id='lk-test';o.textContent=JSON.stringify({shown:[].map.call("
            "document.querySelectorAll('[data-w]'),function(x){return [x.dataset.w,x.textContent]}),"
            f"stored:JSON.parse(localStorage.getItem('lk:{data['id']}')||'{{}}')}});document.body.appendChild(o)}})()</script>")
    page = page.replace("<body>", "<body>" + pre, 1)
    i = page.rindex("</body>")
    page = page[:i] + post + page[i:]
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "keys.html"
        f.write_text(page, encoding="utf-8")
        r = check_render.headless(exe, "--dump-dom", f.resolve().as_uri(), text=True, encoding="utf-8", errors="replace")
    m = re.search(r'<pre id="lk-test">(.*?)</pre>', r.stdout or "", re.S)
    return json.loads(html.unescape(m.group(1))) if m else None


def answer_key_test():
    """→ (실패 목록, 시험 수). 헤드리스 브라우저가 없으면 None."""
    import check_render
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exe = check_render.browser()
    except SystemExit:
        return None
    fails = []
    r1 = open_with_answers(exe, KEYS_V1, KEYS_OLD)
    if not r1:
        return ["답 이름 시험: 화면을 읽지 못했어요"], 3
    old_left = [k for k in r1["stored"] if re.match(r"^[pqt]\d", k)]
    if [t for _, t in r1["shown"]] != KEYS_SHOWN_V1 or old_left:
        fails.append(f"예전 순번 이름 옮기기: 보인 답 {[t for _, t in r1['shown']]} (기대 {KEYS_SHOWN_V1}), 남은 예전 이름 {old_left}")
    r2 = open_with_answers(exe, keys_v2(), r1["stored"])
    if not r2 or [t for _, t in r2["shown"]] != KEYS_SHOWN_V2:
        fails.append(f"끼워 넣은 뒤 답 따라가기: 보인 답 {r2 and [t for _, t in r2['shown']]} (기대 {KEYS_SHOWN_V2})")
    r3 = open_with_answers(exe, KEYS_MERGE, KEYS_MERGE_SEED)
    if not r3 or [t for _, t in r3["shown"]] != KEYS_MERGE_SHOWN:
        fails.append(f"합친 칸 표의 답 이름: 보인 답 {r3 and r3['shown']} (기대 {KEYS_MERGE_SHOWN})")
    return fails, 3


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    fails = []
    for src, want in EQ.items():
        got = eq_to_text(src)
        if got != want:
            fails.append(f'수식 {src!r} → {got!r} (기대 {want!r})')
    for src, want in VOL.items():
        got = parse_volume(src)
        if got != want and not (got is not None and want is not None and abs(got - want) < 1e-9):
            fails.append(f'부피(파이썬) {src!r} → {got} (기대 {want})')
    node = shutil.which('node')
    if node:
        js = (HERE.parent / 'assets' / 'labkit.js').read_text(encoding='utf-8')
        prog = ("const s=require('fs').readFileSync(0,'utf8');const src=JSON.parse(s);"
                "const code=src.js.match(/const VUNIT = [^\\n]*/)[0]+'\\n'+src.js.match(/function parseVol\\(v\\) \\{[\\s\\S]*?\\n\\}/)[0]+'\\nreturn parseVol;';"
                "const f=new Function(code)();console.log(JSON.stringify(src.cases.map(c=>f(c))));")
        r = subprocess.run([node, '-e', prog], input=json.dumps({'js': js, 'cases': list(VOL)}), capture_output=True, text=True, encoding='utf-8')
        if r.returncode:
            fails.append('엔진 parseVol을 실행하지 못했어요: ' + r.stderr.strip()[:200])
        else:
            for src, got in zip(VOL, json.loads(r.stdout)):
                want = VOL[src]
                if got != want and not (got is not None and want is not None and abs(got - want) < 1e-9):
                    fails.append(f'부피(엔진) {src!r} → {got} (기대 {want})')
    else:
        print('node가 없어 엔진 parseVol 비교는 건너뜀')
    rep = main_check(BAD, load_registry())
    text = '\n'.join(rep.errors)
    for frag in BAD_EXPECT:
        if frag not in text:
            fails.append(f'검사기가 찾아야 할 오류를 놓침: {frag}')
    warns = '\n'.join(rep.warns)
    for frag in BAD_WARN:
        if frag not in warns:
            fails.append(f'검사기가 알려야 할 확인을 놓침: {frag}')
    for src, want in QTY.items():
        got = [raw for _, _, raw in quantities(src)]
        if got != want:
            fails.append(f'수치 뽑기 {src!r} → {got} (기대 {want})')
    for (said, quote), want in MISS.items():
        got = [raw for _, raw in missing_quantities(said, quantities(quote, header=True))]
        if got != want:
            fails.append(f'숫자 대조 {said!r} / 근거 {quote!r} → {got} (기대 {want})')
    good = main_check(GOOD, load_registry())
    if good.errors or good.warns:
        fails.append(f'표 근거 단계에 오류·확인이 나옴: {good.errors + good.warns}')
    quiet = main_check(QUIET, load_registry())
    if quiet.errors or quiet.warns:
        fails.append(f'알리지 않아야 할 것에 오류·확인이 나옴: {quiet.errors + quiet.warns}')
    keys = answer_key_test()
    if keys is None:
        print('헤드리스 브라우저가 없어 답 저장 이름 시험은 건너뜀')
    else:
        fails += keys[0]
    total = (len(EQ) + len(VOL) * (2 if node else 1) + len(BAD_EXPECT) + len(BAD_WARN) + len(QTY) + len(MISS) + 2
             + (keys[1] if keys else 0))
    for f in fails:
        print('  -', f)
    print(f'{"OK" if not fails else "FAIL"}  자체 시험 {total - len(fails)}/{total}')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
