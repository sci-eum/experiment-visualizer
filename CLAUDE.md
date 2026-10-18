# experiment-visualizer 프로젝트 지침

## 식별자 (다른 프로젝트와 헷갈리지 않게)
- 저장소: https://github.com/sci-eum/experiment-visualizer (public, 계정 sci-eum)
- 공개 주소: GitHub Pages https://sci-eum.github.io/experiment-visualizer/
- 링크용 SKILL: https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/SKILL.md
- 엔진 CDN: https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/labkit.min.js (태그 v1.x.y 기준)
- Supabase·Vercel: 사용하지 않음 (데이터 저장이 필요 없는 정적 자료)

## 작업 규칙
- 그림 엔진의 원본은 `assets/labkit.js` 하나다. 고친 뒤 `python scripts/make_template.py`로 `assets/template.html`을 다시 만든다.
- 예시는 `python scripts/build_html.py <데이터> <결과.html>`로 다시 만든다 (gallery, recipes, red-cabbage). 다시 만든 뒤 `python scripts/check_render.py <html…> --shots shots`로 오류·겹침을 확인하고, `shots/<이름>/overview.png`를 열어 그림을 직접 본다. 예시는 OK(경고 없음)를 유지한다. `shots/`는 Git에 넣지 않는다.
- `my-results/`는 사용자 실험지로 만든 결과물이라 Git에 넣지 않는다 (.gitignore).
- 엔진을 바꿔 공개하면 새 태그(v1.x.y)를 push해 jsDelivr `@1`에 반영한다. 데이터 형식을 깨는 변경은 v2.
- 버전을 올릴 때는 `labkit.js` 첫 줄 머리말과 `const VERSION`을 태그와 같은 번호로 고친다 (둘이 다르면 `make_template.py`가 멈춘다). 결과 HTML 바닥글에 이 버전이 나온다.
- SKILL.md의 부품 목록·예시는 엔진과 같이 고친다. 예시는 `examples/recipes.data.js`에서 실제로 그려 확인한다.
- `dist/`(스킬 zip)는 Git에 넣지 않고 Release 첨부로만 올린다.
