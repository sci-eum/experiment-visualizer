# 부품 목록 (parts)

> experiment-visualizer 스킬의 참고 문서다. 작업 순서와 규칙은 SKILL.md에, 장면 예시는 scenes.md에 있다.
> 모든 부품을 그려 놓은 카탈로그: https://sci-eum.github.io/experiment-visualizer/examples/gallery.html

장면의 부품마다 `t`에 아래 이름을 쓴다. **여기 없는 이름이나 속성을 지어내지 않는다** (없는 부품은 가장 비슷한 부품 + `label`, 또는 `svg`로 단순하게 그린다).
★는 x만 주면 실험대(y = 268) 위에 서는 부품, ●는 `x, y`가 중심인 부품이다. 놓는 법(`on`·`in`·`over`·`into`·`hold`·`stand`·`dx`·`dy`)은 SKILL.md 4장에 있다.

모든 부품에 쓸 수 있는 공통 속성: `id`, `x`, `y`, `s`(크기 배율, 기본 1), `tilt`(기울기 각도, 시계 방향 +), `label`(이름표 글자), `labelSide`(`'left'`/`'right'`), `z`(입체 보기에서만 앞 +·뒤 −로 옮기는 거리, 아래 '입체(3D) 보기' 참고), `info`(부품을 눌렀을 때 카드에 보이는 원문 설명, data.md '부품 눌러 알아보기').

대략적인 크기 (s=1, 가로×세로): 비커 78×90, 삼각 플라스크 84×106, 둥근바닥 플라스크 72×120, 시험관 28×114, 눈금실린더 52×155, 시약병 52×106, 부피 플라스크 72×152, 반투막 튜브 34×124(+어댑터 16), 컵 66×86, 수조 220×80, 알코올램프 62×92(불꽃 포함), 삼발이 108×103, 가열판 112×32, 교반기 116×36, 전자저울 116×32, 현미경 96×188, 스마트기기 132×90, 무선 센서 몸통 38×56 + 탐침 길이 112(`length`로 바꿈), 온도계 길이 150, 유리 막대 길이 150, 스포이트 길이 88, 집기병 64×112, 가스버너 60×100(불꽃 포함), 뷰렛 길이 162, 분별 깔때기 길이 152, 렌즈·거울 받침 포함 높이 120, 프리즘 84×70, 광원 장치 76×50, 스크린 40×150, 전원 장치 110×62, 암석 78×46, 지층 모형 170×110, 지구본 받침 포함 100×122, 마이크로튜브 16×46, PCR 튜브 12×35, 마이크로피펫 길이 127, 튜브 꽂이 높이 19(칸 간격 24), 스핀 컬럼 19×72, 원심분리기 140×92(뚜껑 열면 134), PCR 기기 170×92(뚜껑 열면 122), 전기 영동 장치 206×82, UV 램프 184×134, 냉동고 130×200(문 열면 194), 홈판 12홈 200×84·6홈 220×84(판 둘레 포함, 홈 수와 상관없이 판 크기는 거의 같다), 오목받침 유리 170×31, pH 미터·전기 전도계 28×128, 디지털 온도계 50×140, 멀티미터 76×108, 주사기 34×120(`vol`을 주면 부피 비율대로), 책상 260×92(`w`·`h`), 트랙 길이 320(`w`), 포토게이트 22×66, 도르래 바퀴 지름 20 + 추걸이 30×45, 삼각대 폰 64×142(`h`). 장면 위쪽(y < 0)으로 넘치면 잘리므로 큰 장치는 `s`를 줄인다. **기구끼리 겹치지 않게** x 간격을 (두 폭의 합 ÷ 2) 이상으로 둔다.

## 없는 기구 그리는 법

원문 기구가 이 목록에 없으면 **다른 기구로 바꿔 그리지 않는다** (학생이 다른 기구를 쓰게 된다). 같은 일을 하는 부품에 원문 이름을 `label`로 붙이거나, 모양이 다르면 `svg`로 단순하게(상자·원·선) 그리고 `label`을 붙인다. 계획(SKILL.md 3장)에 대신 그린 기구를 알린다.

| 원문 기구 | 지금 그리는 법 |
|---|---|
| 습도·운동 같은 그 밖의 센서 | `sensor` `kind:'other'`, `text:'습도'` |
| 그 밖의 기기(증폭기·건조기 …) | `appliance` `kind:'box'` + `text`(앞면 글자)·`reading`(화면) |

홈판·오목받침 유리(`wellplate`), pH 미터·디지털 온도계·멀티미터·전기 전도계(`meter`), CO₂·O₂·조도·힘 센서(`sensor`의 `kind`), 주사기·수조의 용량(`vol`)은 v1.11부터, 저마찰 트랙·포토게이트·도르래와 추걸이·매단 용수철·삼각대 촬영 폰·책상은 v1.12부터, 코일·검류계·전류계·전압계·건전지 끼우개·9 V 건전지·전극·집게 전선은 v1.13부터, 향 불씨·면봉·모세관·눈금/홀 피펫과 필러·한천 배지·종이 디스크·TLC 판·넘치는 거품·기기 상자는 v1.14부터, 분광기·기체 방전관·적외선 온도계·칼·점화기·현미경 폰 거치대·재료 조각은 v1.18부터 부품으로 그린다.

- 준비물 아이콘도 이름으로 짐작해 다른 기구 그림이 될 수 있다 ('피펫' → 스포이트, '시험관 집게' → 시험관). 검사기가 알려 주면 `icon`에 비슷한 부품이나 `{ "t": "generic", "text": "…" }`(첫 글자 상자)를 준다.
- `kind`·`solid`·`graph`·`icon`·`show` 같은 속성은 이 문서에 적힌 값만 그림이 된다. 다른 값은 검사기가 오류로 알린다.

## 그릇 (액체를 담는 부품) ★

`beaker`(비커) · `flask`(삼각 플라스크) · `roundflask`(둥근바닥 플라스크) · `volumetric`(부피 플라스크, 빨간 표시선) · `tube`(시험관) · `cylinder`(눈금실린더) · `bottle`(시약병) · `cup`(컵) · `trough`(수조) · `gasjar`(집기병) · `bag`(반투막 튜브: 아래가 묶여 있고 위에 어댑터·케이블 타이. `adapter:false`면 입구가 열린 상태) · `microtube`(마이크로튜브 1.5 mL) · `pcrtube`(PCR 튜브 0.2 mL) — 두 튜브는 아래 '분자생물학'도 본다

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
| `solid` | 바닥의 고체: `'powder'` `'precipitate'`(앙금) `'crystals'`(결정) `'chips'`(조각) `'nail'`(못) `'block'` `'leaf'` `'egg'` `'potato'`(감자 조각) `'liver'`(생간 조각) `'icebath'`(얼음+소금 한 가득, 한제) — 색은 `solidColor` |
| `stirbar` | 바닥의 마그네틱 바(돌아감). 교반기 위 그릇에 쓴다 |
| `shake` | 손으로 흔드는 동작 (흔들림 + 양옆 움직임 표시) |
| `stopper` | 고무마개 `true`, 유리관이 꽂힌 마개 `'hole'` |
| `flip` | 거꾸로 세우기 (수상 치환으로 기체 모을 때) |
| `holder` | 시험관 집게 (시험관을 손으로 잡고 가열할 때 `tilt`와 함께) |
| `text` | `bottle` 라벨 글자 (예 `"염산"`), `brown: true`면 갈색병, `cap:false`면 뚜껑 열림 |
| `paper` | `cup` 전용: 종이컵 |
| `opacity`, `meniscus:false` | 액체 투명도, 눈금실린더 메니스커스 끄기 |
| `vol` | **용량** (예 `"100 mL"`, `"1 L"`, `"1.5 mL"`). 그릇에 용량을 새기고, 비커·눈금실린더에 눈금 숫자를 넣고, 실제 부피 비율대로 크기를 정한다 (beaker·flask·roundflask·volumetric·cylinder·tube·bottle·cup·microtube·pcrtube, 주사기 `syringe`도). `trough`(수조)는 크기를 바꾸지 않고 용량 글자만 새긴다 |
| `amount` | 넣은 양 (예 `"40 mL"`, `"30~40 mL"`는 가운데 값, `"200 μL"`). `vol`과 함께 주면 액체 높이를 눈금에 맞춘다 |
| `volText`, `print:false` | 새길 글자를 직접 정하기, 용량 글자 숨기기 |
| `arm` | 가지 달린 플라스크 (`true`면 오른쪽, `'left'`면 왼쪽으로 가지). 냉각기 `from`에 이 그릇 id를 주면 가지 끝에 이어진다 |
| `lid` | 유리판 덮개 (집기병에 기체를 모아 덮을 때). `microtube`·`pcrtube`는 붙은 뚜껑이 기본으로 닫혀 있고 `lid:false`면 열린다 |
| `gas` | 그릇 안 기체 색 (예 `"#c9d96a"` 황록색 염소, `"brown"` 이산화 질소) |
| `foam` | 입구로 솟아 넘치는 거품 `true` 또는 높이 0~1.5, 색은 `foamColor` (결과라면 `reveal`에) |

`rack`(시험관대) ★: `tubes: [{id, tag:'A', fill, color, …시험관 속성}]` — 꽂힌 시험관마다 `id`를 주면 `over`/`in`으로 가리킬 수 있다. `tag`는 시험관대 앞에 쓰는 글자.

## 홈판 (웰 플레이트)·오목받침 유리 ★

`wellplate`: 앞에서 비스듬히 내려다본 판. 홈마다 `id`를 주면 `over`(스포이트·마이크로피펫으로 떨어뜨리기), `in`(측정기·유리 막대 넣기), `to`(전선·고무관 잇기)로 가리킨다.

| 속성 | 뜻 |
|---|---|
| `n` | 홈 수 `6`·`12`(기본)·`24`·`48`·`96`. 줄·칸을 직접 정하려면 `rows`·`cols` |
| `kind` | `'plastic'`(투명 플라스틱, 기본) · `'white'`(도자기 홈판) · `'slide'`(오목받침 유리, 기본 홈 2개) |
| `tags` | `true`면 판 옆에 줄 이름(A, B …)과 칸 번호(1, 2 …). 다른 글자는 `rowTags:['가','나']`·`colTags:[…]` |
| `wells` | 내용물이 있는 홈만 적는다: `[{id, at:'B3', color, fill, solid, solidColor, bubbles, cloudy, strip, label, tag}]`. `at`은 줄 글자 + 칸 번호 (생략하면 쓴 순서대로 A1, A2 …) 홈의 `label`은 판 바깥에 붙는다 (앞쪽 칸은 왼쪽, 뒤쪽 칸은 오른쪽, `labelSide`로 바꿈) |

- 홈 속성: `color`·`fill`(0~1, `color`만 주면 0.6) 액체, `solid:'chips'`(조각)·`'powder'`·`'precipitate'` 고체, `bubbles:true` 기포, `cloudy:true` 흐림, `strip`(세워 꽂은 금속판, 색 이름 `'copper'`·`'silver'` 또는 `true`), `label`(홈 이름표, 예 `"식초 1 mL"`), `tag`(홈 안에 쓰는 짧은 글자).
- 금속판(`strip`)이 꽂힌 홈을 `wire`의 `to`로 가리키면 금속판 위 끝에 이어진다. 결과(색이 변한 뒤)는 이어받기 `change`나 `reveal`의 `change`로 홈 `id`를 골라 바꾼다.

## 가열·받침 ★

| t | 이름 | 주요 속성 |
|---|---|---|
| `lamp` | 알코올램프 (`burner`도 같음) | `lit:false`면 뚜껑 덮음(불 끔) |
| `gasburner` | 가스버너 (`bunsen`도 같음) | 기본 파란 불꽃(완전 연소), `flame:'yellow'`면 노란 불꽃(공기 부족), `lit:false`면 불 끔. x 없이 삼발이와 함께 쓰면 삼발이 아래로 |
| `tripod` | 삼발이 + 쇠그물 | `gauze:false`면 쇠그물 없음. 그릇은 `on`으로 올린다 |
| `hotplate` | 가열판(핫플레이트) | `on:false`면 꺼짐 |
| `stirrer` | 자석 교반기 | `on:false`면 꺼짐. 그릇은 `on`으로 올리고 그릇에 `stirbar:true` |
| `stand` | 스탠드 | `hold:'id'`(또는 배열), `reach`(스탠드 막대와 잡은 기구 사이 거리, 기본 100), 직접 지정은 `x`, `clampY`, `arm`(팔 길이, 음수면 왼쪽) |
| `balance` | 전자저울 | `reading:'25.0 g'`, 물체는 `on`으로 올린다 |
| `candle` | 양초 | `lit:false`, `h` |

## 액체·가루 다루기

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `pour` | 붓기 동작 | `into:'id'`, `from:'beaker'/'cylinder'/'tube'/'flask'/'bottle'`, `fromVol`(붓는 그릇의 용량), `color`, `side:'right'`(오른쪽에서 붓기) |
| `dropper` | 스포이트 (`pipette`) | `over:'id'`(방울 떨어짐) 또는 `in:'id'`(빨아올림), `color`, `drops:false` |
| `syringe` | 주사기 (`x,y` = 끝) | `over`/`in`, `fill`·`color`(액체) 또는 `gas`(기체 색), `vol`(용량: 눈금과 크기), `amount`(피스톤까지 찬 양), `tilt:90`이면 끝이 왼쪽인 가로 주사기. `hose`의 `to`로 가리키면 끝에 이어진다 |
| `rod` | 유리 막대 | `in:'id'`, `stir:true`(젓기 + 회전 화살표) |
| `spatula` | 약숟가락 (`spoon`) | `over:'id'`(가루 넣기, `tilt` 음수면 손잡이가 왼쪽으로) 또는 `in:'id'`(섞기), `color`(가루 색) |
| `funnel` | 깔때기 + 거름종이 | `over:'id'`(그릇 입구에 꽂힘), `paper:false`, `fill`, `color`, `drip:true`, `dripColor`, `stand:true` |
| `burette` | 뷰렛 | `over:'플라스크id'`(꼭지를 입구에 넣음), `vol`(기본 `'50 mL'`, 위가 0인 눈금), `fill` 0~1, `reading:'12.5 mL'`(눈금 이름표), `open` 또는 `drip:true`(콕을 열어 방울이 떨어짐). 스탠드 `hold`로 고정 |
| `sepfunnel` | 분별 깔때기 | `over:'비커id'`, `layers:[{h,color},…]`(아래층부터) 또는 `fill`·`color`, `drip:true`, `stopper:false`(마개 열기). 스탠드 `hold`면 고리로 받친다 |
| `condenser` | 리비히 냉각기 | `from:'id'`(가지 달린 플라스크의 가지 끝, 또는 `[x,y]`) → `to:'id'`(받는 그릇 입구, 또는 `[x,y]`). 둘 다 없으면 `x, y` 중심에 `length`(기본 170)·`tilt`(기본 22). `drip:true`(받는 그릇에 방울), `water:false`(냉각수 없음), `flow:false`(냉각수 화살표 끄기) |
| `hose` | 고무관 (`tubing`) | `from:'id'`(마개·압력 센서에서 시작), `to:'id'`(반투막 튜브 어댑터 등으로), `points:[[x,y],…]`, `bubbles:true`(끝에서 기포), `glass:true`(유리관), `color`(주면 전선으로 그림) |

## 측정

| t | 이름 | 속성 |
|---|---|---|
| `thermometer` | 온도계 | `in:'id'`, `reading:'100 ℃'`(빨간 기둥 높이 자동), `level` 0~1 |
| `stopwatch` ● | 초시계 | `time:'1분마다'` |
| `ruler` ★ | 자 | `tilt:-90`이면 세움 |
| `springscale` ● | 용수철저울 (`x,y`=위 고리) | `hang:'weight'/'block'`, `hangText`, `stretch` 0~1, `reading` |
| `weight` ★ | 추 | `text:'100 g'`. `kind:'hanger'`면 추걸이 (`n` 걸린 추 개수) |
| `meter` | 디지털 측정기 | `kind:'ph'`(펜형 pH 미터, 기본) · `'temp'`(탐침형 디지털 온도계, `length` 탐침 길이) · `'conduct'`(간이 전기 전도계, `on:true`면 불이 켜짐) — `x,y` = 탐침 끝, `in:'id'`(그릇이나 홈판의 홈). `'multi'`(멀티미터) ★, 바늘 측정기 `'galvano'`(검류계)·`'ammeter'`(전류계)·`'voltmeter'`(전압계) ★ — (+)·(−) 단자를 `'id:+'`·`'id:-'`로 `wire`에 잇는다. 바늘은 `deflect`(검류계 −1~1, 0이 가운데 / 전류계·전압계 0~1, 기본 0 = 결과를 드러내지 않음). `reading`은 화면 글자 (펜·온도계는 숫자만 나온다). 원문이 값을 주지 않으면 `reading`을 쓰지 않는다 `'ir'`(적외선 온도계, 총 모양) — `x,y` = 앞 끝, `to:'id'`·`[x,y]`면 그곳을 겨누는 빨간 점선(그쪽을 향한다, `dir:'left'`·`'right'`로 정할 수도 있다), 값은 `reading` |

## 센서 실험

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `sensor` | 무선 센서 (`x,y` = 탐침 끝 또는 압력 포트) | `kind:'temp'`(온도, 기본)/`'pressure'`(압력, 아래 포트에 `hose`를 연결)/`'ph'`/`'co2'`·`'o2'`(기체, 짧은 탐침)/`'light'`(조도, 아래 창)/`'force'`(힘, 아래 고리)/`'other'`(그 밖의 센서, 이름은 `text`), `in:'id'`(탐침을 그릇 안에, `dy`로 바닥에서 띄움), `length`(탐침 길이, 기본 112), `text`(몸통 글자), `reading` |
| `device` ● | 스마트기기 화면 (`tablet`·`phone`) | `link:'센서id'`(무선 연결 표시), `title:'온도 (℃)'`, `xlabel:'시간'`, `value`, `graph`, `upto`(0~1, 그래프를 어디까지 그릴지), `markAt`·`markText`(그래프 위 표시) `display`: `'graph'`(그래프, 기본) · `'camera'`(촬영 중인 카메라 화면, `title`) · `'blank'`(그래프 없는 앱 화면, `title`과 크게 `value`) — 동영상 촬영·앱 분석 단계는 그래프가 아니라 이것을 쓴다 |
| `stirrer` ★ | 자석 교반기 | `on:false` |
| `stirbar` ● | 마그네틱 바 (준비물 아이콘용. 그릇 안에서는 그릇의 `stirbar:true`) | |
| `tweezers` ● | 핀셋 | `tilt`, `piece`(집은 재료 조각: `'potato'` `'liver'` `'onion'` … 아래 `piece`의 `kind`) |
| `cabletie` ● | 케이블 타이 | |

`graph` 모양: `'live'`(측정 시작, 기본 — 결과를 드러내지 않음) · `'flat'`(안정화) · `'rise'` · `'fall'` · `'boil'`(올라가다 일정) · `'cool'`(내려가다 일정) · `'freeze'`(과냉각 후 기울기 변화) · `'exo'`(빠르게 올랐다 천천히 내림) · `'endo'` · 숫자 배열(0~1 값을 차례로).

## 빛·소리·전기 장치

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `lens` | 렌즈 | `kind:'convex'`(볼록, 기본)/`'concave'`(오목). `y`를 생략하면 실험대 위 받침에 선다(렌즈 중심 y = 184). `axis:true`(광축 점선), `f:70`(양쪽 초점 F를 그 거리에) |
| `mirror` | 거울 | `kind:'plane'`(평면, 기본)/`'concave'`(오목)/`'convex'`(볼록). 반사면이 오른쪽을 본다(왼쪽은 `tilt:180`). 받침은 렌즈와 같다 |
| `prism` ★ | 프리즘 | `light:true`(왼쪽에서 들어온 빛이 무지개색으로 나뉨), `from:'광원id'`(빛이 오는 곳), `length`(무지개 길이, 기본 96) |
| `lightbox` ★ | 광원 장치 | 오른쪽 창에서 빛이 나온다. `dir:'left'`, `on:false` |
| `screen` ★ | 스크린 | `image:'inverted'`(거꾸로 선 상)/`'upright'`(바로 선 상), `imageY`(상의 높이, 장면 y) |
| `ray` ● | 광선 | `points:[[x,y],…]` 또는 `from`·`to`(id면 광원 창·렌즈 중심), `color`(기본 노란빛, 레이저는 `'red'`), `dash`, `arrow:false` |
| `power` ★ | 전원 장치(직류) | `reading:'6 V'`. (+)·(−) 단자는 `'id:+'`·`'id:-'`로 `wire`의 `from`·`to`에 쓴다 |
| `tuningfork` ★ | 소리굽쇠 | `box:false`(공명 상자 없음), `ring:true`(떨림 표시), `mallet:true`(고무망치) |

- 렌즈로 상을 맺는 장면은 렌즈 중심(받침이면 y = 184)을 광축으로 삼아 물체·렌즈·스크린의 x를 정하고, 광선 `ray`는 `points`로 꺾이는 점을 직접 준다. `?grid`로 좌표를 확인한다.

## 지구과학

| t | 이름 | 속성 |
|---|---|---|
| `rock` ★ | 암석·광물 표본 | `kind`: `'granite'`(화강암) `'basalt'`(현무암) `'sandstone'`(사암) `'limestone'`(석회암) `'shale'`(셰일) `'conglomerate'`(역암) `'gneiss'`(편마암) `'marble'`(대리암) `'quartz'`(석영) `'calcite'`(방해석). `fizz:true`(묽은 염산과 반응한 거품), `color`. 스포이트를 `over`로 올릴 수 있다 |
| `streak` ★ | 조흔판 | `color`(조흔색 줄) |
| `strata` ★ | 지층 모형(단면) | `layers:[{h, kind, color, text, fossil}]`(아래층부터. `kind`: `'gravel'` `'sand'` `'mud'` `'clay'` `'limestone'` `'coal'` `'shale'` `'volcanic'`, `text`는 층 이름, `fossil:true`는 화석), `w`·`h`(기본 170×110), `fold`(위로 휘어진 정도), `fault`(단층에서 오른쪽이 내려간 정도) |
| `globe` | 지구본 | `axis`(자전축 기울기, 기본 23.5), `night:'left'`/`'right'`(밤인 쪽). `y`를 생략하면 받침대에 서서 실험대 위에 놓인다 |

## 분자생물학 (DNA 추출·PCR·전기 영동)

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `micropipette` | 마이크로피펫 (`x, y` = 팁 끝) | `over:'id'`(팁 끝을 그릇 입구 안쪽에 넣고 방울이 떨어짐, 뚜껑을 연 튜브에), `in:'id'`(액체 속에 넣어 빨아올리기), `color`·`fill`(팁 속 액체), `reading:'200 μL'`(맞춘 부피 이름표), `drops:false` |
| `microtube` ★ | 마이크로튜브(E-tube, 1.5 mL) | 그릇 공통 속성 (`color` `fill` `amount` `vol` `layers` `solid:'precipitate'`(펠릿) …). 붙은 뚜껑이 기본으로 닫혀 있고 `lid:false`면 열림 |
| `pcrtube` ★ | PCR 튜브(0.2 mL) | `microtube`와 같다 |
| `tuberack` ★ | 튜브 꽂이 | `tubes:[{id, tag:'1', …튜브 속성}]` — `t`를 생략하면 `microtube`, `pcrtube`·`spincolumn`도 꽂힌다. `n`(빈 칸 수), `color`(꽂이 색). 꽂힌 튜브마다 `id`를 주면 `over`/`in`으로 가리킬 수 있다 |
| `spincolumn` ★ | 스핀 컬럼(Binding Column을 끼운 collection tube) | `color`·`fill`(컬럼에 넣은 액체), `waste`(걸러져 아래 튜브에 모인 액의 색), `lid:false`(뚜껑 열림). 꽂이 `tubes`에도, `in:'원심분리기id'`로도 넣는다 |
| `centrifuge` ★ | 탁상 원심분리기 | `reading:'13,000 rpm'`(화면 글자), `on:false`(멈춤), `lid:false`(뚜껑을 열어 회전자가 보임). 튜브는 `in:'id'`로 회전자에 꽂고 `dx`로 자리를 옮긴다 (마주 보게 `dx:-14`·`dx:14`). 뚜껑을 닫으면 꽂힌 튜브는 가려진다 |
| `thermocycler` ★ | PCR 기기(열 순환기) | `program`(화면 글자, 예 `'95℃ 30초 → 55℃ 30초 → 72℃ 1분'`. `\n`으로 줄 바꿈, 길면 글자를 줄여 5줄까지. 없으면 온도 변화 모양), `lid:false`(뚜껑을 열어 가열 블록이 보임). PCR 튜브는 `in:'id'`로 블록에 꽂는다 (옆 칸은 `dx` 14 간격) |
| `geltank` ★ | 전기 영동 장치 (`electrophoresis`) | 비스듬히 위에서 본 모습: 왼쪽 (−) 쪽 웰에서 오른쪽 (+) 쪽으로 이동한다. `wells`(웰 수, 기본 8), `color`(완충 용액 색), `gel:false`, `loaded`(웰에 넣은 시료 색), `run:true` 또는 0~1(염료가 이동한 정도와 전극의 기포). 단자는 `'id:-'`·`'id:+'`로 `wire`에 잇는다. 마이크로피펫 `over:'id'`는 가운데 웰에 팁을 넣는다 (`dy`로 다른 웰) |
| `uvlamp` ★ | UV 램프로 겔 보기 (받침 위 겔 + 위의 UV 램프) | `on:false`(꺼짐: 보라 빛과 띠가 보이지 않음), `gel:false`, `wells`(기본 8), `bands`(웰마다 띠 위치 `[[0.3, 0.55], [0.4], …]`, 0 = 웰, 1 = 겔 끝) — 띠는 결과이므로 원문이 결과를 알려 줄 때 `reveal`(결과 보기)에만 쓴다 |
| `freezer` ★ | 냉동고 | 문이 열려 선반이 보인다(`open:false`면 닫힘). `reading:'-20 ℃'`(화면 글자). 넣을 것은 `on:'id'`로 가운데 선반에 올리고 `at` 0~1로 왼쪽~오른쪽 자리를 정한다 |

- 작은 튜브는 실제 비율대로 작게 그려진다. 주인공이면 그 장면의 튜브·꽂이·피펫에 같은 `s`(예 1.5)를 준다.
- 튜브 속 양은 `amount`에 원문 그대로 (`"200 μL"`), 용량은 `vol` (`"1.5 mL"`). 원심분리 뒤 바닥의 펠릿은 `solid:'precipitate'`.

## 생물·관찰

`microscope` ★ 현미경(`phone:true`면 접안렌즈 위에 스마트폰 촬영 거치대) · `slide` ● 받침·덮개 유리(`color` 시료 색) · `magnifier` ● 돋보기 · `dish` ★ 페트리 접시(`items:'seeds'/'colony'/'beans'`, `lid`, `fill`) · `evapdish` ★ 증발 접시(`solid`, `steam`) · `watchglass` ★ 시계 접시 · `mortar` ★ 막자사발(`color`, `grind:true`) · `plant` ★ 화분 식물(`bag:true` 비닐 씌움, `droplets:true` 물방울) · `leaf` ● 잎(`color`, `color2`면 절반을 다른 색으로)

## 물리

`ramp` ★ 빗면(`w`, `h`, `dir:'left'`) — 그 위의 `cart`·`block`·`ball`은 `on:'빗면id', at:0~1`로 경사를 따라 놓인다 · `cart` ★ 역학 수레(`text` 몸통 글자 `'A'`, `load` 위에 올린 추 개수) · `block` ★ 나무 도막(`w`,`h`,`text`,`color`) · `ball` ★ 공(`r`,`color`) · `magnet` ★ 막대자석(`flip`, `field:true` 자기력선) · `compass` ● 나침반(`angle`)

## 역학 장치 (트랙·포토게이트·도르래·용수철·촬영)

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `table` ★ | 책상(실험대 윗판) | `w`(너비, 기본 260), `h`(높이, 기본 92). 추를 매달거나 공을 굴려 떨어뜨리는 장면처럼 바닥보다 높은 곳이 필요할 때. 위에 놓을 것은 `on:'책상id'`(`at` 0~1 = 왼쪽~오른쪽, 또는 `x`) |
| `track` ★ | 저마찰 트랙(역학 레일) | `w`(가로 길이, 기본 320), `h`(높은 쪽을 올린 높이, 기본 0 = 수평), `dir:'left'`(왼쪽으로 내려감. 기본은 오른쪽으로), `support:'block'`(기본)·`'stand'`·`'none'`(높은 쪽 받침), `scale:false`(눈금 끄기). 책상 위면 `on:'책상id'`. 수레·공·나무 도막은 `on:'트랙id', at:0~1`(높은 쪽 끝 ~ 낮은 쪽 끝) |
| `photogate` ★ | 포토게이트(속력 측정기) | `on:'트랙id', at:0~1`이면 그 자리에서 트랙을 걸쳐 선다 (기울기를 따른다). `beam:false`면 빛 표시 없음. 스마트기기 `device`의 `link`로 이을 수 있다 |
| `pulley` | 도르래와 매단 추 | `on:'트랙id'`면 낮은 쪽 끝(`at:0`이면 높은 쪽 끝), `on:'책상id'`면 모서리(`side:'right'` 기본·`'left'`)에 끼운다. `from:'수레id'`면 수레에서 도르래까지 실, 바퀴 옆으로 `drop`(기본 50)만큼 내려 `hang`(`'hanger'` 추걸이 기본·`'weight'`·`'block'`)을 매단다. `hangText:'50 g'`, `n`(추걸이 추 개수). 추가 바닥에 닿지 않게 트랙을 `table` 위에 놓는다 |
| `spring` ● | 매단 용수철 (`x,y` = 위 고리) | 스탠드 `hold:'용수철id'`로 위 고리를 잡는다. `length`(늘어나지 않은 길이, 기본 70), `stretch` 0~1(늘어난 정도, 1이면 두 배), `coils`, `hang:'weight'`·`'block'`·`'hanger'`·`'phone'`, `hangText`, `osc:true`(위아래 진동). 길이를 재면 옆에 `ruler`(`tilt:-90`) |
| `camera` ★ | 삼각대에 꽂은 촬영용 스마트폰 | `h`(삼각대 높이, 기본 120), `dir:'left'`(왼쪽을 찍음), `to:'id'` 또는 `[x,y]`(찍는 범위를 점선으로), `rec:false`(녹화 표시 끄기). 동영상 분석 실험의 촬영 장면 |

- 수레를 미는·당기는 힘은 화살표 `arrow`, 움직인 방향은 `arrow`의 `flow`로 그린다. 결과(속력 값·그래프)는 원문이 줄 때만 `reveal`에.

## 전기

`circuit` ● 회로 한 벌: `x, y`(중심), `w, h`, `closed`(스위치 닫힘, 기본 true), `current:true`(전류 흐름 표시), `parts:[…]`

- `parts` 항목: `'battery'` `'bulb'` `'switch'` `'ammeter'` `'voltmeter'` `'resistor'` `'motor'` `'led'` 또는 `{p:'bulb', label:'전구 A', edge:'top', on:false}`
- 순서대로 아래 → 위 → 오른쪽 → 왼쪽 변에 놓인다. `edge`로 직접 정할 수 있다.
- 전압계처럼 병렬로 연결할 부품은 `{p:'voltmeter', across: 1}` (1 = 같은 `parts` 배열에서 병렬로 걸 부품의 번호, 0부터).
- 낱개 부품(`battery` 건전지, `bulb` 전구, `switch` 스위치, `ammeter` 전류계, `voltmeter` 전압계, `resistor` 저항, `motor` 전동기, `led` LED, `wire` 전선)도 ●로 따로 놓을 수 있다 (`x, y` = 가운데). 양 끝 단자를 `'id:-'`(왼쪽)·`'id:+'`(오른쪽)로 `wire`에 이어 실물 배선을 그린다.
- 건전지 `battery`: `kind:'holder'`면 건전지 끼우개(`n` 건전지 수 1~4, `switch:true` 스위치, `on:false` 꺼짐), `kind:'9v'`면 9 V 건전지. 둘은 ★ (x만 주면 실험대 위에 선다). 단자는 `'id:+'`·`'id:-'`.
- `wire`에 `from`·`to`(·`points`)를 주면 두 곳을 잇는 전선이 된다. 단자는 `'id:+'`·`'id:-'` (전원 장치 `power`, 전기 영동 장치 `geltank`, 측정기 `meter`의 `'multi'`·`'galvano'`·`'ammeter'`·`'voltmeter'`, 코일 `coil`, 위의 낱개 부품). `to`에 홈판의 홈 id를 주면 그 홈의 금속판(`strip`)에, 전극 `electrode` id를 주면 전극 위 끝에 이어진다. `clip:true`면 두 끝에 집게(집게 전선), `'from'`·`'to'`면 그 끝에만. `color`(기본 짙은 회색, `'red'`·`'black'`). 예: `{t:'wire', from:'ps:-', to:'gt:-', color:'black'}`


## 코일·전극

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `coil` ★ | 코일(가로로 누운 감은 도선) | `w`(길이, 기본 110), `r`(반지름, 기본 26), `turns`(그린 감은 수), `core:true`(철심), `color`(도선 색). `kind:'flat'`이면 납작한 원형 코일(`w` = 지름). 두 끝 도선은 `'id:-'`(왼쪽)·`'id:+'`(오른쪽)로 `wire`에 잇는다. 막대자석 `magnet`은 `in:'코일id'`면 코일 왼쪽 입구에 오른쪽 끝을 맞추고 `dx`(+)만큼 안으로 들어간다. 넣고 빼는 동작은 `arrow`(`both:true`) |
| `electrode` | 전극(금속판·탄소 막대) | `in:'그릇id'`(`dx`로 옆으로 — 두 개면 `dx:-14`·`dx:14`), `kind:'plate'`(금속판, 기본)·`'rod'`(탄소 막대), `color`(`'copper'`·`'silver'`·`'gray'`·`'black'`). 위 끝에 `wire`의 `to`·`from:'전극id'`가 이어진다. 스탠드 `hold`로 잡을 수 있다 |

## 작은 기구 (불씨·면봉·피펫·배지·TLC·기기)

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `splint` | 향 불씨(나무 막대) | `x,y` = 불씨 끝. `over:'그릇id'`면 끝을 입구 안쪽에 넣는다. 기본은 꺼져 가는 불씨, `lit:true`면 불꽃, `ember:false`면 불 없음. 다시 타오르는 것은 결과이므로 `reveal`에 |
| `swab` | 면봉 | `x,y` = 솜 끝. `over`·`in:'id'`(위에서 본 배지 `agar`, 그릇), `tilt`(기본 35), `color`(솜에 묻은 색) |
| `capillary` | 모세관 | `x,y` = 끝. `color`·`fill`(안의 액체). `over:'TLC id'`면 끝이 TLC 판의 첫 점에 닿는다 (`dx`로 옆 점) |
| `glasspipette` | 눈금 피펫·홀 피펫 | `x,y` = 끝. `kind:'graduated'`(눈금 피펫, 기본)·`'volumetric'`(홀 피펫: 가운데가 불룩, 표선 하나), `vol`(용량 글자·눈금), `amount` 또는 `fill`·`color`(안의 액체), `filler:true`(위에 피펫 필러). `over:'그릇id'`(끝을 입구 안쪽에, 방울), `in:'그릇id'`(빨아올리기). 길이 170이라 키 큰 그릇 위에서는 `s`를 줄인다 |
| `filler` ● | 피펫 필러 (따로 놓을 때) | `x,y` = 가운데 |
| `agar` ● | 위에서 본 한천 배지(페트리 접시) | `x,y` = 가운데, `r`(반지름, 기본 54), `color`(배지 색), `lid:true`(뚜껑), `sectors:['A','B','C','D']`(바닥에 나눈 구역), `disks`(종이 디스크: 개수 또는 `[{at:[x,y](-1~1), color, zone(억제 구역 반지름 0~1, 결과), tag}]`), `colonies`(개수 또는 `true`, `colonyColor`), `streak:true`(그은 자국). 옆에서 본 접시는 `dish` |
| `tlc` | TLC 판(박층 크로마토그래피) | `x,y` = 아래 끝 가운데, `kind:'paper'`면 크로마토그래피 종이 띠, `w`(기본 18)·`h`(기본 110), `spots:['green', …]`(출발선의 점), `bands:[{y:0~1, color}]`(전개된 띠, 결과), `front:0~1`(용매가 올라간 곳), `line:false`(출발선 끄기). `in:'그릇id'`면 그릇 바닥 가까이 세운다 (눈금실린더에 넣고 마개 `stopper:true`) |
| `appliance` ★ | 기기 상자 | `kind:'incubator'`(항온기·배양기, 기본)·`'microwave'`(전자레인지)·`'kettle'`(전기 포트, `steam:true`)·`'box'`(그 밖의 기기). `text`(앞면 글자), `reading`(화면 글자, 예 `'37 ℃'`), `open:true`(문을 열어 안쪽 선반이 보임 — 넣을 것은 `on:'기기id'`, `at` 0~1), `on:false`(꺼짐), `w`·`h` |

- 종이 디스크를 따로 놓을 때는 `paper`의 `kind:'disk'`(`color`는 적신 용액 색), 핀셋 `tweezers`와 함께 쓴다.

## 남은 기구 (분광기·방전관·칼·점화기·재료 조각)

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `spectroscope` ● | 분광기 (손에 드는 관) | `x,y` = 가운데, `tilt`. `to:'id'`·`[x,y]`면 슬릿 끝(왼쪽)이 그쪽을 향하고 빛이 오는 길을 점선으로. 눈 쪽은 오른쪽 (`eye`와 함께) |
| `discharge` ★ | 기체 방전관 + 고전압 발생 장치 | `text`(기체 이름, 예 `'네온'`), `on:false`(꺼짐: 빛 없음), `color`(빛 색, 기본 연보라). 분광기 `to`로 가리킨다 |
| `knife` ● | 칼(커터·실험용 칼) | `x,y` = 가운데, `tilt`(기본 -15), `color`(손잡이 색) |
| `lighter` ● | 점화기(긴 가스 점화기) | `x,y` = 불이 나오는 끝, `tilt`(기본 -25: 손잡이가 오른쪽 위), `lit:false`(불 끔). 향 `splint`의 끝에 대어 불을 붙이는 장면 |
| `piece` ★ | 재료 조각 | `kind`: `'potato'`(감자) `'liver'`(생간) `'onion'`(양파 비늘잎) `'radish'`(무) `'tofu'`(두부) `'banana'`(바나나) `'apple'`(사과) `'cube'`(그 밖의 조각, `color`). `on:'접시·받침 유리·책상 id'`면 그 위에. 그릇 속은 그릇의 `solid:'potato'`·`'liver'`, 핀셋으로 집은 것은 `tweezers`의 `piece` |

## 안전·재료

`goggles` ● 보안경 · `gloves` ● 실험용 장갑 · `ice` ★ 얼음(`n`) · `powder` ★ 가루 더미(`color`, `paper:true` 약포지) · `paper` ● 시험지(`color`, 젖은 부분 색 `color2`와 비율 `dip`), `kind:'filter'`면 거름종이 · `match` ● 성냥(`lit`)

## 표시 부품 ●

| t | 뜻 | 속성 |
|---|---|---|
| `arrow` | 화살표 | `from:[x,y]` 또는 `'id'`, `to`, `curve`(휘는 정도, ±), `label`, `color`, `dash`, `flow`(흐르는 점선), `both` |
| `note` | 말풍선 설명 | `text`, `icon:'eye'(관찰)/'how'(방법)/'tip'(도움말)/'time'/'ok'/'no'/'warn'/'idea'/'result'` 또는 `tag`, `to`(가리킬 곳), `w`(너비, 기본 172) |
| `label` | 이름표 | `text`, `to:[x,y]` 또는 `'id'` |
| `text` | 글자 | `text`, `size`, `color`, `anchor:'start'/'middle'/'end'` |
| `mark` | O·X 표시 | `kind:'ok'` 또는 `'no'` |
| `eye` | 눈 + 시선 | `to:[x,y]` (눈금 읽기 장면) |
| `view` | 확대 원 (`zoom`) | `r`, `show:'plantcells'/'animalcells'/'solid'/'liquid'/'gas'/'crystals'/'bubbles'`, `color`, `from:[x,y]`(확대한 곳), `label`, `markup`(직접 그린 SVG, 원 중심이 0,0) |
| `svg` | 직접 그리기 | `markup`(SVG 조각, 기준점이 0,0 — 실험대에 세울 것은 0,0에서 위쪽(음수 y)으로 그리고 `y:268`), `w`, `h`. `y`를 주지 않으면 y 150이 기준이고, `h`가 150보다 크면 실험대 위에 선다 |

## 입체(3D) 보기에서 보이는 모습

장면의 **3D** 버튼(수업 모드에서는 위쪽 3D 단추)으로 보는 입체 화면에서 부품이 보이는 방식이다. 데이터는 따로 쓸 것이 없다.

| 등급 | 부품 |
|---|---|
| 입체 그릇 (유리와 액체) | `gasjar` `beaker` `flask` `roundflask` `tube` `cylinder` `bottle` `cup` `trough` `volumetric` `bag` `microtube` `pcrtube` |
| 입체 기구 | `tripod` `lamp` `gasburner` `stand` `hotplate` `stirrer` `balance` `rack` `tuberack` `dish` `evapdish` `watchglass` `funnel` `candle` `block` `ball` `ice` `magnet` `stirbar` `microscope` `device` `power` `lightbox` `table` `cart` `track` `ramp` `mortar` `sepfunnel` `wellplate` `burner` `bunsen` |
| 설명 (화면 위 글자·선) | `note` `text` `view` `zoom` `label` `mark` `eye` `arrow` |
| 그림 카드 (2D 그림을 세움) | 위에 없는 나머지 부품 |

- 입체 그릇은 2D와 같은 액체 높이·색·층(`layers`)·흐림·기체 색으로 보인다. 그릇 안(`in`)에 넣은 것은 그릇 안에, 잠긴 부분은 액체 빛으로 보인다.
- 관·전선(`hose` `wire` `tubing`)과 화살표(`arrow`), 말풍선의 지시선(`to`), 눈 시선, 확대 원의 선은 두 끝을 이어진 부품에 붙여 긋는다. 돌려도 가리키는 곳에 붙어 있다.
- 홈판(`wellplate`)의 홈에 둔 것(`over: 'A1'`·`in`)과 홈에 이은 전선은 입체 홈 자리로 옮긴다.
- 2D에서 움직이는 것은 입체에서도 같은 규칙으로 움직인다: 스포이트 방울(`over`)·약숟가락 가루, 그릇의 기포(`bubbles`)·김(`steam`)·젓개(`stirbar`), 기체 모으기 관의 기포, 알코올램프·초·버너·점화기의 불꽃, 향 불씨의 빛, 유리 막대로 젓기(`stir`), 흔드는 그릇(`shake`, 그릇째 기울어진다). **움직임 끄기**를 누르거나 기기의 '동작 줄이기'가 켜져 있으면 멈춘 그림이다.
- 수업 모드에서 입체로 보는 중에 단계를 앞으로 넘기거나 결과 보기를 누르면, 2D 시연처럼 바뀌는 모습을 입체로 보여 준다: 같은 그릇의 액체 높이·색이 서서히 바뀌고, 옮긴 부품은 미끄러지고, 새 부품은 나타나며(동작 부품은 위에서 내려오며), 빠진 부품은 흐려진다. 숫자·그림이 바뀐 카드는 두 그림을 겹쳐 바꾼다.
- `z`: 입체 보기에서만 앞(+)·뒤(−)로 옮기는 거리 (−110~110, 실험대 깊이). 2D 그림과 겹침 점검에는 영향이 없다. 안(`in`)·위(`over`·`on`)에 둔 것, 꽂힌 튜브, 스탠드(`hold`)는 그 부품을 따라간다. 2D에서 일부러 앞뒤로 겹쳐 그린 두 장치를 입체에서 떼어 놓을 때만 쓴다.

## 색 이름

`water`(물) `clear`(투명) `blue` `navy` `skyblue` `red` `pink` `purple` `violet` `yellow` `orange` `green` `lime` `brown` `black` `white` `milky`(뿌연) `gray` `oil`(기름) `iodine`(청람색) `brick`(적갈색) `gold` `copper` `silver` — 한국어 이름(`파랑`, `분홍색`, `청람색`, `황적색` …)과 `"#a9d8f5"` 같은 값도 된다.

원문에 색이 적혀 있지 않을 때만 참고하는 일반적인 지시약 색: BTB 산성 노랑·중성 초록·염기성 파랑 / 페놀프탈레인 염기성 붉은색(산성·중성 무색) / 메틸 오렌지 산성 빨강·염기성 노랑 / 리트머스 산성 붉게·염기성 푸르게 / 붉은 양배추 산성 붉은색·중성 보라·염기성 초록~노랑 / 녹말 + 아이오딘-아이오딘화 칼륨 청람색 / 포도당 + 베네딕트 가열 황적색 / 단백질 + 뷰렛 보라색.
