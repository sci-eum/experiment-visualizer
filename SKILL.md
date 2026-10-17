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

1. 문서 읽기 → 2. 실험 내용 정리 → 3. 장면 설계 → 4. `EXPERIMENT` 데이터 쓰기 → 5. HTML 만들기 → 6. 점검 → 7. 전달

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
- `--images`로 꺼낸 그림(장치도)이 있으면 열어 보고 장치 배치를 장면에 반영한다.
- 문서에 여러 실험이 있으면 사용자가 지정한 실험만, 지정이 없으면 첫 번째 실험을 만들고 나머지가 있다고 알려 준다.

## 2. 실험 내용 정리 — 원문 충실 규칙

문서에서 다음을 뽑는다: 제목, 과목·단원, 목표, 준비물(수량), 안전 수칙, **실험 과정(순서대로)**, 관찰할 점, 예상 결과·결과 기록표, 생각해 볼 질문.

- **원문에 없는 단계·수치·물질을 지어내지 않는다.** 양, 농도, 시간, 온도, 순서는 원문 그대로 쓴다. 문장은 학생이 읽기 쉽게 다듬어도 되지만 뜻은 같아야 한다.
- 한 단계에 동작이 여러 개면 나눠도 된다. 이때 원문 번호를 제목에 남긴다 (예: `"3-1. 지시약 넣기"`, `"3-2. 흔들어 섞기"`). 보통 4~10단계가 된다.
- 원문이 단계 안에서 결과(색 변화 등)를 알려 주지 **않으면** 그림에서도 결과를 미리 보여 주지 않는다. 대신 "무슨 색으로 변하는지 관찰해요" 같은 `observe`·`note`로 둔다. 예상 결과는 `results.expect`에만 쓴다. (탐구 실험의 재미를 지키기 위함. 사용자가 결과도 그려 달라고 하면 그린다.)
- 원문에서 읽기 어렵거나 애매한 부분은 `notes`에 `"원문 확인 필요: …"`로 남기고, 마지막 답변에서도 알린다.
- 학생 이름·번호 같은 개인정보가 문서에 있으면 HTML에 넣지 않는다.
- 원문에 안전 수칙이 없더라도 위험한 조작(가열, 산·염기, 날카로운 기구, 불)이 있으면 일반적인 안전 수칙을 `safety`에 1~3개 넣고, 원문에 없던 것이라고 마지막 답변에서 알린다.

## 3. 장면 설계

장면은 **가로 480 × 세로 300** 좌표의 그림이다. 왼쪽 위가 (0, 0)이고, 실험대 윗면은 **y = 268** 이다.

- **한 단계 = 한 장면 = 핵심 동작 하나.** 학생이 그림만 보고도 "무엇을, 어디에, 어떻게" 하는지 알 수 있어야 한다.
- **주인공 기구**는 가운데(x 180~300)에 두고 크게(`s: 1.2~1.5`) 그린다. 한 장면에 기구 2~5개가 알맞다. 빈 곳이 너무 많으면 `s`를 키운다.
- **동작은 부품으로 표현한다**: 붓기 `pour`, 떨어뜨리기 `dropper`+`over`, 젓기 `rod`+`stir`, 가루 넣기 `spatula`+`over`, 거르기 `funnel`+`over`, 가열 `lamp`·`hotplate`, 이동·순서 `arrow`, 관찰 `note`·`view`·`eye`.
- **상태 변화는 속성으로 표현한다**: 액체 색 `color`, 양 `fill`, 거품 `bubbles`, 김 `steam`, 앙금 `solid:'precipitate'`, 뿌옇게 흐림 `cloudy`, 층 분리 `layers`.
- **단계 사이를 이어지게** 그린다. 같은 기구는 단계가 바뀌어도 같은 x 위치·같은 색·같은 양을 유지하다가 바뀌는 단계에서만 바꾼다.
- `label`(이름표)은 장면마다 1~3개, 핵심 물질과 양만 짧게 (예: `"물 100 mL"`). 긴 설명은 단계의 `text`·`tip`에 쓴다.
- 잘못된 방법을 보여 줄 때는 `mark`(`kind:'no'`)와 `warn`을 함께 쓴다.
- 부품 목록에 없는 기구는 ① 가장 비슷한 부품 + `label`로 이름을 바꿔 쓰거나 ② `svg` 부품으로 단순한 도형을 직접 그린다.

### 배치 규칙

- 대부분의 부품은 **x만 정하면 실험대 위에 선다**. `y`를 생략하면 실험대(268)가 바닥이다. `x`를 생략하면 240(가운데)이다.
- 공중에 떠 있는 표시 부품(`note`, `view`, `mark`, `eye`, `label`, `text`, `stopwatch`, 회로 부품 …)은 `x, y`가 **중심**이다.
- 같은 장면의 다른 부품을 `id`로 가리켜 배치할 수 있다. 가리키는 부품에 `id`를 꼭 붙인다.

| 속성 | 뜻 | 예 |
|---|---|---|
| `on: 'id'` | 그 부품 **위에 올려놓기** (삼발이·가열판·저울·빗면 위) | `{t:'beaker', on:'tr'}` |
| `in: 'id'` | 그 그릇 **안에 넣기** (온도계, 유리 막대, 스포이트로 빨아올리기) | `{t:'thermometer', in:'b'}` |
| `over: 'id'` | 그 그릇 **입구 위에서** (스포이트·주사기·약숟가락·깔때기) | `{t:'dropper', over:'b', color:'pink'}` |
| `into: 'id'` | `pour` 전용: 그 그릇에 **붓기** | `{t:'pour', into:'b', from:'cylinder'}` |
| `hold: 'id'` | `stand` 전용: 그 기구를 **집게로 고정** (배열 가능) | `{t:'stand', hold:['th','t1']}` |
| `stand: true` | 어떤 기구든 스탠드로 고정 (스탠드를 자동으로 그림) | `{t:'tube', x:260, y:200, stand:true}` |

모든 부품에 쓸 수 있는 공통 속성: `id`, `x`, `y`, `s`(크기 배율, 기본 1), `tilt`(기울기 각도, 시계 방향 +), `label`(이름표 글자), `labelSide`(`'left'`/`'right'`).

대략적인 크기 (s=1, 가로×세로): 비커 78×90, 삼각 플라스크 84×106, 둥근바닥 플라스크 72×120, 시험관 28×114, 눈금실린더 52×155, 시약병 52×106, 컵 66×86, 수조 220×80, 알코올램프 62×92(불꽃 포함), 삼발이 108×103, 가열판 112×32, 전자저울 116×32, 현미경 96×188, 온도계 길이 150, 유리 막대 길이 150, 스포이트 길이 88. **기구끼리 겹치지 않게** x 간격을 (두 폭의 합 ÷ 2) 이상으로 둔다.

## 4. `EXPERIMENT` 데이터 쓰기

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
    { "name": "비커 (250 mL)", "qty": "1개", "icon": "beaker" },
    { "name": "온도계", "qty": "1개", "icon": "thermometer" },
    { "name": "묽은 염산", "icon": { "t": "bottle", "text": "염산", "fill": 0.6 } }
  ],
  "safety": ["가열 중인 비커는 맨손으로 만지지 않는다."],
  "steps": [
    {
      "title": "가열하며 온도 재기",
      "text": "알코올램프에 불을 붙이고 **1분마다** 온도를 기록한다.",
      "time": "약 15분",
      "observe": "온도가 어떻게 변하는지 기록해요.",
      "tip": "온도계 눈금은 눈높이에서 읽어요.",
      "warn": "온도계 끝이 비커 바닥에 닿지 않게 해요.",
      "scene": [
        { "t": "stand", "hold": "th" },
        { "t": "tripod", "id": "tr", "x": 280 },
        { "t": "lamp", "x": 280 },
        { "t": "beaker", "id": "b", "on": "tr", "fill": 0.45, "bubbles": 6, "steam": true },
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
- 준비물 `icon`은 부품 이름(`"beaker"`) 또는 부품 객체(`{"t":"bottle","text":"염산"}`)다. 생략하면 이름으로 짐작하고, 모르면 첫 글자 아이콘이 나온다.
- 단계의 `bench: false`를 주면 실험대 바닥을 그리지 않는다 (회로도, 확대 그림만 있는 장면).
- 표지 그림을 바꾸려면 최상위에 `"cover": [ 부품 … ]`을 준다.
- `"_demo": true` 같은 템플릿 예시 값은 남기지 않는다.

## 5. 부품 목록

`t`에 아래 이름을 쓴다. ★는 x만 주면 실험대 위에 서는 부품, ●는 `x, y`가 중심인 부품이다.

### 그릇 (액체를 담는 부품) ★

`beaker`(비커) · `flask`(삼각 플라스크) · `roundflask`(둥근바닥 플라스크) · `tube`(시험관) · `cylinder`(눈금실린더) · `bottle`(시약병) · `cup`(컵) · `trough`(수조)

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
| `solid` | 바닥의 고체: `'powder'` `'precipitate'`(앙금) `'crystals'`(결정) `'chips'`(조각) `'nail'`(못) `'block'` `'leaf'` `'egg'` — 색은 `solidColor` |
| `stopper` | 고무마개 `true`, 유리관이 꽂힌 마개 `'hole'` |
| `flip` | 거꾸로 세우기 (수상 치환으로 기체 모을 때) |
| `holder` | 시험관 집게 (시험관을 손으로 잡고 가열할 때 `tilt`와 함께) |
| `text` | `bottle` 라벨 글자 (예 `"염산"`), `brown: true`면 갈색병, `cap:false`면 뚜껑 열림 |
| `paper` | `cup` 전용: 종이컵 |
| `opacity`, `meniscus:false` | 액체 투명도, 눈금실린더 메니스커스 끄기 |

`rack`(시험관대) ★: `tubes: [{id, tag:'A', fill, color, …시험관 속성}]` — 꽂힌 시험관마다 `id`를 주면 `over`/`in`으로 가리킬 수 있다. `tag`는 시험관대 앞에 쓰는 글자.

### 가열·받침 ★

| t | 이름 | 주요 속성 |
|---|---|---|
| `lamp` | 알코올램프 (`burner`도 같음) | `lit:false`면 뚜껑 덮음(불 끔) |
| `tripod` | 삼발이 + 쇠그물 | `gauze:false`면 쇠그물 없음. 그릇은 `on`으로 올린다 |
| `hotplate` | 가열판(핫플레이트) | `on:false`면 꺼짐 |
| `stand` | 스탠드 | `hold:'id'`(또는 배열), 직접 지정은 `x`, `clampY`, `arm`(팔 길이, 음수면 왼쪽) |
| `balance` | 전자저울 | `reading:'25.0 g'`, 물체는 `on`으로 올린다 |
| `candle` | 양초 | `lit:false`, `h` |

### 액체·가루 다루기

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `pour` | 붓기 동작 | `into:'id'`, `from:'beaker'/'cylinder'/'tube'/'flask'/'bottle'`, `color`, `side:'right'`(오른쪽에서 붓기) |
| `dropper` | 스포이트 (`pipette`) | `over:'id'`(방울 떨어짐) 또는 `in:'id'`(빨아올림), `color`, `drops:false` |
| `syringe` | 주사기 | `over`/`in`, `fill`, `color` |
| `rod` | 유리 막대 | `in:'id'`, `stir:true`(젓기 + 회전 화살표) |
| `spatula` | 약숟가락 (`spoon`) | `over:'id'`, `color`(가루 색) |
| `funnel` | 깔때기 + 거름종이 | `over:'id'`(그릇 입구에 꽂힘), `paper:false`, `fill`, `color`, `drip:true`, `dripColor`, `stand:true` |
| `hose` | 고무관 (`tubing`) | `from:'id'`(마개에서 시작), `points:[[x,y],…]`, `bubbles:true`(끝에서 기포), `glass:true`(유리관) |

### 측정

| t | 이름 | 속성 |
|---|---|---|
| `thermometer` | 온도계 | `in:'id'`, `reading:'100 ℃'`(빨간 기둥 높이 자동), `level` 0~1 |
| `stopwatch` ● | 초시계 | `time:'1분마다'` |
| `ruler` ★ | 자 | `tilt:-90`이면 세움 |
| `springscale` ● | 용수철저울 (`x,y`=위 고리) | `hang:'weight'/'block'`, `hangText`, `stretch` 0~1, `reading` |
| `weight` ★ | 추 | `text:'100 g'` |

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
| `note` | 말풍선 설명 | `text`, `icon:'eye'(관찰)/'how'(방법)/'tip'(도움말)/'time'/'ok'/'no'/'warn'/'idea'/'result'` 또는 `tag`, `to`(가리킬 곳), `w`(너비, 기본 150) |
| `label` | 이름표 | `text`, `to:[x,y]` 또는 `'id'` |
| `text` | 글자 | `text`, `size`, `color`, `anchor:'start'/'middle'/'end'` |
| `mark` | O·X 표시 | `kind:'ok'` 또는 `'no'` |
| `eye` | 눈 + 시선 | `to:[x,y]` (눈금 읽기 장면) |
| `view` | 확대 원 (`zoom`) | `r`, `show:'plantcells'/'animalcells'/'solid'/'liquid'/'gas'/'crystals'/'bubbles'`, `color`, `from:[x,y]`(확대한 곳), `label`, `markup`(직접 그린 SVG, 원 중심이 0,0) |
| `svg` | 직접 그리기 | `markup`(SVG 조각, 기준점이 0,0), `w`, `h` |

### 색 이름

`water`(물) `clear`(투명) `blue` `navy` `skyblue` `red` `pink` `purple` `violet` `yellow` `orange` `green` `lime` `brown` `black` `white` `milky`(뿌연) `gray` `oil`(기름) `iodine`(청람색) `brick`(적갈색) `gold` `copper` `silver` — 한국어 이름(`파랑`, `분홍색`, `청람색`, `황적색` …)과 `"#a9d8f5"` 같은 값도 된다.

원문에 색이 적혀 있지 않을 때만 참고하는 일반적인 지시약 색: BTB 산성 노랑·중성 초록·염기성 파랑 / 페놀프탈레인 염기성 붉은색(산성·중성 무색) / 메틸 오렌지 산성 빨강·염기성 노랑 / 리트머스 산성 붉게·염기성 푸르게 / 붉은 양배추 산성 붉은색·중성 보라·염기성 초록~노랑 / 녹말 + 아이오딘-아이오딘화 칼륨 청람색 / 포도당 + 베네딕트 가열 황적색 / 단백질 + 뷰렛 보라색.

## 6. HTML 만들기

데이터를 `experiment.json`으로 저장한 뒤, 할 수 있는 방법 중 **위에 있는 것**을 쓴다.

### 방법 A — 스킬 폴더가 있다 (Claude 스킬 설치, Claude Code, 저장소 복제)

```bash
python scripts/build_html.py experiment.json 실험제목.html
```

### 방법 B — 코드 실행은 되지만 스킬 폴더가 없다 (링크로 받은 경우)

템플릿을 내려받아 데이터만 끼워 넣는다. 그림 엔진 전체가 HTML 안에 들어가 **인터넷 없이도** 열린다.

```python
import json, pathlib, urllib.request
URLS = ["https://raw.githubusercontent.com/sci-eum/experiment-visualizer/main/assets/template.html",
        "https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1/assets/template.html"]
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

## 7. 점검

HTML을 내기 전에 확인한다.

- [ ] 단계 수와 순서가 원문과 같다 (나눈 단계는 제목에 원문 번호가 있다).
- [ ] 양·농도·시간·온도·단위가 원문과 같다. 지어낸 단계·물질이 없다.
- [ ] 모든 `t`가 5장의 부품 이름이다. `on`/`in`/`over`/`into`/`hold`/`to`/`from`이 가리키는 `id`가 **같은 장면 안에** 있다.
- [ ] 좌표가 화면 안(x 0~480, y 0~300)이고 기구끼리 크게 겹치지 않는다.
- [ ] 원문이 알려 주지 않은 결과를 과정 그림에서 미리 보여 주지 않았다.
- [ ] 이름표는 장면마다 1~3개다.
- [ ] JSON 문법이 맞다 (따옴표, 쉼표, 괄호). `_demo` 같은 예시 값이 남아 있지 않다.
- [ ] 개인정보가 없다.
- 브라우저로 열어 볼 수 있으면 직접 확인한다. 주소 끝에 `?grid`를 붙이면 좌표 격자가 보인다. 콘솔에 `[LabKit]` 경고가 있으면 그 부품을 고친다.

## 8. 전달

- 파일 이름은 실험 제목으로 짓는다 (예: `물의_끓는점_측정.html`). claude.ai에서는 `/mnt/user-data/outputs/`에 저장해 파일로 건넨다.
- 답변에는 짧게: 만든 단계 수, 원문에서 확인이 필요한 곳(`notes`), 원문에 없어 보탠 것(안전 수칙 등), 사용법 한 줄 ("단계 카드를 누르거나 '수업 모드로 보기'를 누르면 한 단계씩 크게 보여요. ← → 키로 넘겨요.")
- 사용자가 고쳐 달라고 하면 데이터만 바꿔 같은 방법으로 다시 만든다.

---

## 부록: 장면 예시 (그대로 고쳐 쓰기)

**눈금실린더로 재서 비커에 붓기**

```json
[{ "t": "beaker", "id": "b", "x": 260, "s": 1.3, "fill": 0.35, "label": "물 100 mL" },
 { "t": "pour", "into": "b", "from": "cylinder", "color": "water" }]
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
 { "t": "trough", "x": 320, "fill": 0.62 },
 { "t": "tube", "id": "gt", "x": 310, "y": 256, "flip": true, "fill": 0.55 }]
```

이 예시들을 실제로 그린 결과는 `examples/recipes.html`, 모든 부품을 한 번에 보려면 `examples/gallery.html`을 연다.
