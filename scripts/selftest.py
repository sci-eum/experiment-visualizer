#!/usr/bin/env python3
"""(관리자용) 수치·수식 읽기와 데이터 검사기가 약속대로 동작하는지 확인한다. CI에서도 돈다.

1. 한글 수식 → 글자 (extract_text.eq_to_text): 묶음 괄호를 지키는지
2. 부피 읽기: 검사기(check_data.parse_volume)와 엔진(labkit.js parseVol)이 같은 값을 내는지 (node가 있으면)
3. 데이터 검사기: 일부러 틀린 데이터에서 오류를 찾는지
사용법:  python scripts/selftest.py      (실패가 있으면 종료 코드 1)
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from check_data import main_check, load_registry, parse_volume  # noqa: E402
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
    ],
}
BAD_EXPECT = ["넣은 양 amount", "없는 속성 'amout'", "알 수 없는 항목 'obsreve'", "없는 부품 'bekaer'",
              "id 'b'가 한 장면에 두 번", "over: 'c'", "부피로 읽지 못해요", "이어받을 단계가 없어요"]


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
    total = len(EQ) + len(VOL) * (2 if node else 1) + len(BAD_EXPECT)
    for f in fails:
        print('  -', f)
    print(f'{"OK" if not fails else "FAIL"}  자체 시험 {total - len(fails)}/{total}')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
