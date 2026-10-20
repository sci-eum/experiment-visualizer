#!/usr/bin/env python3
"""(관리자용) 수치·수식 읽기와 데이터 검사기가 약속대로 동작하는지 확인한다. CI에서도 돈다.

1. 한글 수식 → 글자 (extract_text.eq_to_text): 묶음 괄호를 지키는지
2. 부피 읽기: 검사기(check_data.parse_volume)와 엔진(labkit.js parseVol)이 같은 값을 내는지 (node가 있으면)
3. 데이터 검사기: 일부러 틀린 데이터에서 오류를 찾는지, 원문 숫자 대조가 수치를 바르게 뽑고 비교하는지
   (근거가 표라서 단위가 머리에만 있을 때 포함)
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
        {"title": "이어받기", "scene": {"from": 9, "change": {"zz": {"color": "red"}}}},
        {"title": "원문 기록", "id": "s1", "origin": {"where": "1쪽", "check": "maybe", "added": ["tipp"]}, "scene": [{"t": "beaker"}]},
        {"title": "단계 id", "id": "s1", "scene": [{"t": "beaker"}]},
        {"title": "숫자", "text": "물 10 mL를 넣는다.", "origin": {"where": "1쪽", "quote": "물 5 mL를 넣는다.", "check": "ok"},
         "scene": [{"t": "beaker", "vol": "100 mL", "amount": "7 mL"}]},
    ],
    "results": {"questions": [{"id": "q1", "text": "가"}, {"id": "q1", "text": "나"}]},
}
BAD_EXPECT = ["넣은 양 amount", "없는 속성 'amout'", "알 수 없는 항목 'obsreve'", "없는 부품 'bekaer'",
              "id 'b'가 한 장면에 두 번", "over: 'c'", "부피로 읽지 못해요", "이어받을 단계가 없어요",
              "'ok'(확인함) 또는 'unsure'", "원문에 없이 더한 항목", "단계 id 's1'", "질문 id 'q1'"]
BAD_WARN = ["설명의 '10 mL'가 원문 근거 문장에 없어요 (근거 문장에는 5 mL)", "그림의 '7 mL'"]
# 표에서 옮긴 단계: 단위가 머리에만 있어도 확인이 없어야 한다
PCR_TEXT = '95°C 300초 → (95°C 20초 · 34°C 40초 · 72°C 40초) 45회 → 72°C 300초 → 4°C'
PCR_QUOTE = ('[표] 단계 / 온도 (°C) / 시간(sec) / 사이클 수: Pre-denaturation 95 / 300 / 1, Denaturation 95 / 20 / 45, '
             'Annealing 34 / 40 / 45, Extension 72 / 40 / 45, Final Extension 72 / 300 / 1, Hold 4 / hold / 1')
GOOD = {"title": "표 근거 시험", "source": "보고서", "steps": [
    {"title": "PCR", "text": PCR_TEXT, "origin": {"where": "표 2", "quote": PCR_QUOTE, "check": "ok"}, "scene": [{"t": "beaker"}]}]}
# 원문 숫자 대조: 글 → 뽑히는 수치 (설명 쪽. 숫자 없는 단위는 수치가 아니다)
QTY = {
    '물 **10 mL**를 넣는다': ['10 mL'], '0.5~1 L': ['0.5 L', '1 L'], '5, 10, 15 mL씩': ['5 mL', '10 mL', '15 mL'],
    '3분의 1 정도 채운다': [], '약 15분 동안': ['15분'], '2~3방울': ['2방울', '3방울'], '0.1 M 염산 20 mL': ['0.1 M', '20 mL'],
    '40 ℃로': ['40℃'], '시험관 A에': [], '3-1. 지시약 넣기': [], '1,000 mL 비커': ['1,000 mL'], '1.5 V 전지': ['1.5 V'],
    PCR_TEXT: ['95°C', '300초', '95°C', '20초', '34°C', '40초', '72°C', '40초', '72°C', '300초', '4°C'],
    '온도 (°C) / 시간(sec): 95 / 300': [],
}
# (설명, 근거 문장) → 근거 문장에 없는 수치. 근거 문장은 표 머리 단위('온도 (°C)')로 맨 숫자도 읽는다
MISS = {
    ('1 L를 넣는다', '1,000 mL를 넣는다'): [], ('물 10 mL', '물 5 mL'): ['10 mL'], ('약 15분', '15 분 동안 가열'): [],
    ('5방울씩 떨어뜨린다', '2~3방울 떨어뜨린다'): ['5방울'], ('30 ℃에서', '30 °C로 맞춘다'): [], ('0.1 M 염산', '1 M 염산'): ['0.1 M'],
    (PCR_TEXT, PCR_QUOTE): [], ('72℃에서 5분', '[표] 온도 ℃ / 시간 (초): 72 / 300'): [], ('물 2 mL', '(단위: µL) 물 2,000'): [],
    ('물 10 mL', '[표] 용액 / 부피 (mL): 물 5, 식초 3'): ['10 mL'], ('300초', '[표] 온도 (°C): 95 / 300'): ['300초'],
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
        return ["답 이름 시험: 화면을 읽지 못했어요"], 2
    old_left = [k for k in r1["stored"] if re.match(r"^[pqt]\d", k)]
    if [t for _, t in r1["shown"]] != KEYS_SHOWN_V1 or old_left:
        fails.append(f"예전 순번 이름 옮기기: 보인 답 {[t for _, t in r1['shown']]} (기대 {KEYS_SHOWN_V1}), 남은 예전 이름 {old_left}")
    r2 = open_with_answers(exe, keys_v2(), r1["stored"])
    if not r2 or [t for _, t in r2["shown"]] != KEYS_SHOWN_V2:
        fails.append(f"끼워 넣은 뒤 답 따라가기: 보인 답 {r2 and [t for _, t in r2['shown']]} (기대 {KEYS_SHOWN_V2})")
    return fails, 2


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
    keys = answer_key_test()
    if keys is None:
        print('헤드리스 브라우저가 없어 답 저장 이름 시험은 건너뜀')
    else:
        fails += keys[0]
    total = (len(EQ) + len(VOL) * (2 if node else 1) + len(BAD_EXPECT) + len(BAD_WARN) + len(QTY) + len(MISS) + 1
             + (keys[1] if keys else 0))
    for f in fails:
        print('  -', f)
    print(f'{"OK" if not fails else "FAIL"}  자체 시험 {total - len(fails)}/{total}')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
