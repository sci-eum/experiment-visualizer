# 실험 과정 그림 HTML 만들기 (experiment-visualizer)

[![점검](https://github.com/sci-eum/experiment-visualizer/actions/workflows/check.yml/badge.svg)](https://github.com/sci-eum/experiment-visualizer/actions/workflows/check.yml)

실험지(hwp, hwpx, pdf, 사진 …)를 AI에게 첨부하고 이 저장소의 **SKILL 링크**를 함께 주면,
실험 과정을 **단계별 그림**으로 보여 주는 학생용 HTML 자료를 만들어 줍니다.

> 글로 된 실험 과정은 학생에게 잘 와닿지 않습니다. "비커에 물 100 mL를 넣고 알코올램프로 가열한다"를
> 비커·삼발이·알코올램프 그림으로 바로 보여 주면 실험 전에 머릿속으로 미리 해 볼 수 있습니다.

## 결과물 미리 보기

| 예시 | 설명 |
|---|---|
| [붉은 양배추 지시약 실험](https://sci-eum.github.io/experiment-visualizer/examples/red-cabbage/red-cabbage.html) | 예시 실험지 [worksheet.pdf](examples/red-cabbage/worksheet.pdf)를 이 스킬로 바꾼 결과 (한 파일 버전) |
| [같은 결과, 가벼운 버전](https://sci-eum.github.io/experiment-visualizer/examples/red-cabbage/red-cabbage-light.html) | 그림 엔진을 인터넷에서 불러오는 11 KB짜리 HTML |
| [장면 예시 모음](https://sci-eum.github.io/experiment-visualizer/examples/recipes.html) | 붓기·눈금 읽기·가열·거르기·현미경·회로·기체 모으기 장면 |
| [부품 카탈로그](https://sci-eum.github.io/experiment-visualizer/examples/gallery.html) | 그릴 수 있는 실험 기구와 표시 부품 전체 |

만들어진 HTML에서는

- 단계 카드를 누르거나 **수업 모드로 보기**를 누르면 한 단계씩 크게 보입니다. ← → 키(또는 화면 밀기)로 넘기고 전체 화면으로 띄울 수 있습니다.
- 거품, 김, 불꽃, 떨어지는 방울, 젓는 유리 막대가 살짝 움직여 동작을 보여 줍니다.
- 결과 기록표의 빈칸, 생각해 보기 질문의 답, **예상하기** 칸에 화면에서 바로 적을 수 있습니다 (그 기기의 브라우저에만 저장). 자료를 고쳐 단계·질문을 끼워 넣어도 적은 답이 제 질문을 따라갑니다.
- 실험지에 결과가 있으면 **결과 보기**를 눌러야 결과 그림이 나옵니다. 탐구 전에는 결과를 미리 보여 주지 않습니다.
- 단계에 '약 15분', '1분마다' 같은 시간이 있으면 수업 모드에서 **타이머**를 쓸 수 있습니다.
- **인쇄하기**에서 **학생용 학습지**(이름 칸·적는 줄, 결과는 빼고)와 **교사용**(결과 그림·원문 대조까지)을 고를 수 있고, 휴대폰에서도 보입니다.
- 바닥글의 **원문 대조 보기**를 누르면 단계마다 실험지의 어느 곳·어느 문장에서 왔는지, 원문에 없이 더한 것(선생님이 준 팁 등)이 무엇인지 보입니다. 흐려서 확실히 읽지 못한 곳은 **원문 확인 필요**로 늘 표시됩니다.

## 사용법 1 — 링크로 쓰기 (설치 없음)

1. AI 채팅(Claude 권장, ChatGPT·Gemini도 가능)에 실험지 파일을 첨부합니다.
2. 아래 프롬프트를 붙여 넣습니다.

```text
첨부한 실험지를 읽고, 아래 스킬 지시서를 그대로 따라서 실험 과정을 그림으로 보여 주는 HTML을 만들어 줘.
스킬: https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/SKILL.md
```

주소의 `@1`은 공개된 v1 최신판입니다. 지시서·참고 문서·그림 엔진이 모두 같은 판에서 나와 버전이 어긋나지 않습니다.

3. AI가 먼저 **만들 계획**(단계 구성, 그림에 넣을 기구 용량)을 보여 주고, **단계에 넣을 팁**을 물어봐요. 아래처럼 "과정 번호 - 종류: 내용"으로 답하면 그걸 넣어서 만들어요.

```text
3번 - 팁: 표시선은 눈높이를 맞춰서 확인해요
5번 - 주의: 압력 센서에 물이 들어가지 않게 해요
8번 - 예상: 세 용액의 압력 변화는 어떻게 다를까요?
전체 - 강조: 세 용액의 실험 조건을 똑같이 맞춰요
```

종류는 **팁 / 주의 / 강조 / 예상** 중 하나예요. **예상**을 적으면 그 단계에 학생이 관찰 전에 예상을 적는 칸이 생겨요. 넣을 게 없으면 `없음`이라고 답하면 돼요. 묻지 않고 바로 만들게 하려면 처음 프롬프트에 `팁 없이 바로 만들어 줘`를 덧붙이세요. 다만 양·농도·온도처럼 핵심 수치를 확실히 읽지 못했으면 그것만은 먼저 확인합니다.

필요하면 한 줄을 덧붙이세요.

- `2번 실험만 만들어 줘.`
- `초등학교 3학년이 읽을 수 있게 문장을 더 쉽게 써 줘.`
- `과정 그림에 예상 결과(색 변화)도 보여 줘.` ← 기본은 탐구의 재미를 위해 결과를 미리 보여 주지 않습니다.
- `3단계 그림에서 비커를 더 크게 그려 줘.` (만든 뒤 고칠 때)

**나중에 다른 대화에서 고칠 때**는 만든 HTML 파일을 첨부하고 스킬 링크와 함께 고칠 곳을 말하면 돼요 (예: `첨부한 HTML의 3단계 비커를 더 크게 그려 줘.`). AI가 HTML 안의 데이터를 꺼내 그 부분만 고치고, 그림 엔진도 최신으로 바꿔 줍니다. 학생이 적은 내용은 각 기기 브라우저에 남아 있어요.

**Claude(claude.ai)에서 쓸 때 확인할 것**

- 설정 → 기능에서 **웹 검색**(링크 읽기)과 **코드 실행 및 파일 생성**이 켜져 있어야 합니다.
- hwp 파일을 올릴 수 없거나 내용을 못 읽으면, 한글에서 **파일 → PDF로 저장**한 뒤 PDF를 첨부하세요. 배포용(보호) 문서도 PDF로 저장해야 합니다.
- 채팅 화면 미리보기에 그림이 안 보이면, HTML 파일을 **내려받아** 크롬·엣지로 여세요.

## 사용법 2 — Claude 스킬로 설치하기 (자주 쓸 때)

1. [Releases](https://github.com/sci-eum/experiment-visualizer/releases/latest)에서 `experiment-visualizer.zip`을 내려받습니다.
2. claude.ai → 설정 → 기능 → 스킬에서 zip 파일을 업로드합니다.
3. 이제 링크 없이 "첨부한 실험지를 실험 과정 그림 HTML로 만들어 줘"라고만 해도 됩니다.

Claude Code에서는 이 저장소를 스킬 폴더에 복제하면 됩니다.

```bash
git clone https://github.com/sci-eum/experiment-visualizer ~/.claude/skills/experiment-visualizer
```

## 어떻게 동작하나요

AI는 그림 코드를 직접 짜지 않습니다. 실험지를 읽어 **데이터(JSON)** 만 쓰고, 그림은 미리 만들어 둔 그림 엔진(LabKit)이 그립니다.
그래서 결과물의 그림 모양과 화면 구성이 늘 일정합니다.

```text
실험지 ──(AI가 읽기)──▶ EXPERIMENT 데이터 ──(템플릿에 끼우기)──▶ HTML
                         · 단계 제목·설명                      · 단계별 실험 장면 그림
                         · 장면 = 부품 배치                    · 수업 모드, 인쇄
                           {t:'beaker', x:240, fill:.5}
```

- 원문의 양·시간·순서를 그대로 지키고, 원문에 없는 단계는 지어내지 않도록 지시되어 있습니다.
- 실험지에 **용량이 적힌 기구**(100 mL 비커, 10 mL 눈금실린더 …)는 그림에 용량과 눈금 숫자가 새겨지고, **실제 부피 비율대로** 크기가 정해집니다 (500 mL 비커는 100 mL 비커보다 크게). 넣는 양을 주면 액체 높이도 눈금에 맞춰집니다.
- 원문에 없는 팁·주의는 AI가 마음대로 넣지 않고, 선생님께 먼저 물어본 뒤 답한 내용만 넣습니다.
- Claude Code처럼 브라우저가 있는 환경에서는 만든 장면을 그림(PNG)으로 찍어 AI가 직접 보고, 기구가 겹치거나 잘린 곳을 고친 뒤 건넵니다.
- 학생 이름 같은 개인정보는 결과물에 넣지 않습니다.

## 한계

- 그림은 이해를 돕는 **모식도**입니다. 실제 기구의 모양·크기와 다를 수 있습니다.
- 부품에 없는 기구는 가장 비슷한 부품으로 그리거나 간단한 도형으로 대신합니다. [부품 카탈로그](https://sci-eum.github.io/experiment-visualizer/examples/gallery.html)를 참고하세요.
- AI가 원문을 잘못 읽을 수 있습니다. 수업에 쓰기 전에 **양·농도·순서를 꼭 확인**하세요.
- 코드 실행이 안 되는 AI는 "가벼운 HTML"을 만드는데, 이 파일은 열 때 인터넷이 필요합니다 (그림 엔진을 jsDelivr에서 불러옴). 코드 실행이 되면 인터넷 없이 열리는 한 파일로 만듭니다.

## 파일 구조

```text
SKILL.md                AI가 읽는 작업 지시서 (링크 대상): 판단 규칙 (언제 멈추고 묻는지, 원문에서 무엇을 뽑는지, 전달 전 검사)
references/data.md      데이터 형식 (항목, 수업 기능, 원문 대응 기록, 답 저장 이름, 장면 이어받기)
references/build.md     환경별 만들기 방법과 그림 점검 (도구 내려받기, 가벼운 HTML 틀)
references/parts.md     부품 목록 (장면을 쓸 때 AI가 연다)
references/scenes.md    장면 예시 (examples/recipes.json으로 자동 생성)
references/parts.json   부품마다 쓰는 속성 목록 (엔진에서 자동 생성, 데이터 검사에 쓴다)
assets/labkit.js        그림 엔진 + 화면 (원본)
assets/template.html    엔진을 품은 한 파일짜리 틀 (labkit.js로 자동 생성)
assets/light.html       엔진을 CDN에서 불러오는 가벼운 틀
scripts/build_html.py   데이터(JSON) + 틀 → 완성 HTML (전에 만든 HTML을 넣으면 최신 엔진으로 다시 만듦)
scripts/extract_data.py 전에 만든 HTML에서 데이터(JSON) 꺼내기 (다시 고칠 때)
scripts/check_data.py   만들기 전에 데이터 검사 (오타·없는 부품·id 중복·부피·용량 초과·원문 숫자 대조)
scripts/extract_text.py hwp·hwpx·docx·pptx·pdf에서 글자 꺼내기 (표준 라이브러리만 사용)
scripts/check_render.py 헤드리스 Chrome·Edge로 열어 오류·겹침 확인, 장면을 PNG로 찍기
examples/               예시 실험지와 결과물, 장면 예시, 부품 카탈로그
```

### 고치는 사람을 위한 메모

```bash
python scripts/make_template.py                                  # labkit.js → template.html
python scripts/build_html.py examples/gallery.json examples/gallery.html
python scripts/make_scenes_doc.py                                # examples/recipes.json → references/scenes.md
python scripts/build_html.py examples/recipes.json examples/recipes.html
python scripts/make_registry.py                                  # labkit.js → references/parts.json (부품 속성 목록)
python scripts/check_docs.py                                     # 문서와 엔진이 맞는지 (JSON 문법, 부품 목록, 참고 문서 주소, SKILL.md 길이)
python scripts/check_data.py examples/gallery.json               # 데이터 검사
python scripts/selftest.py                                       # 수식·부피 읽기, 검사기, 원문 숫자 대조, 학생 답 저장 이름(헤드리스 브라우저) 자체 시험
python scripts/check_render.py examples/gallery.html --shots shots  # 헤드리스 Chrome/Edge로 열어 오류·겹침 확인, 장면 PNG를 shots/에 (가벼운 버전도 내 폴더 엔진으로)
python scripts/make_skill_zip.py                                 # dist/experiment-visualizer.zip
```

가벼운 HTML은 `https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/labkit.min.js`를 불러오고, 링크로 쓰는 SKILL.md와 참고 문서·도구도 같은 `@1`에서 나갑니다.
엔진을 고친 뒤에는 `v1.x.y` 태그를 붙여 push해야 jsDelivr에 반영됩니다. 그림 데이터 형식을 바꾸는 큰 변경은 `v2`로 올립니다.
버전을 올릴 때는 `labkit.js` 첫 줄 머리말과 `const VERSION`도 같은 번호로 고칩니다 (다르면 `make_template.py`가 멈춥니다).

**자동 점검과 배포 (GitHub Actions)**

- `main`에 push하면 [점검](.github/workflows/check.yml)이 돕니다: template.html·예시 HTML이 최신인지(다시 만들어 비교), 문서 점검, 헤드리스 Chrome 그림 점검(겹침 의심도 실패). 장면 그림 PNG는 실행 결과의 Artifact `shots`에서 내려받습니다.
- 태그를 push하면 [배포](.github/workflows/release.yml)가 점검을 다시 돌린 뒤, 태그와 엔진 버전이 같은지 보고 Release를 만들어 스킬 zip을 붙이고 jsDelivr `@1` 캐시(엔진·문서·도구)를 비웁니다. 릴리스 노트는 태그 메시지로 씁니다.

```bash
git tag -a v1.9.2 -F 노트.txt   # 노트.txt: 첫 줄은 제목, 빈 줄, 그다음 본문
git push origin v1.9.2
```

## 라이선스

MIT. 학교 수업과 연수에 자유롭게 쓰고 고쳐 쓰세요.
