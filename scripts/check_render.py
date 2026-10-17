#!/usr/bin/env python3
"""(관리자용) 만든 HTML을 헤드리스 브라우저(Edge/Chrome)로 열어 자바스크립트 오류와 [LabKit] 경고를 찾는다.

사용법:  python scripts/check_render.py 결과1.html [결과2.html ...]
오류가 있으면 종료 코드 1.
"""
import pathlib
import re
import subprocess
import sys
import tempfile

CANDIDATES = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]


def browser():
    for c in CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    sys.exit('Edge/Chrome을 찾지 못했습니다.')


def check(path, exe):
    url = pathlib.Path(path).resolve().as_uri()
    with tempfile.TemporaryDirectory() as prof:
        r = subprocess.run([exe, '--headless=new', '--disable-gpu', f'--user-data-dir={prof}', '--enable-logging=stderr', '--v=0',
                            '--virtual-time-budget=4000', '--dump-dom', url], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
    errs = [l for l in r.stderr.splitlines() if 'CONSOLE' in l and re.search(r'Uncaught|\[LabKit\]|Error', l) and 'Tracking Prevention' not in l]
    dom = r.stdout.split('<script')[0]  # 화면 부분만 (스크립트 본문 제외)
    steps = len(re.findall(r'<article class="step"', dom))
    blank = 'aria-busy="true"' in dom or steps == 0
    return errs, steps, blank


def main():
    exe, bad = browser(), 0
    for f in sys.argv[1:]:
        errs, steps, blank = check(f, exe)
        status = 'OK' if not errs and not blank else 'FAIL'
        bad += status == 'FAIL'
        print(f'{status}  {f}  (단계 {steps}개)')
        for e in errs:
            print('   ', re.sub(r'^.*?CONSOLE:\d+\]\s*', '', e)[:300])
        if blank:
            print('    화면이 비어 있습니다 (렌더링 실패).')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
