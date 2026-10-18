---
name: experiment-visualizer
description: 실험 과정이 적힌 문서(hwp, hwpx, pdf, docx, pptx, 사진·스캔 이미지)를 읽고, 실험 단계마다 실험 장면 그림(SVG 모식도)을 붙인 학생용 HTML 학습 자료를 만든다. 사용자가 실험지·실험 보고서·탐구 활동지를 첨부하고 "실험 과정을 그림으로", "실험 시각화", "학생용 실험 안내 HTML"을 요청하거나 이 스킬의 링크를 주면 사용한다.
---

# 실험 과정 그림 HTML 만들기 (experiment-visualizer)

> **이 문서를 링크로 받았다면** 이 문서 전체가 작업 지시서다. 처음부터 끝까지 읽고 순서대로 따른다.
> 저장소: https://github.com/sci-eum/experiment-visualizer

## 무엇을 만드나

- **입력**: 실험 과정이 적힌 문서 1개 이상 (hwp, hwpx, pdf, docx, pptx, png, jpg …)
- **출력**: HTML 파일 1개. 실험 목표 → 준비물(그림 아이콘) → 안전 수칙 → **단계별 실험 장면 그림 + 설명** → 결과 정리 순서로 보이고, "수업 모드"(한 단계씩 크게 넘겨 보기)와 인쇄를 지원한다.
- **핵심 원칙**: 그림 코드를 직접 짜지 않는다. 문서를 읽어 `EXPERIMENT` 데이터(JSON)를 쓰고, 이 저장소의 템플릿에 끼워 넣는다. 장면 그림은 이미 만들어진 **부품**(비커, 알코올램프, 스포이트 …)을 좌표에 배치해서 만든다.

## 작업 순서

1. 문서 읽기 → 2. 실험 내용 정리 → **3. 계획을 보여 주고 팁 묻기 (여기서 멈추고 답을 기다린다)** → 4. 장면 설계 → 5. `EXPERIMENT` 데이터 쓰기 (6. 부품 목록 참고) → 7. HTML 만들기 → 8. 점검 → 9. 전달

> **첫 답변에서 HTML을 만들지 않는다.** 1~3을 한 뒤 계획과 질문을 보내고 답변을 기다린다. 사용자가 답하면 그 답을 반영해 4~9를 한다.

---

## 1. 문서 읽기

| 형식 | 읽는 방법 |
|---|---|
| pdf, png, jpg, 스캔 | 직접 보고 읽는다. 그림·표가 있으면 장치 배치까지 눈으로 확인한다. |
| hwp, hwpx, docx, pptx | 코드 실행이 되면 `scripts/extract_text.py`로 글자를 꺼낸다 (아래). hwpx·docx·pptx는 zip이라 직접 풀어 `Contents/section*.xml`의 `<hp:t>`(hwpx), `word/document.xml`의 `<w:t>`(docx)를 읽어도 된다. |
| 읽을 수 없을 때 | 추측하지 말고 사용자에게 "한글에서 **PDF로 저장**해 다시 첨부해 주세요"라고 요청한다. 배포용(보호) hwp 문서도 같다. |

글자 꺼내기 (표준 라이브러리만 사용):

```bash
# 스킬 폴더가 있으면
python scripts/extract_text.py 실험지.hwp --images 그림폴더
# 없으면 내려받아 실행
curl -sL https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/scripts/extract_text.py -o extract_text.py
python extract_text.py 실험지.hwpx
```

- claude.ai에서 사용자가 올린 파일은 보통 `/mnt/user-data/uploads/`에 있다.
- `extract_text.py`는 한글 수식도 글자로 바꾼다 (예: `rm CaCl _{2}` → `CaCl₂`, `TRIANGLE T` → `ΔT`). zip을 직접 풀어 읽을 때는 `<hp:equation>` 안의 `<hp:script>`가 수식이므로 빠뜨리지 않는다. 괄호가 비어 있으면(`염화 칼슘()`) 수식을 놓친 것이다.
- 문서 전체가 큰 표(틀) 안에 들어 있는 경우가 많다. 표의 칸 구분(`|`)에 흔들리지 말고 내용의 순서를 따라 읽는다.
- `--images`로 꺼낸 그림(장치도)이 있으면 열어 보고 장치 배치를 장면에 반영한다. 학교 로고 같은 장식 그림은 무시한다.
- 문서에 여러 실험이 있으면 사용자가 지정한 실험만, 지정이 없으면 첫 번째 실험을 만들고 나머지가 있다고 알려 준다.

## 2. 실험 내용 정리 — 원문 충실 규칙

문서에서 다음을 뽑는다: 제목, 과목·단원, 목표, 준비물(수량), **기구의 용량(100 mL 비커, 10 mL 눈금실린더 …)과 넣는 양**, 안전 수칙, **실험 과정(순서대로)**, 원문의 주의·팁(※ 표시 등), 관찰할 점, 예상 결과·결과 기록표, 생각해 볼 질문.

- **원문에 없는 단계·수치·물질을 지어내지 않는다.** 양, 농도, 시간, 온도, 순서는 원문 그대로 쓴다. 문장은 학생이 읽기 쉽게 다듬어도 되지만 뜻은 같아야 한다.
- 한 단계에 동작이 여러 개면 나눠도 된다. 이때 원문 번호를 제목에 남긴다 (예: `"3-1. 지시약 넣기"`, `"3-2. 흔들어 섞기"`). 보통 4~12단계가 된다.
- 과정이 "시료 제조하기 / 측정하기"처럼 **소제목으로 나뉘어 있으면** 각 단계에 `section`(소제목)과 `no`(원문 번호, 예 `"➊"`, `"➌~➎"`)를 준다. 원문이 거의 같은 과정을 되풀이하면(예: 같은 방법으로 세 농도 만들기) 한 단계로 합치고 `no`에 범위를 쓴다.
- **준비물 목록에는 없는데 과정에 나오는 기구**(예: 전자 저울)는 준비물에 넣되 `qty`에 `"과정에 사용"`이라 쓰고, `notes`와 마지막 답변에서 알린다.
- 원문이 단계 안에서 결과(색 변화 등)를 알려 주지 **않으면** 그림에서도 결과를 미리 보여 주지 않는다. 대신 "무슨 색으로 변하는지 관찰해요" 같은 `observe`·`note`로 둔다. 예상 결과는 `results.expect`에만 쓴다. (탐구 실험의 재미를 지키기 위함. 사용자가 결과도 그려 달라고 하면 그린다.)
- 원문에서 읽기 어렵거나 애매한 부분은 `notes`에 `"원문 확인 필요: …"`로 남기고, 마지막 답변에서도 알린다.
- 학생 이름·번호 같은 개인정보가 문서에 있으면 HTML에 넣지 않는다.
- 원문에 있는 주의·팁(※ 표시, "주의한다" 문장)은 해당 단계의 `warn`·`tip`으로 그대로 넣는다.
- **원문에 없는 팁·주의·강조는 직접 지어 넣지 않는다.** 필요해 보이면(가열, 산·염기, 날카로운 기구, 불을 다루는데 안전 수칙이 없을 때 등) 3장의 질문에서 **제안**으로 보여 주고, 사용자가 고른 것만 넣는다.

## 3. 계획을 보여 주고 팁 묻기 — 여기서 멈춘다

정리가 끝나면 HTML을 만들기 전에 아래 형식으로 계획을 보여 주고, **실험 단계에 넣을 팁·주의·강조할 점**을 묻는다. 이 답변은 질문으로 끝낸다. 데이터나 HTML을 미리 만들지 않는다.

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
- 안전 수칙 2개 (충전 상태 확인, 센서에 용액이 들어가지 않게)

**원문 확인이 필요한 곳**
- 전자 저울과 부피 플라스크가 준비물 목록에 없어요

## 단계에 넣을 팁을 알려 주세요
학생에게 꼭 알려 주고 싶은 **팁·주의·강조할 점**이 있으면 아래처럼 "과정 번호 - 종류: 내용"으로 적어 주세요. 여러 개 적어도 돼요.

    3번 - 팁: 표시선은 눈높이를 맞춰서 확인해요
    5번 - 주의: 압력 센서에 물이 들어가지 않게 해요
    전체 - 강조: 세 용액의 실험 조건을 똑같이 맞춰요

- 종류는 **팁 / 주의 / 강조** 중 하나예요. 모든 단계에 해당하면 번호 대신 **전체**라고 적어 주세요.
- 넣을 것이 없으면 **없음**이라고 적어 주세요. 계획에서 고칠 점이 있으면 함께 적어 주세요.

(제안) 이런 내용도 넣을 수 있어요. 원하면 번호로 골라 주세요.
① 6번 - 주의: 반투막 튜브를 벌릴 때 찢어지지 않게 조심해요
② 9번 - 팁: 튜브 안팎의 수면 높이를 옆에서 눈높이로 맞춰요
```

- **번호는 HTML에 나올 단계 순서(1, 2, 3 …)다.** 원문 번호(➊ 등)는 '원문' 칸에 함께 보여 줘서 헷갈리지 않게 한다.
- 계획 표의 '그림' 칸에는 그릇의 용량을 함께 쓴다 (사용자가 스케일을 확인할 수 있게).
- 제안은 0~4개, 원문 내용과 실험 원리에 근거한 것만 쓴다. 고르지 않은 제안은 넣지 않는다.
- 사용자가 답하면 이렇게 넣는다: **팁 → 그 단계의 `tip`, 주의 → `warn`, 강조 → `point`** (한 단계에 여러 개면 배열). **전체 - 주의**는 `safety`에, **전체 - 팁/강조**는 최상위 `tips`에 넣는다. 사용자가 쓴 뜻은 바꾸지 않고 맞춤법·말투만 다듬는다.
- 번호가 계획에 없거나 종류가 빠져 있으면 가장 알맞게 넣고, 마지막 답변에서 어디에 넣었는지 알려 준다.
- **질문을 건너뛰는 경우**: 사용자가 처음부터 팁을 함께 주었거나 "질문 없이 바로 만들어 줘", "팁 없음"이라고 했으면 묻지 않고 4장으로 간다. 이미 만든 HTML을 고치는 요청에서도 다시 묻지 않는다.

## 4. 장면 설계

장면은 **가로 480 × 세로 300** 좌표의 그림이다. 왼쪽 위가 (0, 0)이고, 실험대 윗면은 **y = 268** 이다.

- **한 단계 = 한 장면 = 핵심 동작 하나.** 학생이 그림만 보고도 "무엇을, 어디에, 어떻게" 하는지 알 수 있어야 한다.
- **주인공 기구**는 가운데(x 180~300)에 두고 크게 그린다. 한 장면에 기구 2~5개가 알맞다.
- **용량이 적힌 기구는 반드시 용량을 그림에 넣는다** (실험의 스케일은 매우 중요하다). 원문 준비물·과정에 "100 mL 비커", "10 mL 눈금 실린더"처럼 용량이 있으면, 그 그릇이 나오는 **모든 장면과 준비물 아이콘**에 `vol`을 준다.
  - `vol`을 주면 그릇에 용량이 새겨지고(예: 100 mL), 비커·눈금실린더에는 눈금 숫자가 생기며, **실제 부피 비율대로 크기가 정해진다** (500 mL 비커는 100 mL 비커보다 크게, 10 mL 눈금실린더는 100 mL보다 작게).
  - 넣는 양이 있으면 `amount`를 준다 (예: `"vol": "500 mL", "amount": "400 mL"`). 액체 높이가 눈금에 맞게 자동으로 정해지므로 `fill`을 따로 계산하지 않는다. 물은 1 g ≈ 1 mL로 보고 `"amount": "50 mL"`처럼 쓴다.
  - 붓는 쪽 그릇의 용량은 `pour`의 `fromVol`로 준다.
  - `vol`을 준 그릇에는 `s`를 주지 않는다. 장면이 너무 작거나 크면 그 장면의 그릇들에 **똑같은** `s`를 곱해 비율을 지킨다.
  - 용량이 적혀 있지 않은 기구에는 `vol`을 지어내지 않는다 (그때는 `s`로 크기를 맞춘다).
- **동작은 부품으로 표현한다**: 붓기 `pour`, 떨어뜨리기 `dropper`+`over`, 젓기 `rod`+`stir`, 가루 넣기 `spatula`+`over`, 거르기 `funnel`+`over`, 가열 `lamp`·`hotplate`, 이동·순서 `arrow`, 관찰 `note`·`view`·`eye`.
- **상태 변화는 속성으로 표현한다**: 액체 색 `color`, 양 `fill`, 거품 `bubbles`, 김 `steam`, 앙금 `solid:'precipitate'`, 뿌옇게 흐림 `cloudy`, 층 분리 `layers`.
- **단계 사이를 이어지게** 그린다. 같은 기구는 단계가 바뀌어도 같은 x 위치·같은 색·같은 양을 유지하다가 바뀌는 단계에서만 바꾼다.
- `label`(이름표)은 장면마다 1~3개, 핵심 물질과 양만 짧게 (예: `"물 100 mL"`). 긴 설명은 단계의 `text`·`tip`에 쓴다.
- 잘못된 방법을 보여 줄 때는 `mark`(`kind:'no'`)와 `warn`을 함께 쓴다.
- 부품 목록에 없는 기구는 ① 가장 비슷한 부품 + `label`로 이름을 바꿔 쓰거나 ② `svg` 부품으로 단순한 도형을 직접 그린다.
- **센서 실험**은 측정 장면에 `sensor`(무선 센서)와 `device`(스마트기기 그래프, `link`로 센서와 연결)를 함께 그린다. 그래프는 기본 `"graph":"live"`(측정 시작)로 두어 결과 모양을 미리 보여 주지 않는다. 원문이 그래프 모양을 설명할 때만(예: "냉각 곡선의 기울기가 바뀌는 지점") 그 모양(`freeze` 등)을 쓴다.
- 표지(`cover`)에는 그 실험의 **대표 장치 장면**(보통 측정 단계의 장면)을 그대로 넣는다.

### 배치 규칙

- 대부분의 부품은 **x만 정하면 실험대 위에 선다**. `y`를 생략하면 실험대(268)가 바닥이다. `x`를 생략하면 240(가운데)이다.
- 공중에 떠 있는 표시 부품(`note`, `view`, `mark`, `eye`, `label`, `text`, `stopwatch`, 회로 부품 …)은 `x, y`가 **중심**이다.
- 같은 장면의 다른 부품을 `id`로 가리켜 배치할 수 있다. 가리키는 부품에 `id`를 꼭 붙인다.

| 속성 | 뜻 | 예 |
|---|---|---|
| `on: 'id'` | 그 부품 **위에 올려놓기** (삼발이·가열판·저울·빗면 위) | `{t:'beaker', on:'tr'}` |
| `in: 'id'` | 그 그릇 **안에 넣기** (온도계·센서·유리 막대, 스포이트로 빨아올리기, **그릇 속 그릇**: 얼음물 속 시험관, 비커 속 반투막 튜브, 수조 속 거꾸로 세운 시험관 — `x`·`y`를 직접 줘도 `in`으로 이어 두면 잠긴 부분에 물빛이 덮인다). `dy`만큼 바닥에서 띄운다 | `{t:'thermometer', in:'b'}`, `{t:'tube', in:'ice', dy:10}` |
| `over: 'id'` | 그 그릇 **입구 위에서** (스포이트·주사기·약숟가락·깔때기) | `{t:'dropper', over:'b', color:'pink'}` |
| `into: 'id'` | `pour` 전용: 그 그릇에 **붓기** | `{t:'pour', into:'b', from:'cylinder'}` |
| `hold: 'id'` | `stand` 전용: 그 기구를 **집게로 고정** (배열 가능) | `{t:'stand', hold:['th','t1']}` |
| `stand: true` | 어떤 기구든 스탠드로 고정 (스탠드를 자동으로 그림) | `{t:'tube', x:260, y:200, stand:true}` |
| `dx`, `dy` | `in`·`over`·`pour`로 놓은 부품을 **조금 옮기기**. `dx`는 오른쪽이 +, `dy`는 위쪽이 + (`pour`의 `dx`는 받는 그릇 안쪽이 +) | `{t:'spatula', over:'b', dx:-18}` |

모든 부품에 쓸 수 있는 공통 속성: `id`, `x`, `y`, `s`(크기 배율, 기본 1), `tilt`(기울기 각도, 시계 방향 +), `label`(이름표 글자), `labelSide`(`'left'`/`'right'`).

대략적인 크기 (s=1, 가로×세로): 비커 78×90, 삼각 플라스크 84×106, 둥근바닥 플라스크 72×120, 시험관 28×114, 눈금실린더 52×155, 시약병 52×106, 부피 플라스크 72×152, 반투막 튜브 34×124(+어댑터 16), 컵 66×86, 수조 220×80, 알코올램프 62×92(불꽃 포함), 삼발이 108×103, 가열판 112×32, 교반기 116×36, 전자저울 116×32, 현미경 96×188, 스마트기기 132×90, 무선 센서 몸통 38×56 + 탐침 길이 112(`length`로 바꿈), 온도계 길이 150, 유리 막대 길이 150, 스포이트 길이 88. 장면 위쪽(y < 0)으로 넘치면 잘리므로 큰 장치는 `s`를 줄인다. **기구끼리 겹치지 않게** x 간격을 (두 폭의 합 ÷ 2) 이상으로 둔다.

## 5. `EXPERIMENT` 데이터 쓰기

JSON(또는 자바스크립트 객체)으로 쓴다. `title`과 `steps`만 필수이고 나머지는 원문에 있을 때 쓴다.

```json
{
  "title": "물의 끓는점 측정하기",
  "subject": "중학교 과학",
  "unit": "물질의 상태 변화",
  "duration": "45분",
  "group": "4인 1모둠",
  "goal": "물을 가열하면서 온도 변화를 측정하여 **끓는점**을 알아본다.",
  "materials": [
    { "name": "비커 (250 mL)", "qty": "1개", "icon": { "t": "beaker", "vol": "250 mL" } },
    { "name": "온도계", "qty": "1개", "icon": "thermometer" },
    { "name": "묽은 염산", "icon": { "t": "bottle", "text": "염산", "fill": 0.6 } }
  ],
  "safety": ["가열 중인 비커는 맨손으로 만지지 않는다."],
  "tips": ["모둠원끼리 역할(가열, 온도 읽기, 기록)을 미리 나눠요."],
  "steps": [
    {
      "title": "가열하며 온도 재기",
      "text": "알코올램프에 불을 붙이고 **1분마다** 온도를 기록한다.",
      "time": "약 15분",
      "point": "물이 끓기 시작한 뒤에도 측정을 멈추지 않아요.",
      "observe": "온도가 어떻게 변하는지 기록해요.",
      "tip": ["온도계 눈금은 눈높이에서 읽어요.", "기록은 한 사람이 맡아요."],
      "warn": "온도계 끝이 비커 바닥에 닿지 않게 해요.",
      "scene": [
        { "t": "stand", "hold": "th" },
        { "t": "tripod", "id": "tr", "x": 280 },
        { "t": "lamp", "x": 280 },
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
- 단계의 상자: `point`(강조, 보라) · `observe`(관찰, 파랑) · `tip`(팁, 초록) · `warn`(주의, 주황). 모두 글자 하나 또는 글자 배열이다. 3장에서 받은 팁은 여기에 넣는다.
- 최상위 `tips`(배열)는 "실험 전에 알아 두기" 칸으로, 실험 전체에 해당하는 팁·강조를 넣는다. 전체 주의는 `safety`에 넣는다.
- 준비물 `icon`은 부품 이름(`"beaker"`) 또는 부품 객체(`{"t":"bottle","text":"염산"}`)다. 생략하면 이름으로 짐작하고, 모르면 첫 글자 아이콘이 나온다.
- 단계의 `bench: false`를 주면 실험대 바닥을 그리지 않는다 (회로도, 확대 그림만 있는 장면).
- 단계의 `section`(소제목)이 바뀌는 곳마다 페이지에 소제목이 나오고, `no`를 주면 번호 자리에 `1, 2, 3` 대신 그 글자(예 `"➊"`, `"➌~➎"`)가 나온다.
- 표지 그림은 최상위 `"cover": [ 부품 … ]`으로 정한다. 대표 장치 장면을 넣는다 (없으면 일반 실험 기구 그림).
- 결과 표가 여러 개면 `"results": { "tables": [ {title, head, rows}, … ] }`로 쓴다.
- 원문에 결론·정리 글이 있으면 `results.conclusion`에 쓴다 ("정리" 칸으로 나온다). 원문에 없으면 지어내지 않는다.
- `"_demo": true` 같은 템플릿 예시 값은 남기지 않는다.

## 6. 부품 목록

`t`에 아래 이름을 쓴다. ★는 x만 주면 실험대 위에 서는 부품, ●는 `x, y`가 중심인 부품이다.

### 그릇 (액체를 담는 부품) ★

`beaker`(비커) · `flask`(삼각 플라스크) · `roundflask`(둥근바닥 플라스크) · `volumetric`(부피 플라스크, 빨간 표시선) · `tube`(시험관) · `cylinder`(눈금실린더) · `bottle`(시약병) · `cup`(컵) · `trough`(수조) · `bag`(반투막 튜브: 아래가 묶여 있고 위에 어댑터·케이블 타이. `adapter:false`면 입구가 열린 상태)

그릇 공통 속성:

| 속성 | 뜻 |
|---|---|
| `fill` | 액체 양 0~1 (`color`만 주면 0.5) |
| `color` | 액체 색. 아래 색 이름이나 `"#hex"` |
| `layers` | 층 분리 `[{h:0.3,color:'water'},{h:0.2,color:'oil'}]` (아래층부터) |
| `bubbles` | 거품 `true` 또는 개수 |
| `steam` | 김 `true` |
| `cloudy` | 뿌옇게 흐림 `true` |
| `ice` | 떠 있는 얼음 개수 |
| `solid` | 바닥의 고체: `'powder'` `'precipitate'`(앙금) `'crystals'`(결정) `'chips'`(조각) `'nail'`(못) `'block'` `'leaf'` `'egg'` `'icebath'`(얼음+소금 한 가득, 한제) — 색은 `solidColor` |
| `stirbar` | 바닥의 마그네틱 바(돌아감). 교반기 위 그릇에 쓴다 |
| `shake` | 손으로 흔드는 동작 (흔들림 + 양옆 움직임 표시) |
| `stopper` | 고무마개 `true`, 유리관이 꽂힌 마개 `'hole'` |
| `flip` | 거꾸로 세우기 (수상 치환으로 기체 모을 때) |
| `holder` | 시험관 집게 (시험관을 손으로 잡고 가열할 때 `tilt`와 함께) |
| `text` | `bottle` 라벨 글자 (예 `"염산"`), `brown: true`면 갈색병, `cap:false`면 뚜껑 열림 |
| `paper` | `cup` 전용: 종이컵 |
| `opacity`, `meniscus:false` | 액체 투명도, 눈금실린더 메니스커스 끄기 |
| `vol` | **용량** (예 `"100 mL"`, `"1 L"`). 그릇에 용량을 새기고, 비커·눈금실린더에 눈금 숫자를 넣고, 실제 부피 비율대로 크기를 정한다 (beaker·flask·roundflask·volumetric·cylinder·tube·bottle·cup) |
| `amount` | 넣은 양 (예 `"40 mL"`, `"30~40 mL"`는 가운데 값). `vol`과 함께 주면 액체 높이를 눈금에 맞춘다 |
| `volText`, `print:false` | 새길 글자를 직접 정하기, 용량 글자 숨기기 |

`rack`(시험관대) ★: `tubes: [{id, tag:'A', fill, color, …시험관 속성}]` — 꽂힌 시험관마다 `id`를 주면 `over`/`in`으로 가리킬 수 있다. `tag`는 시험관대 앞에 쓰는 글자.

### 가열·받침 ★

| t | 이름 | 주요 속성 |
|---|---|---|
| `lamp` | 알코올램프 (`burner`도 같음) | `lit:false`면 뚜껑 덮음(불 끔) |
| `tripod` | 삼발이 + 쇠그물 | `gauze:false`면 쇠그물 없음. 그릇은 `on`으로 올린다 |
| `hotplate` | 가열판(핫플레이트) | `on:false`면 꺼짐 |
| `stirrer` | 자석 교반기 | `on:false`면 꺼짐. 그릇은 `on`으로 올리고 그릇에 `stirbar:true` |
| `stand` | 스탠드 | `hold:'id'`(또는 배열), `reach`(스탠드 막대와 잡은 기구 사이 거리, 기본 100), 직접 지정은 `x`, `clampY`, `arm`(팔 길이, 음수면 왼쪽) |
| `balance` | 전자저울 | `reading:'25.0 g'`, 물체는 `on`으로 올린다 |
| `candle` | 양초 | `lit:false`, `h` |

### 액체·가루 다루기

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `pour` | 붓기 동작 | `into:'id'`, `from:'beaker'/'cylinder'/'tube'/'flask'/'bottle'`, `fromVol`(붓는 그릇의 용량), `color`, `side:'right'`(오른쪽에서 붓기) |
| `dropper` | 스포이트 (`pipette`) | `over:'id'`(방울 떨어짐) 또는 `in:'id'`(빨아올림), `color`, `drops:false` |
| `syringe` | 주사기 | `over`/`in`, `fill`, `color` |
| `rod` | 유리 막대 | `in:'id'`, `stir:true`(젓기 + 회전 화살표) |
| `spatula` | 약숟가락 (`spoon`) | `over:'id'`(가루 넣기, `tilt` 음수면 손잡이가 왼쪽으로) 또는 `in:'id'`(섞기), `color`(가루 색) |
| `funnel` | 깔때기 + 거름종이 | `over:'id'`(그릇 입구에 꽂힘), `paper:false`, `fill`, `color`, `drip:true`, `dripColor`, `stand:true` |
| `hose` | 고무관 (`tubing`) | `from:'id'`(마개·압력 센서에서 시작), `to:'id'`(반투막 튜브 어댑터 등으로), `points:[[x,y],…]`, `bubbles:true`(끝에서 기포), `glass:true`(유리관) |

### 측정

| t | 이름 | 속성 |
|---|---|---|
| `thermometer` | 온도계 | `in:'id'`, `reading:'100 ℃'`(빨간 기둥 높이 자동), `level` 0~1 |
| `stopwatch` ● | 초시계 | `time:'1분마다'` |
| `ruler` ★ | 자 | `tilt:-90`이면 세움 |
| `springscale` ● | 용수철저울 (`x,y`=위 고리) | `hang:'weight'/'block'`, `hangText`, `stretch` 0~1, `reading` |
| `weight` ★ | 추 | `text:'100 g'` |

### 센서 실험

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `sensor` | 무선 센서 (`x,y` = 탐침 끝 또는 압력 포트) | `kind:'temp'`(온도, 기본)/`'pressure'`(압력, 아래 포트에 `hose`를 연결)/`'ph'`, `in:'id'`(탐침을 그릇 안에, `dy`로 바닥에서 띄움), `length`(탐침 길이, 기본 112), `text`(몸통 글자), `reading` |
| `device` ● | 스마트기기 그래프 (`tablet`·`phone`) | `link:'센서id'`(무선 연결 표시), `title:'온도 (℃)'`, `xlabel:'시간'`, `value`, `graph`, `upto`(0~1, 그래프를 어디까지 그릴지), `markAt`·`markText`(그래프 위 표시) |
| `stirrer` ★ | 자석 교반기 | `on:false` |
| `stirbar` ● | 마그네틱 바 (준비물 아이콘용. 그릇 안에서는 그릇의 `stirbar:true`) | |
| `tweezers` ● | 핀셋 | `tilt` |
| `cabletie` ● | 케이블 타이 | |

`graph` 모양: `'live'`(측정 시작, 기본 — 결과를 드러내지 않음) · `'flat'`(안정화) · `'rise'` · `'fall'` · `'boil'`(올라가다 일정) · `'cool'`(내려가다 일정) · `'freeze'`(과냉각 후 기울기 변화) · `'exo'`(빠르게 올랐다 천천히 내림) · `'endo'` · 숫자 배열(0~1 값을 차례로).

### 생물·관찰

`microscope` ★ 현미경 · `slide` ● 받침·덮개 유리(`color` 시료 색) · `magnifier` ● 돋보기 · `dish` ★ 페트리 접시(`items:'seeds'/'colony'/'beans'`, `lid`, `fill`) · `evapdish` ★ 증발 접시(`solid`, `steam`) · `watchglass` ★ 시계 접시 · `mortar` ★ 막자사발(`color`, `grind:true`) · `plant` ★ 화분 식물(`bag:true` 비닐 씌움, `droplets:true` 물방울) · `leaf` ● 잎(`color`, `color2`면 절반을 다른 색으로)

### 물리

`ramp` ★ 빗면(`w`, `h`, `dir:'left'`) — 그 위의 `cart`·`block`·`ball`은 `on:'빗면id', at:0~1`로 경사를 따라 놓인다 · `cart` ★ 역학 수레 · `block` ★ 나무 도막(`w`,`h`,`text`,`color`) · `ball` ★ 공(`r`,`color`) · `magnet` ★ 막대자석(`flip`, `field:true` 자기력선) · `compass` ● 나침반(`angle`)

### 전기

`circuit` ● 회로 한 벌: `x, y`(중심), `w, h`, `closed`(스위치 닫힘, 기본 true), `current:true`(전류 흐름 표시), `parts:[…]`

- `parts` 항목: `'battery'` `'bulb'` `'switch'` `'ammeter'` `'voltmeter'` `'resistor'` `'motor'` `'led'` 또는 `{p:'bulb', label:'전구 A', edge:'top', on:false}`
- 순서대로 아래 → 위 → 오른쪽 → 왼쪽 변에 놓인다. `edge`로 직접 정할 수 있다.
- 전압계처럼 병렬로 연결할 부품은 `{p:'voltmeter', across: 1}` (1 = 같은 `parts` 배열에서 병렬로 걸 부품의 번호, 0부터).
- 낱개 부품(`battery`, `bulb`, `switch`, `ammeter`, `voltmeter`, `resistor`, `motor`, `led`, `wire`)도 ●로 따로 놓을 수 있다 (준비물 아이콘용).

### 안전·재료

`goggles` ● 보안경 · `gloves` ● 실험용 장갑 · `ice` ★ 얼음(`n`) · `powder` ★ 가루 더미(`color`, `paper:true` 약포지) · `paper` ● 시험지(`color`, 젖은 부분 색 `color2`와 비율 `dip`), `kind:'filter'`면 거름종이 · `match` ● 성냥(`lit`)

### 표시 부품 ●

| t | 뜻 | 속성 |
|---|---|---|
| `arrow` | 화살표 | `from:[x,y]` 또는 `'id'`, `to`, `curve`(휘는 정도, ±), `label`, `color`, `dash`, `flow`(흐르는 점선), `both` |
| `note` | 말풍선 설명 | `text`, `icon:'eye'(관찰)/'how'(방법)/'tip'(도움말)/'time'/'ok'/'no'/'warn'/'idea'/'result'` 또는 `tag`, `to`(가리킬 곳), `w`(너비, 기본 172) |
| `label` | 이름표 | `text`, `to:[x,y]` 또는 `'id'` |
| `text` | 글자 | `text`, `size`, `color`, `anchor:'start'/'middle'/'end'` |
| `mark` | O·X 표시 | `kind:'ok'` 또는 `'no'` |
| `eye` | 눈 + 시선 | `to:[x,y]` (눈금 읽기 장면) |
| `view` | 확대 원 (`zoom`) | `r`, `show:'plantcells'/'animalcells'/'solid'/'liquid'/'gas'/'crystals'/'bubbles'`, `color`, `from:[x,y]`(확대한 곳), `label`, `markup`(직접 그린 SVG, 원 중심이 0,0) |
| `svg` | 직접 그리기 | `markup`(SVG 조각, 기준점이 0,0), `w`, `h` |

### 색 이름

`water`(물) `clear`(투명) `blue` `navy` `skyblue` `red` `pink` `purple` `violet` `yellow` `orange` `green` `lime` `brown` `black` `white` `milky`(뿌연) `gray` `oil`(기름) `iodine`(청람색) `brick`(적갈색) `gold` `copper` `silver` — 한국어 이름(`파랑`, `분홍색`, `청람색`, `황적색` …)과 `"#a9d8f5"` 같은 값도 된다.

원문에 색이 적혀 있지 않을 때만 참고하는 일반적인 지시약 색: BTB 산성 노랑·중성 초록·염기성 파랑 / 페놀프탈레인 염기성 붉은색(산성·중성 무색) / 메틸 오렌지 산성 빨강·염기성 노랑 / 리트머스 산성 붉게·염기성 푸르게 / 붉은 양배추 산성 붉은색·중성 보라·염기성 초록~노랑 / 녹말 + 아이오딘-아이오딘화 칼륨 청람색 / 포도당 + 베네딕트 가열 황적색 / 단백질 + 뷰렛 보라색.

## 7. HTML 만들기

데이터를 `experiment.json`으로 저장한 뒤, 할 수 있는 방법 중 **위에 있는 것**을 쓴다.

### 방법 A — 스킬 폴더가 있다 (Claude 스킬 설치, Claude Code, 저장소 복제)

```bash
python scripts/build_html.py experiment.json 실험제목.html
```

### 방법 B — 코드 실행은 되지만 스킬 폴더가 없다 (링크로 받은 경우)

템플릿을 내려받아 데이터만 끼워 넣는다. 그림 엔진 전체가 HTML 안에 들어가 **인터넷 없이도** 열린다.

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

내려받기가 막혀 있으면(네트워크 제한) 방법 C로 간다.

### 방법 C — 코드 실행이 안 되거나 내려받기가 막혔다

아래 **가벼운 HTML 틀**을 그대로 쓰고 `window.EXPERIMENT = …;` 부분만 데이터로 바꿔 HTML 파일(또는 HTML 아티팩트)로 낸다. 그림 엔진은 열 때 인터넷(jsDelivr)에서 불러온다.

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
window.EXPERIMENT = { /* 여기에 데이터 */ };
</script>
<script src="https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/labkit.min.js" onerror="document.getElementById('app').innerHTML='<p style=&quot;max-width:640px;margin:48px auto;padding:24px;border-radius:16px;background:#fff;line-height:1.7;font-family:sans-serif&quot;>그림 엔진을 불러오지 못했어요. 인터넷에 연결된 상태에서 이 HTML 파일을 크롬·엣지 같은 브라우저로 열어 주세요.</p>'"></script>
</body>
</html>
```

- 채팅 화면의 미리보기에서 외부 스크립트가 막혀 그림이 안 보일 수 있다. 그때는 사용자에게 **파일을 내려받아 브라우저로 열면 보인다**고 안내한다.
- 사용자가 "인터넷 없이 열리는 한 파일"을 꼭 원하고 코드 실행이 안 되면, `assets/template.html`(약 12만 자)을 통째로 복사해 데이터 부분만 바꾼다. 매우 길어 출력이 끊길 수 있으니 가능하면 방법 A·B를 쓴다.

## 8. 점검

HTML을 내기 전에 확인한다.

- [ ] 단계 수와 순서가 원문과 같다 (나눈 단계는 제목에 원문 번호가 있다).
- [ ] 양·농도·시간·온도·단위가 원문과 같다. 지어낸 단계·물질이 없다.
- [ ] 원문에 용량이 적힌 기구는 그 기구가 나오는 **모든 장면과 준비물 아이콘에 `vol`**이 있고, 넣는 양이 있으면 `amount`가 있다. `vol`을 준 그릇에 제각각인 `s`를 주지 않았다.
- [ ] 3장에서 사용자가 준 팁·주의·강조를 **빠짐없이**, 말한 번호의 단계에 넣었다. 사용자가 고르지 않은 제안은 넣지 않았다.
- [ ] 모든 `t`가 6장의 부품 이름이다. `on`/`in`/`over`/`into`/`hold`/`to`/`from`이 가리키는 `id`가 **같은 장면 안에** 있다.
- [ ] 좌표가 화면 안(x 0~480, y 0~300)이고 기구끼리 크게 겹치지 않는다 (아래 그림 점검으로 확인한다).
- [ ] 원문이 알려 주지 않은 결과를 과정 그림에서 미리 보여 주지 않았다.
- [ ] 이름표는 장면마다 1~3개다.
- [ ] JSON 문법이 맞다 (따옴표, 쉼표, 괄호). `_demo` 같은 예시 값이 남아 있지 않다.
- [ ] 개인정보가 없다.
### 그림 점검 — 만든 그림을 직접 보고 고친다

Edge나 Chrome이 있는 환경(Claude Code 등)에서는 HTML을 만든 뒤 반드시 아래를 실행한다. 스킬 폴더가 없으면 `https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/scripts/check_render.py`를 내려받아 실행한다.

```bash
python scripts/check_render.py 결과.html --shots 그림점검
```

1. 결과 줄을 읽는다. **FAIL**(스크립트 오류·빈 화면)과 `[LabKit]` 경고는 고친다. 경고는 단계 번호와 함께 **없는 id를 가리킴, 좌표가 장면 밖, 위쪽이 잘림, `vol` 그릇들의 `s`가 제각각, `_demo`가 남음, 알 수 없는 부품**을 알려 준다.
2. `그림점검/<파일 이름>/overview.png`(모든 장면 한 장)를 **열어서 본다**. 어색한 단계는 `step-03.png`처럼 그 단계 그림을 크게 본다. 원문의 장치와 맞는지, 기구가 잘리거나 떠 있지 않은지, 크기 비율이 이상하지 않은지, 이름표·말풍선이 장치를 가리지 않는지 본다.
3. **WARN**은 겹침 의심(`[LabKit] 겹침?`)이다. 그림에 빨간 점선 상자와 빨간 칸으로 표시된다. 실제로 가리면 x·y를 옮기고, 일부러 넣은 것(수조 속 시험관 등)이면 `in`·`on`·`over`로 이어 준다. 이어진 부품끼리는 겹쳐도 경고하지 않는다.
4. 좌표를 고칠 때는 `--grid`를 붙이면 그림에 20 간격 좌표 격자가 함께 그려진다. 고친 뒤 같은 명령으로 다시 확인한다.

- 브라우저로만 열 수 있으면 주소 끝에 `?check`를 붙여 겹침 표시를, `?grid`를 붙여 좌표 격자를 본다. 콘솔의 `[LabKit]` 경고도 확인한다.
- 코드 실행도 브라우저도 없으면 위 점검 목록을 데이터로 꼼꼼히 확인한다.
- `그림점검` 폴더는 확인용이라 사용자에게 건네지 않는다.

## 9. 전달

- 파일 이름은 실험 제목으로 짓는다 (예: `물의_끓는점_측정.html`). claude.ai에서는 `/mnt/user-data/outputs/`에 저장해 파일로 건넨다.
- 답변에는 짧게: 만든 단계 수, 받은 팁을 어느 단계에 넣었는지, 원문에서 확인이 필요한 곳(`notes`), 사용법 한 줄 ("단계 카드를 누르거나 '수업 모드로 보기'를 누르면 한 단계씩 크게 보여요. ← → 키로 넘겨요.")
- 사용자가 고쳐 달라고 하면 데이터만 바꿔 같은 방법으로 다시 만든다.

---

## 부록: 장면 예시 (그대로 고쳐 쓰기)

**눈금실린더로 재서 비커에 붓기**

```json
[{ "t": "beaker", "id": "b", "x": 260, "vol": "250 mL", "amount": "100 mL", "label": "물 100 mL" },
 { "t": "pour", "into": "b", "from": "cylinder", "fromVol": "100 mL", "color": "water" }]
```

**눈금 읽기 (눈높이)**

```json
[{ "t": "cylinder", "id": "c", "x": 240, "s": 1.4, "fill": 0.55 },
 { "t": "eye", "x": 110, "y": 151, "to": [218, 151] },
 { "t": "note", "x": 385, "y": 80, "text": "액체 표면의 가장 낮은 곳을 눈높이에서 읽어요", "icon": "eye", "to": [252, 153] }]
```

**시험관 여러 개에 지시약 떨어뜨리기**

```json
[{ "t": "rack", "x": 220, "s": 1.2, "tubes": [
    { "id": "A", "tag": "A", "fill": 0.4, "color": "clear" },
    { "id": "B", "tag": "B", "fill": 0.4, "color": "clear" },
    { "id": "C", "tag": "C", "fill": 0.4, "color": "clear" } ] },
 { "t": "dropper", "over": "A", "color": "purple" },
 { "t": "note", "x": 395, "y": 70, "text": "색이 어떻게 변하는지 관찰해요", "icon": "eye" }]
```

**시험관을 집게로 잡고 가열하기**

```json
[{ "t": "lamp", "x": 240 },
 { "t": "tube", "x": 272, "y": 196, "tilt": 35, "fill": 0.3, "color": "blue", "holder": true },
 { "t": "note", "x": 390, "y": 70, "text": "시험관 입구는 사람이 없는 쪽으로!", "icon": "warn" }]
```

**거름 장치로 거르기**

```json
[{ "t": "flask", "id": "f", "x": 280, "fill": 0.15, "color": "clear" },
 { "t": "funnel", "id": "fn", "over": "f", "fill": 0.5, "color": "brown", "drip": true, "stand": true },
 { "t": "pour", "into": "fn", "from": "beaker", "color": "brown" }]
```

**현미경으로 관찰하기**

```json
[{ "t": "microscope", "x": 150, "s": 1.1 },
 { "t": "view", "x": 360, "y": 120, "r": 80, "show": "plantcells", "color": "#e8d9f2", "from": [180, 60], "label": "양파 표피 세포" }]
```

**전기 회로 (전압계 병렬)**

```json
[{ "t": "circuit", "x": 240, "y": 140, "w": 280, "h": 160, "current": true,
   "parts": [{ "p": "battery", "label": "전지" }, { "p": "bulb", "label": "전구" }, { "p": "switch" }, { "p": "ammeter" }, { "p": "voltmeter", "across": 1 }] }]
```
(이 장면은 단계에 `"bench": false`를 준다)

**기체 모으기 (수상 치환)**

```json
[{ "t": "flask", "id": "f", "x": 90, "fill": 0.35, "color": "clear", "solid": "chips", "bubbles": 6, "stopper": "hole" },
 { "t": "stand", "hold": "gt", "x": 430 },
 { "t": "hose", "from": "f", "points": [[90, 118], [170, 108], [250, 200], [282, 262], [306, 258]], "bubbles": true },
 { "t": "trough", "id": "tr", "x": 320, "fill": 0.62 },
 { "t": "tube", "id": "gt", "in": "tr", "x": 310, "y": 256, "flip": true, "fill": 0.55 }]
```

**온도 센서 + 교반기로 용해열 측정 (가루 넣기)**

```json
[{ "t": "stand", "hold": "ts", "reach": 110 },
 { "t": "sensor", "id": "ts", "kind": "temp", "in": "b", "dy": 16 },
 { "t": "stirrer", "id": "st", "x": 220 },
 { "t": "beaker", "id": "b", "on": "st", "fill": 0.5, "color": "water", "stirbar": true },
 { "t": "spatula", "over": "b", "color": "white", "dx": -18, "tilt": -55 },
 { "t": "device", "x": 395, "y": 95, "s": 0.82, "title": "온도 (℃)", "graph": "live", "xlabel": "시간", "link": "ts" }]
```

**얼음물(한제) 속 시험관의 온도 측정**

```json
[{ "t": "stand", "hold": "ts", "reach": 120 },
 { "t": "sensor", "id": "ts", "kind": "temp", "in": "tb", "length": 150, "dy": 6 },
 { "t": "tube", "id": "tb", "in": "ib", "s": 1.2, "fill": 0.75, "color": "clear", "dy": 10 },
 { "t": "beaker", "id": "ib", "x": 225, "s": 1.5, "solid": "icebath" },
 { "t": "device", "x": 395, "y": 82, "s": 0.82, "title": "온도 (℃)", "graph": "live", "xlabel": "시간", "link": "ts" }]
```

**압력 센서 + 반투막 튜브 (삼투압)**

```json
[{ "t": "stand", "hold": "ps", "reach": 115 },
 { "t": "sensor", "id": "ps", "kind": "pressure", "x": 230, "y": 80, "s": 0.95 },
 { "t": "hose", "from": "ps", "to": "bg" },
 { "t": "bag", "id": "bg", "fill": 0.64, "color": "clear", "in": "bk", "dy": 16 },
 { "t": "beaker", "id": "bk", "x": 230, "s": 1.45, "fill": 0.8, "color": "water" },
 { "t": "device", "x": 395, "y": 82, "s": 0.82, "title": "압력 (kPa)", "graph": "live", "xlabel": "시간", "link": "ps" }]
```

이 예시들을 실제로 그린 결과는 `examples/recipes.html`, 모든 부품을 한 번에 보려면 `examples/gallery.html`을 연다.
