# 부품 목록 (parts)

> experiment-visualizer 스킬의 참고 문서다. 작업 순서와 규칙은 SKILL.md에, 장면 예시는 scenes.md에 있다.
> 모든 부품을 그려 놓은 카탈로그: https://sci-eum.github.io/experiment-visualizer/examples/gallery.html

장면의 부품마다 `t`에 아래 이름을 쓴다. **여기 없는 이름이나 속성을 지어내지 않는다** (없는 부품은 가장 비슷한 부품 + `label`, 또는 `svg`로 단순하게 그린다).
★는 x만 주면 실험대(y = 268) 위에 서는 부품, ●는 `x, y`가 중심인 부품이다. 놓는 법(`on`·`in`·`over`·`into`·`hold`·`stand`·`dx`·`dy`)은 SKILL.md 4장에 있다.

모든 부품에 쓸 수 있는 공통 속성: `id`, `x`, `y`, `s`(크기 배율, 기본 1), `tilt`(기울기 각도, 시계 방향 +), `label`(이름표 글자), `labelSide`(`'left'`/`'right'`).

대략적인 크기 (s=1, 가로×세로): 비커 78×90, 삼각 플라스크 84×106, 둥근바닥 플라스크 72×120, 시험관 28×114, 눈금실린더 52×155, 시약병 52×106, 부피 플라스크 72×152, 반투막 튜브 34×124(+어댑터 16), 컵 66×86, 수조 220×80, 알코올램프 62×92(불꽃 포함), 삼발이 108×103, 가열판 112×32, 교반기 116×36, 전자저울 116×32, 현미경 96×188, 스마트기기 132×90, 무선 센서 몸통 38×56 + 탐침 길이 112(`length`로 바꿈), 온도계 길이 150, 유리 막대 길이 150, 스포이트 길이 88, 집기병 64×112, 가스버너 60×100(불꽃 포함), 뷰렛 길이 162, 분별 깔때기 길이 152, 렌즈·거울 받침 포함 높이 120, 프리즘 84×70, 광원 장치 76×50, 스크린 40×150, 전원 장치 110×62, 암석 78×46, 지층 모형 170×110, 지구본 받침 포함 100×122, 마이크로튜브 16×46, PCR 튜브 12×35, 마이크로피펫 길이 127, 튜브 꽂이 높이 19(칸 간격 24), 스핀 컬럼 19×72, 원심분리기 140×92(뚜껑 열면 134), PCR 기기 170×92(뚜껑 열면 122), 전기 영동 장치 206×82, UV 램프 184×134, 냉동고 130×200(문 열면 194). 장면 위쪽(y < 0)으로 넘치면 잘리므로 큰 장치는 `s`를 줄인다. **기구끼리 겹치지 않게** x 간격을 (두 폭의 합 ÷ 2) 이상으로 둔다.

## 없는 기구 그리는 법

원문 기구가 이 목록에 없으면 **다른 기구로 바꿔 그리지 않는다** (학생이 다른 기구를 쓰게 된다). 같은 일을 하는 부품에 원문 이름을 `label`로 붙이거나, 모양이 다르면 `svg`로 단순하게(상자·원·선) 그리고 `label`을 붙인다. 계획(SKILL.md 3장)에 대신 그린 기구를 알린다.

| 원문 기구 | 지금 그리는 법 |
|---|---|
| pH 미터(펜형) | `sensor` `kind:'ph'` + `label:'pH 미터'`, 값은 `reading` |
| 디지털 온도계(탐침형) | `sensor` `kind:'temp'` + `label:'디지털 온도계'` (`thermometer`는 유리 막대 온도계) |
| CO₂·조도·힘 센서 | `sensor` `kind:'other'`, `text:'CO₂'` |
| 역학 트랙(저마찰 레일) | 낮은 빗면 `ramp`(`w:320, h:46`) + `cart`(`on`) + `label:'역학 트랙'` |
| 주사기·수조의 용량 | `vol`이 없다. `label`에 쓴다 (`'50 mL 주사기'`) |
| 홈판(웰 플레이트)·오목받침 유리 | `svg`로 판과 홈을 단순히 그리고 홈 이름은 `text`. 시험관대로 바꾸지 않는다 |
| 눈금 피펫·홀 피펫, 멀티미터, 항온기·전자레인지 같은 기기 | `svg` 관·상자 + `label` (`dropper`·`pipette`는 스포이트 그림. 회로도면 `circuit`의 `voltmeter`·`ammeter`) |

- 준비물 아이콘도 이름으로 짐작해 다른 기구 그림이 될 수 있다 ('눈금 피펫' → 스포이트, '시험관 집게' → 시험관). 검사기가 알려 주면 `icon`에 비슷한 부품이나 `{ "t": "generic", "text": "…" }`(첫 글자 상자)를 준다.
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
| `solid` | 바닥의 고체: `'powder'` `'precipitate'`(앙금) `'crystals'`(결정) `'chips'`(조각) `'nail'`(못) `'block'` `'leaf'` `'egg'` `'icebath'`(얼음+소금 한 가득, 한제) — 색은 `solidColor` |
| `stirbar` | 바닥의 마그네틱 바(돌아감). 교반기 위 그릇에 쓴다 |
| `shake` | 손으로 흔드는 동작 (흔들림 + 양옆 움직임 표시) |
| `stopper` | 고무마개 `true`, 유리관이 꽂힌 마개 `'hole'` |
| `flip` | 거꾸로 세우기 (수상 치환으로 기체 모을 때) |
| `holder` | 시험관 집게 (시험관을 손으로 잡고 가열할 때 `tilt`와 함께) |
| `text` | `bottle` 라벨 글자 (예 `"염산"`), `brown: true`면 갈색병, `cap:false`면 뚜껑 열림 |
| `paper` | `cup` 전용: 종이컵 |
| `opacity`, `meniscus:false` | 액체 투명도, 눈금실린더 메니스커스 끄기 |
| `vol` | **용량** (예 `"100 mL"`, `"1 L"`, `"1.5 mL"`). 그릇에 용량을 새기고, 비커·눈금실린더에 눈금 숫자를 넣고, 실제 부피 비율대로 크기를 정한다 (beaker·flask·roundflask·volumetric·cylinder·tube·bottle·cup·microtube·pcrtube) |
| `amount` | 넣은 양 (예 `"40 mL"`, `"30~40 mL"`는 가운데 값, `"200 μL"`). `vol`과 함께 주면 액체 높이를 눈금에 맞춘다 |
| `volText`, `print:false` | 새길 글자를 직접 정하기, 용량 글자 숨기기 |
| `arm` | 가지 달린 플라스크 (`true`면 오른쪽, `'left'`면 왼쪽으로 가지). 냉각기 `from`에 이 그릇 id를 주면 가지 끝에 이어진다 |
| `lid` | 유리판 덮개 (집기병에 기체를 모아 덮을 때). `microtube`·`pcrtube`는 붙은 뚜껑이 기본으로 닫혀 있고 `lid:false`면 열린다 |
| `gas` | 그릇 안 기체 색 (예 `"#c9d96a"` 황록색 염소, `"brown"` 이산화 질소) |

`rack`(시험관대) ★: `tubes: [{id, tag:'A', fill, color, …시험관 속성}]` — 꽂힌 시험관마다 `id`를 주면 `over`/`in`으로 가리킬 수 있다. `tag`는 시험관대 앞에 쓰는 글자.

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
| `syringe` | 주사기 | `over`/`in`, `fill`, `color` |
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
| `weight` ★ | 추 | `text:'100 g'` |

## 센서 실험

| t | 이름 | 놓는 법 / 속성 |
|---|---|---|
| `sensor` | 무선 센서 (`x,y` = 탐침 끝 또는 압력 포트) | `kind:'temp'`(온도, 기본)/`'pressure'`(압력, 아래 포트에 `hose`를 연결)/`'ph'`/`'other'`(그 밖의 센서, 이름은 `text`), `in:'id'`(탐침을 그릇 안에, `dy`로 바닥에서 띄움), `length`(탐침 길이, 기본 112), `text`(몸통 글자), `reading` |
| `device` ● | 스마트기기 그래프 (`tablet`·`phone`) | `link:'센서id'`(무선 연결 표시), `title:'온도 (℃)'`, `xlabel:'시간'`, `value`, `graph`, `upto`(0~1, 그래프를 어디까지 그릴지), `markAt`·`markText`(그래프 위 표시) |
| `stirrer` ★ | 자석 교반기 | `on:false` |
| `stirbar` ● | 마그네틱 바 (준비물 아이콘용. 그릇 안에서는 그릇의 `stirbar:true`) | |
| `tweezers` ● | 핀셋 | `tilt` |
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

`microscope` ★ 현미경 · `slide` ● 받침·덮개 유리(`color` 시료 색) · `magnifier` ● 돋보기 · `dish` ★ 페트리 접시(`items:'seeds'/'colony'/'beans'`, `lid`, `fill`) · `evapdish` ★ 증발 접시(`solid`, `steam`) · `watchglass` ★ 시계 접시 · `mortar` ★ 막자사발(`color`, `grind:true`) · `plant` ★ 화분 식물(`bag:true` 비닐 씌움, `droplets:true` 물방울) · `leaf` ● 잎(`color`, `color2`면 절반을 다른 색으로)

## 물리

`ramp` ★ 빗면(`w`, `h`, `dir:'left'`) — 그 위의 `cart`·`block`·`ball`은 `on:'빗면id', at:0~1`로 경사를 따라 놓인다 · `cart` ★ 역학 수레 · `block` ★ 나무 도막(`w`,`h`,`text`,`color`) · `ball` ★ 공(`r`,`color`) · `magnet` ★ 막대자석(`flip`, `field:true` 자기력선) · `compass` ● 나침반(`angle`)

## 전기

`circuit` ● 회로 한 벌: `x, y`(중심), `w, h`, `closed`(스위치 닫힘, 기본 true), `current:true`(전류 흐름 표시), `parts:[…]`

- `parts` 항목: `'battery'` `'bulb'` `'switch'` `'ammeter'` `'voltmeter'` `'resistor'` `'motor'` `'led'` 또는 `{p:'bulb', label:'전구 A', edge:'top', on:false}`
- 순서대로 아래 → 위 → 오른쪽 → 왼쪽 변에 놓인다. `edge`로 직접 정할 수 있다.
- 전압계처럼 병렬로 연결할 부품은 `{p:'voltmeter', across: 1}` (1 = 같은 `parts` 배열에서 병렬로 걸 부품의 번호, 0부터).
- 낱개 부품(`battery`, `bulb`, `switch`, `ammeter`, `voltmeter`, `resistor`, `motor`, `led`, `wire`)도 ●로 따로 놓을 수 있다 (준비물 아이콘용).
- `wire`에 `from`·`to`(·`points`)를 주면 두 곳을 잇는 전선이 된다. 단자는 `'id:+'`·`'id:-'` (전원 장치 `power`, 전기 영동 장치 `geltank`), `color`(기본 짙은 회색, `'red'`·`'black'`). 예: `{t:'wire', from:'ps:-', to:'gt:-', color:'black'}`

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
| `svg` | 직접 그리기 | `markup`(SVG 조각, 기준점이 0,0), `w`, `h` |

## 색 이름

`water`(물) `clear`(투명) `blue` `navy` `skyblue` `red` `pink` `purple` `violet` `yellow` `orange` `green` `lime` `brown` `black` `white` `milky`(뿌연) `gray` `oil`(기름) `iodine`(청람색) `brick`(적갈색) `gold` `copper` `silver` — 한국어 이름(`파랑`, `분홍색`, `청람색`, `황적색` …)과 `"#a9d8f5"` 같은 값도 된다.

원문에 색이 적혀 있지 않을 때만 참고하는 일반적인 지시약 색: BTB 산성 노랑·중성 초록·염기성 파랑 / 페놀프탈레인 염기성 붉은색(산성·중성 무색) / 메틸 오렌지 산성 빨강·염기성 노랑 / 리트머스 산성 붉게·염기성 푸르게 / 붉은 양배추 산성 붉은색·중성 보라·염기성 초록~노랑 / 녹말 + 아이오딘-아이오딘화 칼륨 청람색 / 포도당 + 베네딕트 가열 황적색 / 단백질 + 뷰렛 보라색.
