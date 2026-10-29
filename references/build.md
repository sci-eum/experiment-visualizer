# 만들기·점검 도구 (환경별 방법)

SKILL.md 6·7·9장에서 연다. 할 수 있는 방법 중 **위에 있는 것**을 쓴다.

| 환경 | 방법 |
|---|---|
| 스킬 폴더가 있다 (Claude 스킬 설치, Claude Code, 저장소 복제) | **A** |
| 코드 실행은 되지만 스킬 폴더가 없다 (링크로 받음) | **B** 도구를 내려받아 A와 같이 |
| 코드 실행이 안 되거나 내려받기가 막혔다 | **C** 가벼운 HTML 틀 |

## 방법 A — 스킬 폴더의 도구

```bash
python scripts/extract_text.py 실험지.hwp --images 그림폴더   # hwp·hwpx·docx·pptx 글자와 그림 꺼내기
python scripts/check_data.py experiment.json                  # 데이터 검사 (오류를 모두 고친 뒤 만든다)
python scripts/build_html.py experiment.json 실험제목.html     # 인터넷 없이도 열리는 한 파일
python scripts/build_html.py experiment.json 실험제목.html --light   # 가벼운 버전 (엔진을 인터넷에서 불러옴)
python scripts/build_html.py experiment.json 실험제목.html --3d      # 입체 보기 엔진까지 넣은 한 파일 (인터넷 없이 3D까지, 약 90 KB 더)
python scripts/check_render.py 실험제목.html --shots 그림점검 --3d   # 그림 점검 (입체 보기까지)
python scripts/extract_data.py 결과.html experiment.json      # 이미 만든 HTML에서 데이터 꺼내기
```

## 방법 B — 도구 내려받기

스킬과 같은 고정 배포판(`@1.27.0`)에서 도구를 `ev` 폴더로 내려받는다. 그러면 방법 A의 명령을 `ev/`를 붙여 그대로 쓴다 (`python ev/scripts/build_html.py experiment.json 실험제목.html`).

```python
import pathlib, urllib.request
BASES = ["https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1.27.0/",            # 이 문서와 같은 배포판
         "https://raw.githubusercontent.com/sci-eum/experiment-visualizer/v1.27.0/"]  # 막히면 저장소 원본
FILES = ["scripts/build_html.py", "scripts/check_data.py", "scripts/extract_text.py", "scripts/extract_data.py",
         "scripts/check_render.py", "assets/template.html", "assets/light.html", "assets/labkit3d.js", "references/parts.json"]
downloaded = {}
for f in FILES:
    for base in BASES:
        try:
            data = urllib.request.urlopen(base + f, timeout=30).read(); break
        except Exception as e:
            print("실패:", base + f, e)
    else:
        raise SystemExit("내려받지 못했어요: " + f)
    downloaded[f] = data
# 모두 같은 고정 버전으로 내려받은 뒤에만 파일을 쓴다.
for f, data in downloaded.items():
    p = pathlib.Path("ev") / f
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
print("ev 폴더 준비 완료 (v1.27.0)")
```

- `build_html.py`가 만든 한 파일 버전은 그림 엔진이 HTML 안에 들어가 **인터넷 없이도** 열린다.
- 장면의 **3D** 버튼(입체 보기)은 누를 때 입체 엔진(`labkit3d.js`)을 그림 엔진과 같은 버전 주소에서 불러온다. 인터넷이 없는 교실에서 3D까지 쓰려면 `--3d`로 만든다 (가벼운 버전에는 쓰지 않는다). `--3d`로 만든 HTML을 다시 넣으면 3D를 넣은 채로 다시 만든다.
- 데이터를 고치지 않고 엔진만 새로 하려면 결과 HTML을 그대로 넣는다: `python scripts/build_html.py 옛결과.html 새결과.html` (가벼운 버전은 가벼운 버전으로 만든다).

## 방법 C — 가벼운 HTML 틀

코드 실행이 안 되면 아래 틀에서 `window.EXPERIMENT = …;` 부분만 데이터로 바꿔 HTML 파일(또는 HTML 아티팩트)로 낸다. 그림 엔진은 열 때 인터넷(jsDelivr `@1.27.0`)에서 불러온다.

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
<script src="https://cdn.jsdelivr.net/gh/sci-eum/experiment-visualizer@1.27.0/assets/labkit.min.js" onerror="document.getElementById('app').innerHTML='<p style=&quot;max-width:640px;margin:48px auto;padding:24px;border-radius:16px;background:#fff;line-height:1.7;font-family:sans-serif&quot;>그림 엔진을 불러오지 못했어요. 인터넷에 연결된 상태에서 이 HTML 파일을 크롬·엣지 같은 브라우저로 열어 주세요.</p>'"></script>
</body>
</html>
```

- 코드 실행이 안 되면 검사기도 못 돌린다. JSON 문법, `_demo`, id 중복, 용량·양, `origin`을 눈으로 확인한다.
- 채팅 화면 미리보기에서 외부 스크립트가 막혀 그림이 안 보일 수 있다. 그때는 **파일을 내려받아 브라우저로 열면 보인다**고 안내한다.
- "인터넷 없이 열리는 한 파일"이 꼭 필요한데 코드 실행이 안 되면 `assets/template.html`을 통째로 복사해 데이터 부분만 바꾼다. 매우 길어 출력이 끊길 수 있으니 가능하면 방법 A·B를 쓴다.

## 그림 점검 (`check_render.py`)

Edge나 Chrome이 있는 환경(Claude Code 등)에서는 반드시 실행한다.

```bash
python scripts/check_render.py 결과.html --shots 그림점검 --3d
```

1. **FAIL**(스크립트 오류·빈 화면)과 `[LabKit]` 경고를 고친다. 경고는 단계 번호와 함께 없는 id, 장면 밖 좌표, 위쪽 잘림, 읽지 못한 부피, 넣은 양 > 용량, `vol` 그릇들의 제각각인 `s`, 남은 `_demo`, 알 수 없는 부품, 잘못된 이어받기를 알려 준다. `--3d`를 붙이면 `3D OK/WARN/FAIL` 줄이 더 나온다 (입체 오류·그림 카드 실패·화면 밖으로 나간 묶음).
2. `그림점검/<파일 이름>/overview.png`(모든 장면 한 장)를 **열어서 본다**. 어색한 단계는 `step-03.png`처럼 크게 본다 (결과 보기가 있으면 `step-03-result.png`도 생긴다). 원문 장치와 맞는지, 잘리거나 떠 있지 않은지, 크기 비율, 이름표·말풍선이 장치를 가리지 않는지 본다.
3. **WARN**(`[LabKit] 겹침?`)은 그림에 빨갛게 표시된다. 실제로 가리면 x·y를 옮기고, 일부러 넣은 것이면 `in`·`on`·`over`로 이어 준다.
4. 좌표를 고칠 때는 `--grid`(20 간격 격자)를 붙인다. 고친 뒤 같은 명령으로 다시 확인한다.
5. `--3d`면 `3d-overview.png`(모든 단계를 비스듬히 본 입체 그림)도 생긴다. 그릇과 자주 쓰는 기구는 2D 장면의 자리·크기 그대로 입체로 빚고(유리, 액체 높이·색·층), 나머지는 2D 그림을 카드로 세운 것이라 2D가 바르면 대개 바르다. 액체 높이·색이 2D와 같은지, 그릇 안에 넣은 것(`in`)이 그릇 안에 보이는지 본다. 한 장치가 어긋나 보이면 `in`·`on`·`hold`로 이어 준다. 2D에서 일부러 앞뒤로 겹쳐 그린 두 장치가 입체에서 한데 붙어 보이면 한쪽에 `z`(앞 +, 뒤 −)를 준다 (2D는 그대로). 어떤 부품이 입체로 보이는지는 parts.md '입체(3D) 보기'에 있다.

- 브라우저 찾기: Chrome을 먼저, 없으면 Edge를 쓴다. 특정 브라우저를 쓰려면 환경 변수 `CHECK_RENDER_BROWSER`에 실행 파일 경로를 준다. `--strict`는 경고도 실패로 친다.
- 가벼운 버전은 스킬 폴더의 `assets/labkit.js`가 있으면 그 엔진으로 연다 (스킬과 같은 판으로 점검). 결과 줄에 `엔진 v1.19.0 내 폴더`처럼 쓴 엔진이 나온다. 인터넷 엔진 그대로 보려면 `--engine online`, 다른 엔진 파일은 `--engine 경로`.
- 브라우저로만 열 수 있으면 주소 끝에 `?check`(겹침 표시)·`?grid`(격자)를 붙이고 콘솔의 `[LabKit]` 경고를 본다. 코드 실행도 브라우저도 없으면 SKILL.md 7장 목록을 데이터로 꼼꼼히 확인한다.
- `그림점검` 폴더는 확인용이라 사용자에게 건네지 않는다.

## 이미 만든 HTML에서 데이터 꺼내기

`/* ===== EXPERIMENT DATA START` 다음 줄부터 `/* ===== EXPERIMENT DATA END` 앞까지의 `window.EXPERIMENT = {…};`가 데이터다. `extract_data.py`는 표시가 없는 HTML도 `window.EXPERIMENT = …`를 찾아 꺼낸다. `check_data.py`에 HTML을 바로 넣어 검사할 수도 있다.

- 코드 실행이 안 되면 데이터 블록 안만 고쳐 HTML 전체를 그대로 다시 낸다. 블록 밖은 한 글자도 바꾸지 않는다 (한 파일 버전은 매우 길어 출력이 끊길 수 있으니, 가능하면 코드 실행이 되는 곳에서 고친다).
