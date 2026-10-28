# experiment-visualizer 프로젝트 지침

## 식별자 (다른 프로젝트와 헷갈리지 않게)
- 저장소: https://github.com/sci-eum/experiment-visualizer (public, 계정 sci-eum)
- 공개 주소: GitHub Pages https://sci-eum.github.io/experiment-visualizer/
- 링크용 SKILL: https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/SKILL.md (진입 링크만 `@1`. 지시서 안의 문서·도구·엔진은 엔진 VERSION과 같은 정확한 버전으로 고정. 대체 주소도 같은 태그를 사용한다)
- 엔진 CDN: https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1.23.0/assets/labkit.min.js (태그 v1.x.y 기준)
- 입체(3D) 엔진 CDN: https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@<그림 엔진과 같은 버전>/assets/labkit3d.min.js (예: @1.19.0, 3D 버튼을 누를 때 불러옴)
- Supabase·Vercel: 사용하지 않음 (데이터 저장이 필요 없는 정적 자료)

## 작업 규칙
- 그림 엔진의 원본은 `assets/labkit.js`, 입체(3D) 보기 엔진의 원본은 `assets/labkit3d.js`다 (외부 라이브러리 없이 WebGL만 쓴다. template.html에는 넣지 않고 3D 버튼을 누를 때 같은 버전 주소에서 불러오며, `build_html.py --3d`면 파일 안에 넣는다). labkit.js를 고친 뒤 `python scripts/make_template.py`로 `assets/template.html`을 다시 만든다.
- 예시는 `python scripts/build_html.py <데이터> <결과.html>`로 다시 만든다 (gallery.json, recipes.json, red-cabbage/experiment.json; red-cabbage-light.html은 `--light`). 다시 만든 뒤 `python scripts/check_render.py <html…> --shots shots --3d`로 오류·겹침·입체 보기를 확인하고, `shots/<이름>/overview.png`와 `3d-overview.png`를 열어 그림을 직접 본다. 예시는 OK(경고 없음)를 유지한다. `shots/`는 Git에 넣지 않는다.
- `my-results/`는 사용자 실험지로 만든 결과물이라 Git에 넣지 않는다 (.gitignore).
- 사용자가 시험 삼아 준 실험지·보고서에서 나온 내용(문장, 수치·표, 이름, 사진, 자료 제목)은 예시·자체 시험(selftest)·문서·커밋 메시지·태그·릴리스 노트에 넣지 않는다. 시험 사례가 필요하면 값을 지어낸다. 다른 세션에 일을 맡길 때도 그 내용을 옮겨 적지 않는다.
- `교과서/`는 출판사 교과서·탐구 활동 PDF(저작물)를 검토용으로 둔 폴더라 Git에 넣지 않는다 (.gitignore). 그 안의 내용(문장, 과정, 수치·표, 그림, 활동 제목)도 위 실험지와 같이 예시·selftest·문서·커밋 메시지·태그·릴리스 노트·다른 세션 지시에 옮기지 않는다. 부품·장면 예시가 필요하면 상황과 값을 지어낸다.
- 엔진을 바꿔 공개하면 새 태그(v1.x.y)를 push해 jsDelivr `@1`에 반영한다. 데이터 형식을 깨는 변경은 v2.
- 버전을 올릴 때는 `labkit.js`와 `labkit3d.js`의 첫 줄 머리말과 `const VERSION`을 모두 태그와 같은 번호로 고친다 (다르면 `make_template.py`가 멈춘다). 결과 HTML 바닥글에 이 버전이 나온다.
- 스킬 문서: `SKILL.md`(판단 규칙만, 400줄 이하), `references/parts.md`(부품 목록), `references/scenes.md`(장면 예시, 자동 생성), `references/data.md`(데이터 형식), `references/build.md`(환경별 만들기·점검). 자세한 형식·방법은 SKILL.md가 아니라 참고 문서에 쓴다. 부품을 바꾸면 parts.md와 SKILL.md의 '부품 이름 한눈에'를 같이 고친다. 참고 문서를 더하면 `make_skill_zip.py`와 release.yml의 캐시 비우기 목록에도 넣는다.
- 장면 예시의 원본은 `examples/recipes.json`이다. 고친 뒤 `python scripts/make_scenes_doc.py`로 scenes.md를 만들고 recipes.html도 다시 그린다. scenes.md를 손으로 고치지 않는다.
- 엔진의 부품·속성을 바꾸면 `python scripts/make_registry.py`로 `references/parts.json`을 다시 만든다 (데이터 검사기가 쓴다).
- 수업 조작·학생 답 저장을 고치면 `python scripts/selftest_ui.py --require-browser`로 PC·휴대폰 너비에서 실제 브라우저 검사를 한다. 새 배포 버전은 SKILL.md의 참고 링크, build.md의 다운로드·가벼운 틀, light.html, check_data.py의 VERSION도 맞춘다.
- 문서를 고친 뒤 `python scripts/check_docs.py`가 OK인지 확인한다 (JSON 문법, 엔진과 부품 목록 일치, scenes.md·parts.json 최신, SKILL.md 길이).
- 예시 데이터는 `python scripts/check_data.py`가 오류·확인 없이 OK여야 한다. 수식·부피 읽기나 검사기를 고치면 `python scripts/selftest.py`에 사례를 더한다.
- `dist/`(스킬 zip)는 Git에 넣지 않는다. Release와 zip 첨부, jsDelivr 캐시 비우기는 태그를 push하면 `.github/workflows/release.yml`이 한다. 손으로 `gh release create`를 하지 않는다. 릴리스 노트는 태그 메시지로 쓴다 (`git tag -a v1.x.y -F 노트.txt`, 첫 줄 제목·빈 줄·본문).
- push하면 `.github/workflows/check.yml`(점검)이 돈다. 실패하면 로그를 보고 같은 점검을 로컬에서 다시 돌려 고친다. 장면 그림은 실행의 Artifact `shots`에 있다.
