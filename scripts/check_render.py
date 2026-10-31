#!/usr/bin/env python3
"""만든 HTML을 헤드리스 브라우저(Edge/Chrome)로 열어 자바스크립트 오류와 [LabKit] 경고를 찾고, 장면 그림을 PNG로 찍는다.

사용법:  python scripts/check_render.py 결과1.html [결과2.html ...] [--shots 폴더] [--grid] [--strict] [--engine auto] [--3d]
  --shots 폴더  장면 그림(PNG)을 만든다: 폴더/<파일 이름>/overview.png(모든 장면 한 장), step-01.png …(단계마다 크게),
                결과 보기(reveal)가 있는 단계는 step-03-result.png 처럼 결과 장면도 따로
                겹쳐 보이는 부품은 빨간 점선 상자로 표시된다. AI가 이 그림을 직접 열어 보고 고친다.
  --grid        PNG에 좌표 격자(20 간격)를 함께 그린다. 좌표를 고칠 때 쓴다.
  --strict      겹침 의심(WARN)도 실패로 친다 (예시를 점검하는 CI에서 쓴다).
  --engine      가벼운 버전(엔진을 인터넷에서 불러오는 HTML)을 어떤 엔진으로 열지
                auto(기본): 스크립트 옆 ../assets/labkit.js가 있으면 그것으로, 없으면 인터넷(@1)으로
                local: 내 폴더의 엔진으로 (공개 전에 고친 엔진을 시험할 때) · online: 인터넷 엔진 그대로 · 파일 경로
                한 파일 버전은 HTML 안의 엔진을 그대로 쓴다. 결과 줄에 쓴 엔진 버전이 나온다.
  --3d          입체 보기도 점검한다: 모든 단계를 입체로 그려 오류·그림 카드 실패·화면 밖으로 나간 부품을 찾는다.
                결과 줄에 입체로 빚은 부품(그릇·자주 쓰는 기구) 수와 2D 그림 카드 수가 나온다.
                --shots와 함께 주면 3d-overview.png, 3d-step-01.png …도 만든다.
                입체 엔진: HTML 안에 있으면 그것, 없으면 ../assets/labkit3d.js (--engine online이면 인터넷 @버전)
결과: OK / WARN(겹침 의심만 있음, 종료 코드 0 — PNG로 실제로 가리는지 확인) / FAIL(오류·빈 화면, 종료 코드 1)
"""
import argparse
import html as htmllib
import json
import math
import os
import pathlib
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

CANDIDATES = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
# 가벼운 버전이 엔진을 불러오는 주소 (@1, @1.9.1 …)
ENGINE_SRC = re.compile(r'src="https://cdn\.jsdelivr\.net/gh/sci-eum/experiment-visualizer@[^/"]+/assets/labkit(?:\.min)?\.js"')
LOCAL_ENGINE = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'labkit.js'
LOCAL_ENGINE3D = LOCAL_ENGINE.parent / 'labkit3d.js'
LK3D_TAG = '<script id="lk3d">'  # build_html.py --3d가 넣는 입체 엔진
# 입체 점검: GPU가 없는 곳(CI)에서도 WebGL을 소프트웨어(SwiftShader)로 그린다
GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
# 엔진의 촬영 화면(?shot=)과 같은 크기: 여백 16, 제목 30, 장면 480×300(한 장에 2열) 또는 960×600(단계마다)
ONE = (992, 662)


def browser():
    """헤드리스로 실제 화면을 그려 내는 브라우저를 고른다.
    설치만 되어 있고 헤드리스가 아무것도 내놓지 않는 경우가 있어(예: Edge 155) 짧게 시험해 본다.
    CHECK_RENDER_BROWSER 환경 변수로 경로를 직접 정할 수 있다."""
    env = os.environ.get('CHECK_RENDER_BROWSER')
    found = [env] if env else [c for c in CANDIDATES if pathlib.Path(c).exists()]
    for c in found:
        try:
            r = headless(c, '--dump-dom', 'data:text/html,<p>lk-probe-ok</p>', text=True, encoding='utf-8', errors='replace')
            if 'lk-probe-ok' in (r.stdout or ''):
                return c
        except Exception:
            pass
        print(f'건너뜀: {c} (헤드리스로 화면을 그리지 못함)')
    sys.exit('헤드리스로 쓸 수 있는 Chrome/Edge를 찾지 못했습니다. CHECK_RENDER_BROWSER로 브라우저 경로를 정해 보세요.')


# GitHub Actions 같은 CI의 Linux에서는 Chrome 샌드박스를 쓸 수 없어 끈다 (CI 환경 변수가 있을 때만)
CI_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'] if os.environ.get('CI') else []


def headless(exe, *args, **kw):
    with tempfile.TemporaryDirectory() as prof:
        return subprocess.run([exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', *CI_ARGS, f'--user-data-dir={prof}',
                               '--virtual-time-budget=4000', *args], capture_output=True, timeout=120, **kw)


def message(line):
    # Windows: ...:CONSOLE:12] "글", source: …   Linux: ...:CONSOLE(12)] "글", source: …
    m = re.search(r'CONSOLE[:(]\d+\)?\]\s*"(.*)", source:', line)
    return (m.group(1) if m else re.sub(r'^.*?CONSOLE[:(]\d+\)?\]\s*', '', line))[:300]


def prepare(path, engine, tmp, n):
    """가벼운 버전이면 엔진 주소를 고른 엔진으로 바꾼 사본을 tmp에 만들어 그 경로를 돌려준다 (이름은 같게: 그림 폴더 이름).
    → (열 경로, 엔진 출처)"""
    text = pathlib.Path(path).read_text(encoding='utf-8', errors='replace')
    if not ENGINE_SRC.search(text):
        return path, '파일 안'
    eng = LOCAL_ENGINE if engine in ('auto', 'local') else None if engine == 'online' else pathlib.Path(engine)
    if eng is None or not eng.exists():
        if engine not in ('auto', 'online'):
            sys.exit(f'엔진 파일이 없습니다: {eng}')
        return path, '인터넷'
    copy = pathlib.Path(tmp) / str(n) / pathlib.Path(path).name
    copy.parent.mkdir(parents=True, exist_ok=True)
    copy.write_text(ENGINE_SRC.sub(lambda m: f'src="{eng.resolve().as_uri()}"', text), encoding='utf-8')
    return str(copy), '내 폴더' if eng.resolve() == LOCAL_ENGINE.resolve() else str(eng)


def check(path, exe):
    url = pathlib.Path(path).resolve().as_uri() + '?check'  # 점검 화면: 움직임을 멈추고 겹침까지 본다
    r = headless(exe, '--enable-logging=stderr', '--v=0', '--dump-dom', url, text=True, encoding='utf-8', errors='replace')
    logs = [message(l) for l in r.stderr.splitlines()
            if 'CONSOLE' in l and re.search(r'Uncaught|\[LabKit\]|Error', l) and 'Tracking Prevention' not in l]
    overlaps = [m for m in logs if '[LabKit] 겹침' in m]
    errs = [m for m in logs if m not in overlaps]
    dom = r.stdout.split('<script')[0]  # 화면 부분만 (스크립트 본문 제외)
    steps = len(re.findall(r'<article class="step[ "]', dom))
    reveals = sorted({int(n) for n in re.findall(r'data-rvi="(\d+)"', dom)})  # 결과 장면이 있는 단계 (0부터)
    blank = 'aria-busy="true"' in dom or steps == 0
    ver = re.search(r'experiment-visualizer</a>\s*v(\d+\.\d+\.\d+)', dom)
    return errs, overlaps, steps, reveals, blank, ver.group(1) if ver else '?'



def shots(path, exe, steps, reveals, out_dir, grid):
    out = pathlib.Path(out_dir).resolve() / pathlib.Path(path).stem  # 브라우저는 상대 경로를 못 알아듣는다
    out.mkdir(parents=True, exist_ok=True)
    for old in list(out.glob('step-*.png')) + list(out.glob('overview.png')):  # step-NN-result.png 포함
        old.unlink()  # 지난번 결과(단계 수가 달랐을 수 있음)를 지운다
    base = pathlib.Path(path).resolve().as_uri() + '?' + ('grid&' if grid else '') + 'shot='
    rows = math.ceil((steps + len(reveals) + 1) / 2)  # 표지 한 칸 더 (cover가 없으면 엔진이 고른 기본 표지)
    jobs = [(out / 'overview.png', base + 'all', (1008, 32 + rows * 330 + (rows - 1) * 16))]
    jobs += [(out / f'step-{i:02d}.png', base + str(i), ONE) for i in range(1, steps + 1)]
    jobs += [(out / f'step-{i + 1:02d}-result.png', base + f'{i + 1}r', ONE) for i in reveals]

    def run(job):
        png, url, (w, h) = job
        headless(exe, f'--window-size={w},{h}', f'--screenshot={png}', url)
        return png.exists()
    with ThreadPoolExecutor(max_workers=4) as pool:
        made = sum(pool.map(run, jobs))
    return out, made, len(jobs)


def prepare3d(path, engine, tmp, n):
    """입체 점검용 사본: HTML 안에 입체 엔진이 없으면 내 폴더의 labkit3d.js를 넣는다 (이름은 같게).
    → (열 경로, 입체 엔진 출처)"""
    text = pathlib.Path(path).read_text(encoding='utf-8', errors='replace')
    if LK3D_TAG in text:
        return path, '파일 안'
    if engine == 'online' or not LOCAL_ENGINE3D.exists():
        return path, '인터넷'
    js = LOCAL_ENGINE3D.read_text(encoding='utf-8')
    k = text.rfind('</body>')
    copy = pathlib.Path(tmp) / f'{n}-3d' / pathlib.Path(path).name
    copy.parent.mkdir(parents=True, exist_ok=True)
    copy.write_text(text[:k] + LK3D_TAG + '\n' + js + '\n</script>\n' + text[k:], encoding='utf-8')
    return str(copy), '내 폴더'


def check3d(path, exe):
    """모든 단계를 입체로 그려(?shot3d=all) 엔진이 남긴 결과(<html data-lk3d>)와 콘솔 오류를 읽는다."""
    url = pathlib.Path(path).resolve().as_uri() + '?shot3d=all'
    r = headless(exe, *GL_ARGS, '--enable-logging=stderr', '--v=0', '--dump-dom', url, text=True, encoding='utf-8', errors='replace')
    logs = [message(l) for l in r.stderr.splitlines()
            if 'CONSOLE' in l and re.search(r'Uncaught|\[LabKit\]|Error', l) and 'Tracking Prevention' not in l]
    m = re.search(r'<html[^>]*\sdata-lk3d="([^"]*)"', r.stdout)
    v = re.search(r'<html[^>]*\sdata-lk3d-v="([^"]*)"', r.stdout)
    try:
        report = json.loads(htmllib.unescape(m.group(1))) if m else None
    except ValueError:
        report = None
    return logs, report, v.group(1) if v else '?'


def shots3d(path, name, exe, steps, reveals, out_dir):
    out = pathlib.Path(out_dir).resolve() / name
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('3d-*.png'):
        old.unlink()
    base = pathlib.Path(path).resolve().as_uri() + '?shot3d='
    n = steps + len(reveals)
    rows = math.ceil(n / 2) if n > 1 else 1
    jobs = [(out / '3d-overview.png', base + 'all', (1008, 32 + rows * 330 + (rows - 1) * 16) if n > 1 else ONE)]
    jobs += [(out / f'3d-step-{i:02d}.png', base + str(i), ONE) for i in range(1, steps + 1)]
    jobs += [(out / f'3d-step-{i + 1:02d}-result.png', base + f'{i + 1}r', ONE) for i in reveals]

    def run(job):
        png, url, (w, h) = job
        headless(exe, *GL_ARGS, f'--window-size={w},{h}', f'--screenshot={png}', url)
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
    ap.add_argument('--strict', action='store_true', help='WARN(겹침 의심)도 실패로 친다')
    ap.add_argument('--engine', default='auto', metavar='auto|local|online|경로', help='가벼운 버전을 열 엔진')
    ap.add_argument('--3d', dest='three', action='store_true', help='입체 보기도 점검한다')
    a = ap.parse_args()
    exe, bad = browser(), 0
    with tempfile.TemporaryDirectory() as tmp:
        for n, f in enumerate(a.html):
            bad += check_one(f, exe, a, tmp, n)
    return 1 if bad else 0


def check_one(f, exe, a, tmp, n):
    """HTML 하나를 점검한다. 실패(또는 --strict에서 WARN)면 True."""
    path, src = prepare(f, a.engine, tmp, n)
    errs, overlaps, steps, reveals, blank, ver = check(path, exe)
    status = 'FAIL' if errs or blank else 'WARN' if overlaps else 'OK'
    print(f'{status}  {f}  (단계 {steps}개, 엔진 v{ver} {src})')
    for m in errs + overlaps:
        print('   ', m)
    if blank:
        print('    화면이 비어 있습니다 (렌더링 실패).')
    if a.shots and not blank:
        out, made, total = shots(path, exe, steps, reveals, a.shots, a.grid)
        extra = f' + 결과 {len(reveals)}장' if reveals else ''
        print(f'    그림: {out} (overview.png + step-01~{steps:02d}.png{extra}, {made}/{total}장)')
        if made < total:
            print('    일부 그림을 만들지 못했습니다. 브라우저가 실행되는지 확인하세요.')
    bad = status == 'FAIL' or (a.strict and status == 'WARN')
    if a.three and not blank:
        bad = check_one3d(f, path, exe, a, tmp, n, steps, reveals) or bad
    return bad


def check_one3d(f, path, exe, a, tmp, n, steps, reveals):
    """입체 보기를 점검한다. 실패(또는 --strict에서 WARN)면 True."""
    path3, src = prepare3d(path, a.engine, tmp, n)
    logs, report, ver = check3d(path3, exe)
    outs = [m for m in logs if '화면 밖' in m]
    errs = [m for m in logs if m not in outs]
    scenes = report if isinstance(report, list) else []
    if isinstance(report, dict) and report.get('fail'):
        errs.append(report['fail'])
    errs += [f"{r.get('title', '')}: {r['error']}" for r in scenes if r.get('error')]
    status = 'FAIL' if errs or report is None else 'WARN' if outs else 'OK'
    cards, meshes = sum(r.get('units', 0) for r in scenes), sum(r.get('meshes', 0) for r in scenes)
    print(f'3D {status}  {f}  (장면 {len(scenes)}개, 입체 부품 {meshes}개, 그림 카드 {cards}장, 입체 엔진 v{ver} {src})')
    for m in dict.fromkeys(errs + outs):
        print('   ', m)
    if report is None and not errs:
        print('    입체 그림이 끝까지 그려지지 않았습니다 (WebGL을 쓸 수 없거나 입체 엔진을 불러오지 못함).')
    if a.shots and report is not None:
        out, made, total = shots3d(path3, pathlib.Path(f).stem, exe, steps, reveals, a.shots)
        print(f'    입체 그림: {out} (3d-overview.png + 3d-step-NN.png, {made}/{total}장)')
    return status == 'FAIL' or (a.strict and status == 'WARN')


if __name__ == '__main__':
    sys.exit(main())
