#!/usr/bin/env python3
"""만든 HTML을 헤드리스 브라우저(Edge/Chrome)로 열어 자바스크립트 오류와 [LabKit] 경고를 찾고, 장면 그림을 PNG로 찍는다.

사용법:  python scripts/check_render.py 결과1.html [결과2.html ...] [--shots 폴더] [--grid]
  --shots 폴더  장면 그림(PNG)을 만든다: 폴더/<파일 이름>/overview.png(모든 장면 한 장), step-01.png …(단계마다 크게)
                겹쳐 보이는 부품은 빨간 점선 상자로 표시된다. AI가 이 그림을 직접 열어 보고 고친다.
  --grid        PNG에 좌표 격자(20 간격)를 함께 그린다. 좌표를 고칠 때 쓴다.
결과: OK / WARN(겹침 의심만 있음, 종료 코드 0 — PNG로 실제로 가리는지 확인) / FAIL(오류·빈 화면, 종료 코드 1)
"""
import argparse
import math
import pathlib
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

CANDIDATES = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
# 엔진의 촬영 화면(?shot=)과 같은 크기: 여백 16, 제목 30, 장면 480×300(한 장에 2열) 또는 960×600(단계마다)
ONE = (992, 662)


def browser():
    for c in CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    sys.exit('Edge/Chrome을 찾지 못했습니다.')


def headless(exe, *args, **kw):
    with tempfile.TemporaryDirectory() as prof:
        return subprocess.run([exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={prof}',
                               '--virtual-time-budget=4000', *args], capture_output=True, timeout=120, **kw)


def message(line):
    m = re.search(r'CONSOLE:\d+\]\s*"(.*)", source:', line)
    return (m.group(1) if m else re.sub(r'^.*?CONSOLE:\d+\]\s*', '', line))[:300]


def check(path, exe):
    url = pathlib.Path(path).resolve().as_uri() + '?check'  # 점검 화면: 움직임을 멈추고 겹침까지 본다
    r = headless(exe, '--enable-logging=stderr', '--v=0', '--dump-dom', url, text=True, encoding='utf-8', errors='replace')
    logs = [message(l) for l in r.stderr.splitlines()
            if 'CONSOLE' in l and re.search(r'Uncaught|\[LabKit\]|Error', l) and 'Tracking Prevention' not in l]
    overlaps = [m for m in logs if '[LabKit] 겹침' in m]
    errs = [m for m in logs if m not in overlaps]
    dom = r.stdout.split('<script')[0]  # 화면 부분만 (스크립트 본문 제외)
    steps = len(re.findall(r'<article class="step"', dom))
    blank = 'aria-busy="true"' in dom or steps == 0
    return errs, overlaps, steps, blank


def shots(path, exe, steps, out_dir, grid):
    out = pathlib.Path(out_dir).resolve() / pathlib.Path(path).stem  # 브라우저는 상대 경로를 못 알아듣는다
    out.mkdir(parents=True, exist_ok=True)
    for old in list(out.glob('step-*.png')) + list(out.glob('overview.png')):
        old.unlink()  # 지난번 결과(단계 수가 달랐을 수 있음)를 지운다
    base = pathlib.Path(path).resolve().as_uri() + '?' + ('grid&' if grid else '') + 'shot='
    rows = math.ceil((steps + 1) / 2)  # 표지가 있을 수 있어 한 칸 더
    jobs = [(out / 'overview.png', base + 'all', (1008, 32 + rows * 330 + (rows - 1) * 16))]
    jobs += [(out / f'step-{i:02d}.png', base + str(i), ONE) for i in range(1, steps + 1)]

    def run(job):
        png, url, (w, h) = job
        headless(exe, f'--window-size={w},{h}', f'--screenshot={png}', url)
        return png.exists()
    with ThreadPoolExecutor(max_workers=4) as pool:
        made = sum(pool.map(run, jobs))
    return out, made, len(jobs)


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', nargs='+', help='점검할 HTML 파일')
    ap.add_argument('--shots', metavar='폴더', help='장면 그림(PNG)을 만들 폴더')
    ap.add_argument('--grid', action='store_true', help='PNG에 좌표 격자를 그린다')
    a = ap.parse_args()
    exe, bad = browser(), 0
    for f in a.html:
        errs, overlaps, steps, blank = check(f, exe)
        status = 'FAIL' if errs or blank else 'WARN' if overlaps else 'OK'
        bad += status == 'FAIL'
        print(f'{status}  {f}  (단계 {steps}개)')
        for m in errs + overlaps:
            print('   ', m)
        if blank:
            print('    화면이 비어 있습니다 (렌더링 실패).')
        if a.shots and not blank:
            out, made, total = shots(f, exe, steps, a.shots, a.grid)
            print(f'    그림: {out} (overview.png + step-01~{steps:02d}.png, {made}/{total}장)')
            if made < total:
                print('    일부 그림을 만들지 못했습니다. 브라우저가 실행되는지 확인하세요.')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
