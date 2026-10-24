#!/usr/bin/env python3
"""(관리자용) assets/light.html + assets/labkit.js 로 assets/template.html 을 다시 만든다.
입체 보기 엔진(assets/labkit3d.js)은 template.html에 넣지 않는다 ('3D' 버튼을 누를 때 불러온다. 넣으려면 build_html.py --3d).
그래서 여기서는 두 엔진의 버전이 같은지만 확인한다.

light.html  : 그림 엔진을 CDN(jsDelivr)에서 불러오는 가벼운 HTML
template.html: 그림 엔진을 파일 안에 그대로 넣은 한 파일짜리 HTML (인터넷 없이도 동작)
labkit.js 를 고친 뒤에는 이 스크립트를 실행해 template.html 을 맞춰 준다.
"""
import re
import sys
from pathlib import Path

for s in (sys.stdout, sys.stderr):
    try:
        s.reconfigure(encoding="utf-8")
    except Exception:
        pass
root = Path(__file__).resolve().parent.parent
light = (root / "assets" / "light.html").read_text(encoding="utf-8")
engine = (root / "assets" / "labkit.js").read_text(encoding="utf-8")
if re.search(r"</script", engine, re.I):
    sys.exit("labkit.js 안에 </script 문자열이 있어 인라인할 수 없습니다.")
head = re.search(r"LabKit v(\d+\.\d+\.\d+)", engine)
ver = re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", engine)
if not head or not ver or head.group(1) != ver.group(1):
    sys.exit("labkit.js 첫 줄 머리말의 버전과 VERSION 값이 다릅니다. 둘을 같게 고치세요.")
engine3d = (root / "assets" / "labkit3d.js").read_text(encoding="utf-8")
head3 = re.search(r"LabKit3D v(\d+\.\d+\.\d+)", engine3d)
ver3 = re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", engine3d)
if not head3 or not ver3 or {head3.group(1), ver3.group(1)} != {ver.group(1)}:
    sys.exit(f"labkit3d.js의 첫 줄 머리말·VERSION을 labkit.js와 같은 {ver.group(1)}로 고치세요 (입체 엔진은 같은 버전 주소에서 불러온다).")
if re.search(r"</script", engine3d, re.I):
    sys.exit("labkit3d.js 안에 </script 문자열이 있어 --3d로 넣을 수 없습니다.")
pat = re.compile(r'<script src="[^"]*labkit(?:\.min)?\.js"[^\n]*</script>')
if not pat.search(light):
    sys.exit("light.html 에서 labkit 스크립트 태그를 찾지 못했습니다.")
out = pat.sub(lambda m: "<script>\n" + engine.rstrip() + "\n</script>", light, count=1)
(root / "assets" / "template.html").write_text(out, encoding="utf-8")
print(f"assets/template.html 갱신 (LabKit v{ver.group(1)}, {len(out):,} chars)")
