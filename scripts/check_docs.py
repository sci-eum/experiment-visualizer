#!/usr/bin/env python3
"""(관리자용) SKILL.md·references 문서가 그림 엔진과 맞는지 확인한다.

1. 문서의 ```json 예시가 모두 JSON 문법에 맞는다.
2. 엔진(labkit.js)의 부품이 모두 references/parts.md에 있고, SKILL.md의 '부품 이름 한눈에'에도 있다.
3. 문서·예시 데이터에 쓴 부품 이름(t)이 모두 엔진에 있다.
4. references/scenes.md가 examples/recipes.json과, references/parts.json이 엔진과 같다.
5. SKILL.md가 가리키는 참고 문서가 있고, SKILL.md가 너무 길지 않다.
6. 문서의 jsDelivr @1 주소가 저장소에 있는 파일을 가리키고, 참고 문서가 모두 스킬 zip·캐시 비우기 목록에 있다.
   SKILL.md는 raw main 주소를 쓰지 않는다 (지시서와 엔진의 버전이 어긋나지 않게).

사용법:  python scripts/check_docs.py      (문제가 있으면 종료 코드 1)
표준 라이브러리만 쓴다.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_scenes_doc  # noqa: E402
import make_registry  # noqa: E402

CIRCUIT_PARTS = {'battery', 'bulb', 'switch', 'ammeter', 'voltmeter', 'resistor', 'motor', 'led', 'wire'}
MAX_SKILL_LINES = 400


def engine_types():
    js = (ROOT / 'assets' / 'labkit.js').read_text(encoding='utf-8')
    shapes = re.search(r'const SHAPES = \{(.*?)\n\};', js, re.S).group(1)
    names = set(re.findall(r'^  ([a-z]+): \{', shapes, re.M))  # 그릇 모양
    names |= set(re.findall(r'^T\.([a-z]+) = \{', js, re.M))  # 부품 정의
    for group in re.findall(r"\[([^\]]*)\]\.forEach\(n => \{ T\[n\] =", js):  # 한꺼번에 만든 부품 (회로 낱개 부품)
        names |= set(re.findall(r"'([a-z]+)'", group))
    aliases = {a for a, _ in re.findall(r'\bT\.([a-z]+) = T\.([a-z]+);', js)}  # 별칭 (burner = lamp …)
    return names - {'generic'}, aliases


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    problems = []
    skill = (ROOT / 'SKILL.md').read_text(encoding='utf-8')
    parts = (ROOT / 'references' / 'parts.md').read_text(encoding='utf-8')
    docs = {'SKILL.md': skill, 'references/parts.md': parts}
    for f in sorted((ROOT / 'references').glob('*.md')):
        docs.setdefault(f'references/{f.name}', f.read_text(encoding='utf-8'))
    types, aliases = engine_types()
    known = types | aliases

    # 1. JSON 예시
    used = []
    for name, text in docs.items():
        for i, block in enumerate(re.findall(r'```json\n(.*?)```', text, re.S), 1):
            try:
                json.loads(block)
            except Exception as e:
                problems.append(f'{name}: {i}번째 json 블록 문법 오류 ({e})')
            used += [(name, t) for t in re.findall(r'"t":\s*"([a-zA-Z_]+)"', block)]

    # 2. 엔진 부품이 문서에 있는지
    documented = set(re.findall(r'`([a-z]+)`', parts))
    for t in sorted(types - documented):
        problems.append(f'references/parts.md에 없는 부품: {t}')
    glance = skill.split('### 부품 이름 한눈에', 1)[-1].split('\n## ', 1)[0]
    for t in sorted(types - CIRCUIT_PARTS - set(re.findall(r'`([a-z]+)`', glance))):
        problems.append(f"SKILL.md '부품 이름 한눈에'에 없는 부품: {t}")
    for t in sorted(set(re.findall(r'`([a-z]+)`', glance)) - known):
        problems.append(f"SKILL.md '부품 이름 한눈에'에 엔진에 없는 이름: {t}")

    # 3. 문서·예시 데이터에 쓴 t
    for f in ['examples/recipes.json', 'examples/gallery.json', 'examples/red-cabbage/experiment.json']:
        used += [(f, t) for t in re.findall(r'"t":\s*"([a-zA-Z_]+)"', (ROOT / f).read_text(encoding='utf-8'))]
    for where, t in sorted(set(used)):
        if t not in known:
            problems.append(f'{where}: 엔진에 없는 부품 이름 "{t}"')

    # 4. scenes.md·parts.json 최신
    scenes_path = ROOT / 'references' / 'scenes.md'
    if scenes_path.read_text(encoding='utf-8') != make_scenes_doc.build():
        problems.append('references/scenes.md가 examples/recipes.json과 다릅니다. python scripts/make_scenes_doc.py 를 실행하세요.')
    try:
        if (ROOT / 'references' / 'parts.json').read_text(encoding='utf-8') != make_registry.build():
            problems.append('references/parts.json이 엔진과 다릅니다. python scripts/make_registry.py 를 실행하세요.')
    except ValueError as e:
        problems.append(str(e))

    # 5. 참고 문서 링크와 길이
    for ref in sorted(set(re.findall(r'`(references/[a-z]+\.md)`', skill))):
        if not (ROOT / ref).exists():
            problems.append(f'SKILL.md가 가리키는 파일이 없습니다: {ref}')
    lines = len(skill.splitlines())
    for ref in sorted(set(re.findall(r'`(references/[a-z]+\.md)`', skill))):
        if f'experiment-visualizer@1/{ref}' not in skill:
            problems.append(f'SKILL.md 참고 문서 표에 {ref}의 @1 주소가 없습니다')
    if 'raw.githubusercontent.com' in skill:
        problems.append('SKILL.md에 raw main 주소가 있습니다. https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/… 를 쓰세요.')

    # 6. @1 주소와 배포 목록
    for name, text in docs.items():
        for path in sorted(set(re.findall(r'experiment-visualizer@1/([A-Za-z0-9_./-]+)', text))):
            if path.endswith('/'):
                continue
            local = ROOT / (path[:-len('.min.js')] + '.js' if path.endswith('.min.js') else path)
            if not local.exists():
                problems.append(f'{name}: @1 주소가 없는 파일을 가리킵니다: {path}')
    zip_src = (ROOT / 'scripts' / 'make_skill_zip.py').read_text(encoding='utf-8')
    release = (ROOT / '.github' / 'workflows' / 'release.yml').read_text(encoding='utf-8')
    for f in sorted((ROOT / 'references').iterdir()):
        ref = f'references/{f.name}'
        if f'"{ref}"' not in zip_src:
            problems.append(f'scripts/make_skill_zip.py 파일 목록에 {ref}가 없습니다')
        if ref not in release:
            problems.append(f'release.yml 캐시 비우기 목록에 {ref}가 없습니다')
    if lines > MAX_SKILL_LINES:
        problems.append(f'SKILL.md가 {lines}줄입니다 ({MAX_SKILL_LINES}줄 이하로 줄이고 자세한 내용은 references로).')

    print(f'부품 {len(types)}종(별칭 {len(aliases)}), SKILL.md {lines}줄, ' + ', '.join(f'{n.split("/")[-1]} {len(t.splitlines())}줄' for n, t in docs.items() if n != 'SKILL.md'))
    for p in problems:
        print('  -', p)
    print('OK' if not problems else f'FAIL ({len(problems)}건)')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
