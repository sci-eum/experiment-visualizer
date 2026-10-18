#!/usr/bin/env python3
"""(관리자용) Claude에 올릴 스킬 zip(dist/experiment-visualizer.zip)을 만든다.

zip 안 구조:  experiment-visualizer/SKILL.md, assets/, scripts/
claude.ai → 설정 → 기능(Capabilities) → 스킬 → 스킬 업로드 에서 이 zip을 올린다.
"""
import sys
import zipfile
from pathlib import Path

for s in (sys.stdout, sys.stderr):
    try:
        s.reconfigure(encoding="utf-8")
    except Exception:
        pass
root = Path(__file__).resolve().parent.parent
files = ["SKILL.md", "LICENSE", "assets/template.html", "assets/light.html", "assets/labkit.js",
         "scripts/build_html.py", "scripts/extract_text.py", "scripts/check_render.py"]
out = root / "dist" / "experiment-visualizer.zip"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(root / f, f"experiment-visualizer/{f}")
print(f"완성: {out.relative_to(root)} ({out.stat().st_size:,} bytes)")
