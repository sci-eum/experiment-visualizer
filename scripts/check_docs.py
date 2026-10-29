#!/usr/bin/env python3
"""(관리자용) SKILL.md·references 문서가 그림 엔진과 맞는지 확인한다.

1. 문서의 ```json 예시가 모두 JSON 문법에 맞는다.
2. 엔진(labkit.js)의 부품이 모두 references/parts.md에 있고, SKILL.md의 '부품 이름 한눈에'에도 있다.
3. 문서·예시 데이터에 쓴 부품 이름(t)이 모두 엔진에 있다.
4. references/scenes.md가 examples/recipes.json과, references/parts.json이 엔진과 같다.
5. SKILL.md가 가리키는 참고 문서가 있고, SKILL.md가 너무 길지 않다.
6. 문서의 고정 버전 jsDelivr 주소가 저장소에 있는 파일을 가리키고, 참고 문서가 모두 스킬 zip·캐시 비우기 목록에 있다.
7. parts.md의 '입체(3D) 보기' 표가 입체 엔진(labkit3d.js)이 빚는 부품·설명 부품과 같다.
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
    version = re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", (ROOT / 'assets/labkit.js').read_text(encoding='utf-8')).group(1)

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
        if f'experiment-visualizer@{version}/{ref}' not in skill:
            problems.append(f'SKILL.md 참고 문서 표에 {ref}의 @{version} 고정 주소가 없습니다')
    if 'raw.githubusercontent.com' in skill:
        problems.append(f'SKILL.md는 고정 버전 jsDelivr @{version} 주소를 쓰세요.')

    # 6. 고정 버전 주소와 배포 목록
    for name, text in docs.items():
        for tag, path in sorted(set(re.findall(r'experiment-visualizer@([0-9.]+)/([A-Za-z0-9_./-]+)', text))):
            if tag != version:
                problems.append(f'{name}: @{tag} 주소는 엔진과 같은 @{version}으로 고정하세요')
            if path.endswith('/'):
                continue
            local = ROOT / (path[:-len('.min.js')] + '.js' if path.endswith('.min.js') else path)
            if not local.exists():
                problems.append(f'{name}: 주소가 없는 파일을 가리킵니다: {path}')
        if 'experiment-visualizer/main/' in text:
            problems.append(f'{name}: 대체 다운로드 주소도 v{version} 태그로 고정하세요')
    import check_data
    if check_data.VERSION != version:
        problems.append('check_data.py의 부품 목록 다운로드 버전을 엔진과 맞추세요')
    light = (ROOT / 'assets/light.html').read_text(encoding='utf-8')
    if f'experiment-visualizer@{version}/assets/labkit.min.js' not in light:
        problems.append('light.html의 엔진 주소를 현재 버전으로 고정하세요')
    zip_src = (ROOT / 'scripts' / 'make_skill_zip.py').read_text(encoding='utf-8')
    release = (ROOT / '.github' / 'workflows' / 'release.yml').read_text(encoding='utf-8')
    for f in sorted((ROOT / 'references').iterdir()):
        ref = f'references/{f.name}'
        if f'"{ref}"' not in zip_src:
            problems.append(f'scripts/make_skill_zip.py 파일 목록에 {ref}가 없습니다')
        if ref not in release:
            problems.append(f'release.yml 캐시 비우기 목록에 {ref}가 없습니다')
    # 7. 입체 등급 표 = 엔진의 그릇 + labkit3d.js의 BUILD(별칭 포함) + OVERLAY
    l3 = (ROOT / 'assets' / 'labkit3d.js').read_text(encoding='utf-8')
    js = (ROOT / 'assets' / 'labkit.js').read_text(encoding='utf-8')
    want = {
        '입체 그릇': set(re.findall(r'^  ([a-z]+): \{', re.search(r'const SHAPES = \{(.*?)\n\};', js, re.S).group(1), re.M)),
        '입체 기구': set(re.findall(r'^  ([a-z]+)\(d, b\)', re.search(r'const BUILD = \{(.*?)\n\};', l3, re.S).group(1), re.M)) | set(re.findall(r'BUILD\.([a-z]+) = BUILD\.[a-z]+', l3)),
        '설명': set(re.findall(r"'([a-z]+)'", re.search(r'const OVERLAY = new Set\(\[(.*?)\]\)', l3).group(1))),
    }
    for grade, names in want.items():
        row = re.search(r'^\| ' + grade + r'[^|]*\|(.*)\|$', parts, re.M)
        got = set(re.findall(r'`([a-z]+)`', row.group(1))) if row else set()
        if got != names:
            problems.append(f"parts.md '입체(3D) 보기' 표의 {grade}: 빠짐 {sorted(names - got)}, 남음 {sorted(got - names)} (labkit3d.js와 맞추세요)")
        unknown = got - known
        if unknown:
            problems.append(f"parts.md '입체(3D) 보기' 표에 엔진에 없는 부품: {sorted(unknown)}")
    # 8. 부품 이름(부품 눌러 알아보기 카드): 엔진의 KO 표가 설명 부품을 뺀 모든 부품을 갖고, 이름이 parts.md에 그대로 있다
    ko = dict(re.findall(r"(\w+): '([^']+)'", re.search(r'const KO = \{(.*?)\};', js, re.S).group(1)))
    skip = set(re.findall(r"'([a-z]+)'", re.search(r'const PK_SKIP = new Set\(\[(.*?)\]\)', js).group(1)))
    missing = sorted(t for t in types if t not in ko and t not in skip)
    if missing:
        problems.append(f'labkit.js KO(부품 이름) 표에 없는 부품: {missing}')
    for t, n in sorted(ko.items()):
        if not t.startswith('_') and n not in parts:
            problems.append(f"labkit.js KO의 '{t}' 이름 '{n}'이 references/parts.md에 없습니다 (문서의 이름과 맞추세요)")
    # 9. 기구 기본 설명(INFO) 표의 부품 이름이 엔진에 있다 ('meter:ph'처럼 kind를 붙인 것 포함)
    info = re.search(r'const INFO = \{(.*?)\n\};', js, re.S)
    for k in re.findall(r"^  '?([a-z]+(?::[a-z0-9]+)?)'?: \[", info.group(1) if info else '', re.M):
        if k.split(':')[0] not in types or k.split(':')[0] not in ko:
            problems.append(f"labkit.js INFO(기구 기본 설명)에 엔진에 없는 부품: {k}")
    if lines > MAX_SKILL_LINES:
        problems.append(f'SKILL.md가 {lines}줄입니다 ({MAX_SKILL_LINES}줄 이하로 줄이고 자세한 내용은 references로).')

    print(f'부품 {len(types)}종(별칭 {len(aliases)}), SKILL.md {lines}줄, ' + ', '.join(f'{n.split("/")[-1]} {len(t.splitlines())}줄' for n, t in docs.items() if n != 'SKILL.md'))
    for p in problems:
        print('  -', p)
    print('OK' if not problems else f'FAIL ({len(problems)}건)')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
