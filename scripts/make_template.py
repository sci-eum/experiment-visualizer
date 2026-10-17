#!/usr/bin/env python3
"""(관리자용) assets/light.html + assets/labkit.js 로 assets/template.html 을 다시 만든다.

light.html  : 그림 엔진을 CDN(jsDelivr)에서 불러오는 가벼운 HTML
template.html: 그림 엔진을 파일 안에 그대로 넣은 한 파일짜리 HTML (인터넷 없이도 동작)
labkit.js 를 고친 뒤에는 이 스크립트를 실행해 template.html 을 맞춰 준다.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
light = (root / "assets" / "light.html").read_text(encoding="utf-8")
engine = (root / "assets" / "labkit.js").read_text(encoding="utf-8")
if re.search(r"</script", engine, re.I):
    sys.exit("labkit.js 안에 </script 문자열이 있어 인라인할 수 없습니다.")
pat = re.compile(r'<script src="[^"]*labkit(?:\.min)?\.js"[^\n]*</script>')
if not pat.search(light):
    sys.exit("light.html 에서 labkit 스크립트 태그를 찾지 못했습니다.")
out = pat.sub(lambda m: "<script>\n" + engine.rstrip() + "\n</script>", light, count=1)
(root / "assets" / "template.html").write_text(out, encoding="utf-8")
print(f"assets/template.html 갱신 ({len(out):,} chars)")
