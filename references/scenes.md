# 장면 예시 (그대로 고쳐 쓰기)

> experiment-visualizer 스킬의 참고 문서다. 작업 순서와 규칙은 SKILL.md에 있다.
> 이 예시들은 모두 실제로 그려 본 장면이다: https://sci-eum.github.io/experiment-visualizer/examples/recipes.html
> 부품 이름과 속성은 parts.md를 본다.

비슷한 장면이 있으면 여기서 가져와 좌표·색·양만 원문에 맞게 고친다. 블록 하나가 단계의 `scene` 값이다.

## 기본 장면

### 1. 눈금실린더로 재서 비커에 붓기

```json
[{"t": "beaker", "id": "b", "x": 260, "vol": "250 mL", "amount": "100 mL", "label": "물 100 mL"},
 {"t": "pour", "into": "b", "from": "cylinder", "fromVol": "100 mL", "color": "water"}]
```

### 2. 눈금 읽기 (눈높이)

```json
[{"t": "cylinder", "id": "c", "x": 240, "s": 1.4, "fill": 0.55},
 {"t": "eye", "x": 110, "y": 151, "to": [218, 151]},
 {"t": "note", "x": 385, "y": 80, "text": "액체 표면의 가장 낮은 곳을 눈높이에서 읽어요", "icon": "eye", "to": [252, 153]}]
```

### 3. 시험관 여러 개에 지시약 떨어뜨리기

predict는 관찰 전에 예상을 적는 칸, reveal은 '결과 보기'를 눌러야 보이는 결과다 (원문이 결과를 알려 줄 때만 쓴다).

```json
[{"t": "rack", "x": 220, "s": 1.2, "tubes": [{"id": "A", "tag": "A", "fill": 0.4, "color": "clear"}, {"id": "B", "tag": "B", "fill": 0.4, "color": "clear"}, {"id": "C", "tag": "C", "fill": 0.4, "color": "clear"}]},
 {"t": "dropper", "over": "A", "color": "purple"},
 {"t": "note", "x": 395, "y": 70, "text": "색이 어떻게 변하는지 관찰해요", "icon": "eye"}]
```

단계에 함께 쓴 속성:

```json
{"predict": "세 시험관의 색은 같을까요, 다를까요?", "reveal": {"text": "지시약을 넣은 용액마다 색이 달라져요.", "remove": ["dropper"], "change": {"A": {"color": "red"}, "B": {"color": "purple"}, "C": {"color": "green"}}}}
```

### 4. 시험관을 집게로 잡고 가열하기

```json
[{"t": "lamp", "x": 240},
 {"t": "tube", "x": 272, "y": 196, "tilt": 35, "fill": 0.3, "color": "blue", "holder": true},
 {"t": "note", "x": 390, "y": 70, "text": "시험관 입구는 사람이 없는 쪽으로!", "icon": "warn"}]
```

### 5. 거름 장치로 거르기

```json
[{"t": "flask", "id": "f", "x": 280, "fill": 0.15, "color": "clear"},
 {"t": "funnel", "id": "fn", "over": "f", "fill": 0.5, "color": "brown", "drip": true, "stand": true},
 {"t": "pour", "into": "fn", "from": "beaker", "color": "brown"}]
```

단계에 함께 쓴 속성:

```json
{"time": "약 5분"}
```

### 6. 현미경으로 관찰하기

```json
[{"t": "microscope", "x": 150, "s": 1.1},
 {"t": "view", "x": 360, "y": 120, "r": 80, "show": "plantcells", "color": "#e8d9f2", "from": [180, 60], "label": "양파 표피 세포"}]
```

### 7. 전기 회로 (전압계 병렬)

회로도만 있는 장면이라 단계에 "bench": false를 준다. 전압계는 across로 병렬 연결한다.

```json
[{"t": "circuit", "x": 240, "y": 140, "w": 280, "h": 160, "current": true, "parts": [{"p": "battery", "label": "전지"}, {"p": "bulb", "label": "전구"}, {"p": "switch"}, {"p": "ammeter"}, {"p": "voltmeter", "across": 1}]}]
```

### 8. 기체 모으기 (수상 치환)

수조 속 거꾸로 세운 시험관은 x·y를 직접 주되 in으로 수조에 이어 둔다 (잠긴 부분에 물빛이 덮이고, 겹침 경고가 나지 않는다).

```json
[{"t": "flask", "id": "f", "x": 90, "fill": 0.35, "color": "clear", "solid": "chips", "bubbles": 6, "stopper": "hole"},
 {"t": "stand", "hold": "gt", "x": 430},
 {"t": "hose", "from": "f", "points": [[90, 118], [170, 108], [250, 200], [282, 262], [306, 258]], "bubbles": true},
 {"t": "trough", "id": "tr", "x": 320, "fill": 0.62},
 {"t": "tube", "id": "gt", "in": "tr", "x": 310, "y": 256, "flip": true, "fill": 0.55}]
```

## 센서 실험

### 9. 온도 센서 + 교반기로 용해열 측정

```json
[{"t": "stand", "hold": "ts", "reach": 110},
 {"t": "sensor", "id": "ts", "kind": "temp", "in": "b", "dy": 16},
 {"t": "stirrer", "id": "st", "x": 220},
 {"t": "beaker", "id": "b", "on": "st", "fill": 0.5, "color": "water", "stirbar": true},
 {"t": "spatula", "over": "b", "color": "white", "dx": -18, "tilt": -55},
 {"t": "device", "x": 395, "y": 95, "s": 0.82, "title": "온도 (℃)", "graph": "live", "xlabel": "시간", "link": "ts"}]
```

### 10. 얼음물(한제) 속 시험관의 온도 측정

```json
[{"t": "stand", "hold": "ts", "reach": 120},
 {"t": "sensor", "id": "ts", "kind": "temp", "in": "tb", "length": 150, "dy": 6},
 {"t": "tube", "id": "tb", "in": "ib", "s": 1.2, "fill": 0.75, "color": "clear", "dy": 10},
 {"t": "beaker", "id": "ib", "x": 225, "s": 1.5, "solid": "icebath"},
 {"t": "device", "x": 395, "y": 82, "s": 0.82, "title": "온도 (℃)", "graph": "live", "xlabel": "시간", "link": "ts"}]
```

### 11. 압력 센서 + 반투막 튜브 (삼투압)

```json
[{"t": "stand", "hold": "ps", "reach": 115},
 {"t": "sensor", "id": "ps", "kind": "pressure", "x": 230, "y": 80, "s": 0.95},
 {"t": "hose", "from": "ps", "to": "bg"},
 {"t": "bag", "id": "bg", "fill": 0.64, "color": "clear", "in": "bk", "dy": 16},
 {"t": "beaker", "id": "bk", "x": 230, "s": 1.45, "fill": 0.8, "color": "water"},
 {"t": "device", "x": 395, "y": 82, "s": 0.82, "title": "압력 (kPa)", "graph": "live", "xlabel": "시간", "link": "ps"}]
```

### 12. 그래프 모양 (freeze, markAt)

원문이 그래프 모양을 설명할 때만 graph 모양을 쓴다. 그래프만 있는 장면이라 "bench": false.

```json
[{"t": "device", "x": 240, "y": 140, "s": 2.4, "title": "온도 (℃)", "graph": "freeze", "markAt": 0.54, "markText": "기울기가 바뀌는 지점", "xlabel": "시간"}]
```

## 가열

### 13. 가열하며 온도 재기

time에 '약 5분'·'1분마다'처럼 시간이 있으면 수업 모드에 타이머가 생긴다.

```json
[{"t": "stand", "hold": "th"},
 {"t": "tripod", "id": "tr", "x": 280},
 {"t": "lamp", "x": 280},
 {"t": "beaker", "id": "b", "on": "tr", "fill": 0.45, "bubbles": 6, "steam": true},
 {"t": "thermometer", "id": "th", "in": "b", "reading": "100 ℃"},
 {"t": "stopwatch", "x": 420, "y": 70, "time": "1분마다"}]
```

단계에 함께 쓴 속성:

```json
{"time": "1분마다"}
```

## 자동 배치·장면 이어받기

### 14. 자동 배치 (x 생략)

준비물을 늘어놓는 장면은 x를 생략하면 쓴 순서대로 고르게 놓인다. label 자리도 비워 둔다.

```json
[{"t": "beaker", "id": "b", "vol": "100 mL", "amount": "50 mL", "label": "물 50 mL"},
 {"t": "bottle", "id": "btb", "text": "BTB", "fill": 0.6},
 {"t": "bottle", "id": "hcl", "text": "묽은 염산", "fill": 0.6}]
```

### 15. 이어받기 ① 지시약 넣기

앞 단계를 이어받아 바뀐 것만 쓴다 (scene이 배열이 아니라 객체).

```json
{
  "from": "prev",
  "change": {"b": {"color": "green", "label": "BTB 용액"}},
  "add": [{"t": "dropper", "over": "b", "color": "green"}]
}
```

### 16. 이어받기 ② 염산 떨어뜨리기

remove는 id 또는 부품 이름, change의 null은 그 속성을 지운다. 말풍선은 이어받지 않으므로 add에 쓴다.

```json
{
  "from": "prev",
  "remove": ["dropper", "btb"],
  "change": {"b": {"label": null}, "hcl": {"cap": false}},
  "add": [{"t": "dropper", "over": "b", "color": "clear"}, {"t": "note", "x": 390, "y": 60, "text": "색이 어떻게 변하는지 관찰해요", "icon": "eye"}]
}
```

## 더 많은 실험 장치

### 17. 중화 적정 (뷰렛)

```json
[{"t": "stand", "hold": "bu"},
 {"t": "flask", "id": "f", "x": 240, "vol": "100 mL", "amount": "20 mL", "color": "clear"},
 {"t": "burette", "id": "bu", "over": "f", "fill": 0.7, "drip": true, "reading": "12.5 mL"},
 {"t": "note", "x": 395, "y": 190, "text": "색이 바뀌면 바로 콕을 잠가요", "icon": "how"}]
```

### 18. 증류 (가지 달린 플라스크 + 냉각기)

냉각기는 from에 가지 달린 플라스크, to에 받는 그릇을 주면 저절로 이어진다.

```json
[{"t": "hotplate", "id": "hp", "x": 100},
 {"t": "roundflask", "id": "rf", "on": "hp", "arm": true, "fill": 0.45, "color": "#e9d3a6", "bubbles": 4},
 {"t": "thermometer", "in": "rf", "dy": 73, "s": 0.7, "reading": "78 ℃", "labelSide": "left"},
 {"t": "stand", "hold": "cd", "reach": 60},
 {"t": "condenser", "id": "cd", "from": "rf", "to": "rc", "drip": true},
 {"t": "beaker", "id": "rc", "x": 410, "s": 0.8, "fill": 0.15, "color": "clear"}]
```

### 19. 볼록 렌즈로 상 맺기

받침에 선 렌즈의 중심 y = 184가 광축이다. 광선은 points로 꺾이는 점을 직접 준다.

```json
[{"t": "candle", "x": 60},
 {"t": "lens", "id": "ln", "x": 230, "axis": true, "f": 70},
 {"t": "screen", "x": 350, "image": "inverted", "imageY": 180},
 {"t": "ray", "points": [[60, 168], [230, 168], [350, 195]]},
 {"t": "ray", "points": [[60, 168], [230, 184], [350, 195]], "dash": true}]
```

### 20. 프리즘으로 빛 나누기

```json
[{"t": "lightbox", "id": "lb", "x": 70},
 {"t": "prism", "x": 230, "light": true, "from": "lb", "length": 115},
 {"t": "note", "x": 390, "y": 80, "text": "빛이 여러 색으로 나뉘어요", "icon": "eye"}]
```

### 21. 석회암에 묽은 염산 떨어뜨리기

```json
[{"t": "rock", "id": "ls", "kind": "limestone", "x": 170, "fizz": true, "label": "석회암"},
 {"t": "dropper", "over": "ls", "color": "clear"},
 {"t": "rock", "kind": "granite", "x": 330, "label": "화강암", "labelSide": "right"}]
```

## 분자생물학 (DNA·PCR·전기 영동)

### 22. 마이크로피펫으로 튜브에 넣기

작은 튜브는 꽂이·튜브·피펫에 같은 s를 주어 크게 그린다. 피펫은 뚜껑을 연 튜브(lid:false)에 over로 넣는다.

```json
[{"t": "tuberack", "x": 220, "s": 1.4, "tubes": [{"id": "t1", "tag": "1", "s": 1.4, "lid": false, "color": "#a9c97a", "fill": 0.3}, {"id": "t2", "tag": "2", "s": 1.4, "lid": false}, {"id": "t3", "tag": "3", "s": 1.4}]},
 {"t": "micropipette", "over": "t2", "s": 1.4, "color": "#a9c97a", "reading": "200 μL"}]
```

### 23. 물중탕에 튜브와 온도계 함께 넣기

튜브와 온도계를 둘 다 in으로 비커 물에 넣고 dx로 나란히 놓는다. 물에 잠긴 부분도 온도계의 빨간 기둥이 보인다.

```json
[{"t": "beaker", "id": "b", "x": 232, "s": 1.9, "fill": 0.8, "color": "water"},
 {"t": "microtube", "vol": "1.5 mL", "in": "b", "dx": -16, "s": 1.6, "color": "#a9c97a", "fill": 0.5},
 {"t": "thermometer", "in": "b", "dx": 16, "reading": "50 ℃"}]
```

### 24. 원심분리기에 튜브 넣기 (마주 보게)

튜브는 in으로 회전자에 꽂고 dx로 마주 보게 놓는다.

```json
[{"t": "centrifuge", "id": "cf", "x": 240, "s": 1.3, "lid": false, "on": false},
 {"t": "microtube", "id": "a", "in": "cf", "dx": -18, "s": 1.3, "color": "#a9c97a", "fill": 0.4},
 {"t": "microtube", "id": "b", "in": "cf", "dx": 18, "s": 1.3, "color": "#a9c97a", "fill": 0.4}]
```

### 25. 원심분리하기 (뚜껑 닫기)

앞 장면을 이어받아 lid·on을 지우면 뚜껑이 닫히고 돌아간다. 닫으면 꽂힌 튜브는 가려진다.

```json
{
  "from": "prev",
  "change": {"cf": {"lid": null, "on": null, "reading": "13,000 rpm"}},
  "add": [{"t": "stopwatch", "x": 80, "y": 110, "time": "1분"}]
}
```

### 26. PCR 기기에 PCR 튜브 꽂기

블록의 옆 칸은 dx 14×s 간격이다.

```json
[{"t": "thermocycler", "id": "tc", "x": 240, "s": 1.2, "lid": false},
 {"t": "pcrtube", "in": "tc", "dx": -17, "s": 1.2, "color": "pink", "fill": 0.3},
 {"t": "pcrtube", "in": "tc", "s": 1.2, "color": "pink", "fill": 0.3},
 {"t": "pcrtube", "in": "tc", "dx": 17, "s": 1.2, "color": "pink", "fill": 0.3}]
```

### 27. PCR 기기로 DNA 증폭하기

program에는 원문의 온도·시간을 그대로 쓴다 (\n으로 줄 바꿈, 길면 글자를 줄여 5줄까지).

```json
{
  "from": "prev",
  "change": {"tc": {"lid": null, "program": "95℃ 30초 → 55℃ 30초 → 72℃ 1분\n30회 반복"}}
}
```

### 28. 겔의 웰에 시료 넣기

마이크로피펫 over에 전기 영동 장치 id를 주면 가운데 웰에 팁을 넣는다 (dy로 다른 웰). loaded는 웰에 넣은 시료 색.

```json
[{"t": "geltank", "id": "gt", "x": 240, "s": 1.3, "loaded": "#4a5fd0"},
 {"t": "micropipette", "over": "gt", "s": 1.3, "color": "#4a5fd0"}]
```

### 29. 전기 영동하기 (전원 연결)

전선 wire는 from·to에 'id:+'·'id:-'로 단자를 잇는다 (빨강은 +, 검정은 −). run은 염료가 (+) 쪽으로 이동한 정도.

```json
{
  "from": "prev",
  "remove": ["micropipette"],
  "change": {"gt": {"run": 0.45}},
  "add": [{"t": "power", "id": "ps", "x": 425, "s": 0.8, "reading": "100 V"}, {"t": "wire", "from": "ps:+", "to": "gt:+", "color": "red", "points": [[436, 212]]}, {"t": "wire", "from": "ps:-", "to": "gt:-", "color": "black", "points": [[464, 206], [300, 112], [120, 140]]}]
}
```

### 30. UV로 겔 관찰하기

띠(bands)는 결과이므로 원문이 결과를 알려 줄 때 reveal(결과 보기)에만 넣는다.

```json
[{"t": "uvlamp", "id": "uv", "x": 240, "s": 1.3, "wells": 4}]
```

단계에 함께 쓴 속성:

```json
{"reveal": {"text": "웰마다 DNA 띠가 보여요.", "change": {"uv": {"bands": [[0.3, 0.55], [0.3, 0.55], [0.42], [0.3, 0.55, 0.7]]}}}}
```

## 기본 장면

### 31. 홈판의 홈마다 지시약 떨어뜨리기

wellplate의 wells에 id를 주고 스포이트를 over로 그 홈 위에. tags:true면 줄(A, B …)·칸(1, 2 …) 이름이 나온다.

```json
[{"t": "wellplate", "x": 220, "s": 1.2, "tags": true, "wells": [{"id": "A1", "at": "A1", "color": "clear"}, {"id": "A2", "at": "A2", "color": "clear"}, {"id": "A3", "at": "A3", "color": "clear"}, {"id": "A4", "at": "A4", "color": "clear"}]},
 {"t": "dropper", "over": "A1", "color": "purple"},
 {"t": "note", "x": 400, "y": 60, "text": "홈마다 색이 어떻게 변하는지 관찰해요", "icon": "eye", "w": 150}]
```

### 32. 홈에 금속판을 꽂고 멀티미터로 전압 재기

홈의 strip은 세워 꽂은 금속판(색 이름). wire의 to를 홈 id로 주면 금속판 위 끝에 이어진다. 멀티미터 단자는 'id:+'·'id:-'.

```json
[{"t": "meter", "id": "mm", "kind": "multi", "x": 75},
 {"t": "wellplate", "x": 300, "n": 6, "s": 1.1, "wells": [{"id": "p1", "at": "A1", "color": "skyblue", "strip": "copper"}, {"id": "p2", "at": "A3", "color": "clear", "strip": "silver"}]},
 {"t": "wire", "from": "mm:+", "to": "p1", "color": "red", "points": [[130, 215]]},
 {"t": "wire", "from": "mm:-", "to": "p2", "color": "black", "points": [[40, 170], [150, 105], [300, 110]]}]
```

### 33. pH 미터로 용액의 pH 재기

meter kind:'ph'를 in으로 그릇에 넣는다. reading은 원문이 값을 줄 때만 (화면에 숫자가 나온다).

```json
[{"t": "beaker", "id": "b", "x": 240, "s": 1.2, "vol": "100 mL", "amount": "50 mL", "color": "clear", "label": "용액 50 mL"},
 {"t": "meter", "kind": "ph", "in": "b", "dx": -22, "label": "pH 미터", "labelSide": "left"}]
```

### 34. 오목받침 유리의 홈에 시약 떨어뜨리기

wellplate kind:'slide'는 오목받침 유리(기본 홈 2개).

```json
[{"t": "wellplate", "x": 240, "s": 1.5, "kind": "slide", "wells": [{"id": "h1", "color": "#d9433f", "fill": 0.5, "tag": "A"}, {"id": "h2", "color": "#d9433f", "fill": 0.5, "tag": "B"}]},
 {"t": "dropper", "over": "h1", "color": "clear"},
 {"t": "note", "x": 400, "y": 70, "text": "두 홈에 넣는 시약이 달라요", "icon": "how", "w": 140}]
```

### 35. 주사기와 압력 센서를 고무관으로 잇기

syringe의 vol·amount로 눈금과 피스톤 위치를, gas로 안의 기체 색을. hose의 to를 주사기 id로 주면 주사기 끝에 이어진다.

```json
[{"t": "sensor", "id": "ps", "kind": "pressure", "x": 120, "y": 170},
 {"t": "syringe", "id": "sy", "x": 215, "y": 205, "tilt": 90, "vol": "50 mL", "amount": "40 mL", "gas": "#eef3f8"},
 {"t": "hose", "from": "ps", "to": "sy", "points": [[135, 205]]},
 {"t": "device", "x": 395, "y": 70, "s": 0.75, "link": "ps", "title": "압력 (kPa)", "graph": "live"}]
```
