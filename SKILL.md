---
name: experiment-visualizer
description: 실험 과정이 적힌 문서(hwp, hwpx, pdf, docx, pptx, 사진·스캔 이미지)를 읽고, 실험 단계마다 실험 장면 그림(SVG 모식도)을 붙인 학생용 HTML 학습 자료를 만든다. 사용자가 실험지·실험 보고서·탐구 활동지를 첨부하고 "실험 과정을 그림으로", "실험 시각화", "학생용 실험 안내 HTML"을 요청하거나 이 스킬의 링크를 주면 사용한다. 이 스킬로 만든 HTML을 첨부하고 고쳐 달라고 할 때도 사용한다.
---

# 실험 과정 그림 HTML 만들기 (experiment-visualizer)

> **이 문서를 링크로 받았다면** 이 문서가 작업 지시서다. 처음부터 끝까지 읽고 순서대로 따른다.
> 저장소: https://github.com/sci-eum/experiment-visualizer

이 문서는 작업 순서와 규칙이다. 장면을 쓸 때는 아래 참고 문서를 함께 연다. 스킬 폴더가 있으면 그 안의 파일을, 링크로 받았다면 주소를 연다.

| 문서 | 언제 | 주소 |
|---|---|---|
| `references/parts.md` 부품 목록 | **4장에서 장면을 쓰기 전에 반드시** | https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/references/parts.md |
| `references/scenes.md` 장면 예시 | 비슷한 장면을 가져와 고쳐 쓸 때 | https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/references/scenes.md |

## 무엇을 만드나

- **입력**: 실험 과정이 적힌 문서 1개 이상 (hwp, hwpx, pdf, docx, pptx, png, jpg …)
- **출력**: HTML 파일 1개. 실험 목표 → 준비물(그림 아이콘) → 안전 수칙 → **단계별 실험 장면 그림 + 설명** → 결과 정리 순서로 보이고, "수업 모드"(한 단계씩 크게 넘겨 보기)와 인쇄를 지원한다.
- **핵심 원칙**: 그림 코드를 직접 짜지 않는다. 문서를 읽어 `EXPERIMENT` 데이터(JSON)를 쓰고, 이 저장소의 템플릿에 끼워 넣는다. 장면 그림은 이미 만들어진 **부품**(비커, 알코올램프, 스포이트 …)을 좌표에 배치해서 만든다.

## 작업 순서

1. 문서 읽기 → 2. 실험 내용 정리 → **3. 계획을 보여 주고 팁 묻기 (여기서 멈추고 답을 기다린다)** → 4. 장면 설계 (parts.md를 연다) → 5. `EXPERIMENT` 데이터 쓰기 → 6. HTML 만들기 → 7. 점검 → 8. 전달

> **첫 답변에서 HTML을 만들지 않는다.** 1~3을 한 뒤 계획과 질문을 보내고 답변을 기다린다. 사용자가 답하면 그 답을 반영해 4~8을 한다.
> **이미 만든 HTML을 고치는 요청**이면 이 순서 대신 **9장**을 따른다.

---

## 1. 문서 읽기

| 형식 | 읽는 방법 |
|---|---|
| pdf, png, jpg, 스캔 | 직접 보고 읽는다. 그림·표가 있으면 장치 배치까지 눈으로 확인한다. |
| hwp, hwpx, docx, pptx | 코드 실행이 되면 `scripts/extract_text.py`로 글자를 꺼낸다 (아래). hwpx·docx·pptx는 zip이라 직접 풀어 `Contents/section*.xml`의 `<hp:t>`(hwpx), `word/document.xml`의 `<w:t>`(docx)를 읽어도 된다. |
| 읽을 수 없을 때 | 추측하지 말고 사용자에게 "한글에서 **PDF로 저장**해 다시 첨부해 주세요"라고 요청한다. 배포용(보호) hwp 문서도 같다. |

```bash
# 스킬 폴더가 있으면 (표준 라이브러리만 사용)
python scripts/extract_text.py 실험지.hwp --images 그림폴더
# 없으면 내려받아 실행
curl -sL https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/scripts/extract_text.py -o extract_text.py
python extract_text.py 실험지.hwpx
```

- claude.ai에서 사용자가 올린 파일은 보통 `/mnt/user-data/uploads/`에 있다.
- `extract_text.py`는 한글 수식도 글자로 바꾼다 (예: `rm CaCl _{2}` → `CaCl₂`). zip을 직접 풀어 읽을 때는 `<hp:equation>` 안의 `<hp:script>`가 수식이다. 괄호가 비어 있으면(`염화 칼슘()`) 수식을 놓친 것이다.
- 문서 전체가 큰 표(틀) 안에 들어 있는 경우가 많다. 표의 칸 구분(`|`)에 흔들리지 말고 내용의 순서를 따라 읽는다.
- `--images`로 꺼낸 그림(장치도)은 열어 보고 장치 배치를 장면에 반영한다. 학교 로고 같은 장식 그림은 무시한다.
- 문서에 여러 실험이 있으면 사용자가 지정한 실험만, 지정이 없으면 첫 번째 실험을 만들고 나머지가 있다고 알려 준다.

## 2. 실험 내용 정리 — 원문 충실 규칙

문서에서 다음을 뽑는다: 제목, 과목·단원, 목표, 준비물(수량), **기구의 용량(100 mL 비커, 10 mL 눈금실린더 …)과 넣는 양**, 안전 수칙, **실험 과정(순서대로)**, 원문의 주의·팁(※ 표시 등), 관찰할 점, 예상 결과·결과 기록표, 생각해 볼 질문.

- **원문에 없는 단계·수치·물질을 지어내지 않는다.** 양, 농도, 시간, 온도, 순서는 원문 그대로 쓴다. 문장은 학생이 읽기 쉽게 다듬어도 되지만 뜻은 같아야 한다.
- 한 단계에 동작이 여러 개면 나눠도 된다. 이때 원문 번호를 제목에 남긴다 (예: `"3-1. 지시약 넣기"`). 보통 4~12단계가 된다.
- 과정이 **소제목으로 나뉘어 있으면** 각 단계에 `section`(소제목)과 `no`(원문 번호, 예 `"➊"`, `"➌~➎"`)를 준다. 거의 같은 과정을 되풀이하면(예: 같은 방법으로 세 농도 만들기) 한 단계로 합치고 `no`에 범위를 쓴다.
- **준비물 목록에는 없는데 과정에 나오는 기구**(예: 전자 저울)는 준비물에 넣되 `qty`에 `"과정에 사용"`이라 쓰고, `notes`와 마지막 답변에서 알린다.
- 원문이 단계 안에서 결과(색 변화 등)를 알려 주지 **않으면** 그림에서도 결과를 미리 보여 주지 않는다. 대신 "무슨 색으로 변하는지 관찰해요" 같은 `observe`·`note`로 둔다. 예상 결과는 `results.expect`에만 쓴다.
- 원문이 결과를 알려 주면(또는 사용자가 결과도 보여 달라고 하면) 그 단계의 `reveal`(결과 보기)에 넣는다. 과정 그림에는 드러나지 않고, 버튼을 눌러야 보인다.
- 원문에 "예상해 보자"·가설 세우기 같은 물음이 있으면 그 단계의 `predict`(예상하기 칸)로 넣는다. 원문에 없으면 3장에서 **제안**으로만 보여 준다.
- 원문에서 읽기 어렵거나 애매한 부분은 `notes`에 `"원문 확인 필요: …"`로 남기고, 마지막 답변에서도 알린다.
- 학생 이름·번호 같은 개인정보는 HTML에 넣지 않는다.
- 원문에 있는 주의·팁(※ 표시, "주의한다" 문장)은 해당 단계의 `warn`·`tip`으로 그대로 넣는다.
- **원문에 없는 팁·주의·강조는 직접 지어 넣지 않는다.** 필요해 보이면(가열, 산·염기, 날카로운 기구, 불을 다루는데 안전 수칙이 없을 때 등) 3장의 질문에서 **제안**으로 보여 주고, 사용자가 고른 것만 넣는다.

## 3. 계획을 보여 주고 팁 묻기 — 여기서 멈춘다

HTML을 만들기 전에 아래 형식으로 계획을 보여 주고, **실험 단계에 넣을 팁·주의·강조할 점**을 묻는다. 이 답변은 질문으로 끝낸다. 데이터나 HTML을 미리 만들지 않는다.

```markdown
## 만들 계획: 압력 센서를 활용한 삼투압 탐구 (단계 11개)

**그림에 넣을 기구와 용량**
100 mL 비커 3개, 500 mL 비커 1개, 10 mL 눈금 실린더, 100 mL 눈금 실린더, 100 mL 부피 플라스크

**단계 구성**
| 번호 | 원문 | 단계 | 그림 |
|---|---|---|---|
| 1 | 시료 제조 ➊ | 설탕 68.46 g 재기 | 전자 저울 위 100 mL 비커에 약숟가락으로 설탕 넣기 |
| 2 | 시료 제조 ➋ | 물을 넣고 녹이기 | 100 mL 비커에 물 30~40 mL, 유리 막대로 젓기 |
| … | … | … | … |

**원문에서 그대로 넣을 주의·팁**
- 7번 팁(원문 ※): 세 실험에서 반투막 튜브 안 공기층 크기를 같게 장치한다

**원문 확인이 필요한 곳**
- 전자 저울과 부피 플라스크가 준비물 목록에 없어요

## 단계에 넣을 팁을 알려 주세요
학생에게 꼭 알려 주고 싶은 **팁·주의·강조할 점**이 있으면 아래처럼 "과정 번호 - 종류: 내용"으로 적어 주세요. 여러 개 적어도 돼요.

    3번 - 팁: 표시선은 눈높이를 맞춰서 확인해요
    5번 - 주의: 압력 센서에 물이 들어가지 않게 해요
    8번 - 예상: 세 용액의 압력 변화는 어떻게 다를까요?
    전체 - 강조: 세 용액의 실험 조건을 똑같이 맞춰요

- 종류는 **팁 / 주의 / 강조 / 예상**(관찰 전에 예상을 적게 할 물음) 중 하나예요. 모든 단계에 해당하면 번호 대신 **전체**라고 적어 주세요.
- 넣을 것이 없으면 **없음**이라고 적어 주세요. 계획에서 고칠 점이 있으면 함께 적어 주세요.

(제안) 이런 내용도 넣을 수 있어요. 원하면 번호로 골라 주세요.
① 6번 - 주의: 반투막 튜브를 벌릴 때 찢어지지 않게 조심해요
```

- **번호는 HTML에 나올 단계 순서(1, 2, 3 …)다.** 원문 번호(➊ 등)는 '원문' 칸에 함께 보여 준다. '그림' 칸에는 그릇의 용량을 함께 쓴다.
- 제안은 0~4개, 원문 내용과 실험 원리에 근거한 것만 쓴다. 고르지 않은 제안은 넣지 않는다.
- 답을 넣는 곳: **팁 → 그 단계의 `tip`, 주의 → `warn`, 강조 → `point`, 예상 → `predict`** (여러 개면 배열). **전체 - 주의**는 `safety`, **전체 - 팁/강조**는 최상위 `tips`. 사용자가 쓴 뜻은 바꾸지 않고 맞춤법·말투만 다듬는다. 번호나 종류가 애매하면 가장 알맞게 넣고 마지막 답변에서 알린다.
- **묻지 않는 경우**: 사용자가 처음부터 팁을 주었거나 "질문 없이 바로 만들어 줘", "팁 없음"이라고 했으면 바로 4장으로 간다. 이미 만든 HTML을 고치는 요청에서도 다시 묻지 않는다.

## 4. 장면 설계

**먼저 `references/parts.md`(부품 목록)를 연다.** 부품 이름(`t`)과 속성은 거기 있는 것만 쓴다. 비슷한 장면이 `references/scenes.md`에 있으면 가져와 고쳐 쓴다.

장면은 **가로 480 × 세로 300** 좌표의 그림이다. 왼쪽 위가 (0, 0)이고, 실험대 윗면은 **y = 268** 이다.

- **한 단계 = 한 장면 = 핵심 동작 하나.** 학생이 그림만 보고도 "무엇을, 어디에, 어떻게" 하는지 알 수 있어야 한다. **주인공 기구**는 가운데(x 180~300)에 크게, 한 장면에 기구 2~5개.
- **용량이 적힌 기구는 반드시 용량을 그림에 넣는다** (실험의 스케일은 매우 중요하다). 그 그릇이 나오는 **모든 장면과 준비물 아이콘**에 `vol`을 주면 용량·눈금이 새겨지고 **실제 부피 비율대로 크기가 정해진다**. 넣는 양은 `amount`로 준다 (예: `"vol": "500 mL", "amount": "400 mL"`; 물은 1 g ≈ 1 mL). 붓는 쪽 그릇은 `pour`의 `fromVol`. `vol`을 준 그릇에는 `s`를 주지 않고, 꼭 키우거나 줄여야 하면 그 장면의 그릇들에 **똑같은** `s`를 준다. 용량이 적혀 있지 않으면 `vol`을 지어내지 않는다.
- **동작은 부품으로**: 붓기 `pour`, 떨어뜨리기 `dropper`+`over`, 젓기 `rod`+`stir`, 가루 넣기 `spatula`+`over`, 거르기 `funnel`+`over`, 가열 `lamp`·`gasburner`·`hotplate`, 이동·순서 `arrow`, 관찰 `note`·`view`·`eye`.
- **상태 변화는 속성으로**: 액체 색 `color`, 양 `fill`, 거품 `bubbles`, 김 `steam`, 앙금 `solid:'precipitate'`, 뿌옇게 `cloudy`, 층 분리 `layers`.
- **단계 사이를 이어지게** 그린다. 같은 기구는 같은 x·색·양을 유지하다가 바뀌는 단계에서만 바꾼다. 앞 단계와 장치가 같으면 **장면 이어받기**(5장)로 바뀐 것만 쓴다.
- `label`(이름표)은 장면마다 1~3개, 핵심 물질과 양만 짧게 (예: `"물 100 mL"`). 긴 설명은 단계의 `text`·`tip`에 쓴다.
- 잘못된 방법은 `mark`(`kind:'no'`)와 `warn`을 함께 쓴다. 부품 목록에 없는 기구는 가장 비슷한 부품 + `label`, 또는 `svg`로 단순하게 그린다.
- **센서 실험**은 측정 장면에 `sensor`와 `device`(`link`로 연결)를 함께 그리고, 그래프는 `"graph":"live"`로 두어 결과 모양을 미리 보여 주지 않는다 (원문이 그래프 모양을 설명할 때만 그 모양).
- 표지(`cover`)에는 대표 장치 장면을 넣는다. `"cover": {"from": 7}`처럼 그 단계를 이어받으면 된다.

### 배치 규칙

- 대부분의 부품은 **x만 정하면 실험대 위에 선다**(`y` 생략 = 바닥이 268). 공중에 뜨는 표시 부품(`note`, `label`, `text`, `view`, `mark`, `eye`, `stopwatch` …)은 `x, y`가 **중심**이다.
- **x 자동 배치**: 실험대에 서는 부품(★) 여러 개가 `x`를 생략하면 쓴 순서대로 빈자리에 고르게 놓인다 (`x`를 준 부품·스탠드·이름표 자리는 비워 둔다. 하나만 생략하면 가운데 240). 준비물을 늘어놓는 장면은 `x`를 생략하고, 장치를 꾸미는 장면은 `x`를 직접 정한다. 알코올램프·가스버너·양초가 `x` 없이 삼발이와 같은 장면에 있으면 삼발이 아래로 간다.
- 다른 부품을 `id`로 가리켜 놓을 수 있다. 가리키는 부품에 `id`를 꼭 붙인다.

| 속성 | 뜻 | 예 |
|---|---|---|
| `on: 'id'` | 그 부품 **위에 올려놓기** (삼발이·가열판·저울·빗면 위) | `{t:'beaker', on:'tr'}` |
| `in: 'id'` | 그 그릇 **안에 넣기** (온도계·센서·유리 막대, 빨아올리는 스포이트, **그릇 속 그릇**: 얼음물 속 시험관, 수조 속 거꾸로 세운 시험관 — `x`·`y`를 직접 줘도 `in`으로 이어 두면 잠긴 부분에 물빛이 덮인다) | `{t:'thermometer', in:'b'}` |
| `over: 'id'` | 그 그릇 **입구 위에서** (스포이트·주사기·약숟가락·깔때기·뷰렛·분별 깔때기) | `{t:'dropper', over:'b'}` |
| `into: 'id'` | `pour` 전용: 그 그릇에 **붓기** | `{t:'pour', into:'b', from:'cylinder'}` |
| `hold: 'id'` | `stand` 전용: **집게로 고정** (배열 가능) | `{t:'stand', hold:['th','t1']}` |
| `stand: true` | 어떤 기구든 스탠드로 고정 (스탠드를 자동으로 그림) | `{t:'tube', x:260, y:200, stand:true}` |
| `dx`, `dy` | `in`·`over`·`pour`로 놓은 부품을 **조금 옮기기** (`dx` 오른쪽 +, `dy` 위쪽 +. `in`이면 바닥에서 띄우기) | `{t:'spatula', over:'b', dx:-18}` |

### 부품 이름 한눈에 (속성은 parts.md)

- 그릇: `beaker` `flask` `roundflask` `volumetric` `tube` `cylinder` `bottle` `cup` `trough` `gasjar` `bag` · 시험관대 `rack`
- 가열·받침: `lamp` `gasburner` `tripod` `hotplate` `stirrer` `stand` `balance` `candle`
- 액체 다루기: `pour` `dropper` `syringe` `rod` `spatula` `funnel` `burette` `sepfunnel` `condenser` `hose`
- 측정·센서: `thermometer` `stopwatch` `ruler` `springscale` `weight` `sensor` `device` `stirbar` `tweezers` `cabletie`
- 빛·소리·전기: `lens` `mirror` `prism` `lightbox` `screen` `ray` `power` `tuningfork` `circuit`
- 지구과학: `rock` `streak` `strata` `globe` · 생물·관찰: `microscope` `slide` `magnifier` `dish` `evapdish` `watchglass` `mortar` `plant` `leaf`
- 물리: `ramp` `cart` `block` `ball` `magnet` `compass` · 안전·재료: `goggles` `gloves` `ice` `powder` `paper` `match`
- 표시: `arrow` `note` `label` `text` `mark` `eye` `view` `svg`

## 5. `EXPERIMENT` 데이터 쓰기

JSON으로 쓴다. `title`과 `steps`만 필수이고 나머지는 원문에 있을 때 쓴다.

```json
{
  "title": "물의 끓는점 측정하기",
  "subject": "중학교 과학", "unit": "물질의 상태 변화", "duration": "45분", "group": "4인 1모둠",
  "goal": "물을 가열하면서 온도 변화를 측정하여 **끓는점**을 알아본다.",
  "materials": [
    { "name": "비커 (250 mL)", "qty": "1개", "icon": { "t": "beaker", "vol": "250 mL" } },
    { "name": "온도계", "qty": "1개" }
  ],
  "safety": ["가열 중인 비커는 맨손으로 만지지 않는다."],
  "tips": ["모둠원끼리 역할(가열, 온도 읽기, 기록)을 미리 나눠요."],
  "cover": { "from": 1 },
  "steps": [
    {
      "title": "가열하며 온도 재기",
      "text": "알코올램프에 불을 붙이고 **1분마다** 온도를 기록한다.",
      "time": "약 15분",
      "point": "물이 끓기 시작한 뒤에도 측정을 멈추지 않아요.",
      "observe": "온도가 어떻게 변하는지 기록해요.",
      "tip": ["온도계 눈금은 눈높이에서 읽어요."],
      "warn": "온도계 끝이 비커 바닥에 닿지 않게 해요.",
      "scene": [
        { "t": "stand", "hold": "th" },
        { "t": "tripod", "id": "tr", "x": 280 },
        { "t": "lamp" },
        { "t": "beaker", "id": "b", "on": "tr", "vol": "250 mL", "amount": "100 mL", "bubbles": 6, "steam": true },
        { "t": "thermometer", "id": "th", "in": "b", "reading": "100 ℃" },
        { "t": "stopwatch", "x": 420, "y": 70, "time": "1분마다" }
      ]
    }
  ],
  "results": {
    "expect": "물이 끓기 시작하면 온도가 일정하게 유지된다.",
    "table": { "title": "온도 기록표", "head": ["시간(분)", "0", "1", "2"], "rows": [["온도(℃)", "", "", ""]] },
    "questions": ["물이 끓는 동안 온도가 일정한 까닭은?"]
  },
  "source": "2학년 과학 실험지 3번",
  "notes": "원문 확인 필요: 2번 과정의 물의 양이 흐릿함"
}
```

- 글자 안에서 `**굵게**`와 줄바꿈(`\n`)을 쓸 수 있다.
- **수업 기능** (단계 속성):
  - `predict`: 관찰 전에 예상을 적는 칸 (글자 하나 또는 배열). 화면에서 바로 적을 수 있다.
  - `reveal`: '결과 보기'를 눌러야 보이는 결과. 글자만 주거나, 그 단계 장면을 이어받아 바꾼 결과 그림을 함께 준다 (`from` 없이 `remove`·`change`·`add`만 쓰면 그 단계 장면에서 바뀐다). 원문이 결과를 알려 줄 때만 쓴다.
  - `time`에 `"약 15분"`, `"30초"`, `"1분마다"`처럼 시간이 있으면 수업 모드에 타이머가 생긴다 (`"마다"`면 그 간격마다 소리). `timer`에 초를 숫자로 주면 그 시간으로, `false`면 끈다.
  - 결과 표의 빈칸(`""`)과 `questions`의 답은 화면에서 바로 적을 수 있다 (그 기기의 브라우저에만 저장). 인쇄하기는 **학생용 학습지**(결과 그림·예상 결과·메모를 빼고 적는 줄과 이름 칸)와 **교사용**(결과 그림까지)을 고른다.

```json
{ "title": "지시약 떨어뜨리기", "observe": "색이 어떻게 변하는지 관찰해요.",
  "predict": "세 시험관의 색은 같을까요, 다를까요?",
  "reveal": { "text": "산성 용액은 붉은색, 염기성 용액은 초록색으로 변해요.",
              "remove": ["dropper"], "change": { "A": { "color": "red" }, "C": { "color": "green" } } },
  "scene": [ { "t": "rack", "x": 220, "tubes": [ { "id": "A", "fill": 0.4, "color": "clear" }, { "id": "B", "fill": 0.4, "color": "clear" }, { "id": "C", "fill": 0.4, "color": "clear" } ] },
             { "t": "dropper", "over": "A", "color": "purple" } ] }
```
- 단계의 상자: `point`(강조) · `observe`(관찰) · `tip`(팁) · `warn`(주의). 글자 하나 또는 배열. 최상위 `tips`는 "실험 전에 알아 두기" 칸, 전체 주의는 `safety`.
- 준비물 `icon`은 부품 이름이나 부품 객체다. 생략하면 이름으로 짐작한다 ("분별 깔때기" → 분별 깔때기 그림). 용량이 있으면 `{ "t": "beaker", "vol": "250 mL" }`처럼 준다.
- 단계의 `bench: false`는 실험대 바닥을 그리지 않는다 (회로도·그래프만 있는 장면). `section`이 바뀌는 곳마다 소제목이 나오고, `no`는 번호 자리에 그 글자를 쓴다.
- 결과 표가 여러 개면 `"results": { "tables": [ … ] }`. 원문에 결론·정리 글이 있으면 `results.conclusion`에 쓴다 (없으면 지어내지 않는다).
- `"_demo": true` 같은 템플릿 예시 값은 남기지 않는다.

### 장면 이어받기

앞 단계와 장치가 같고 일부만 바뀌면 `scene`을 배열 대신 객체로 쓴다.

```json
{ "title": "지시약 넣기",
  "scene": { "from": "prev", "remove": ["pour", "btb"],
             "change": { "b": { "color": "green", "label": null } },
             "add": [ { "t": "dropper", "over": "b", "color": "green" } ] } }
```

- `from`: 이어받을 단계 (HTML 단계 순서 번호 또는 `"prev"`). 기구는 위치(자동 배치한 `x`까지)·색·양을 그대로 가져온다.
- `remove`: `id` 또는 부품 이름(`"dropper"`면 스포이트 모두). `change`: `id`로 골라 속성을 바꾸고, 값이 `null`이면 그 속성을 지운다 (삼발이 위로 옮기기: `"on": "tr", "x": null`). `add`: 새 부품.
- **설명·동작 부품(`note`, `text`, `arrow`, `mark`, `eye`, `label` 부품, `view`, `pour`)은 이어받지 않는다.** 필요하면 `add`에 다시 쓴다. 기구에 붙은 `label` 속성은 기구와 함께 이어진다.
- 바꾸거나 뺄 부품에는 처음 장면에서 `id`를 붙여 둔다.

## 6. HTML 만들기

데이터를 `experiment.json`으로 저장한 뒤, 할 수 있는 방법 중 **위에 있는 것**을 쓴다.

**방법 A — 스킬 폴더가 있다** (Claude 스킬 설치, Claude Code, 저장소 복제)

```bash
python scripts/build_html.py experiment.json 실험제목.html
# 가벼운 버전(엔진을 인터넷에서 불러오는 작은 파일)이 필요하면 --light
```

**방법 B — 코드 실행은 되지만 스킬 폴더가 없다** (링크로 받은 경우). 템플릿을 내려받아 데이터만 끼워 넣는다. 그림 엔진이 HTML 안에 들어가 **인터넷 없이도** 열린다.

```python
import json, pathlib, urllib.request
# 공개된 v1 최신판(@1)을 먼저 받고, 막히면 저장소 원본을 받는다
URLS = ["https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/template.html",
        "https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/assets/template.html"]
tpl = None
for u in URLS:
    try:
        tpl = urllib.request.urlopen(u, timeout=20).read().decode("utf-8"); break
    except Exception as e:
        print("실패:", u, e)
data = json.loads(pathlib.Path("experiment.json").read_text(encoding="utf-8"))
s = tpl.index("\n", tpl.index("/* ===== EXPERIMENT DATA START")) + 1
e = tpl.index("/* ===== EXPERIMENT DATA END ===== */")
js = "window.EXPERIMENT = " + json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/") + ";\n"
pathlib.Path("실험제목.html").write_text(tpl[:s] + js + tpl[e:], encoding="utf-8")
```

**방법 C — 코드 실행이 안 되거나 내려받기가 막혔다.** 아래 **가벼운 HTML 틀**에서 `window.EXPERIMENT = …;` 부분만 데이터로 바꿔 HTML 파일(또는 HTML 아티팩트)로 낸다. 그림 엔진은 열 때 인터넷(jsDelivr)에서 불러온다.

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>실험 과정 그림 안내</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>body{margin:0;background:#F8FAFC;font-family:"Pretendard Variable",Pretendard,sans-serif}.lk-wait{max-width:1080px;margin:36px auto;padding:0 20px}.lk-sk{height:220px;border-radius:24px;margin-bottom:16px;background:linear-gradient(90deg,#eceff5 25%,#f6f7fa 37%,#eceff5 63%);background-size:400% 100%;animation:lksk 1.4s ease infinite}@keyframes lksk{0%{background-position:100% 50%}100%{background-position:0 50%}}</style>
</head>
<body>
<div id="app" aria-busy="true"><div class="lk-wait"><div class="lk-sk"></div><div class="lk-sk"></div></div></div>
<script>
/* ===== EXPERIMENT DATA START — 이 블록만 바꾸세요 ===== */
window.EXPERIMENT = { /* 여기에 데이터 */ };
/* ===== EXPERIMENT DATA END ===== */
</script>
<script src="https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/labkit.min.js" onerror="document.getElementById('app').innerHTML='<p style=&quot;max-width:640px;margin:48px auto;padding:24px;border-radius:16px;background:#fff;line-height:1.7;font-family:sans-serif&quot;>그림 엔진을 불러오지 못했어요. 인터넷에 연결된 상태에서 이 HTML 파일을 크롬·엣지 같은 브라우저로 열어 주세요.</p>'"></script>
</body>
</html>
```

- 채팅 화면 미리보기에서 외부 스크립트가 막혀 그림이 안 보일 수 있다. 그때는 **파일을 내려받아 브라우저로 열면 보인다**고 안내한다.
- "인터넷 없이 열리는 한 파일"이 꼭 필요한데 코드 실행이 안 되면 `assets/template.html`을 통째로 복사해 데이터 부분만 바꾼다. 매우 길어 출력이 끊길 수 있으니 가능하면 방법 A·B를 쓴다.

## 7. 점검

HTML을 내기 전에 확인한다.

- [ ] 단계 수·순서, 양·농도·시간·온도·단위가 원문과 같다. 지어낸 단계·물질이 없다 (나눈 단계는 제목에 원문 번호가 있다).
- [ ] 원문에 용량이 적힌 기구는 나오는 **모든 장면과 준비물 아이콘에 `vol`**이 있고, 넣는 양이 있으면 `amount`가 있다.
- [ ] 3장에서 받은 팁·주의·강조를 **빠짐없이**, 말한 번호의 단계에 넣었다. 고르지 않은 제안은 넣지 않았다.
- [ ] 모든 `t`와 속성이 parts.md에 있다. 가리키는 `id`가 같은 장면 안에 있다 (이어받은 기구 포함).
- [ ] 원문이 알려 주지 않은 결과를 과정 그림에서 미리 보여 주지 않았다. `reveal`·`predict`는 원문 근거가 있거나 사용자가 고른 것만 넣었다. 이름표는 장면마다 1~3개다.
- [ ] JSON 문법이 맞고 `_demo` 같은 예시 값이 없다. 개인정보가 없다.

**그림 점검** — Edge나 Chrome이 있는 환경(Claude Code 등)에서는 반드시 실행한다. 스킬 폴더가 없으면 `https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/scripts/check_render.py`를 내려받는다.

```bash
python scripts/check_render.py 결과.html --shots 그림점검
```

1. **FAIL**(스크립트 오류·빈 화면)과 `[LabKit]` 경고를 고친다. 경고는 단계 번호와 함께 없는 id, 장면 밖 좌표, 위쪽 잘림, `vol` 그릇들의 제각각인 `s`, 남은 `_demo`, 알 수 없는 부품, 잘못된 이어받기를 알려 준다.
2. `그림점검/<파일 이름>/overview.png`(모든 장면 한 장)를 **열어서 본다**. 어색한 단계는 `step-03.png`처럼 크게 본다 (결과 보기가 있으면 `step-03-result.png`도 생긴다). 원문 장치와 맞는지, 잘리거나 떠 있지 않은지, 크기 비율, 이름표·말풍선이 장치를 가리지 않는지 본다.
3. **WARN**(`[LabKit] 겹침?`)은 그림에 빨갛게 표시된다. 실제로 가리면 x·y를 옮기고, 일부러 넣은 것이면 `in`·`on`·`over`로 이어 준다.
4. 좌표를 고칠 때는 `--grid`(20 간격 격자)를 붙인다. 고친 뒤 같은 명령으로 다시 확인한다.

- 브라우저로만 열 수 있으면 주소 끝에 `?check`(겹침 표시)·`?grid`(격자)를 붙이고 콘솔의 `[LabKit]` 경고를 본다. 코드 실행도 브라우저도 없으면 위 목록을 데이터로 꼼꼼히 확인한다.
- `그림점검` 폴더는 확인용이라 사용자에게 건네지 않는다.

## 8. 전달

- 파일 이름은 실험 제목으로 짓는다 (예: `물의_끓는점_측정.html`). claude.ai에서는 `/mnt/user-data/outputs/`에 저장해 파일로 건넨다.
- 답변에는 짧게: 만든 단계 수, 받은 팁을 어느 단계에 넣었는지, 원문에서 확인이 필요한 곳(`notes`), 사용법 한두 줄 ("단계 카드를 누르거나 '수업 모드로 보기'를 누르면 한 단계씩 크게 보여요. ← → 키로 넘겨요." + 쓴 기능만: "'결과 보기'를 누르면 결과가 나와요.", "수업 모드에서 타이머를 쓸 수 있어요.", "인쇄하기에서 학생용 학습지와 교사용을 골라요.")
- 사용자가 고쳐 달라고 하면 데이터만 바꿔 같은 방법으로 다시 만든다 (다른 대화에서 HTML을 첨부해 고쳐 달라고 하면 9장).

## 9. 이미 만든 HTML을 고칠 때

사용자가 이 스킬로 만든 HTML(파일 안에 `EXPERIMENT DATA START`나 바닥글 "만든 도구: experiment-visualizer"가 있다)을 첨부하고 고쳐 달라고 하면 처음부터 다시 만들지 않는다.

1. 3장 질문 없이 바로 고친다. 원문 실험지가 함께 있으면 원문과 맞는지도 본다 (2장 규칙은 그대로).
2. 데이터를 꺼낸다. `/* ===== EXPERIMENT DATA START` 다음 줄부터 `/* ===== EXPERIMENT DATA END` 앞까지의 `window.EXPERIMENT = {…};`가 데이터다.
   ```bash
   python scripts/extract_data.py 결과.html experiment.json
   ```
   스킬 폴더가 없으면 `https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/scripts/extract_data.py`를 내려받는다. 표시가 없는 HTML도 `window.EXPERIMENT = …`를 찾아 꺼낸다.
3. **요청한 곳만** 고친다. 다른 단계·문장·좌표·색은 그대로 둔다. 장면을 고칠 때도 parts.md를 보고 쓴다.
4. 6장 방법으로 다시 만든다. `build_html.py`로 만들면 그림 엔진도 최신으로 바뀐다. 데이터를 고치지 않고 엔진만 새로 하려면 결과 HTML을 그대로 넣는다: `python scripts/build_html.py 옛결과.html 새결과.html` (가벼운 버전은 가벼운 버전으로 만든다).
5. 7장 점검을 다시 하고, 원래 파일 이름으로 건넨다. 답변에는 고친 곳만 짧게 알린다.

- 코드 실행이 안 되면 데이터 블록 안만 고쳐 HTML 전체를 그대로 다시 낸다. 블록 밖은 한 글자도 바꾸지 않는다 (한 파일 버전은 매우 길어 출력이 끊길 수 있으니, 가능하면 코드 실행이 되는 곳에서 고친다).
- 학생이 화면에 적은 내용은 HTML이 아니라 각 기기의 브라우저에 실험 제목별로 저장되어 있어, 다시 만들어도 이어진다. 실험 제목(`title`)을 바꾸면 예전에 적은 내용이 안 보이니 꼭 필요할 때만 바꾼다. 같은 제목의 다른 실험을 같은 기기에서 쓰면 최상위 `id`로 구분한다.
