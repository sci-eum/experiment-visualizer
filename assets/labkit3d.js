/*! experiment-visualizer LabKit3D v1.33.0 | MIT License | https://github.com/sci-eum/experiment-visualizer */
/* 실험 장면을 입체(WebGL)로 보여 준다. 외부 라이브러리 없이 WebGL만 쓴다 (인터넷 없이 여는 한 파일 버전에도 넣을 수 있게).
   - 그릇 13종(비커·플라스크·시험관 …)은 그림 엔진의 윤곽선을 돌려 빚은 유리와, 높이·색·층이 맞는 액체로 (v1.20)
   - 자주 쓰는 기구(삼발이·알코올램프·스탠드·가열판·시험관대·저울 …)는 상자·원기둥으로 빚는다 (v1.20)
   - 나머지 기구는 2D 그림을 카드로 세운다. 불꽃·눈금·거품처럼 얹히는 것은 그 부품의 덧그림 카드로 (v1.19)
   - 방울·기포·김·불꽃·젓기는 2D 정지 그림의 표시(data-fx)로 떼어 낸 조각 카드를 2D와 같은 규칙으로 움직이고, 흔드는 그릇은 통째로 돌린다 (v1.25)
   - 시연(o.from): 시작 장면도 세워 같은 부품끼리 짝짓고, 액체 높이·색·자리를 끝 장면으로 바꾸며 새 부품은 나타나고 빠진 부품은 흐려진다 (v1.26)
   그림 엔진이 '3D' 버튼을 누를 때 불러와 LabKit3D.open(창, { items, title, bench })을 부른다. */
(function () {
'use strict';
const VERSION = '1.33.0'; // labkit.js의 VERSION·첫 줄 머리말과 같게 고친다
const FONT = '"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
const SVGNS = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;
const FOV = 30 * DEG; // 세로 시야각
// 시점: az(좌우로 돈 각도), el(내려다보는 각도). front는 2D 그림과 거의 같은 모습
const VIEWS = { front: { az: 0, el: 5 }, angle: { az: -30, el: 18 }, top: { az: 0, el: 42 } };
// 설명 부품(말풍선·화살표·글자 등)은 기구 바로 앞에 두고 늘 기구 위에 그린다 (2D처럼 가리지 않게)
const OVERLAY = new Set(['note', 'text', 'view', 'zoom', 'label', 'mark', 'eye', 'arrow', 'heat', 'current']);
// 입체 장면에서 카메라를 따라 돌지 않고 앞을 보는 카드: 두 기구를 잇는 것(광선·냉각기), 붓는 장면 (돌리면 끝이 어긋나지 않게)
const FIXED = new Set(['hose', 'wire', 'tubing', 'pour', 'condenser', 'ray']);
const MAX_TEX = 2048;
const L = [.36, .82, .45], LN = Math.hypot(...L), LIGHT = L.map(v => v / LN);
const GLASS = '#e2effa', INK = '#56617a', METAL = '#b0b7c4', DARK = '#444b5d';

const CSS = `.v3-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none}
.v3-cv.drag{cursor:grabbing}
.v3-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.v3-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.v3-tag{position:absolute;left:0;top:0;white-space:nowrap;padding:4px 10px;border-radius:999px;background:#fff;color:#2b3040;font-size:13px;font-weight:700;line-height:1.3;box-shadow:0 1px 2px rgba(29,33,48,.08),0 4px 10px -4px rgba(29,33,48,.2)}
.v3-tag.hot{background:#ffedef;color:#c7323f}.v3-tag.arrow{background:#fbf4ff;color:#7d2ba6}
.v3-pk{filter:drop-shadow(0 0 5px rgba(177,77,224,.55))}
.v3-tag.sec{background:#f6edff;color:#6b2a99;font-size:12.5px;padding:3px 9px;box-shadow:0 0 0 1.5px #d9b3f3}
.v3-ctl{position:absolute;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100% - 24px)}
.v3-ctl button{appearance:none;border:0;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700;line-height:1.2;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.95);color:#1d2130;box-shadow:0 1px 2px rgba(29,33,48,.06),0 2px 8px rgba(29,33,48,.1)}
.v3-ctl button[aria-pressed=true]{background:#d070fb;color:#fff}
.v3-ctl button:focus-visible{outline:3px solid #e6b8fd;outline-offset:2px}
.v3-ctl .v3-sep{width:6px}
.v3-hint{position:absolute;right:14px;bottom:14px;margin:0;max-width:42%;text-align:right;font-size:12.5px;line-height:1.5;color:#7f8698;pointer-events:none}
.v3-load{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.92);font-size:13px;font-weight:700;color:#4b5265;pointer-events:none}
.v3-load[hidden]{display:none}
.v3-hint[hidden]{display:none}
.v3-inline .v3-ctl{left:8px;bottom:8px;gap:4px}.v3-inline .v3-ctl button{padding:6px 9px;font-size:12px;border-radius:8px}
@media(max-width:700px){.v3-hint{display:none}}
.lk3-shots{display:grid;gap:16px;padding:16px;width:max-content;background:#fff}
.lk3-shot b{display:block;height:30px;line-height:30px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lk3-shot .v3-stage{position:relative;margin:0;border-radius:0;box-shadow:none;outline:1px solid #e4d9f1;background:linear-gradient(#ffffff,#f4eefc)}
.lk3-shot img{position:absolute;inset:0;width:100%;height:100%}`;
function injectCss() {
  if (document.getElementById('lk3d-css')) return;
  const st = document.createElement('style'); st.id = 'lk3d-css'; st.textContent = CSS; document.head.appendChild(st);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const warn = msg => console.warn('[LabKit] 입체: ' + msg);
const hex = h => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return [.8, .8, .8]; let v = m[1]; if (v.length === 3) v = v.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// 그림 엔진과 같은 난수 (접시 속 씨앗·결정을 2D와 같은 자리에)
/* ---------- 움직이는 조각 (v1.25) ---------- */
// 2D 아핀 [a,b,c,d,e,f]: x' = a x + c y + e, y' = b x + d y + f (SVG matrix와 같은 순서)
const aMul = (P, Q) => [P[0] * Q[0] + P[2] * Q[1], P[1] * Q[0] + P[3] * Q[1], P[0] * Q[2] + P[2] * Q[3], P[1] * Q[2] + P[3] * Q[3], P[0] * Q[4] + P[2] * Q[5] + P[4], P[1] * Q[4] + P[3] * Q[5] + P[5]];
const aInv = P => { const k = P[0] * P[3] - P[1] * P[2] || 1e-9; return [P[3] / k, -P[1] / k, -P[2] / k, P[0] / k, (P[2] * P[5] - P[3] * P[4]) / k, (P[1] * P[4] - P[0] * P[5]) / k]; };
const aT = (x, y) => [1, 0, 0, 1, x, y], aS = (x, y) => [x, 0, 0, y, 0, 0], aR = deg => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; };
const A1 = [1, 0, 0, 1, 0, 0];
const frac = v => v - Math.floor(v);
const keys = (p, ks) => { for (let i = 1; i < ks.length; i++) if (p <= ks[i][0]) { const [t0, v0] = ks[i - 1], [t1, v1] = ks[i]; return v0 + (v1 - v0) * (p - t0) / ((t1 - t0) || 1); } return ks[ks.length - 1][1]; };
// 조각의 t초 모습: 조각 자기 좌표에서의 움직임(A)과 불투명도(a). labkit.js의 SMIL 움직임과 같은 값을 쓴다 (data-fx-d)
function fxAt(f, t) {
  const d = f.fd;
  switch (f.fk) {
    case 'rise': case 'fall': { // 기포(cy가 오름)·방울과 가루(떨어짐): [시작 y, 끝 y, 주기, 시작 시각, 정지 그림의 y, 흐려지기]
      const p = frac((t - (d[3] || 0)) / (d[2] || 1)), al = !d[5] ? 1 : f.fk === 'rise' ? keys(p, [[0, 0], [.15, 1], [.8, 1], [1, 0]]) : keys(p, [[0, 1], [.85, 1], [1, 0]]);
      return { A: aT(0, d[0] + (d[1] - d[0]) * p - d[4]), a: f.a0 * al };
    }
    case 'steam': { const p = frac((t - (d[1] || 0)) / (d[0] || 2.4)); return { A: aT(0, 6 - 16 * p), a: keys(p, [[0, 0], [.5, .85], [1, 0]]) }; } // 김: 오르며 나타났다 사라짐
    case 'flame': { const p = frac(t / (d[0] || .9)); return { A: aS(keys(p, [[0, 1], [1 / 3, d[1]], [2 / 3, d[3]], [1, 1]]), keys(p, [[0, 1], [1 / 3, d[2]], [2 / 3, d[4]], [1, 1]])), a: f.a0 }; } // 불꽃: 아래 끝을 축으로
    case 'spin': { const p = frac(t / (d[0] || .45)); return { A: aS(keys(p, [[0, 1], [.5, .18], [1, 1]]), 1), a: f.a0 }; } // 젓개: 도는 모습
    case 'stir': { const p = frac(t / (d[2] || 1.2)), g = keys(p, [[0, -d[3]], [.5, d[3]], [1, -d[3]]]); return { A: aMul(aT(d[0], d[1]), aMul(aR(g), aT(-d[0], -d[1]))), a: f.a0 }; } // 젓는 막대
    case 'glow': { const p = frac(t / (d[0] || 1.4)); return { A: A1, a: keys(p, [[0, d[1]], [.5, d[2]], [1, d[1]]]) }; } // 불씨의 빛
  }
  return { A: A1, a: f.a0 };
}
const ease3 = t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const TW_DROP3 = new Set(['dropper', 'pipette', 'glasspipette', 'micropipette', 'spatula', 'spoon', 'rod', 'splint', 'swab', 'capillary', 'tweezers', 'thermometer', 'meter', 'syringe', 'pour', 'filler']); // 시연에서 위에서 내려오며 나타나는 동작 부품 (labkit.js TW_DROP과 같다)
const minY = v => { let m = Infinity; for (let i = 1; i < v.length; i += 9) m = Math.min(m, v[i]); return m; }; // 정점 배열(9칸씩)의 가장 낮은 높이
function rng(seed) { let s = Math.abs(Math.floor(seed)) % 2147483646 + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }

/* ---------- 행렬 (열 우선, WebGL과 같은 순서) ---------- */
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}
const ID = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const mT = (x, y, z) => { const m = ID(); m[12] = x; m[13] = y; m[14] = z; return m; };
const mS = (x, y = x, z = x) => { const m = ID(); m[0] = x; m[5] = y; m[10] = z; return m; };
const mRz = a => { const m = ID(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
const mRy = a => { const m = ID(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const chain = (...ms) => ms.reduce((a, b) => mul(a, b));
function inv(m) { // 4×4 역행렬
  const a = m, o = new Float32Array(16);
  o[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  o[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  o[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  o[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  o[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  o[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  o[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  o[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  o[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  o[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  o[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  o[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  o[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  o[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  o[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  o[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  const det = a[0] * o[0] + a[1] * o[4] + a[2] * o[8] + a[3] * o[12];
  return o.map(v => v / (det || 1));
}
function persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
function lookAt(e, c) {
  let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]], l = Math.hypot(...z); z = z.map(v => v / l);
  let x = [z[2], 0, -z[0]]; l = Math.hypot(...x) || 1; x = x.map(v => v / l); // 위쪽(0,1,0)과 z의 외적
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]], d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, e), -d(y, e), -d(z, e), 1]);
}
// 카드: 축(px,py,pz)을 세로로 th만큼 돌리고(카메라 쪽으로), 축에서 ox만큼 옆에 두고, 아래 모서리를 축으로 lean만큼 뒤로 눕힌다
function cardMat(px, py, pz, th, lean, w, h, ox = 0) {
  const cs = Math.cos(th), sn = Math.sin(th), cl = Math.cos(lean), sl = Math.sin(lean);
  return new Float32Array([w * cs, 0, -w * sn, 0, -h * sl * sn, h * cl, -h * sl * cs, 0, cl * sn, sl, cl * cs, 0, px + ox * cs, py, pz - ox * sn, 1]);
}
function apply(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }

/* ---------- 모양 빚기: 정점마다 [위치 3, 법선 3, 색 3]을 world 좌표로 쌓는다 ---------- */
function put(out, M, p, n, c) {
  const q = apply(M, p[0], p[1], p[2]);
  let nx = M[0] * n[0] + M[4] * n[1] + M[8] * n[2], ny = M[1] * n[0] + M[5] * n[1] + M[9] * n[2], nz = M[2] * n[0] + M[6] * n[1] + M[10] * n[2];
  const l = Math.hypot(nx, ny, nz) || 1;
  out.push(q[0], q[1], q[2], nx / l, ny / l, nz / l, c[0], c[1], c[2]);
}
// 윤곽 P = [[반지름, 높이] …](아래 → 위)를 세로축으로 돌린 면. 밖에서 보면 반시계 방향 (뒷면 거르기가 맞게)
function lathe(out, M, P, col, seg = 40) {
  const c = typeof col === 'string' ? hex(col) : col || [0, 0, 0], n = P.length;
  if (n < 2) return;
  const sn = []; for (let i = 0; i < n - 1; i++) { const dr = P[i + 1][0] - P[i][0], dh = P[i + 1][1] - P[i][1], l = Math.hypot(dr, dh) || 1; sn.push([dh / l, -dr / l]); }
  const vn = (i, s) => { const a = sn[s], b = s === i ? sn[i - 1] : sn[i]; if (!b) return a; const d = a[0] * b[0] + a[1] * b[1]; if (d < .7) return a; const r = a[0] + b[0], h = a[1] + b[1], l = Math.hypot(r, h) || 1; return [r / l, h / l]; };
  for (let i = 0; i < n - 1; i++) {
    const n0 = vn(i, i), n1 = vn(i + 1, i), [r0, h0] = P[i], [r1, h1] = P[i + 1];
    if (r0 < 1e-4 && r1 < 1e-4) continue;
    for (let j = 0; j < seg; j++) {
      const t0 = j / seg * 2 * Math.PI, t1 = (j + 1) / seg * 2 * Math.PI, c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      const a = [[r0 * c0, h0, r0 * s0], [n0[0] * c0, n0[1], n0[0] * s0]], b = [[r0 * c1, h0, r0 * s1], [n0[0] * c1, n0[1], n0[0] * s1]];
      const cc = [[r1 * c1, h1, r1 * s1], [n1[0] * c1, n1[1], n1[0] * s1]], d = [[r1 * c0, h1, r1 * s0], [n1[0] * c0, n1[1], n1[0] * s0]];
      [a, d, cc, a, cc, b].forEach(v => put(out, M, v[0], v[1], c));
    }
  }
}
// 상자: 면마다 밖에서 보면 반시계 방향. sides에서 뺀 면은 만들지 않는다 (t 위, b 아래, f 앞, k 뒤, l 왼, r 오른)
function box(out, M, x0, x1, y0, y1, z0, z1, col, sides = 'tbfklr') {
  const c = typeof col === 'string' ? hex(col) : col, f = (n, ...v) => { [0, 1, 2, 0, 2, 3].forEach(i => put(out, M, v[i], n, c)); };
  if (sides.includes('t')) f([0, 1, 0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  if (sides.includes('b')) f([0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  if (sides.includes('f')) f([0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  if (sides.includes('k')) f([0, 0, -1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  if (sides.includes('l')) f([-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  if (sides.includes('r')) f([1, 0, 0], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
}
// 두 점을 잇는 원기둥(원뿔대). caps면 양 끝을 막는다
function tube(out, M, p0, p1, r0, r1 = r0, col, seg = 16, caps = true) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], len = Math.hypot(...d) || 1, y = d.map(v => v / len);
  let u = Math.abs(y[1]) < .9 ? [y[2], 0, -y[0]] : [1, 0, 0]; const ul = Math.hypot(...u); u = u.map(v => v / ul);
  const w = [u[1] * y[2] - u[2] * y[1], u[2] * y[0] - u[0] * y[2], u[0] * y[1] - u[1] * y[0]];
  const B = new Float32Array([u[0], u[1], u[2], 0, y[0], y[1], y[2], 0, w[0], w[1], w[2], 0, p0[0], p0[1], p0[2], 1]);
  lathe(out, mul(M, B), caps ? [[0, 0], [r0, 0], [r1, len], [0, len]] : [[r0, 0], [r1, len]], col, seg);
}
// 볼록한 다각형 면: center에서 바깥쪽을 보게 순서를 맞춰 부채꼴로 쌓는다 (빗면·레일 같은 기둥꼴)
function poly(out, M, pts, col, center) {
  const c = typeof col === 'string' ? hex(col) : col, [a, b, d] = pts, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const m = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
  if (center && n[0] * (m[0] - center[0]) + n[1] * (m[1] - center[1]) + n[2] * (m[2] - center[2]) < 0) { pts = pts.slice().reverse(); n = n.map(x => -x); }
  for (let i = 1; i < pts.length - 1; i++) [pts[0], pts[i], pts[i + 1]].forEach(p => put(out, M, p, n, c));
}
// 앞면 꼴(xy 평면의 볼록 다각형)을 z0~z1로 늘인 기둥
function prism(out, M, shape, z0, z1, col) {
  const cx = shape.reduce((s, p) => s + p[0], 0) / shape.length, cy = shape.reduce((s, p) => s + p[1], 0) / shape.length, C = [cx, cy, (z0 + z1) / 2];
  poly(out, M, shape.map(p => [p[0], p[1], z1]), col, C); poly(out, M, shape.map(p => [p[0], p[1], z0]), col, C);
  shape.forEach((p, i) => { const q = shape[(i + 1) % shape.length]; poly(out, M, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], col, C); });
}
function sphere(out, M, c, r, col, seg = 18) {
  const P = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; P.push([r * Math.sin(a), -r * Math.cos(a)]); }
  lathe(out, mul(M, mT(c[0], c[1], c[2])), P, col, seg);
}
// SVG 경로 → 오른쪽 절반 윤곽 [[반지름, 높이] …] (아래 → 위). 그림 엔진의 그릇 윤곽을 그대로 돌려 빚는다
const PROFILES = new Map();
function profileOf(d, host) {
  if (PROFILES.has(d)) return PROFILES.get(d);
  const path = document.createElementNS(SVGNS, 'path'); path.setAttribute('d', d); host.appendChild(path);
  let pts = [];
  try { const len = path.getTotalLength(), n = Math.max(80, Math.ceil(len / 1.2)); for (let i = 0; i <= n; i++) { const q = path.getPointAtLength(len * i / n); pts.push([q.x, q.y]); } } finally { path.remove(); }
  const k = pts.findIndex(q => q[0] < -.05); if (k > 0) pts = pts.slice(k).concat(pts.slice(0, k)); // 닫힌 경로는 왼쪽에서 시작하게
  let best = [], run = [];
  pts.forEach((q, i) => {
    if (q[0] >= -.05) { if (!run.length && i > 0) { const a = pts[i - 1], t = a[0] / (a[0] - q[0]); run.push([0, a[1] + (q[1] - a[1]) * t]); } run.push([Math.max(0, q[0]), q[1]]); }
    else if (run.length) { const a = pts[i - 1], t = a[0] / (a[0] - q[0]); run.push([0, a[1] + (q[1] - a[1]) * t]); if (run.length > best.length) best = run; run = []; }
  });
  if (run.length > best.length) best = run;
  let P = best.map(([x, y]) => [x, -y]);
  if (P.length && P[0][1] > P[P.length - 1][1]) P.reverse();
  // 곧은 곳은 점을 줄인다 (꺾임 2° 미만)
  const out = P.length ? [P[0]] : [];
  for (let i = 1; i < P.length - 1; i++) { const a = out[out.length - 1], b = P[i], c = P[i + 1], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]], cr = Math.abs(u[0] * v[1] - u[1] * v[0]) / ((Math.hypot(...u) * Math.hypot(...v)) || 1); if (cr > .035 || Math.hypot(...u) > 24) out.push(b); }
  if (P.length > 1) out.push(P[P.length - 1]);
  PROFILES.set(d, out);
  return out;
}
// 윤곽의 높이별 반지름 표 (액체 윗면이 그릇 안쪽인지 셰이더가 본다)
function radiusTable(P, n = 32) {
  const h0 = Math.min(...P.map(p => p[1])), h1 = Math.max(...P.map(p => p[1])), R = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const h = h0 + (h1 - h0) * k / (n - 1); let r = 0;
    for (let i = 0; i < P.length - 1; i++) { const [ra, ha] = P[i], [rb, hb] = P[i + 1]; if ((h - ha) * (h - hb) <= 0) r = Math.max(r, ha === hb ? Math.max(ra, rb) : ra + (rb - ra) * (h - ha) / (hb - ha)); }
    R[k] = r;
  }
  return { h0, h1, R };
}

/* ---------- WebGL 준비 ---------- */
const VS_TEX = 'attribute vec3 p;attribute vec2 q;uniform mat4 m;varying vec2 v;void main(){v=q;gl_Position=m*vec4(p,1.);}';
const FS_TEX = 'precision mediump float;uniform sampler2D t;uniform float a;varying vec2 v;void main(){gl_FragColor=texture2D(t,v)*a;}';
const VS_COL = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 m;varying vec3 vn;varying vec3 vc;varying vec3 vw;void main(){vn=n;vc=c;vw=p;gl_Position=m*vec4(p,1.);}';
// 단면 보기 (v1.30): X(자르는 면, 실험대 좌표) 앞쪽은 버리고, S가 켜지면 잘린 속(뒷면이 보이는 곳)을 빗금으로 칠한다
const FS_COL = 'precision mediump float;uniform vec3 L;uniform vec4 X;uniform float S;varying vec3 vn;varying vec3 vc;varying vec3 vw;void main(){if(dot(X.xyz,vw)+X.w>0.)discard;vec3 N=normalize(vn);'
  + 'if(!gl_FrontFacing){if(S>.5){float h=mod(gl_FragCoord.x+gl_FragCoord.y,7.)<1.8?.7:1.;gl_FragColor=vec4(mix(vc,vec3(1.),.32)*h,1.);return;}N=-N;}gl_FragColor=vec4(vc*(.72+.3*max(dot(N,L),0.)),1.);}';
// 유리: 가장자리(비스듬히 보이는 곳)는 2D 그림처럼 진한 선, 가운데는 거의 투명, 빛 반사 한 줄
const VS_SURF = 'attribute vec3 p;attribute vec3 n;uniform mat4 m;varying vec3 vp;varying vec3 vn;void main(){vp=p;vn=n;gl_Position=m*vec4(p,1.);}';
const FS_GLASS = 'precision mediump float;uniform vec3 E;uniform vec3 T;uniform float A;uniform float K;uniform vec3 L;uniform vec4 X;varying vec3 vp;varying vec3 vn;'
  + 'void main(){float cd=dot(X.xyz,vp)+X.w;if(cd>0.)discard;if(cd>-1.6){gl_FragColor=vec4(vec3(.337,.38,.478)*.95,.95);return;}vec3 N=normalize(vn);if(!gl_FrontFacing)N=-N;vec3 V=normalize(E-vp);float f=1.-abs(dot(N,V));float e=smoothstep(.6,.96,f)*K;'
  + 'float s=pow(max(dot(N,normalize(L+V)),0.),36.);vec3 c=mix(T,vec3(.337,.38,.478),e*.85)+s*.55;float a=clamp(mix(A,.92,e)+s*.45,0.,1.);gl_FragColor=vec4(c*a,a);}';
// 액체: 높이 lo~hi 사이만 칠한다 (기울인 그릇도 수면은 수평)
const FS_LIQ = 'precision mediump float;uniform vec3 C;uniform float A;uniform float lo;uniform float hi;uniform vec3 L;uniform vec4 X;uniform float S;varying vec3 vp;varying vec3 vn;'
  + 'void main(){if(vp.y>hi||vp.y<lo||dot(X.xyz,vp)+X.w>0.)discard;if(S>.5&&!gl_FrontFacing){float a=min(A+.3,1.);gl_FragColor=vec4(C*.95*a,a);return;}vec3 N=normalize(vn);if(!gl_FrontFacing)N=-N;gl_FragColor=vec4(C*(.8+.24*max(dot(N,L),0.))*A,A);}';
// 수면: 높이 hi의 수평면에서 그릇 안쪽(돌린 윤곽의 반지름 표, 또는 상자)만 남긴다
const VS_CAP = 'attribute vec3 p;uniform mat4 m;uniform float dy;varying vec3 vp;void main(){vec3 w=p+vec3(0.,dy,0.);vp=w;gl_Position=m*vec4(w,1.);}'; // dy: 시연 중 수면 높이
const FS_CAP = 'precision mediump float;uniform mat4 IM;uniform float R[32];uniform float h0;uniform float h1;uniform float bx;uniform vec2 hb;uniform vec3 C;uniform float A;uniform vec4 X;varying vec3 vp;'
  + 'void main(){if(dot(X.xyz,vp)+X.w>0.)discard;vec4 q=IM*vec4(vp,1.);if(q.y<h0||q.y>h1)discard;'
  + 'if(bx>.5){if(abs(q.x)>hb.x||abs(q.z)>hb.y)discard;}else{float t=(q.y-h0)/(h1-h0)*31.;float r=R[31];'
  + 'for(int i=0;i<31;i++){float a=float(i);if(t>=a&&t<a+1.)r=mix(R[i],R[i+1],t-a);}if(length(q.xz)>r)discard;}'
  + 'vec3 c=min(C*1.08+.05,1.);gl_FragColor=vec4(c*A,A);}';
function program(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('셰이더: ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('셰이더 연결: ' + gl.getProgramInfoLog(p));
  const at = {}, un = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const a = gl.getActiveAttrib(p, i); at[a.name] = gl.getAttribLocation(p, a.name); }
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const u = gl.getActiveUniform(p, i); un[u.name.replace('[0]', '')] = gl.getUniformLocation(p, u.name); }
  return { p, at, un };
}
function buffer(gl, data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW); return b; }
function texture(gl, src, gl2) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  const pot = v => (v & (v - 1)) === 0, mip = gl2 || (pot(src.width) && pot(src.height));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}
// 실험대 그림자 (가운데가 진하고 가장자리로 갈수록 사라지는 타원)
function shadowCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(70,50,110,.30)'); g.addColorStop(.55, 'rgba(70,50,110,.14)'); g.addColorStop(1, 'rgba(70,50,110,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
}

/* ---------- 실험대 (상판·서랍장) ---------- */
function room(x0, x1) {
  const v = [], D = 120, cab = -150, w = x1 - x0, M = ID();
  box(v, M, x0, x1, -12, 0, -D, D, '#f4eefb');                 // 상판
  box(v, M, x0, x1, -12, -10.5, -D, D + .4, '#e2d6f0', 'f');   // 상판 앞 모서리 띠
  box(v, M, x0 + 12, x1 - 12, cab, -12, -D + 10, D - 14, '#ebe4f4'); // 서랍장
  const n = Math.max(2, Math.round(w / 190)), dw = (w - 24) / n;
  for (let i = 0; i < n; i++) { // 문 사이 틈과 손잡이
    const a = x0 + 12 + i * dw;
    if (i) box(v, M, a - .8, a + .8, cab + 6, -18, D - 14, D - 13.4, '#d8cbe8', 'f');
    box(v, M, a + dw / 2 - 22, a + dw / 2 + 22, -34, -28, D - 14, D - 10, '#cbbbdf', 'tfb');
  }
  return v;
}

/* ---------- 입체로 빚는 부품 ----------
   b(부품, 빚개)로 부른다. 부품: { t, g(그림 엔진이 잰 자리·크기), p(데이터 속성), shape(그릇 이름) }
   빚개: M(부품 → 실험대 좌표), op(불투명 정점), glass(fn, 색, 투명도, 윤곽 진하기), liquid(…), col(색 이름 → #), front(덧그림을 붙일 앞면 깊이) */
const ring = (out, M, r0, r1, h0, h1, col, seg = 32) => lathe(out, M, [[r0, h0], [r1, h0], [r1, h1], [r0, h1], [r0, h0]], col, seg);
const BUILD = {
  tripod(d, b) {
    const { op, M } = b;
    [[-60, 1], [60, 1], [180, 1]].forEach(([a]) => { const s = Math.sin(a * DEG), c = Math.cos(a * DEG); tube(op, M, [41.6 * s, 94, 41.6 * c], [54 * s, 0, 54 * c], 2.1, 2.1, DARK, 10); });
    ring(op, M, 38, 44, 92, 98, DARK);
    if (d.p.gauze !== false) { box(op, M, -54, 54, 98, 103, -54, 54, '#cfd4dd'); box(op, M, -22, 22, 103, 103.6, -22, 22, '#f3f1ea', 't'); }
  },
  lamp(d, b) {
    const body = [[0, 0], [26, 0], [29.5, 1], [30, 4], [30.4, 14], [28.5, 23], [23, 30.5], [15, 35], [0, 35]];
    b.glass(o => lathe(o, b.M, body), GLASS, .16);
    b.liquid(body.map(([r, h]) => [Math.max(0, r - .6), Math.max(h, .6)]), [{ hi: 17, color: b.col(d.p.color, '#f3e4a2'), alpha: .85 }]); // 바닥을 실험대 면에서 조금 띄운다 (단면에서 겹쳐 깜빡이지 않게)
    tube(b.op, b.M, [0, 34, 0], [0, 44, 0], 9, 9, METAL, 20); tube(b.op, b.M, [0, 27, 0], [0, 35, 0], 4.6, 4.6, METAL, 16); tube(b.op, b.M, [0, 43, 0], [0, 52, 0], 3, 3, '#f4efe2', 12);
    tube(b.op, b.M, [0, 2.5, 0], [0, 44, 0], 2.3, 2.3, '#ece3cc', 12); // 몸통 속의 심지 (알코올에 잠겨 빨아올린다)
    if (d.p.lit === false) b.glass(o => lathe(o, b.M, [[12, 40], [12, 58], [10, 63.5], [6, 65.5], [0, 66]]), GLASS, .2);
    b.sec.push({ t: '심지', y: 22, r: -2 }, { t: '심지 꽂이', y: 39, r: 9 }, { t: '알코올', y: 8, r: 17 });
    if (d.p.lit === false) b.sec.push({ t: '뚜껑', y: 62, r: -10 });
  },
  gasburner(d, b) {
    const { op, M } = b;
    box(op, M, -30, 30, 0, 9, -24, 24, DARK);
    ring(op, M, 4.2, 6, 9, 21, METAL, 24); ring(op, M, 4.2, 6, 28, 64, METAL, 24); // 속이 빈 관: 아래와 위 사이(고리 안)로 공기가 들어온다
    ring(op, M, 6.3, 8.5, 19, 30, '#c9ced8', 24);                                    // 공기를 조절하는 고리
    [0, 90, 180, 270].forEach(a => { const c = Math.cos(a * DEG), n = Math.sin(a * DEG); tube(op, M, [8.2 * n, 24.5, 8.2 * c], [8.8 * n, 24.5, 8.8 * c], 2.4, 2.4, DARK, 10); }); // 공기 구멍
    tube(op, M, [0, 9, 0], [0, 23, 0], 2.4, 1.1, '#c8a24a', 12); tube(op, M, [0, 15, 0], [6, 15, 0], 1.5, 1.5, '#c8a24a', 8); // 가스가 나오는 곳과 가스 길
    box(op, M, 6, 32, 12, 18, -3, 3, METAL); tube(op, M, [30, 15, 0], [46, 15, 0], 3, 3, '#e39a52', 10);
    b.sec.push({ t: d.t === 'bunsen' ? '공기 조절 고리' : '공기 조절 나사', y: 27, r: 8.5 }, { t: '공기가 들어오는 곳', y: 24.5, r: -5 }, { t: '가스가 나오는 곳', y: 20, r: 0 }, { t: '가스와 공기가 섞여 오르는 관', y: 48, r: -5 }, { t: '가스가 들어오는 곳', at: [44, 15, 0] });
  },
  stand(d, b) { // 막대와 받침은 잡은 기구보다 뒤(RZ)에 두고, 팔이 비스듬히 앞으로 나와 기구를 잡는다. 받침 자리에 수조처럼 큰 것이 있으면 그 뒤로
    const { op, M } = b, g = d.g, gx = g.x, gy = g.y, RZ = -Math.max(26, b.deepAt(gx - 46, gx + 58) + 30);
    box(op, M, -46, 58, 0, 10, RZ - 26, RZ + 26, DARK);
    tube(op, M, [0, 10, RZ], [0, gy - g.top, RZ], 3.5, 3.5, METAL, 14);
    (g.pts || []).forEach(p => {
      const hy = gy - p.y, px = p.x - gx, right = p.x >= gx, a2 = right ? px - p.half - 3 : px + p.half + 3;
      tube(op, M, [right ? 5 : -5, hy, RZ], [a2, hy, 0], 2.5, 2.5, METAL, 10);
      box(op, M, -7, 7, hy - 7, hy + 7, RZ - 7, RZ + 7, DARK); sphere(op, M, [right ? -11 : 11, hy, RZ], 3, DARK, 10);
      // 집게 고리는 잡은 것의 축을 따라 (냉각기·기울인 그릇은 비스듬히)
      const held = (b.els || []).find(e => e && e.g && e.g.hold && Math.abs(e.g.hold.x - p.x) < .6 && Math.abs(e.g.hold.y - p.y) < .6), hg = held ? held.g : {};
      const dir = held && held.t === 'condenser' && hg.deg != null ? [Math.cos(hg.deg * DEG), -Math.sin(hg.deg * DEG)] : hg.tilt ? [Math.sin(hg.tilt * DEG), Math.cos(hg.tilt * DEG)] : [0, 1];
      const RM = chain(M, mT(px, hy, 0), mRz(Math.atan2(-dir[0], dir[1])));
      if (p.ring) ring(op, RM, p.half + 2, p.half + 5, -2.5, 2.5, METAL, 28);
      else ring(op, RM, p.half + 2.5, p.half + 5.5, -6, 6, DARK, 28);
    });
  },
  hotplate(d, b) {
    const { op, M } = b, on = d.p.on !== false;
    box(op, M, -56, 56, 0, 28, -44, 44, '#eceff4'); box(op, M, -47, 47, 28, 32, -38, 38, on ? '#f06a4a' : '#9aa1ad');
    tube(op, M, [36, 14, 44], [36, 14, 48], 6.5, 6.5, '#ffffff', 16); sphere(op, M, [-40, 14, 44], 3, on ? '#ff5a3c' : '#c9ced6', 10);
  },
  stirrer(d, b) {
    const { op, M } = b, on = d.p.on !== false;
    box(op, M, -58, 58, 0, 30, -44, 44, '#eceff4'); box(op, M, -46, 46, 30, 36, -38, 38, '#fafbfc');
    [-38, 38].forEach(x => tube(op, M, [x, 15, 44], [x, 15, 48], 6.5, 6.5, '#ffffff', 16)); sphere(op, M, [-24, 15, 44], 2.4, on ? '#3ccf7e' : '#c9ced6', 10);
    b.front = 44;
  },
  balance(d, b) {
    const { op, M } = b;
    box(op, M, -56, 56, 0, 25, -40, 40, '#eef1f6'); box(op, M, -6, 6, 24, 27, -6, 6, '#8c95a8'); box(op, M, -46, 46, 25, 32, -36, 36, '#d4d9e2');
    b.front = 40;
  },
  rack(d, b) { // g의 크기는 이미 s를 곱한 값 (b.M은 크기를 키우지 않는다)
    const { op, M } = b, g = d.g, s = g.s || 1, hw = g.w / 2, c = b.col(d.p.color, '#e6cfa9'), D = 22 * s;
    box(op, M, -hw, hw, 0, 6 * s, -D, D, c);
    [-hw, hw - 8 * s].forEach(x => box(op, M, x, x + 8 * s, 6 * s, 70 * s, -D, D, c));
    box(op, M, -hw, hw, 25 * s, 30 * s, -D * .8, D * .8, c); box(op, M, -hw, hw, 55 * s, 66 * s, -D, D, c);
    b.front = D; b.noScale = true;
  },
  tuberack(d, b) {
    const { op, M } = b, g = d.g, s = g.s || 1, hw = g.w / 2, c = hex(b.col(d.p.color, '#a9d4f2')), D = 12 * s;
    box(op, M, -hw, hw, 0, 13 * s, -D, D, mix(c, [1, 1, 1], .35)); box(op, M, -hw + 5 * s, hw - 5 * s, 13 * s, 19 * s, -D * .8, D * .8, mix(c, [1, 1, 1], .55));
    b.front = D; b.noScale = true;
  },
  dish(d, b) {
    const { op, M } = b, p = d.p, g = d.g, lv = g.lv || 0;
    b.glass(o => lathe(o, M, [[0, 0], [44, 0], [46, 2], [46, 16]]), GLASS, .18);
    if (lv > 0) b.liquid([[0, 1], [45, 1], [45, 16]], [{ hi: 8, color: b.col(p.color, 'water'), alpha: .78 }]);
    const floor = lv > 0 ? 7.6 : 1.4, it = p.items;
    if (it) {
      const ic = b.col(p.itemColor, { seeds: '#c99a5b', colony: '#f2d26a', beans: '#c99a5b', cells: '#e9a3c0' }[it] || 'white'), R = rng(g.x * 3 + g.y), n = it === 'colony' ? 9 : 7;
      for (let i = 0; i < n; i++) {
        const a = R() * 6.28, dd = Math.sqrt(R()), x = Math.cos(a) * dd * 32, z = Math.sin(a) * dd * 32;
        if (it === 'colony') { const r = 1.5 + R() * 2.5; tube(op, M, [x, floor, z], [x, floor + 1, z], r, r, ic, 12); }
        else { const rot = R() * 60 - 30; sphere(op, chain(M, mT(x, floor + 1.4, z), mRy(rot * DEG), mS(4.2, 1.7, 2.6)), [0, 0, 0], 1, ic, 10); }
      }
    }
    if (p.solid === 'powder') lathe(op, M, [[0, floor], [14, floor], [0, floor + 8]], b.col(p.solidColor, 'white'), 20);
    if (p.lid) b.glass(o => lathe(o, M, [[49, 10], [49, 17], [48, 18], [0, 18]]), GLASS, .2);
  },
  evapdish(d, b) {
    const { op, M } = b, p = d.g, prof = [[0, 0], [12, 0], [14, 2], [24, 3.6], [33, 7.5], [39, 13], [42.6, 20], [44, 28]], lv = p.lv || 0;
    lathe(op, M, prof, '#fbfbf8', 40);
    const level = 10 + lv * 14;
    if (lv > 0) b.liquid(prof, [{ hi: level, color: b.col(d.p.color, 'water'), alpha: .85 }]);
    if (d.p.solid) { const sc = b.col(d.p.solidColor, 'white'), R = rng(p.x + 5); for (let i = 0; i < 9; i++) { const x = -26 + R() * 52, y = -29 + R() * 5, z = 3 + R() * 3, r = R() * 40; const at = lv > 0 ? level : 4; box(op, chain(M, mT(x * .8, at, (y + 26.5) * 6), mRy(r * DEG)), -z / 2, z / 2, 0, z * .7, -z / 2, z / 2, sc); } }
  },
  watchglass(d, b) {
    const { op, M } = b, prof = [[0, 0], [14, .8], [26, 3.5], [37, 10]];
    b.glass(o => lathe(o, M, prof), GLASS, .2);
    if (d.p.color) b.liquid(prof, [{ hi: 3, color: b.col(d.p.color, 'water'), alpha: .85 }]);
    if (d.p.solid) { const sc = b.col(d.p.solidColor, 'white'), R = rng(d.g.x); for (let i = 0; i < 6; i++) { const x = -16 + R() * 32, y = -11 + R() * 2, r = R() * 40; box(op, chain(M, mT(x, 2, (y + 10) * 7), mRy(r * DEG)), -2, 2, 0, 3, -2, 2, sc); } }
  },
  funnel(d, b) {
    const { M } = b, g = d.g, paper = d.p.paper !== false;
    b.glass(o => lathe(o, M, [[3, 0], [3, 46], [4, 47], [38, 90]]), GLASS, .16);
    if (paper) b.glass(o => lathe(o, M, [[.6, 51], [33, 88]]), '#fbfaf3', .72, .35);
    if (g.lv > 0) b.liquid(paper ? [[0, 51], [33, 88]] : [[0, 47], [36, 90]], [{ hi: 51 + g.lv * 35, color: b.col(d.p.color, 'water'), alpha: .85 }]);
  },
  candle(d, b) {
    const h = d.g.ch ?? 60;
    tube(b.op, b.M, [0, 0, 0], [0, h, 0], 9, 9, b.col(d.p.color, '#fff6e3'), 20); tube(b.op, b.M, [0, h, 0], [0, h + 6, 0], .9, .9, DARK, 6);
  },
  block(d, b) {
    const g = d.g, w = g.bw ?? 70, h = g.bh ?? 40, D = Math.min(w, 60) * .4;
    box(b.op, b.M, -w / 2, w / 2, 0, h, -D, D, b.col(d.p.color, '#ddb07a')); b.front = D;
  },
  ball(d, b) { const r = d.g.r ?? 14; sphere(b.op, b.M, [0, r, 0], r, b.col(d.p.color, 'red'), 22); },
  ice(d, b) {
    const n = Math.max(1, Math.min(5, d.p.n ?? 3));
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 22, top = i % 2 ? 36 : 20, a = (i % 2 ? 10 : -8) * DEG; b.glass(o => box(o, chain(b.M, mT(x, top - 9.5, i % 2 ? -6 : 6), mRz(-a)), -10, 10, -9.5, 9.5, -9, 9, [1, 1, 1]), '#eef9ff', .55, .6); }
  },
  magnet(d, b) {
    const f = d.p.flip ? -1 : 1, red = '#e5484d', blue = '#4a7fe0';
    box(b.op, b.M, -55, 0, 0, 26, -14, 14, f > 0 ? red : blue); box(b.op, b.M, 0, 55, 0, 26, -14, 14, f > 0 ? blue : red); b.front = 14;
  },
  stirbar(d, b) { tube(b.op, b.M, [-10, 0, 0], [10, 0, 0], 4, 4, '#fbfbfd', 12, false); sphere(b.op, b.M, [-10, 0, 0], 4, '#fbfbfd', 10); sphere(b.op, b.M, [10, 0, 0], 4, '#fbfbfd', 10); },
  // v1.21: 현미경 (광축은 x = 27.5)
  microscope(d, b) {
    const { op, M } = b, body = '#525a6e', ax = 27.5;
    prism(op, M, [[-46, 0], [50, 0], [46, 14], [-41, 14]], -30, 30, DARK);
    box(op, M, -34, -17, 12, 38, -9, 9, body);
    const arm = t => { const u = 1 - t; return [u * u * u * -26 + 3 * u * u * t * -40 + 3 * u * t * t * -36 + t * t * t * -4, u * u * u * 38 + 3 * u * u * t * 80 + 3 * u * t * t * 126 + t * t * t * 150]; };
    for (let i = 0; i < 10; i++) { const p = arm(i / 10), q = arm((i + 1) / 10); tube(op, M, [p[0], p[1], 0], [q[0], q[1], 0], 7.5, 7.5, body, 14); sphere(op, M, [q[0], q[1], 0], 7.5, body, 12); }
    box(op, M, 17, 38, 14, 34, -10, 10, body); tube(op, M, [ax, 34, 0], [ax, 40, 0], 7, 7, '#fff2b8', 16);
    box(op, M, -16, 50, 67, 74, -26, 26, '#323846'); box(op, M, 11, 43, 74, 77.5, -10, 10, '#cfe7f7'); box(op, M, -4, 8, 74, 77, -12, 12, METAL);
    box(op, M, -8, 24, 144, 158, -10, 10, body);
    tube(op, M, [ax, 112, 0], [ax, 170, 0], 7.5, 7.5, '#e8ebf1', 18); tube(op, M, [ax, 168, 0], [ax, 188, 0], 6, 6, DARK, 16);
    tube(op, M, [ax, 112, 0], [ax, 104, 0], 12.5, 9.5, DARK, 18); tube(op, M, [ax, 104, 0], [ax, 86, 0], 4, 4, '#c3c9d3', 12);
    [[9, 14], [-9, -14]].forEach(([a, z]) => { tube(op, M, [-22, 96, a], [-22, 96, z], 10, 10, '#323846', 18); tube(op, M, [-22, 96, z], [-22, 96, z + Math.sign(z)], 4, 4, METAL, 12); });
    if (d.p.phone) { box(op, M, 17, 38, 186, 198, -8, 8, '#20262f'); box(op, M, 25, 30, 196, 206, -3, 3, '#20262f'); box(op, M, 6.5, 48.5, 206, 254, -3, 3, '#2b3040'); b.front = 3; }
  },
  // 앞면 그림을 통째로 붙이는 상자: 앞면이 부품 자리(z)에 오고 뒤로 깊다 (전선·광선이 앞면 단자·창에 닿게)
  device(d, b) { box(b.op, b.M, -66, 66, -45, 45, -8, 0, '#2b3040'); b.front = 0; },
  power(d, b) { box(b.op, b.M, -55, 55, 0, 62, -60, 0, '#eceff4'); b.front = 0; },
  lightbox(d, b) { const f = d.g.dir < 0 ? -1 : 1; box(b.op, b.M, f > 0 ? -36 : -32, f > 0 ? 32 : 36, 4, 50, -40, 0, '#4a5164'); box(b.op, b.M, -30, 30, 0, 6, -36, -4, DARK); b.front = 0; },
  table(d, b) {
    const g = d.g, w = g.tw ?? 260, h = g.th ?? 92, c = hex(b.col(d.p.color, '#e6cfa9')), leg = mix(c, [0, 0, 0], .12), D = clamp(w * .32, 40, 110);
    box(b.op, b.M, -w / 2, w / 2, h - 11, h, -D, D, c);
    [[-w / 2 + 12, -w / 2 + 21], [w / 2 - 21, w / 2 - 12]].forEach(([x0, x1]) => [[D - 14, D - 5], [-D + 5, -D + 14]].forEach(([z0, z1]) => box(b.op, b.M, x0, x1, 0, h - 11, z0, z1, leg)));
  },
  cart(d, b) {
    const { op, M } = b, c = b.col(d.p.color, '#6e8ff0'), n = d.g.load || 0;
    box(op, M, -34, 34, 13, 30, -16, 16, c);
    [-20, 20].forEach(x => [-1, 1].forEach(sd => { tube(op, M, [x, 7, sd * 16], [x, 7, sd * 21], 7, 7, DARK, 16); tube(op, M, [x, 7, sd * 21], [x, 7, sd * 22], 2.4, 2.4, METAL, 10); }));
    for (let i = 0; i < n; i++) box(op, M, -13, 13, 30.5 + i * 9, 39 + i * 9, -10, 10, '#a5adbb');
    b.front = 16;
  },
  track(d, b) {
    const { op, M } = b, g = d.g, w = g.rw ?? 320, h = g.rh ?? 0, f = g.f || 1, A0 = [-f * w / 2, 10 + h], A1 = [f * w / 2, 10], L = Math.hypot(w, h) || 1;
    const nx = -(A1[1] - A0[1]) / L * f, ny = (A1[0] - A0[0]) / L * f; // 레일 위쪽 방향
    const dn = ny < 0 ? -1 : 1, off = (p, k) => [p[0] - nx * k * dn, p[1] - ny * k * dn];
    prism(op, M, [A0, A1, off(A1, 8), off(A0, 8)], -10, 10, '#c9ced6');
    [A0, A1].forEach(p => box(op, M, p[0] - 2, p[0] + 2, p[1] - 8, p[1] + 7, -12, 12, DARK)); // 끝 막이
    const foot = ex => box(op, M, ex - 8, ex + 8, 0, 10, -12, 12, DARK);
    foot(A1[0] - f * 10); if (!h) foot(A0[0] + f * 10);
    if (h > 0 && (d.p.support ?? 'block') === 'block') box(op, M, A0[0] - 15, A0[0] + 15, 0, h + 3, -14, 14, '#ddb07a');
  },
  ramp(d, b) {
    const g = d.g, w = g.rw ?? 240, h = g.rh ?? 80, f = g.f || 1;
    prism(b.op, b.M, [[-w / 2 * f, 0], [w / 2 * f, 0], [-w / 2 * f, h]], -32, 32, b.col(d.p.color, '#ece3d3'));
  },
  mortar(d, b) {
    const { op, M } = b, prof = [[0, 0], [14, 0], [16, 2], [27, 3.6], [35, 8], [39.5, 15], [41.4, 24], [42, 34]];
    lathe(op, M, prof, '#f7f6f2', 40);
    if (d.p.color) b.liquid(prof, [{ hi: 24, color: b.col(d.p.color), alpha: .95 }]);
    if (d.p.pestle !== false) { const a = 28 * DEG, at = h => [(h - 32) * Math.sin(a), 32 + (h - 32) * Math.cos(a), 0]; tube(op, M, at(30), at(100), 6, 4, '#f2f1ec', 16); }
  },
  sepfunnel(d, b) {
    const { M } = b, p = d.p, bulb = profileOf('M-3,-52 C-24,-66 -33,-104 -16,-124 Q-9,-131 -6,-131 L6,-131 Q9,-131 16,-124 C33,-104 24,-66 3,-52 Z', b.host);
    b.glass(o => { lathe(o, M, bulb); lathe(o, M, [[1.4, 0], [2.2, 41]], null, 12); lathe(o, M, [[4, 41], [4, 53]], null, 16); lathe(o, M, [[6, 130], [6, 142]], null, 16); }, GLASS, .16);
    if (p.stopper !== false) tube(b.op, M, [0, 141, 0], [0, 152, 0], 8, 8, '#c9ced8', 18);
    const ls = Array.isArray(p.layers) && p.layers.length ? p.layers : [{ h: p.fill ?? .55, color: p.color ?? 'water' }];
    let acc = 0; const bands = ls.map((ly, i) => { const h = +ly.h || +ly.fill || .3, bd = { lo: i ? 52 + acc * 79 : -1e9, hi: 52 + (acc + h) * 79, color: b.col(ly.color, 'water'), alpha: .85 }; acc += h; return bd; });
    b.liquid(bulb, bands);
  },
  // 홈판·오목받침 유리: 판 위에 홈(테두리·액체·꼬리표)을 그린 그림을 깐다. 홈에 넣은 것은 입체 홈 자리로 옮긴다 (viewer)
  wellplate(d, b) {
    const g = d.g, dd = g.d; if (!dd) return;
    const LK = { plastic: { top: '#eef5fb', front: '#d5e3f0', rim: '#fbfdff', hole: '#d9e5f0', st: INK }, white: { top: '#fbfaf6', front: '#e6e2d8', rim: '#ffffff', hole: '#ebe7de', st: '#8f8a7e' }, slide: { top: '#e3f0fa', front: '#c9dfef', rim: '#f4f9fd', hole: '#d6e7f4', st: INK } }[dd.kind] || null, L = LK || { top: '#eef5fb', front: '#d5e3f0', rim: '#fbfdff', hole: '#d9e5f0', st: INK };
    const W = dd.Wp, Dp = dd.Dp, th = dd.th;
    if (dd.kind === 'slide') b.glass(o => box(o, b.M, -W / 2, W / 2, 0, th, -Dp / 2, Dp / 2, [1, 1, 1]), L.top, .45, .7);
    else box(b.op, b.M, -W / 2, W / 2, 0, th, -Dp / 2, Dp / 2, L.front, 'bfklr');
    const wells = (b.els || []).filter(e => e && e.parentE === d.e && e.g && e.g.rc), at = (r, c) => [(c - (dd.cols - 1) / 2) * dd.px, Dp / 2 - (Dp - dd.m - (r + .5) * dd.pz)];
    const k = Math.min(6, 2048 / Math.max(W, Dp)), cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(Dp * k);
    const x = cv.getContext('2d'); x.scale(k, k); x.fillStyle = L.top; x.fillRect(0, 0, W, Dp);
    const byRC = new Map(wells.map(w => [w.g.rc.join(','), w]));
    for (let r = 0; r < dd.rows; r++) for (let c = 0; c < dd.cols; c++) {
      const [lx, lz] = at(r, c), cx = lx + W / 2, cy = lz + Dp / 2, w = byRC.get(`${r},${c}`), p = w ? w.p : {}, rr = dd.r;
      x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fillStyle = L.rim; x.fill(); x.lineWidth = 1.1; x.strokeStyle = L.st; x.stroke();
      x.beginPath(); x.arc(cx, cy, rr * .88, 0, 7); x.fillStyle = L.hole; x.fill();
      const lv = p.fill != null ? clamp(+p.fill || 0, 0, 1) : p.color ? .6 : 0;
      if (lv > 0) { x.beginPath(); x.arc(cx, cy, rr * (.6 + .26 * lv), 0, 7); x.fillStyle = b.col(p.color, 'water'); x.globalAlpha = .92; x.fill(); x.globalAlpha = 1; }
      if (p.cloudy) { x.beginPath(); x.arc(cx, cy, rr * .7, 0, 7); x.fillStyle = 'rgba(244,242,236,.78)'; x.fill(); }
      if (p.solid) { const R = rng(cx * 7 + cy); x.fillStyle = b.col(p.solidColor, p.solid === 'powder' || p.solid === 'precipitate' ? 'white' : 'gray'); for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(cx + (R() - .5) * rr, cy + (R() - .5) * rr, rr * .16, 0, 7); x.fill(); } }
      if (p.bubbles) { const R = rng(cx + cy * 3); x.strokeStyle = '#7aaed0'; x.lineWidth = .7; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(cx + (R() - .5) * rr, cy + (R() - .5) * rr, 1.4 + R() * 1.2, 0, 7); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill(); x.stroke(); } }
      if (p.tag) { x.font = `800 ${Math.min(9, rr * .8)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 2.4; x.strokeStyle = '#fff'; x.strokeText(p.tag, cx, cy); x.fillStyle = '#2b3040'; x.fillText(p.tag, cx, cy); }
      if (p.strip) { const sc = b.col(p.strip === true ? 'silver' : p.strip), sw = Math.max(5, rr * .55); box(b.op, b.M, lx - sw / 2, lx + sw / 2, th, th + 34, lz - .8, lz + .8, sc); }
    }
    const tags = (v, def) => Array.isArray(v) ? v : d.p.tags === true ? def : null;
    const rt = tags(d.p.rowTags, Array.from({ length: dd.rows }, (_, i) => String.fromCharCode(65 + i))), ct = tags(d.p.colTags, Array.from({ length: dd.cols }, (_, i) => String(i + 1)));
    x.font = `800 ${Math.min(9.5, dd.m * .8)}px ${FONT}`; x.fillStyle = L.st; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (rt) for (let r = 0; r < dd.rows; r++) if (rt[r] != null) { const [lx, lz] = at(r, 0); x.fillText(rt[r], lx + W / 2 - dd.px / 2 - 1, lz + Dp / 2); }
    if (ct) for (let c = 0; c < dd.cols; c++) if (ct[c] != null) { const [lx, lz] = at(0, c); x.fillText(ct[c], lx + W / 2, lz + Dp / 2 - dd.pz / 2 - 1); }
    b.top = { canvas: cv, M: chain(b.M, mT(0, th + .08, 0), mS(W, 1, Dp)) };
    b.well = (r, c) => { const [lx, lz] = at(r, c); return apply(b.M, lx, th, lz); };
    b.wellShift = (r, c) => { const Z = Dp - dd.m - (r + .5) * dd.pz; return { dy: Z * .45 * (g.s || 1), dz: (Dp / 2 - Z) * (g.s || 1) }; }; // 2D는 뒤 줄을 위로 올려 그렸다 (깊이 비율 0.45)
  }
};
BUILD.burner = BUILD.lamp; BUILD.bunsen = BUILD.gasburner;
// 덧그림을 앞면에 붙이는 부품 (돌리면 함께 돈다): 표시판·글자·눈금
const FRONT_DECAL = new Set(['rack', 'tuberack', 'balance', 'stirrer', 'block', 'magnet', 'microscope', 'device', 'power', 'lightbox', 'cart']);

// 그릇(SHAPES): 바깥 윤곽을 돌린 유리 + 안쪽 윤곽을 돌린 액체(높이·층·색) + 받침·마개·뚜껑·곁가지
function container(d, b, S) {
  const p = d.p, g = d.g, host = b.host;
  const tint = p.brown ? '#d6a066' : S.membrane ? '#efe7d2' : p.paper && d.t === 'cup' ? '#fdfcf9' : GLASS;
  const alpha = p.brown ? .42 : S.membrane ? .5 : p.paper && d.t === 'cup' ? .97 : .15, edge = p.paper && d.t === 'cup' ? .5 : 1;
  if (d.shape === 'trough') { // 수조는 네모난 유리 상자
    const D = 55;
    b.glass(o => box(o, b.M, -110, 110, 0, 80, -D, D, [1, 1, 1], 'bfklr'), tint, alpha, edge);
    b.liquidBox(108, D - 2, 2, 78, o => box(o, b.M, -108, 108, 2, 78, -(D - 2), D - 2, [1, 1, 1], 'bfklr'));
    return;
  }
  b.glass(o => lathe(o, b.M, profileOf(S.outline, host)), tint, alpha, edge);
  if (S.foot) b.glass(o => lathe(o, b.M, profileOf(S.foot, host)), S.footFill || GLASS, .5);
  if (S.under && !g.tilt && p.ring !== false) lathe(b.op, b.M, profileOf(S.under, host), S.underFill || '#cfa77c', 32);
  if (S.cap && p.cap !== false && !p.stopper) tube(b.op, b.M, [0, -(S.cap.y + S.cap.h), 0], [0, -S.cap.y, 0], S.cap.w / 2, S.cap.w / 2, S.cap.fill || DARK, 24);
  if (p.stopper) {
    lathe(b.op, b.M, [[0, S.h - 10], [S.half + .5, S.h - 10], [S.half + 4, S.h + 7], [0, S.h + 7]], '#9a5b4b', 28);
    if (p.stopper === 'hole' || p.stopper === 'tube') b.glass(o => tube(o, b.M, [0, S.h - 10, 0], [0, S.h + 30, 0], 2.3, 2.3, [1, 1, 1], 10), GLASS, .3);
  }
  if (p.lid && !S.snap) b.glass(o => lathe(o, b.M, [[0, S.h], [S.half + 9, S.h], [S.half + 9, S.h + 4], [0, S.h + 4]]), GLASS, .3);
  if (p.arm) { const dd = p.arm === 'left' ? -1 : 1; b.glass(o => tube(o, b.M, [dd * S.half, S.h - 22, 0], [dd * (S.half + 34), S.h - 38, 0], 3.5, 3.5, [1, 1, 1], 12, false), GLASS, .2); }
  const inner = profileOf(S.clip, host), bands = [];
  if (Array.isArray(p.layers) && p.layers.length) {
    const span = g.ymax - g.ymin; let acc = 0;
    p.layers.forEach((ly, i) => { const h = +ly.h || +ly.fill || .2, top = g.y + g.s * (g.ymax - (acc + h) * span), bot = g.y + g.s * (g.ymax - acc * span); bands.push({ lo: i ? b.B - bot : -1e9, hi: b.B - top, color: b.col(ly.color, 'water'), alpha: ly.opacity ?? .86, world: true }); acc += h; });
  } else if (g.fill > 0) {
    let c = hex(b.col(p.color, 'water')), a = p.opacity ?? .82;
    if (p.cloudy) { c = mix(c, hex('#f4f2ec'), .6); a = .92; }
    bands.push({ lo: -1e9, hi: b.B - g.surfaceY, color: c, alpha: a, world: true });
  }
  if (p.gas) bands.push({ lo: bands.length ? bands[bands.length - 1].hi : -1e9, hi: 1e9, color: b.col(p.gas), alpha: .22, world: true, noCap: true });
  if (bands.length) b.liquid(inner, bands);
}

/* ---------- 장면 → 카드·입체 부품 ---------- */
// LabKit.scene3이 그린 SVG를 화면 밖에 잠깐 붙여, 카드로 세울 것은 상자를 재어 SVG로 떼어 내고, 입체로 빚을 것은 자리·크기를 읽는다
function cutScene(K, items, hide) { // hide: 보이지 않는 것(unseen)을 뺀다 (v1.31)
  const SH = K.shapes3 ? K.shapes3() : {}, types = Object.keys(SH).concat(Object.keys(BUILD));
  const { svg, labels, els = [] } = K.scene3(items || [], { mesh3: types, hideUnseen: !!hide });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:480px;height:300px;opacity:0;pointer-events:none;font-family:' + FONT;
  host.innerHTML = svg; document.body.appendChild(host);
  const root = host.firstElementChild, ser = new XMLSerializer();
  try { const RI = root.getScreenCTM().inverse(); root.querySelectorAll('[data-fx]').forEach(n => { const m = RI.multiply(n.getScreenCTM()); n.setAttribute('data-fx-m', [m.a, m.b, m.c, m.d, m.e, m.f].map(v => Math.round(v * 1e4) / 1e4).join(',')); }); } catch (e) { }
  // 부품 눌러 알아보기 (v1.29): 그림 엔진이 부품마다 붙인 data-lk-k 묶음의 상자 (장면 좌표). 입체에서 누른 곳의 부품을 찾는다
  const pkBoxes = [];
  try {
    const RI = root.getScreenCTM().inverse();
    root.querySelectorAll('[data-lk-k]').forEach(n => {
      const b = n.getBBox(); if (!(b.width + b.height > 0)) return;
      const m = RI.multiply(n.getScreenCTM()), xs = [], ys = [], w3 = n.closest('[data-e3]');
      [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].forEach(([x, y]) => { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); });
      pkBoxes.push({ k: n.getAttribute('data-lk-k'), e: w3 ? +w3.getAttribute('data-e3') : null, u: w3 ? w3.getAttribute('data-u3') : null, x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) });
    });
  } catch (e) { }
  const defs = root.querySelector(':scope > defs'), defsXml = defs ? ser.serializeToString(defs) : '';
  const measure = nodes => { // 여러 마디를 함께 잰 상자 (화면 밖 SVG에 잠깐 붙여서)
    const mg = document.createElementNS(SVGNS, 'g'); nodes.forEach(n => mg.appendChild(n)); root.appendChild(mg);
    let b = null; try { const r = mg.getBBox(); if (r.width + r.height > 0) b = { x: r.x, y: r.y, x2: r.x + r.width, y2: r.y + r.height }; } catch (e) { }
    mg.remove(); return b;
  };
  // 움직이는 조각(data-fx)을 카드에서 떼어 낸다: 조각마다 자기 좌표 → 장면 좌표 행렬(L)로 감싸 따로 카드로 만든다. 카드 상자는 떼기 전 그대로 (자리가 바뀌지 않게)
  const takeFx = nodes => {
    const out = [];
    nodes.forEach(n => (n.matches && n.matches('[data-fx]') ? [n] : [...n.querySelectorAll('[data-fx]')]).forEach(f => {
      if (f !== n && f.parentElement && f.parentElement.closest('[data-fx]')) return;
      const L = (f.getAttribute('data-fx-m') || '1,0,0,1,0,0').split(',').map(Number), c = f.cloneNode(true);
      c.removeAttribute('transform'); const a0 = c.hasAttribute('opacity') ? +c.getAttribute('opacity') : 1; c.removeAttribute('opacity');
      const w = document.createElementNS(SVGNS, 'g'); w.setAttribute('transform', `matrix(${L.join(' ')})`); w.appendChild(c);
      const fc = card([w], measure([w.cloneNode(true)]), { fk: f.getAttribute('data-fx'), fd: (f.getAttribute('data-fx-d') || '').split(',').filter(v => v !== '').map(Number), L, a0, types: ['fx'] }, true);
      if (fc) out.push(fc);
      if (f !== n) f.remove(); else n.dataset.fxTaken = '1';
    }));
    return out;
  };
  const card = (nodes, box, extra, raw) => {
    if (!box) return null;
    const fx = raw ? [] : takeFx(nodes); if (!raw) nodes = nodes.filter(n => !(n.dataset && n.dataset.fxTaken));
    const pad = 6 + .02 * Math.max(box.x2 - box.x, box.y2 - box.y); // 선 굵기·그림자가 상자 밖으로 나온다
    const x = box.x - pad, y = box.y - pad, w = box.x2 - box.x + 2 * pad, h = box.y2 - box.y + 2 * pad;
    const k = Math.min(3, MAX_TEX / Math.max(w, h)), cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
    const xml = `<svg xmlns="${SVGNS}" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}" font-family='${FONT}'>${defsXml}${nodes.map(n => ser.serializeToString(n)).join('')}</svg>`;
    return { kind: 'card', x, y, w, h, cw, ch, xml, bottom: box.y2, ...extra, fx: fx.length ? fx : null };
  };
  try {
    // 묶음(한 장치) 정리: 위층 마디의 순서가 앞뒤 순서 (그린 것이 없는 부품만 있는 묶음은 맨 뒤)
    const units = new Map(), byE = new Map(), unit = u => { if (!units.has(u)) units.set(u, { u, order: 1e6 + units.size, top: [], types: new Set() }); return units.get(u); };
    [...root.querySelectorAll('[data-e3]')].forEach(n => { const e = +n.getAttribute('data-e3'); if (!byE.has(e)) byE.set(e, []); byE.get(e).push(n); });
    [...root.children].forEach((n, i) => { if (!n.matches('g[data-u3]')) return; const un = unit(n.getAttribute('data-u3')); un.order = Math.min(un.order, i); un.top.push(n); un.types.add(n.getAttribute('data-u3t')); });
    els.forEach(d => { if (d) unit(d.u); });
    // 그 묶음에 입체 부품이 하나라도 있으면 부품마다 따로 (카드는 제 자리에, 입체는 실험대 좌표에), 없으면 v1.19처럼 묶음 카드 한 장
    const uOf = new Map(els.filter(Boolean).map(d => [d.e, d.u]));
    const split = new Set(); els.forEach(d => { if (d && d.d3) split.add(d.u); });
    const cards = [], parts = [];
    units.forEach(un => {
      if (!split.has(un.u)) {
        const types = [...un.types], ks = els.filter(d => d && String(d.u) === String(un.u) && d.k).map(d => d.k), c = card(un.top.map(n => n.cloneNode(true)), measure(un.top.map(n => n.cloneNode(true))), { u: un.u, order: un.order, types, over: types.every(t => OVERLAY.has(t)), fixedPlane: types.every(t => FIXED.has(t)), keys: ks.length ? ks.join(',') : null });
        if (c) cards.push(c);
      }
    });
    els.forEach(d => {
      if (!d) return; const u = uOf.get(d.e); if (u == null || !split.has(u)) return;
      const un = units.get(u), nodes = (byE.get(d.e) || []).map(n => { const c = n.cloneNode(true); c.querySelectorAll('[data-e3]').forEach(x => { if (+x.getAttribute('data-e3') !== d.e) x.remove(); }); return c; });
      const box = nodes.length ? measure(nodes.map(n => n.cloneNode(true))) : null;
      const base = { u, e: d.e, order: un ? un.order : 0, types: [d.t], over: false };
      if (d.d3) parts.push({ ...d, u, order: base.order, decal: card(nodes, box, { ...base, decal: true }) });
      else { const c = card(nodes, box, base); if (c) { c.fixedPlane = FIXED.has(d.t); c.d = d; cards.push(c); } }
    });
    return { cards, parts, labels, els, SH, host, root, pkBoxes };
  } catch (e) { host.remove(); throw e; }
}
// 실험대 선 바로 위 12만큼의 줄에서 칠해진 곳의 왼쪽·오른쪽 끝 (그림자를 실험대에 닿은 곳에만 깐다)
function footOf(card, cv) {
  try {
    const k = card.cw / card.w, y0 = Math.max(0, Math.floor((card.bottom - 12 - card.y) * k)), y1 = Math.min(card.ch, Math.ceil((card.bottom - card.y) * k));
    if (y1 <= y0) return null;
    const d = cv.getContext('2d').getImageData(0, y0, card.cw, y1 - y0).data;
    let a = Infinity, b = -Infinity;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = (i >> 2) % card.cw; if (x < a) a = x; if (x > b) b = x; }
    return a <= b ? { x: card.x + a / k, x2: card.x + (b + 1) / k } : null; // 닿은 곳이 없으면 그림자도 없다
  } catch (e) { return { x: card.x, x2: card.x + card.w }; } // 그림을 읽을 수 없는 브라우저면 카드 너비로
}
function raster(card) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = card.cw; c.height = card.ch; c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, card.cw, card.ch); card.feet = footOf(card, c); ok(c); } catch (e) { no(e); } };
    img.onerror = () => no(new Error('그림 카드를 만들지 못했어요: ' + card.types.join(',')));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(card.xml);
  });
}

/* ---------- 보기 화면 ---------- */
// stage: 그릴 자리(크기가 있는 요소). o: { items, title, bench, view, still(점검용: 조작 없이 한 번), size: [w,h] }
function viewer(stage, o = {}) {
  const K = window.LabKit;
  if (!K || !K.scene3) throw new Error('그림 엔진(LabKit)이 없어요');
  injectCss();
  const B = K.BENCH, CX = K.W / 2, still = !!o.still;
  const cv = document.createElement('canvas'); cv.className = 'v3-cv'; cv.tabIndex = still ? -1 : 0;
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `${o.title || '실험 장면'} 입체 그림. 끌어서 돌려 볼 수 있어요${o.onPick ? '. 부품을 누르면 정보 카드가 열려요' : ''}`);
  const opts = { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: still };
  const gl = cv.getContext('webgl2', opts) || cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  if (!gl) { const e = new Error('WebGL을 쓸 수 없어요'); e.code = 'nogl'; throw e; }
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  stage.appendChild(cv);
  const lines = document.createElementNS(SVGNS, 'svg'); lines.setAttribute('class', 'v3-lines'); lines.setAttribute('aria-hidden', 'true'); stage.appendChild(lines);
  const tagBox = document.createElement('div'); tagBox.className = 'v3-tags'; tagBox.setAttribute('aria-hidden', 'true'); stage.appendChild(tagBox);
  const load = document.createElement('div'); load.className = 'v3-load'; load.textContent = '실험대를 꾸미는 중…'; stage.appendChild(load);
  let ctl = null;
  if (o.inline) stage.classList.add('v3-inline');
  if (!still) {
    ctl = document.createElement('div'); ctl.className = 'v3-ctl'; ctl.setAttribute('role', 'toolbar'); ctl.setAttribute('aria-label', '시점 바꾸기');
    ctl.innerHTML = '<button type="button" data-view="front">앞에서</button><button type="button" data-view="angle">비스듬히</button><button type="button" data-view="top">위에서</button><span class="v3-sep"></span><button type="button" data-zoom="1" aria-label="가까이 보기">+</button><button type="button" data-zoom="-1" aria-label="멀리 보기">−</button><span class="v3-sep"></span><button type="button" data-cut aria-pressed="false" aria-label="고른 부품의 단면 보기" hidden>단면</button>';
    stage.appendChild(ctl);
    const hint = document.createElement('p'); hint.className = 'v3-hint'; if (o.inline) hint.hidden = true;
    hint.textContent = '끌어서 돌리기 · 휠이나 두 손가락으로 확대 · 오른쪽 버튼(Shift+끌기)으로 옮기기. 그릇·자주 쓰는 기구는 입체로, 나머지는 2D 그림 카드로 보여 줘요.';
    stage.appendChild(hint);
  }

  /* 장면: 묶음마다 앞뒤 자리(z). 나중에 그린 묶음이 조금 앞 */
  const P_TEX = program(gl, VS_TEX, FS_TEX), P_COL = program(gl, VS_COL, FS_COL), P_GLASS = program(gl, VS_SURF, FS_GLASS), P_LIQ = program(gl, VS_SURF, FS_LIQ), P_CAP = program(gl, VS_CAP, FS_CAP);
  const bench = o.bench !== false;
  // 장면 하나를 카드·입체 부품으로 세운다 (v1.26: 시연 때는 시작 장면도 같은 방법으로 세워 짝짓는다)
  function assemble(S) {
    const { cards, parts } = S;
    const unitZ = new Map(); [...new Set([...cards, ...parts].sort((a, b) => a.order - b.order).map(c => String(c.u)))].forEach((u, i, a) => unitZ.set(u, (i - a.length / 2) * 4));
    // 데이터의 z(앞 +, 뒤 −, v1.21): 2D 그림은 그대로 두고 입체에서만 앞뒤로 옮긴다. 안·위에 둔 것, 꽂힌 것, 스탠드는 그 부품을 따라간다
    const E = S.els, zMemo = new Map(), byId = new Map(E.filter(d => d && d.id).map(d => [d.id, d.e]));
    const zOf = e => {
      const d = e != null && E[e]; if (!d) return 0; if (zMemo.has(e)) return zMemo.get(e); zMemo.set(e, 0);
      let z = typeof d.p?.z === 'number' && isFinite(d.p.z) ? d.p.z : null;
      const via = [d.inE, d.overE, d.onE, d.parentE]; if (d.t === 'stand') [].concat(d.p?.hold ?? []).forEach(h => via.push(byId.get(h)));
      if (z == null) for (const k of via) if (k != null && E[k]) { z = zOf(k); break; }
      z = clamp(z || 0, -110, 110); zMemo.set(e, z); return z;
    };
    const unitShift = new Map(); E.forEach(d => { if (d && !unitShift.has(String(d.u)) && zOf(d.e)) unitShift.set(String(d.u), zOf(d.e)); });
    const zAt = (u, e) => (unitZ.get(String(u)) ?? 0) + (e != null ? zOf(e) : unitShift.get(String(u)) || 0);
    let overI = 0;
    cards.forEach(c => {
      c.sign = bench && c.over && c.y + 6 >= B; // 실험대 띠(실험대 선 아래)에 쓴 글자는 실험대 앞면에 붙인다
      c.ax = c.x + c.w / 2; c.ox = 0;
      c.px = c.ax - CX; c.py = c.sign ? -6 - c.h / 2 : B - (c.y + c.h);
      c.pz = c.sign ? 122 + overI * .5 : c.over ? 10 + (overI++) * .5 + (unitShift.get(String(c.u)) || 0) : zAt(c.u, c.e);
      c.mode = c.sign || c.fixedPlane ? 'fixed' : 'bill';
      c.foot = bench && !c.over && Math.abs(c.bottom - B) < 8; // 실험대에 놓인 것 (그림자를 깐다)
    });

    /* 입체 부품 빚기 */
    const opV = [], objs = [], objByE = new Map();
    // 실험대 위 x 범위에 놓인 입체 부품의 앞뒤 반 깊이 (스탠드 받침을 그 뒤로 비키게)
    const halfDepth = d => { const g = d.g || {}, sh = d.shape && S.SH[d.shape]; return d.shape === 'trough' ? 55 : sh ? sh.w * (g.s || 1) / 2 : { hotplate: 44, stirrer: 44, balance: 40, rack: 22 * (g.s || 1), tuberack: 12 * (g.s || 1) }[d.t] || 0; };
    const deepAt = (x0, x1) => parts.reduce((m, d) => { const g = d.g || {}, w = (d.shape && S.SH[d.shape] ? S.SH[d.shape].w * (g.s || 1) : g.w) || 0; return d.t !== 'stand' && g.x != null && g.x + w / 2 > x0 && g.x - w / 2 < x1 && Math.abs((g.y ?? B) - B) < 8 ? Math.max(m, halfDepth(d)) : m; }, 0);
    parts.forEach(d => {
      const g = d.g || {}, z = zAt(d.u, d.e), s = g.s || 1, tilt = (g.tilt || 0) * DEG, shape = d.shape && S.SH[d.shape];
      const ob = { kind: 'obj', e: d.e, u: d.u, d, z, glass: [], liquids: [], caps: [], kids: [], decal: d.decal, gx: g.x ?? 240, ax: (g.x ?? 240) - CX, az: z };
      const base = mT((g.x ?? 240) - CX, B - (g.y ?? B), z);
      const bld = { op: opV, B, host: S.root, col: (c, def) => K.col(c, def) || def, front: 0, noScale: false, deepAt, els: S.els, sec: [] }; // sec: 단면 보기의 안쪽 이름표 { t, y, r(자르는 면 위 옆 거리) | at }
      bld.M = shape ? chain(base, mT(0, shape.h * s / 2, 0), mRz(-tilt), mT(0, -shape.h * s / 2, 0), mS(s)) : null;
      if (!shape) bld.M = d.t === 'rack' || d.t === 'tuberack' || d.t === 'stand' ? chain(base, mRz(-tilt)) : chain(base, mRz(-tilt), mS(s));
      bld.glass = (fn, tint, alpha, edge = 1) => { const v = []; fn(v); if (v.length) ob.glass.push({ v: new Float32Array(v), tint: hex(tint), alpha, edge }); };
      bld.liquid = (P, bands) => { // P: 안쪽 윤곽 (부품 좌표). bands: [{lo, hi, color, alpha, world}] — world가 아니면 부품 높이
        const v = []; lathe(v, bld.M, P, null, 40); const buf = new Float32Array(v), tb = radiusTable(P), IM = inv(bld.M), floor = minY(buf);
        bands.forEach(bd => {
          const toW = h => h <= -1e8 || h >= 1e8 ? h : bd.world ? h : apply(bld.M, 0, h, 0)[1];
          const lo = toW(bd.lo ?? -1e9), hi = toW(bd.hi ?? 1e9), col = typeof bd.color === 'string' ? hex(bd.color) : bd.color;
          ob.liquids.push({ v: buf, lo, hi, color: col, alpha: bd.alpha, floor });
          if (!bd.noCap && hi < 1e8) ob.caps.push({ y: hi, IM, R: tb.R, h0: tb.h0, h1: tb.h1, bx: 0, color: col, alpha: Math.min(.95, bd.alpha + .06), j: ob.liquids.length - 1 });
        });
      };
      bld.liquidBox = (hx, hz, h0, h1, fn) => { // 수조: 상자 모양 액체
        const v = []; fn(v); const buf = new Float32Array(v), IM = inv(bld.M);
        if (!(g.fill > 0)) return;
        const col = hex(bld.col(d.p.color, 'water')), hi = B - g.surfaceY;
        ob.liquids.push({ v: buf, lo: -1e9, hi, color: col, alpha: d.p.opacity ?? .7, floor: minY(buf) });
        ob.caps.push({ y: hi, IM, R: new Float32Array(32), h0, h1, bx: 1, hb: [hx, hz], color: col, alpha: .75, j: ob.liquids.length - 1 });
      };
      const op0 = opV.length;
      try { if (shape) container(d, bld, shape); else BUILD[d.t](d, bld); }
      catch (e) { warn(`${d.t}을(를) 입체로 빚지 못했어요: ${e.message}`); }
      ob.op = [op0 / 9, (opV.length - op0) / 9]; // 이 부품의 불투명한 부분 (시연에서 따로 그린다)
      ob.top = bld.top || null; ob.well = bld.well || null; ob.wellShift = bld.wellShift || null; ob.sec = bld.sec; ob.M = bld.M; ob.boxy = d.shape === 'trough';
      // 크기·자리 (화면 맞추기·그림자·순서)
      const w = (shape ? shape.w * s : g.w) || 60, top = g.top ?? (g.y - (g.h || 60)), bottom = g.y ?? B;
      ob.cx = ob.ax; ob.cy = B - (top + bottom) / 2; ob.hw = w / 2; ob.y0 = B - bottom; ob.y1 = B - top;
      ob.foot = bench && !g.tilt && Math.abs(bottom - B) < 8 ? { x: (g.x ?? 240) - w * .48, x2: (g.x ?? 240) + w * .48 } : null;
      if (d.decal) { // 덧그림 카드: 그릇·불꽃은 부품 축에 세워 카메라 쪽으로, 표시판·글자는 앞면에 붙인다
        const c = d.decal; c.obj = ob; c.ax = g.x ?? (c.x + c.w / 2); c.ox = c.x + c.w / 2 - c.ax; c.px = c.ax - CX; c.py = B - (c.y + c.h); c.foot = false;
        if (FRONT_DECAL.has(d.t)) { c.mode = 'fixed'; c.pz = z + (bld.front || 0) * (bld.noScale ? 1 : s) + .5; c.ox = 0; c.px = c.x + c.w / 2 - CX; }
        else { c.mode = shape && g.tilt ? 'fixed' : 'bill'; c.pz = z; if (c.mode === 'fixed') { c.ox = 0; c.px = c.x + c.w / 2 - CX; } }
      }
      objs.push(ob); objByE.set(d.e, ob);
    });
    // 그릇 안(in)·위(over)에 있는 것은 그 그릇의 차례 안에서 그린다 (유리 뒷면 → 안의 것 → 액체 → 유리 앞면)
    const top = [], cardOfE = new Map();
    cards.forEach(c => { if (c.e != null) cardOfE.set(c.e, c); });
    const holder = d => { for (const k of [d.inE, d.overE]) { const ob = k != null && objByE.get(k); if (ob && (ob.glass.length || ob.liquids.length)) return ob; } return null; };
    [...objs, ...cards.filter(c => c.e != null)].forEach(it => {
      const h = it.d && holder(it.d);
      if (!h || h === it) return top.push(it);
      h.kids.push(it);
      if (it.kind !== 'obj' && it.mode === 'bill') { it.ax = h.gx; it.ox = it.x + it.w / 2 - h.gx; it.px = h.ax; } // 그릇 안의 카드는 그 그릇의 축을 따라 돈다
    });
    cards.filter(c => c.e == null).forEach(c => top.push(c));
    const wellOf = d => { for (const k of [d.overE, d.inE]) { const w = k != null && E[k]; if (w && w.t === '_well' && w.g && w.g.rc) { const pb = objByE.get(w.parentE); if (pb && pb.wellShift) return pb.wellShift(...w.g.rc); } } return null; };
    cards.forEach(c => { const sh = c.d && wellOf(c.d); if (sh) { c.py -= sh.dy; c.pz += sh.dz; c.foot = false; } });
    const allCards = cards.concat(objs.map(ob => ob.decal).filter(Boolean));
    // 부품 눌러 알아보기 (v1.29): 카드마다 그 안에 그린 부품의 상자, 입체 부품은 그 부품의 이름(pk)과 앞뒤 반 깊이 (누른 곳 찾기·고른 부품 틀)
    const PB = S.pkBoxes || [];
    allCards.forEach(c => { c.pks = PB.filter(b => c.e != null ? b.e === c.e : b.u === String(c.u)); });
    const boxOf = ob => { // 빚은 꼭짓점(불투명한 부분·유리)을 둘러싼 상자. 꼭짓점이 없으면 자리·크기로 어림
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      const add = (v, a, n) => { for (let i = a; i < a + n; i++) for (let q = 0; q < 3; q++) { const x = v[i * 9 + q]; if (x < lo[q]) lo[q] = x; if (x > hi[q]) hi[q] = x; } };
      if (ob.op && ob.op[1]) add(opV, ob.op[0], ob.op[1]); ob.glass.forEach(gp => add(gp.v, 0, gp.v.length / 9));
      if (lo[0] <= hi[0]) return { lo, hi };
      const hd = halfDepth(ob.d) || Math.max(10, ob.hw * .6); return { lo: [ob.cx - ob.hw, ob.y0, ob.az - hd], hi: [ob.cx + ob.hw, ob.y1, ob.az + hd] };
    };
    objs.forEach(ob => { ob.pk = ob.d.pk || null; ob.box = boxOf(ob); });
    // 움직임 (v1.25): 떼어 낸 조각 카드와 흔드는 그릇. o.motion은 그림 엔진의 움직임 상태 (움직임 끄기·동작 줄이기)
    const fxAll = allCards.flatMap(c => c.fx || []);
    objs.forEach(ob => { const g = ob.d.g || {}; if (ob.d.p && ob.d.p.shake && g.hold) ob.shake = [g.hold.x - CX, B - g.hold.y, ob.az]; });
    return { S, E, cards, parts, unitZ, zAt, opV, objs, objByE, top, cardOfE, allCards, fxAll };
  }
  const S = cutScene(K, o.items, !o.unseen), { labels } = S, AS = assemble(S);
  const { E, cards, unitZ, zAt, opV, objs, objByE, top, cardOfE, allCards, fxAll } = AS;
  const arrows = E.filter(d => d && d.t === 'arrow' && d.g && d.g.a && d.g.b);
  const pipes = E.filter(d => d && (d.t === 'hose' || d.t === 'tubing' || d.t === 'wire') && !d.d3 && d.g && Array.isArray(d.g.pts) && d.g.pts.length > 1);
  const heats = E.filter(d => d && d.t === 'heat' && d.g), currents = E.filter(d => d && d.t === 'current' && d.g), pipeScr = new Map(); // 보이지 않는 것 (v1.31)
  const anim3 = !still && (o.motion ?? !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  allCards.forEach(c => { xmin = Math.min(xmin, c.px + c.ox - c.w / 2); xmax = Math.max(xmax, c.px + c.ox + c.w / 2); ymin = Math.min(ymin, c.py); ymax = Math.max(ymax, c.py + c.h); });
  objs.forEach(ob => { xmin = Math.min(xmin, ob.cx - ob.hw); xmax = Math.max(xmax, ob.cx + ob.hw); ymin = Math.min(ymin, ob.y0); ymax = Math.max(ymax, ob.y1); });
  if (!isFinite(xmin)) { xmin = -CX; xmax = CX; ymin = 0; ymax = 160; }
  const tx0 = (xmin + xmax) / 2, ty0 = (Math.min(ymin, bench ? -20 : ymin) + ymax) / 2, spanX = xmax - xmin, spanY = ymax - ymin;
  // 이 시점에서 모든 것이 화면에 들어오는 거리: 카드·부품의 위아래 끝을 카메라 기준으로 재어 가장 먼 것을 고른다
  const fitPts = allCards.flatMap(c => [[c.px + c.ox, c.py, c.pz, c.w / 2], [c.px + c.ox, c.py + c.h, c.pz, c.w / 2]]).concat(objs.flatMap(ob => [[ob.cx, ob.y0, ob.az, ob.hw], [ob.cx, ob.y1, ob.az, ob.hw]]));
  arrows.forEach(d => { if (d.fromE == null) fitPts.push([d.g.a.x - CX, B - d.g.a.y, 0, 0]); if (d.toE == null) fitPts.push([d.g.b.x - CX, B - d.g.b.y, 0, 0]); });
  if (!fitPts.length) fitPts.push([xmin, ymin, 0, 0], [xmax, ymax, 0, 0]);
  if (bench) fitPts.push([tx0, -14, 0, spanX / 2]); // 실험대 앞 모서리가 조금 보이게
  function fitDist(az, el, asp) {
    const a = az * DEG, e = el * DEG, ty = Math.tan(FOV / 2) * .88, tx = Math.tan(FOV / 2) * asp * .92;
    const r = [Math.cos(a), 0, -Math.sin(a)], b = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)], u = [-Math.sin(e) * Math.sin(a), Math.cos(e), -Math.sin(e) * Math.cos(a)];
    let d = 1;
    fitPts.forEach(([x, y, z, hw]) => {
      const q = [x - tx0, y - ty0, z], dot = v => q[0] * v[0] + q[1] * v[1] + q[2] * v[2];
      const zb = dot(b), ox = Math.abs(dot(r)) + hw, oy = Math.abs(dot(u));
      d = Math.max(d, zb + ox / tx, zb + oy / ty);
    });
    return d;
  }

  // 시연 (v1.26): 시작 장면과 끝 장면의 같은 부품을 짝짓는다. 그림 엔진이 붙인 고정 이름(k), 없으면 같은 종류·속성, 묶음 카드는 같은 그림
  function matchScenes(A, A0) {
    const norm = c => c && c.xml ? c.xml.replace(/(id="|url\(#|href="#)[^"')\s]+/g, '$1') : '';
    const sameTex = (a, b) => !!(a && b) && Math.abs(a.w - b.w) < .6 && Math.abs(a.h - b.h) < .6 && norm(a) === norm(b);
    const flat = X => { const out = [], walk = it => { out.push(it); (it.kids || []).forEach(walk); }; X.top.forEach(walk); return out; };
    const dOf = (X, it) => it.kind === 'obj' ? it.d : it.e != null ? X.E[it.e] : null;
    const keyOf = (X, it) => { const d = dOf(X, it), k = d ? d.k : it.keys ? 'u:' + it.keys : null; return k ? (it.kind === 'obj' ? 'o|' : 'c|') + k : null; };
    const sigOf = (X, it) => { const d = dOf(X, it); return d ? it.kind + '|' + d.t + '|' + JSON.stringify(d.p) : null; };
    const I1 = flat(A), I0 = flat(A0), byKey = new Map();
    I0.forEach(it => { const k = keyOf(A0, it); if (k && !byKey.has(k)) byKey.set(k, it); });
    const pairs = [], enter = [];
    I1.forEach(it => { const k = keyOf(A, it), it0 = k && byKey.get(k); if (it0 && !it0.taken) { it0.taken = true; pairs.push([it, it0]); } else enter.push(it); });
    for (let j = enter.length - 1; j >= 0; j--) {
      const it = enter[j], sg = sigOf(A, it);
      const it0 = I0.find(x => !x.taken && x.kind === it.kind && (sg ? sigOf(A0, x) === sg : !dOf(A0, x) && sameTex(x, it)));
      if (it0) { it0.taken = true; pairs.push([it, it0]); enter.splice(j, 1); }
    }
    let moved = false;
    pairs.forEach(([it, it0]) => {
      it.tw = { from: it0 };
      const off = it.kind === 'obj' ? [it0.ax - it.ax, it0.y0 - it.y0, it0.az - it.az] : [(it0.px + it0.ox) - (it.px + it.ox), it0.py - it.py, it0.pz - it.pz];
      if (Math.hypot(...off) > .3) { it.tw.off = off; moved = true; }
      if (it.kind === 'obj') {
        const L = it.liquids, L0 = it0.liquids;
        if (L.length !== L0.length || L.some((lq, j) => Math.abs(lq.hi - L0[j].hi) > .3 || lq.color.some((v, q) => Math.abs(v - L0[j].color[q]) > .01))) moved = true;
        if (it.decal && !sameTex(it.decal, it0.decal)) { it.decal.tw0 = it0.decal || 'none'; moved = true; }
      } else if (!sameTex(it, it0)) { it.tw0 = it0; moved = true; }
    });
    enter.forEach(it => { const d = dOf(A, it), t = d ? d.t : (it.types || [])[0]; it.tw = { enter: true, drop: TW_DROP3.has(t) }; });
    // 사라지는 것: 짝이 없는 시작 장면의 부품 (짝지은 그릇 안에 있던 것은 꺼내어 따로 그린다)
    const ghosts = [], pick = it => { if (!it.taken) { it.ghost = true; ghosts.push(it); } else (it.kids || []).forEach(pick); };
    A0.top.forEach(pick);
    if (!moved && !enter.length && !ghosts.length) return null;
    const swap = enter.length + ghosts.length > 0;
    return { ghosts, ghostObjs: A0.objs.filter(ob => !ob.taken), moved, swap, dur: moved ? (swap ? 1500 : 1100) : 650, t0: null, k: 0, kc: 0, kIn: 0, kOut: 0 };
  }

  /* WebGL 자원 */
  const quad = buffer(gl, [-.5, 0, 0, 0, 1, .5, 0, 0, 1, 1, .5, 1, 0, 1, 0, -.5, 0, 0, 0, 1, .5, 1, 0, 1, 0, -.5, 1, 0, 0, 0]);
  const flat = buffer(gl, [-.5, 0, -.5, 0, 0, .5, 0, -.5, 1, 0, .5, 0, .5, 1, 1, -.5, 0, -.5, 0, 0, .5, 0, .5, 1, 1, -.5, 0, .5, 0, 1]);
  const roomV = bench ? room(Math.min(-CX - 40, xmin - 40), Math.max(CX + 40, xmax + 40)) : [];
  const opAll = new Float32Array(roomV.concat(opV)), opB = opAll.length ? buffer(gl, opAll) : null, opN = opAll.length / 9, roomN = roomV.length / 9;
  const bufs = [];
  const upload = list => list.forEach(ob => {
    ob.glass.forEach(gp => { gp.b = buffer(gl, gp.v); gp.n = gp.v.length / 9; bufs.push(gp.b); });
    const made = new Map(); ob.liquids.forEach(lq => { if (!made.has(lq.v)) { const b = buffer(gl, lq.v); made.set(lq.v, b); bufs.push(b); } lq.b = made.get(lq.v); lq.n = lq.v.length / 9; });
    ob.caps.forEach(cp => { const r = Math.max(ob.hw * 2.2, 60), v = [-r, 0, -r, r, 0, -r, r, 0, r, -r, 0, -r, r, 0, r, -r, 0, r].map((q, i) => i % 3 === 0 ? q + ob.ax : i % 3 === 1 ? cp.y : q + ob.az); cp.b = buffer(gl, v); bufs.push(cp.b); });
  });
  upload(objs);
  // 시연 (v1.26): 시작 장면(o.from)도 세워 두고 같은 부품끼리 짝짓는다. 움직임 끄기·동작 줄이기·점검 촬영이면 하지 않는다
  let AS0 = null, opB0 = null, TR = null, FADE = 1; // FADE: 지금 그리는 부품의 흐림 (시연 중)
  if (!still && (o.motion ?? !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) && Array.isArray(o.from) && o.from.length) {
    try { AS0 = assemble(cutScene(K, o.from, !o.unseen)); upload(AS0.objs); opB0 = AS0.opV.length ? buffer(gl, new Float32Array(AS0.opV)) : null; TR = matchScenes(AS, AS0); }
    catch (e) { warn('시연의 시작 장면을 세우지 못했어요: ' + e.message); TR = null; }
    if (TR) cv.dataset.tw = 'run';
  }
  const shTex = texture(gl, shadowCanvas(), gl2);
  objs.forEach(ob => { if (ob.top) ob.top.tex = texture(gl, ob.top.canvas, gl2); });
  let alive = true, frame = 0, done = 0, failed = 0;
  const toLoad = allCards.concat(fxAll, TR ? AS0.allCards : []);
  const ready = Promise.all(toLoad.map(c => raster(c).then(img => {
    if (!alive) return;
    try { c.tex = texture(gl, img, gl2); if (o.onPick && !still) c.cvs = img; } catch (e) { failed++; warn('그림 카드를 올리지 못했어요 (' + c.types.join(',') + '): ' + e.message); }
    done++; load.textContent = `실험대를 꾸미는 중… ${done}/${toLoad.length}`; invalidate();
  }, e => { failed++; done++; warn(e.message); invalidate(); }))).then(() => { load.hidden = true; if (TR) TR.t0 = performance.now(); invalidate(); return { units: cards.length, meshes: objs.length, failed }; }); // 시연은 그림이 다 올라온 뒤 시작
  if (!allCards.length) load.hidden = true;

  /* 카메라 */
  const v0 = VIEWS[o.view] || VIEWS.angle;
  const cam = { az: v0.az, el: v0.el, zoom: 1, panX: 0, panY: 0, panZ: 0, faz: v0.az, fel: v0.el }; // faz·fel: 거리를 맞춘 시점 (끌어 돌릴 때는 그대로 둔다)
  let anim = null, view = VIEWS[o.view] ? o.view : 'angle';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moving = !still && (o.motion ?? !reduce) && (fxAll.length > 0 || objs.some(ob => ob.shake));
  cv.dataset.motion = moving ? 'on' : 'off';
  const T0 = performance.now(); let tNow = 0, MOD = null, lastSig = '', tick = 0; // MOD: 흔드는 그릇을 그릴 때 곱하는 행렬
  const setPressed = () => { if (ctl) ctl.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view)); };
  setPressed();
  function goView(name) {
    const v = VIEWS[name]; if (!v) return; view = name; setPressed();
    const from = { ...cam }, to = { az: v.az, el: v.el, zoom: 1, panX: 0, panY: 0, panZ: 0, faz: v.az, fel: v.el };
    while (from.az - to.az > 180) from.az -= 360; while (to.az - from.az > 180) from.az += 360;
    if (reduce || still) { Object.assign(cam, to); anim = null; return invalidate(); }
    anim = { from, to, t0: performance.now(), dur: 450 }; invalidate();
  }
  const eyeOf = asp => {
    const d = fitDist(cam.faz, cam.fel, asp) * cam.zoom, a = cam.az * DEG, e = cam.el * DEG;
    const tgt = [tx0 + cam.panX, ty0 + cam.panY, cam.panZ];
    return { d, tgt, eye: [tgt[0] + d * Math.cos(e) * Math.sin(a), tgt[1] + d * Math.sin(e), tgt[2] + d * Math.cos(e) * Math.cos(a)] };
  };

  /* 그리기 */
  let W = 0, H = 0, PV = null, EYE = [0, 0, 1], RIGHT = [1, 0, 0];
  function invalidate() { if (alive && !frame) frame = requestAnimationFrame(draw); }
  const surfAttr = (prog, b) => { const a = prog.at; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 36, 0); if (a.n != null && a.n >= 0) { gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 36, 12); } };
  const offAttr = prog => Object.values(prog.at).forEach(i => i >= 0 && gl.disableVertexAttribArray(i));
  // 시연 (v1.26) 중의 부품 모습: 흐림(fade)·옮김(off). 짝지은 부품은 시작 자리에서 끝 자리로, 새 부품은 나타나고(동작 부품은 위에서 내려오고), 빠진 부품은 흐려진다
  function trState(it) {
    if (!TR) return null;
    if (it.ghost) return { fade: 1 - TR.kOut, off: null };
    const tw = it.tw; if (!tw) return null;
    if (tw.enter) return { fade: TR.kIn, off: tw.drop ? [0, 30 * (1 - TR.kIn), 0] : null };
    return tw.off ? { fade: 1, off: tw.off.map(v => v * (1 - TR.kc)) } : null;
  }
  // 카드의 단위 사각형 안에, 같은 장면 좌표의 다른 사각형(떼어 낸 조각·시작 장면의 카드)을 놓는 행렬. A: 조각 좌표에서의 움직임
  const rectIn = (c, f, A) => {
    const S2 = A ? aMul(f.L, aMul(A, aInv(f.L))) : A1, R = [f.w, 0, 0, -f.h, f.x + f.w / 2, f.y + f.h], U = [1 / c.w, 0, 0, -1 / c.h, -c.x / c.w - .5, (c.y + c.h) / c.h], Q = aMul(U, aMul(S2, R));
    return new Float32Array([Q[0], Q[1], 0, 0, Q[2], Q[3], 0, 0, 0, 0, 1, 0, Q[4], Q[5], 0, 1]);
  };
  function drawCard(c, lean) {
    if (!c.tex) return;
    const th = c.mode === 'fixed' ? 0 : Math.atan2(EYE[0] - c.px, EYE[2] - c.pz);
    c.m = cardMat(c.px, c.py, c.pz, th, c.mode === 'fixed' || c.e != null ? 0 : lean, c.w, c.h, c.ox); // 입체 부품 곁의 카드는 곧게 (유리와 어긋나지 않게)
    const st = trState(c), a = FADE * (st ? st.fade : 1); if (a <= .003) return;
    let M = MOD ? mul(MOD, c.m) : c.m; if (st && st.off) M = mul(mT(...st.off), M);
    gl.useProgram(P_TEX.p); gl.disable(gl.CULL_FACE); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const at = P_TEX.at; gl.enableVertexAttribArray(at.p); gl.vertexAttribPointer(at.p, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(at.q); gl.vertexAttribPointer(at.q, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P_TEX.un.t, 0);
    // 시작 장면의 그림이 다르면(숫자·색·모양이 바뀐 카드) 두 그림을 겹쳐 바꾼다
    const old = TR && c.tw0, kc = TR ? TR.kc : 1, a1 = old ? a * kc : a;
    if (old && old !== 'none' && old.tex) { gl.bindTexture(gl.TEXTURE_2D, old.tex); gl.uniform1f(P_TEX.un.a, a * (1 - kc)); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, mul(M, rectIn(c, old)))); gl.drawArrays(gl.TRIANGLES, 0, 6); }
    gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniform1f(P_TEX.un.a, a1);
    gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, M)); gl.drawArrays(gl.TRIANGLES, 0, 6);
    // 떼어 낸 조각: 조각 사각형 → (조각 좌표에서 움직인 만큼) 장면 좌표 → 이 카드의 단위 사각형 → 카드 자리
    if (c.fx) c.fx.forEach(f => {
      if (!f.tex) return;
      const fs = moving ? fxAt(f, tNow) : { A: A1, a: f.a0 }; if (fs.a * a1 <= .003) return;
      gl.bindTexture(gl.TEXTURE_2D, f.tex); gl.uniform1f(P_TEX.un.a, Math.min(1, fs.a) * a1); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, mul(M, rectIn(c, f, fs.A)))); gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    offAttr(P_TEX);
  }
  // 단면 보기 (v1.30): 고른 부품을 축을 지나 카메라를 보는 세로 면으로 잘라 앞쪽 반을 걷어 낸다 (CUT: { ob, X })
  const NOX = new Float32Array([0, 0, 0, -1e5]), clipOf = ob => CUT && CUT.ob === ob ? CUT.X : NOX;
  function drawGlass(ob, face) {
    if (!ob.glass.length) return;
    gl.useProgram(P_GLASS.p); gl.enable(gl.CULL_FACE); gl.cullFace(face); gl.uniform4fv(P_GLASS.un.X, clipOf(ob));
    gl.uniformMatrix4fv(P_GLASS.un.m, false, MOD ? mul(PV, MOD) : PV); gl.uniform3fv(P_GLASS.un.E, EYE); gl.uniform3fv(P_GLASS.un.L, LIGHT);
    ob.glass.forEach(gp => { gl.uniform3fv(P_GLASS.un.T, gp.tint); gl.uniform1f(P_GLASS.un.A, gp.alpha * FADE); gl.uniform1f(P_GLASS.un.K, gp.edge * FADE); surfAttr(P_GLASS, gp.b); gl.drawArrays(gl.TRIANGLES, 0, gp.n); });
    offAttr(P_GLASS); gl.disable(gl.CULL_FACE);
  }
  // 액체와 수면. 시연 중 짝지은 그릇은 시작 장면의 높이·색에서 끝 장면으로 (없던 액체는 바닥에서 차오르고, 없어진 액체는 바닥으로 줄어든다)
  function drawLiquid(ob) {
    const from = TR && ob.tw && ob.tw.from && ob.tw.from.kind === 'obj' ? ob.tw.from : null, kc = TR ? TR.kc : 1;
    const now = ob.liquids.map((lq, j) => {
      const b0 = from && from.liquids[j]; if (!from || lq.hi >= 1e8) return { hi: lq.hi, color: lq.color };
      const h0 = b0 ? (b0.hi >= 1e8 ? lq.hi : b0.hi) : lq.floor; return { hi: h0 + (lq.hi - h0) * kc, color: b0 ? mix(b0.color, lq.color, kc) : lq.color };
    });
    const gone = from ? from.liquids.slice(ob.liquids.length).map((b0, q) => ({ lq: b0, j: ob.liquids.length + q, hi: b0.hi >= 1e8 ? b0.hi : b0.hi + (b0.floor - b0.hi) * kc, color: b0.color })) : [];
    const bands = ob.liquids.map((lq, j) => ({ lq, hi: now[j].hi, color: now[j].color })).concat(gone);
    if (bands.length) {
      gl.useProgram(P_LIQ.p); gl.enable(gl.CULL_FACE); gl.uniformMatrix4fv(P_LIQ.un.m, false, MOD ? mul(PV, MOD) : PV); gl.uniform3fv(P_LIQ.un.L, LIGHT); gl.uniform4fv(P_LIQ.un.X, clipOf(ob)); gl.uniform1f(P_LIQ.un.S, CUT && CUT.ob === ob ? 1 : 0);
      [gl.FRONT, gl.BACK].forEach(face => { gl.cullFace(face); bands.forEach(b => { gl.uniform3fv(P_LIQ.un.C, b.color); gl.uniform1f(P_LIQ.un.A, b.lq.alpha * FADE); gl.uniform1f(P_LIQ.un.lo, b.lq.lo); gl.uniform1f(P_LIQ.un.hi, b.hi); surfAttr(P_LIQ, b.lq.b); gl.drawArrays(gl.TRIANGLES, 0, b.lq.n); }); });
      offAttr(P_LIQ); gl.disable(gl.CULL_FACE);
    }
    const caps = ob.caps.map(cp => ({ cp, hi: now[cp.j] ? now[cp.j].hi : cp.y, color: now[cp.j] ? now[cp.j].color : cp.color }))
      .concat(from ? from.caps.filter(cp => cp.j >= ob.liquids.length).map(cp => { const g = gone.find(x => x.j === cp.j); return { cp, hi: g ? g.hi : cp.y, color: cp.color }; }) : []);
    if (caps.length) {
      gl.useProgram(P_CAP.p); gl.uniformMatrix4fv(P_CAP.un.m, false, MOD ? mul(PV, MOD) : PV); gl.uniform4fv(P_CAP.un.X, clipOf(ob));
      caps.forEach(({ cp, hi, color }) => {
        gl.uniformMatrix4fv(P_CAP.un.IM, false, cp.IM); gl.uniform1fv(P_CAP.un.R, cp.R); gl.uniform1f(P_CAP.un.h0, cp.h0); gl.uniform1f(P_CAP.un.h1, cp.h1); gl.uniform1f(P_CAP.un.dy, hi - cp.y);
        gl.uniform1f(P_CAP.un.bx, cp.bx); gl.uniform2fv(P_CAP.un.hb, cp.hb || [0, 0]); gl.uniform3fv(P_CAP.un.C, color); gl.uniform1f(P_CAP.un.A, cp.alpha * FADE);
        gl.bindBuffer(gl.ARRAY_BUFFER, cp.b); gl.enableVertexAttribArray(P_CAP.at.p); gl.vertexAttribPointer(P_CAP.at.p, 3, gl.FLOAT, false, 12, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
      offAttr(P_CAP);
    }
  }
  const distOf = it => it.kind === 'obj' ? Math.hypot(EYE[0] - it.cx, EYE[1] - it.cy, EYE[2] - it.az) : Math.hypot(EYE[0] - (it.px + it.ox), EYE[1] - (it.py + it.h / 2), EYE[2] - it.pz);
  const byFar = list => list.map(it => [distOf(it), it]).sort((a, b) => b[0] - a[0] || (a[1].order ?? 0) - (b[1].order ?? 0)).map(x => x[1]);
  function drawItem(it, lean) {
    if (it.kind !== 'obj') return drawCard(it, lean);
    const prev = MOD, prevF = FADE, st = trState(it);
    let own = MOD;
    if (moving && it.shake) { // 흔드는 그릇: 잡는 곳을 축으로 -7°~7° (2D와 같은 0.75초)
      const p = it.shake, R = chain(mT(p[0], p[1], p[2]), mRz(-keys(frac(tNow / .75), [[0, -7], [.5, 7], [1, -7]]) * DEG), mT(-p[0], -p[1], -p[2]));
      own = own ? mul(own, R) : R;
    }
    const self = st && st.off ? mul(mT(...st.off), own || ID()) : own; // 시연에서 옮기는 만큼 (그릇 안의 것은 저마다 옮긴다)
    if (st) FADE = prevF * st.fade;
    MOD = self; drawGlass(it, gl.FRONT);                               // 유리 뒷면
    MOD = own; byFar(it.kids.filter(k => !k.taken)).forEach(k => drawItem(k, lean)); // 그릇 안의 것 (시작 장면에서 끝 장면과 짝지은 것은 끝 장면 쪽에서 그린다)
    MOD = self; drawLiquid(it);                                         // 액체와 수면
    drawGlass(it, gl.BACK);                                             // 유리 앞면
    if (it.decal) drawCard(it.decal, lean);                             // 눈금·거품·불꽃 같은 덧그림
    MOD = prev; FADE = prevF;
  }
  const setK = k => { TR.k = k; TR.kc = ease3(TR.swap && TR.moved ? (k - .3) / .7 : k); TR.kOut = ease3(TR.moved ? k / .3 : k); TR.kIn = ease3(TR.moved ? k / .35 : k); };
  function draw(now) {
    frame = 0; if (!alive) return;
    const tn = now || performance.now();
    tNow = (tn - T0) / 1000; cv._frames = (cv._frames || 0) + 1;
    if (TR) { if (TR.t0 == null) setK(0); else { const k = (tn - TR.t0) / TR.dur; if (k >= 1) { TR = null; delete cv.dataset.tw; lastSig = ''; lines.style.visibility = tagBox.style.visibility = ''; } else setK(k); } }
    if (anim) { const k = clamp((tn - anim.t0) / anim.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; Object.keys(anim.to).forEach(p => { cam[p] = anim.from[p] + (anim.to[p] - anim.from[p]) * e; }); if (k >= 1) anim = null; else invalidate(); }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = (o.size && o.size[0]) || stage.clientWidth || 960, ch = (o.size && o.size[1]) || stage.clientHeight || 600;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    W = cw; H = ch;
    const { d, eye, tgt } = eyeOf(cw / ch), P = persp(FOV, cw / ch, d * .05, d * 12), V = lookAt(eye, tgt);
    PV = mul(P, V); EYE = eye; RIGHT = [V[0], V[4], V[8]];
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    const opaque = (b, f) => { // 실험대와 불투명한 부품
      gl.disable(gl.BLEND); gl.depthMask(true); gl.useProgram(P_COL.p); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      const a = P_COL.at; gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(a.c); gl.vertexAttribPointer(a.c, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(P_COL.un.m, false, PV); gl.uniform3fv(P_COL.un.L, LIGHT); gl.uniform4fv(P_COL.un.X, NOX); gl.uniform1f(P_COL.un.S, 0); f(); offAttr(P_COL);
    };
    // 단면: 고른 부품을 축을 지나 카메라 쪽을 보는 세로 면으로 자른다 (시연 중에는 하지 않는다. 수조처럼 네모난 그릇은 모서리를 따라)
    const cob = !TR && cutOn ? selOb() : null;
    if (cob) { let nx = EYE[0] - cob.ax, nz = EYE[2] - cob.az; if (cob.boxy) { if (Math.abs(nx) > Math.abs(nz)) nz = 0; else nx = 0; } const l = Math.hypot(nx, nz) || 1; CUT = { ob: cob, X: new Float32Array([nx / l, 0, nz / l, -(nx * cob.ax + nz * cob.az) / l]), n: [nx / l, nz / l] }; } else CUT = null;
    if (opB) opaque(opB, () => {
      if (CUT && CUT.ob.op && CUT.ob.op[1]) { // 자른 부품만 따로 (앞쪽은 버리고 잘린 속은 빗금)
        const [a, n] = CUT.ob.op; gl.drawArrays(gl.TRIANGLES, 0, roomN + a);
        gl.uniform4fv(P_COL.un.X, CUT.X); gl.uniform1f(P_COL.un.S, 1); gl.drawArrays(gl.TRIANGLES, roomN + a, n);
        gl.uniform4fv(P_COL.un.X, NOX); gl.uniform1f(P_COL.un.S, 0); if (opN > roomN + a + n) gl.drawArrays(gl.TRIANGLES, roomN + a + n, opN - roomN - a - n);
        return;
      }
      if (!TR) return gl.drawArrays(gl.TRIANGLES, 0, opN);
      if (roomN) gl.drawArrays(gl.TRIANGLES, 0, roomN); // 시연 중: 부품마다 (새 부품은 반쯤 나타난 뒤에, 옮기는 부품은 옮긴 자리에)
      objs.forEach(ob => { if (!ob.op || !ob.op[1]) return; const st = trState(ob); if (st && st.fade < .5) return; gl.uniformMatrix4fv(P_COL.un.m, false, st && st.off ? mul(PV, mT(...st.off)) : PV); gl.drawArrays(gl.TRIANGLES, roomN + ob.op[0], ob.op[1]); });
    });
    if (TR && opB0 && TR.kOut < .5) opaque(opB0, () => TR.ghostObjs.forEach(ob => { if (ob.op && ob.op[1]) gl.drawArrays(gl.TRIANGLES, ob.op[0], ob.op[1]); })); // 사라지는 부품의 불투명한 부분
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    // 그림자: 실험대에 닿은 곳에만
    gl.useProgram(P_TEX.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P_TEX.un.t, 0); gl.uniform1f(P_TEX.un.a, 1); gl.bindBuffer(gl.ARRAY_BUFFER, flat);
    { const at = P_TEX.at; gl.enableVertexAttribArray(at.p); gl.vertexAttribPointer(at.p, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(at.q); gl.vertexAttribPointer(at.q, 2, gl.FLOAT, false, 20, 12); }
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    const shade = (f, z) => { const w = (f.x2 - f.x) * 1.1 + 12, sx = (f.x + f.x2) / 2 - CX, m = new Float32Array([w, 0, 0, 0, 0, 1, 0, 0, 0, 0, clamp(w * .5, 22, 70), 0, sx, .3, z, 1]); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, m)); gl.drawArrays(gl.TRIANGLES, 0, 6); };
    cards.forEach(c => { if (c.foot && c.tex && c.feet) shade(c.feet, c.pz); });
    objs.forEach(ob => { if (ob.foot) shade(ob.foot, ob.az); });
    objs.forEach(ob => { if (!ob.top || !ob.top.tex) return; gl.bindTexture(gl.TEXTURE_2D, ob.top.tex); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, ob.top.M)); gl.drawArrays(gl.TRIANGLES, 0, 6); }); // 홈판 윗면
    offAttr(P_TEX);
    const lean = clamp(cam.el * .3, 0, 14) * DEG; // 높이서 볼 때 카드를 조금 눕혀 덜 납작하게
    const all = TR ? top.concat(TR.ghosts) : top;
    byFar(all.filter(it => !(it.kind !== 'obj' && it.over && !it.sign))).forEach(it => drawItem(it, lean));
    byFar(all.filter(it => it.kind !== 'obj' && it.over && !it.sign)).forEach(it => drawCard(it, lean)); // 설명 카드는 맨 나중에
    gl.depthMask(true);
    if (TR) { lines.style.visibility = tagBox.style.visibility = 'hidden'; return invalidate(); } // 시연 중에는 선·이름표를 감춘다
    // 선·이름표는 시점·크기·카드가 바뀔 때만 다시 놓는다 (움직임만 있는 장면은 그대로)
    const sig = [cam.az, cam.el, cam.zoom, cam.panX, cam.panY, W, H, done, selK, CUT ? 1 : 0].join();
    syncSec();
    if (!moving || sig !== lastSig) { lines.innerHTML = overlay() + placeTags(); lastSig = sig; }
    if (moving && !tick) tick = setTimeout(() => { tick = 0; invalidate(); }, 30); // 움직임만 있으면 1초에 30장쯤
  }

  /* 이름표: 카드(또는 입체 부품의 축) 위의 점을 화면에 비춰 글자로 띄운다 (가리지 않게 위아래로 비켜 놓는다) */
  const unitCard = new Map(cards.filter(c => c.e == null).map(c => [String(c.u), c]));
  // 2D 점 (x, y)를 부품 e의 입체 자리로: 그 부품의 카드 → 입체 부품의 덧그림 → 입체 부품의 축 → 묶음 카드 → 실험대 가운데 평면
  function worldAt(x, y, e) {
    if (e != null && E[e]) {
      const w = E[e], pb = w.t === '_well' && objByE.get(w.parentE); // 홈판의 홈: 입체 홈 자리로
      if (pb && pb.wellShift && w.g && w.g.rc) { const sh = pb.wellShift(...w.g.rc); return [x - CX, B - y - sh.dy, pb.az + sh.dz, 1]; }
      const ob = objByE.get(e), c = cardOfE.get(e) || (ob && ob.decal) || (!ob && unitCard.get(String(E[e].u)));
      if (c && c.m && c.tex) return apply(c.m, (x - c.x) / c.w - .5, (c.y + c.h - y) / c.h, 0);
      if (ob) { const th = Math.atan2(EYE[0] - ob.ax, EYE[2] - ob.az), dx = x - ob.gx; return [ob.ax + dx * Math.cos(th), B - y, ob.az - dx * Math.sin(th), 1]; }
      return [x - CX, B - y, zAt(E[e].u, e), 1];
    }
    return [x - CX, B - y, 0, 1];
  }
  const scr = w => { const p = apply(PV, w[0], w[1], w[2]); return p[3] > 0 ? { x: (p[0] / p[3] * .5 + .5) * W, y: (.5 - p[1] / p[3] * .5) * H } : null; };
  const pxPer = w => { const a = scr(w), b = scr([w[0] + RIGHT[0], w[1] + RIGHT[1], w[2] + RIGHT[2]]); return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1; };
  const tags = labels.map(l => {
    let c = null, ob = null;
    if (l.e != null) { c = cardOfE.get(l.e) || null; ob = objByE.get(l.e) || null; if (!c && ob) c = ob.decal || null; } // 부품 카드 → 입체 부품의 덧그림 → 그 축
    if (l.well && ob && ob.well) c = null; // 홈판 홈의 이름표는 입체 홈 자리에
    if (!c && !ob) c = unitCard.get(String(l.u)) || null; // 묶음 카드 (v1.19)
    const wz = !c && !ob ? unitZ.get(String(l.u)) ?? 0 : null; // 그린 것이 없는 이름표(label 부품)는 가리키는 곳 그대로
    const n = document.createElement('span'); n.className = 'v3-tag' + (l.tone === 'hot' || l.tone === 'arrow' ? ' ' + l.tone : ''); n.textContent = l.text; tagBox.appendChild(n);
    return { l, c, ob, wz, n, w: 0, h: 0 };
  }).filter(Boolean);
  function screenOf(t) {
    const { l, c, ob } = t; let p;
    if (t.w3) { const w = t.w3(); if (!w) return null; p = apply(PV, w[0], w[1], w[2]); }
    else if (l.well && ob && ob.well) { const w = ob.well(...l.well); p = apply(PV, w[0], w[1], w[2]); }
    else if (c) { if (!c.m || !c.tex) return null; p = apply(mul(PV, c.m), (l.x - c.x) / c.w - .5, (c.y + c.h - l.y) / c.h, 0); }
    else if (!ob) p = apply(PV, l.x - CX, B - l.y, t.wz);
    else { const th = Math.atan2(EYE[0] - ob.ax, EYE[2] - ob.az), dx = l.x - ob.gx; p = apply(PV, ob.ax + dx * Math.cos(th), B - l.y, ob.az - dx * Math.sin(th)); }
    return p[3] > 0 ? { x: (p[0] / p[3] * .5 + .5) * W, y: (.5 - p[1] / p[3] * .5) * H } : null;
  }
  // 단면 보기의 안쪽 이름표: 자른 부품이 바뀔 때 만든다. 자리는 축 위 높이 y에서 자르는 면을 따라 옆으로 r (또는 부품 좌표 at)
  let secTags = [], secOf = null;
  function syncSec() {
    const ob = CUT ? CUT.ob : null; if (ob === secOf) return;
    secTags.forEach(t => t.n.remove()); secTags = []; secOf = ob; if (!ob) return;
    const k = Math.hypot(ob.M[0], ob.M[1], ob.M[2]) || 1;
    secTags = (ob.sec || []).map(sc => {
      const n = document.createElement('span'); n.className = 'v3-tag sec'; n.textContent = sc.t; tagBox.appendChild(n);
      const w3 = () => { if (!CUT) return null; if (sc.at) return apply(ob.M, ...sc.at); const a = apply(ob.M, 0, sc.y, 0); let u = [-CUT.n[1], 0, CUT.n[0]]; if (u[0] * RIGHT[0] + u[2] * RIGHT[2] < 0) u = u.map(v => -v); return [a[0] + u[0] * sc.r * k, a[1], a[2] + u[2] * sc.r * k]; };
      return { l: { pin: true, text: sc.t }, n, w: 0, h: 0, w3 };
    });
  }
  function placeTags() {
    const all = tags.concat(secTags); if (!all.length) return '';
    const boxes = [], hit = b => boxes.some(q => b.x < q.x + q.w + 4 && b.x + b.w + 4 > q.x && b.y < q.y + q.h + 3 && b.y + b.h + 3 > q.y);
    let svg = '';
    all.forEach(t => {
      const s = screenOf(t); if (!s) { t.n.style.display = 'none'; return; }
      t.n.style.display = ''; if (!t.w) { t.w = t.n.offsetWidth; t.h = t.n.offsetHeight; }
      const w = t.w, h = t.h;
      let b;
      if (!t.l.pin) b = { x: s.x - w / 2, y: s.y - h / 2, w, h };
      else {
        const side = s.x + 22 + w > W - 6 ? -1 : 1;
        const make = dy => ({ x: side > 0 ? s.x + 22 : s.x - 22 - w, y: s.y - h / 2 + dy, w, h });
        b = make(0); for (let i = 1; i < 12 && hit(b); i++) b = make((i % 2 ? 1 : -1) * Math.ceil(i / 2) * (h + 4));
        const ex = side > 0 ? b.x : b.x + w, ey = b.y + h / 2;
        svg += `<path d="M${s.x.toFixed(1)},${s.y.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}" stroke="#9aa2b4" stroke-width="1.3"/><circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="3" fill="#fff" stroke="#7f889c" stroke-width="1.4"/>`;
      }
      boxes.push(b); t.n.style.transform = `translate(${Math.round(b.x)}px,${Math.round(b.y)}px)`;
    });
    return svg;
  }
  // 화살표·말풍선 지시선·눈 시선·확대 원의 선: 두 끝을 각 부품의 입체 자리에 이어 긋는다 (돌려도 가리키는 곳에 붙어 있게)
  const mkMarker = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse"><path d="M0,0.6 L10,5 L0,9.4 Z" fill="${c}"/></marker>`;
  const f1 = v => v.toFixed(1);
  const HEAT3 = '#f0662f', COOL3 = '#4b86e0';
  const wave2 = (a, b, off, amp, lam) => { // 화면에서 a → b 물결 선 (옆으로 off), 끝은 곧게
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, n = Math.max(2, Math.ceil(L / 3)); let d = '';
    for (let i = 0; i <= n; i++) { const t = L * i / n, w = off + amp * Math.sin(t / lam * 6.283) * Math.min(1, (L - t) / (3 * lam / 4)); d += `${i ? ' L' : 'M'}${f1(a.x + ux * t - uy * w)},${f1(a.y + uy * t + ux * w)}`; }
    return d;
  };
  const exitPt = (from, to, quad) => { // from(사각형 안) → to 선이 사각형을 빠져나가는 점
    let best = 0;
    for (let i = 0; i < 4; i++) { const a = quad[i], b = quad[(i + 1) % 4], dx = to.x - from.x, dy = to.y - from.y, ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-6) continue; const t = ((a.x - from.x) * ey - (a.y - from.y) * ex) / den, u = ((a.x - from.x) * dy - (a.y - from.y) * dx) / den; if (t > 0 && t <= 1 && u >= 0 && u <= 1) best = best ? Math.min(best, t) : t; }
    return { x: from.x + (to.x - from.x) * best, y: from.y + (to.y - from.y) * best };
  };
  // 관·전선: 점마다 입체 자리로 옮기되, 두 끝은 이어진 부품에 붙이고 그 어긋남을 사이 점에 고르게 나눈다
  const catmull = P => { let d = `M${f1(P[0].x)},${f1(P[0].y)}`; if (P.length < 3) return d + ` L${f1(P[1].x)},${f1(P[1].y)}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2; d += ` C${f1(p1.x + (p2.x - p0.x) / 6)},${f1(p1.y + (p2.y - p0.y) / 6)} ${f1(p2.x - (p3.x - p1.x) / 6)},${f1(p2.y - (p3.y - p1.y) / 6)} ${f1(p2.x)},${f1(p2.y)}`; } return d; };
  function pipe(d) {
    const pts = d.g.pts, n = pts.length, z = zAt(d.u, d.e), raw = pts.map(([x, y]) => [x - CX, B - y, z]);
    const fix = (k, e) => { if (e == null) return [0, 0, 0]; const w = worldAt(pts[k][0], pts[k][1], e); return [w[0] - raw[k][0], w[1] - raw[k][1], w[2] - raw[k][2]]; };
    const c0 = fix(0, d.fromE), c1 = fix(n - 1, d.toE); let acc = [0], L = 0;
    for (let i = 1; i < n; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(L); }
    const W3 = raw.map((r, i) => { const t = L ? acc[i] / L : i / (n - 1); return [r[0] + c0[0] + (c1[0] - c0[0]) * t, r[1] + c0[1] + (c1[1] - c0[1]) * t, r[2] + c0[2] + (c1[2] - c0[2]) * t]; });
    const S2 = W3.map(scr); if (S2.some(v => !v)) return '';
    pipeScr.set(d.e, S2); // 전류의 흐름이 이 화면 점을 따라간다
    if (d.pk) pipeHits.push({ k: d.pk, pts: S2, r: Math.max(7, 4 * pxPer(W3[Math.floor(n / 2)])) });
    const k = pxPer(W3[Math.floor(n / 2)]), p = d.p || {}, path = catmull(S2), st = (c, w) => `<path d="${path}" fill="none" stroke="${c}" stroke-width="${f1(w * k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (p.glass) return st(INK, 6.5) + st('#eaf5fc', 3.6);
    const wc = d.t === 'wire' && p.color == null ? '#3b4253' : p.color != null ? K.col(p.color) || p.color : null;
    if (wc) { const dk = K.shade ? K.shade(wc, -.4) : '#333'; return st(dk, 4.4) + st(wc, 2.8) + [S2[0], S2[n - 1]].map(q => `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${f1(3.2 * k)}" fill="${wc}" stroke="${dk}" stroke-width="${f1(1.2 * k)}"/>`).join(''); }
    return st('#c4834a', 7.5) + st('#eab37c', 3.8);
  }
  function overlay() {
    pipeHits = []; pipeScr.clear(); const pp = pipes.map(pipe).join(''); // 관·전선의 화면 점 (누른 곳 찾기·전류의 흐름)
    let defs = '', o = selRect() + pp;
    // 보이지 않는 것 (v1.31): 열의 이동은 두 끝(그릇 안의 흐름은 점마다)을 입체 자리에 이어 물결 화살표로, 전류의 흐름은 그 전선 위에 움직이는 점으로
    const flowA = (len, dur = 1) => anim3 ? `<animate attributeName="stroke-dashoffset" from="${f1(len)}" to="0" dur="${dur}s" repeatCount="indefinite"/>` : '';
    heats.forEach((d, i) => {
      const g = d.g, ref = d.fromE ?? d.inE ?? d.toE, k = pxPer(worldAt(g.x, g.y, ref)), id = `lk3h${i}`;
      defs += mkMarker(id, HEAT3) + mkMarker(id + 'c', COOL3);
      const line = (dd, hot) => `<path d="${dd}" fill="none" stroke="#fff" stroke-width="${f1(5.6 * k)}" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/><path d="${dd}" fill="none" stroke="${hot ? HEAT3 : COOL3}" stroke-width="${f1(2.6 * k)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${f1(11 * k)} ${f1(4 * k)}" marker-end="url(#${hot ? id : id + 'c'})">${flowA(30 * k)}</path>`;
      if (g.loops3) g.loops3.forEach(L => { const P = []; for (let q = 0; q + 1 < L.f.length; q += 2) P.push(scr(worldAt(L.f[q], L.f[q + 1], d.inE))); if (P.length > 1 && P.every(Boolean)) o += line(catmull(P), L.hot); });
      else if (g.rays) g.rays.forEach(([ax, ay, bx, by]) => { const a = scr(worldAt(ax, ay, d.fromE)), b = scr(worldAt(bx, by, d.fromE)); if (a && b) o += line(wave2(a, b, 0, 2.6 * k, 10 * k), true); });
      else if (g.a && g.b) { const a = scr(worldAt(g.a.x, g.a.y, d.fromE)), b = scr(worldAt(g.b.x, g.b.y, d.toE)); if (a && b) [-9, 0, 9].forEach(off => { o += line(wave2(a, b, off * k, 3 * k, 13 * k), true); }); }
    });
    currents.forEach(d => { // 2D와 같은 그림(LabKit.currentMarks)을 그 전선의 화면 점 위에
      const g = d.g, p = d.p || {}, mode = p.show || (p.electrons ? 'electrons' : 'current'), paths = [];
      let k = 1;
      (d.alongE || []).forEach((ae, j) => {
        if (g.paths && !g.paths[j]) return; // 열린 회로·열린 스위치가 끊은 전선: 2D와 같이 흐르지 않는다 (v1.32.1)
        let P = pipeScr.get(ae);
        if (P) { P = P.map(v => [v.x, v.y]); if (p.reverse) P.reverse(); }
        else { const q = g.paths && g.paths[j]; if (!q) return; const S = q.map(([x, y]) => scr(worldAt(x, y, ae))); if (S.some(v => !v)) return; P = S.map(v => [v.x, v.y]); } // 회로 카드: 2D 둘레(방향은 이미 맞춤)를 카드 위로
        k = pxPer(worldAt(g.x, g.y, ae)); paths.push(P);
      });
      if (paths.length && K.currentMarks) o += K.currentMarks(paths, { mode, k, anim: anim3, color: p.color != null ? K.col(p.color) : null }).svg;
    });
    arrows.forEach((d, i) => {
      const g = d.g, p = d.p || {}, wa = worldAt(g.a.x, g.a.y, d.fromE), wb = worldAt(g.b.x, g.b.y, d.toE), a = scr(wa), b = scr(wb); if (!a || !b) return;
      const k = pxPer(wa), c = K.col(p.color, '#b14de0') || '#b14de0', id = `lk3m${i}`, q = p.curve && g.ctrl ? scr(worldAt(g.ctrl.x, g.ctrl.y, null)) : null;
      defs += mkMarker(id, c);
      const dash = p.dash ? ` stroke-dasharray="${f1(7 * k)} ${f1(6 * k)}"` : p.flow ? ` stroke-dasharray="${f1(9 * k)} ${f1(4 * k)}"` : '';
      o += `<path d="M${f1(a.x)},${f1(a.y)} ${q ? `Q${f1(q.x)},${f1(q.y)} ` : 'L'}${f1(b.x)},${f1(b.y)}" fill="none" stroke="${c}" stroke-width="${f1((p.width ?? 3.2) * k)}" stroke-linecap="round"${dash} marker-end="url(#${id})"${p.both ? ` marker-start="url(#${id})"` : ''}/>`;
    });
    E.forEach(d => {
      if (!d || !d.g) return; const g = d.g;
      if (d.t === 'note' && g.toPt && g.box) { // 말풍선 지시선: 말풍선 가장자리에서 가리키는 곳까지
        const bx = g.box, cen = scr(worldAt(bx.x + bx.w / 2, bx.y + bx.h / 2, d.e)), end = worldAt(g.toPt.x, g.toPt.y, d.toE), e2 = scr(end); if (!cen || !e2) return;
        const quad = [[bx.x, bx.y], [bx.x + bx.w, bx.y], [bx.x + bx.w, bx.y + bx.h], [bx.x, bx.y + bx.h]].map(([x, y]) => scr(worldAt(x, y, d.e)));
        const st = quad.every(Boolean) ? exitPt(cen, e2, quad) : cen, k = pxPer(end);
        o += `<path d="M${f1(st.x)},${f1(st.y)} L${f1(e2.x)},${f1(e2.y)}" stroke="#8c95a8" stroke-width="${f1(1.3 * k)}" stroke-dasharray="${f1(3 * k)} ${f1(3 * k)}"/><circle cx="${f1(e2.x)}" cy="${f1(e2.y)}" r="${f1(2.8 * k)}" fill="#8c95a8"/>`;
      }
      if (d.t === 'eye' && g.toPt) { const a = scr(worldAt(g.x + 16, g.y, d.e)), w = worldAt(g.toPt.x, g.toPt.y, d.toE), b = scr(w); if (a && b) { const k = pxPer(w); o += `<path d="M${f1(a.x)},${f1(a.y)} L${f1(b.x)},${f1(b.y)}" stroke="#2c5fb3" stroke-width="${f1(1.6 * k)}" stroke-dasharray="${f1(4 * k)} ${f1(4 * k)}"/>`; } }
      if ((d.t === 'view' || d.t === 'zoom') && g.fromPt) { // 확대 원: 들여다본 곳에서 원의 양쪽 가장자리로
        const wf = worldAt(g.fromPt.x, g.fromPt.y, d.fromE), f = scr(wf), c = scr(worldAt(g.x, g.y, d.e)), r0 = scr(worldAt(g.x + g.r, g.y, d.e)); if (!f || !c || !r0) return;
        const rr = Math.hypot(r0.x - c.x, r0.y - c.y), dx = c.x - f.x, dy = c.y - f.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * rr, ny = dx / L * rr, k = pxPer(wf);
        o += `<path d="M${f1(f.x)},${f1(f.y)} L${f1(c.x + nx)},${f1(c.y + ny)} M${f1(f.x)},${f1(f.y)} L${f1(c.x - nx)},${f1(c.y - ny)}" stroke="#c99be6" stroke-width="${f1(1.4 * k)}" stroke-dasharray="${f1(4 * k)} ${f1(4 * k)}"/><circle cx="${f1(f.x)}" cy="${f1(f.y)}" r="${f1(7 * k)}" fill="none" stroke="#c99be6" stroke-width="${f1(1.6 * k)}"/>`;
      }
    });
    return (defs ? `<defs>${defs}</defs>` : '') + o;
  }

  /* 부품 눌러 알아보기 (v1.29): 누른 곳의 부품을 찾아 o.onPick(k)로 알리고, 고른 부품(pick)은 보라색 틀로 둘러 보인다 */
  let selK = null;
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const det3 = (p, q, r) => p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0]);
  function rayAt(mx, my) { // 화면의 점 → 카메라에서 나가는 반직선
    const IPV = inv(PV), nx = mx / W * 2 - 1, ny = 1 - my / H * 2, a = apply(IPV, nx, ny, -1), b = apply(IPV, nx, ny, 1);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], d = sub3([b[0] / b[3], b[1] / b[3], b[2] / b[3]], p0), L = Math.hypot(...d) || 1;
    return { o: p0, d: d.map(v => v / L) };
  }
  function onCard(c, ray) { // 반직선이 카드에 닿는 곳: 카드 칸 (a: −.5~.5, b: 0~1), 장면 좌표 (sx, sy), 거리 t
    if (!c.m || !c.tex) return null;
    const O = apply(c.m, 0, 0, 0), A = sub3(apply(c.m, 1, 0, 0), O), Bv = sub3(apply(c.m, 0, 1, 0), O), nD = ray.d.map(v => -v), R = sub3(ray.o, O), dt = det3(A, Bv, nD);
    if (Math.abs(dt) < 1e-9) return null;
    const a = det3(R, Bv, nD) / dt, b = det3(A, R, nD) / dt, t = det3(A, Bv, R) / dt;
    return t > 0 && a >= -.5 && a <= .5 && b >= 0 && b <= 1 ? { a, b, t, sx: c.x + (a + .5) * c.w, sy: c.y + c.h - b * c.h } : null;
  }
  const solidAt = (c, h) => { // 누른 곳 둘레(장면 좌표 3쯤)에 칠한 것이 있나
    if (!c.cvs) return true;
    const r = Math.max(2, Math.round(3 * c.cw / c.w)), x0 = clamp(Math.round((h.a + .5) * c.cw) - r, 0, c.cw - 1), y0 = clamp(Math.round((1 - h.b) * c.ch) - r, 0, c.ch - 1);
    try { const d = c.cvs.getContext('2d').getImageData(x0, y0, Math.min(2 * r + 1, c.cw - x0), Math.min(2 * r + 1, c.ch - y0)).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 50) return true; return false; } catch (e) { return true; }
  };
  const pkIn = (c, x, y) => { // 카드 안 (x, y)의 부품과 그 상자 넓이: 그 점을 품은 가장 작은 상자 (꽂힌 시험관·그릇 안의 온도계가 먼저), 없으면 6 안의 가까운 상자
    let best = null, ba = Infinity, bd = 6;
    c.pks.forEach(b => { if (x >= b.x - 2 && x <= b.x2 + 2 && y >= b.y - 2 && y <= b.y2 + 2) { const ar = (b.x2 - b.x) * (b.y2 - b.y); if (ar < ba) { ba = ar; best = b; } } });
    if (!best) c.pks.forEach(b => { const d = Math.hypot(Math.max(b.x - x, 0, x - b.x2), Math.max(b.y - y, 0, y - b.y2)); if (d < bd) { bd = d; best = b; } });
    return best ? { k: best.k, area: (best.x2 - best.x) * (best.y2 - best.y) } : c.e != null && E[c.e] && E[c.e].pk ? { k: E[c.e].pk, area: c.w * c.h } : null;
  };
  const onObj = (ob, ray) => { // 입체 부품을 둘러싼 상자에 들어가고(t0) 나오는(t1) 거리
    const { lo, hi } = ob.box; let t0 = 0, t1 = Infinity;
    for (let q = 0; q < 3; q++) {
      if (Math.abs(ray.d[q]) < 1e-9) { if (ray.o[q] < lo[q] || ray.o[q] > hi[q]) return null; continue; }
      let a = (lo[q] - ray.o[q]) / ray.d[q], b = (hi[q] - ray.o[q]) / ray.d[q]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
    }
    return { t0, t1 };
  };
  // 화면 (mx, my)의 부품 → { k, t }. 관·전선(선으로 그린 것)이 맨 위, 그다음 카드는 칠한 곳에 닿은 거리, 입체 부품은 상자 앞면까지의 거리로 가장 앞의 것.
  // 가장 앞의 것이 입체 부품이면 그 상자 안(뒷면까지)에서 닿은 더 작은 것을 고른다 (그릇 안에 든 것, 스탠드에 물린 시험관, 꽂이의 시험관)
  let pipeHits = [];
  const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1) : 0; return Math.hypot(a.x + dx * t - x, a.y + dy * t - y); };
  function hitAt(mx, my) {
    if (!PV || TR || !W || !H) return null;
    for (const p of pipeHits) for (let i = 1; i < p.pts.length; i++) if (segD(mx, my, p.pts[i - 1], p.pts[i]) <= p.r) return { k: p.k, t: 0 };
    const ray = rayAt(mx, my), hs = [];
    allCards.forEach(c => { if (!c.pks || (!c.pks.length && c.e == null)) return; const h = onCard(c, ray), p = h && solidAt(c, h) && pkIn(c, h.sx, h.sy); if (p) hs.push({ k: p.k, t: h.t, t1: h.t, area: p.area }); });
    objs.forEach(ob => { if (!ob.pk) return; const h = onObj(ob, ray); if (h) hs.push({ k: ob.pk, t: h.t0, t1: h.t1, area: (ob.box.hi[0] - ob.box.lo[0]) * (ob.box.hi[1] - ob.box.lo[1]) }); });
    if (!hs.length) return null;
    let best = hs.reduce((a, b) => b.t < a.t ? b : a);
    for (;;) { const inner = hs.filter(h => h.area < best.area && h.t <= best.t1); if (!inner.length) break; best = inner.reduce((a, b) => b.area < a.area ? b : a); }
    return { k: best.k, t: best.t };
  }
  // 고른 부품이 화면에서 차지하는 사각형: 입체 부품은 둘러싼 상자, 카드는 그 부품의 상자를 카드 위에 비춘 것
  function rectOf(k) {
    if (!k || !PV) return null;
    const pts = [];
    objs.forEach(ob => { if (ob.pk === k) { const { lo, hi } = ob.box; [lo[0], hi[0]].forEach(x => [lo[1], hi[1]].forEach(y => [lo[2], hi[2]].forEach(z => pts.push(scr([x, y, z]))))); } });
    pipeHits.forEach(p => { if (p.k === k) pts.push(...p.pts); });
    allCards.forEach(c => {
      if (!c.m || !c.tex || !c.pks) return;
      const bs = c.pks.filter(b => b.k === k); if (!bs.length && !c.pks.length && c.e != null && E[c.e] && E[c.e].pk === k) bs.push({ x: c.x, y: c.y, x2: c.x + c.w, y2: c.y + c.h });
      bs.forEach(b => [[b.x, b.y], [b.x2, b.y], [b.x, b.y2], [b.x2, b.y2]].forEach(([x, y]) => pts.push(scr(apply(c.m, (x - c.x) / c.w - .5, (c.y + c.h - y) / c.h, 0)))));
    });
    const P = pts.filter(Boolean); if (!P.length) return null;
    return { x: Math.min(...P.map(p => p.x)), y: Math.min(...P.map(p => p.y)), x2: Math.max(...P.map(p => p.x)), y2: Math.max(...P.map(p => p.y)) };
  }
  function selRect() {
    const r = CUT ? null : rectOf(selK); if (!r) return ''; // 단면으로 보는 동안은 틀 없이
    const x = Math.max(2, r.x - 6), y = Math.max(2, r.y - 6), x2 = Math.min(W - 2, r.x2 + 6), y2 = Math.min(H - 2, r.y2 + 6);
    return x2 > x && y2 > y ? `<rect class="v3-pk" x="${f1(x)}" y="${f1(y)}" width="${f1(x2 - x)}" height="${f1(y2 - y)}" rx="10" fill="rgba(177,77,224,.07)" stroke="#b14de0" stroke-width="2.4"/>` : '';
  }
  let cutOn = false, CUT = null;
  const canCut = ob => !!ob && (ob.glass.length > 0 || ob.liquids.length > 0 || ob.sec.length > 0); // 그릇·버너처럼 속이 있는 입체 부품
  const selOb = () => selK ? objs.find(ob => ob.pk === selK && canCut(ob)) || null : null;
  const cutBtn = ctl && ctl.querySelector('[data-cut]');
  // 단면을 켜면 자른 부품을 가운데로 당겨 크게 보고, 끄면 그 전 거리·자리로 돌아간다
  let camKeep = null, focusFor = null;
  function focusOn(ob) {
    let to;
    if (ob) {
      if (!camKeep) camKeep = { zoom: cam.zoom, panX: cam.panX, panY: cam.panY, panZ: cam.panZ };
      const { lo, hi } = ob.box, size = Math.max(hi[1] - lo[1], (hi[0] - lo[0]) * .75, 36), d0 = fitDist(cam.faz, cam.fel, (W || 960) / (H || 600));
      to = { zoom: clamp(size / .55 / (2 * Math.tan(FOV / 2)) / d0, .15, 2.6), panX: (lo[0] + hi[0]) / 2 - tx0, panY: (lo[1] + hi[1]) / 2 - ty0, panZ: (lo[2] + hi[2]) / 2 };
    } else { if (!camKeep) return; to = camKeep; camKeep = null; }
    if (reduce) { Object.assign(cam, to); anim = null; } else anim = { from: { ...cam }, to, t0: performance.now(), dur: 450 };
    invalidate();
  }
  function syncCut() { // 단면 단추는 자를 수 있는 부품을 골랐을 때만
    const ob = selOb(); if (!ob) cutOn = false;
    const tgtOb = cutOn ? ob : null; if (tgtOb !== focusFor) { focusFor = tgtOb; focusOn(tgtOb); }
    if (cutBtn) { cutBtn.hidden = !ob; cutBtn.setAttribute('aria-pressed', String(cutOn)); }
    cv.dataset.cut = cutOn && ob ? selK : ''; lastSig = ''; invalidate();
  }
  function pick(k) { selK = k || null; cv.dataset.pick = selK || ''; syncCut(); }
  // 점검용: 그 부품을 누를 수 있는 화면의 점 (사각형 안을 고르게 훑는다)
  cv._spot = k => { const r = rectOf(k); if (!r) return null; for (const p of pipeHits) if (p.k === k) for (let i = 1; i < p.pts.length; i++) { const x = (p.pts[i - 1].x + p.pts[i].x) / 2, y = (p.pts[i - 1].y + p.pts[i].y) / 2, h = hitAt(x, y); if (h && h.k === k) return { x, y }; } for (let j = 1; j < 10; j++) for (let i = 1; i < 10; i++) { const x = r.x + (r.x2 - r.x) * i / 10, y = r.y + (r.y2 - r.y) * j / 10, h = hitAt(x, y); if (h && h.k === k) return { x, y }; } return null; };
  cv._hit = (x, y) => { const h = hitAt(x, y); return h && h.k; };
  let lastTap = 0;
  function tap(ev) { // 짧게 누름: 두 번 누름(처음 시점으로)의 두 번째는 넘긴다
    const now = performance.now(), dbl = now - lastTap < 350; lastTap = dbl ? 0 : now; if (dbl) return;
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const h = hitAt((ev.clientX - r.left) * W / r.width, (ev.clientY - r.top) * H / r.height);
    if (h) o.onPick(h.k);
  }

  /* 조작: 끌어서 돌리기, 오른쪽 버튼·Shift로 옮기기, 휠·두 손가락으로 확대. 거의 움직이지 않고 떼면 누름 (부품 눌러 알아보기) */
  const ptrs = new Map(); let pinch = null, multi = false;
  const rotate = (dx, dy) => { cam.az -= dx * .35; cam.el = clamp(cam.el + dy * .3, 0, 75); };
  const zoomBy = f => { cam.zoom = clamp(cam.zoom * f, .15, 2.6); };
  const pan = (dx, dy) => { const s = eyeOf(W / H).d * 2 * Math.tan(FOV / 2) / H, a = cam.az * DEG; cam.panX = clamp(cam.panX - dx * s * Math.cos(a), -spanX, spanX); cam.panY = clamp(cam.panY + dy * s, -spanY, spanY); };
  const touched = () => { if (anim) { Object.assign(cam, anim.to); anim = null; } if (view) { view = null; setPressed(); } invalidate(); }; // 움직이던 시점은 끝 자리에서 이어 조작
  const offs = [];
  const listen = (t, ev, f, op) => { t.addEventListener(ev, f, op); offs.push(() => t.removeEventListener(ev, f, op)); };
  if (!still) {
    listen(cv, 'pointerdown', ev => { try { cv.setPointerCapture(ev.pointerId); } catch (e) { } ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, pan: ev.button === 2 || ev.shiftKey || ev.ctrlKey, mv: 0 }); cv.classList.add('drag'); if (ptrs.size === 2) { multi = true; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; } });
    listen(cv, 'pointermove', ev => {
      const p = ptrs.get(ev.pointerId); if (!p) return;
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY; p.mv += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size >= 2 && pinch) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomBy(pinch.d / d); pan(mx - pinch.mx, my - pinch.my); pinch = { d, mx, my }; }
      else if (o.onPick && p.mv < 5) return; // 누르려다 조금 움직인 것은 돌리지 않는다
      else if (p.pan) pan(dx, dy); else rotate(dx, dy);
      touched();
    });
    const up = ev => {
      const p = ptrs.get(ev.pointerId); ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) cv.classList.remove('drag');
      if (ev.type === 'pointerup' && p && !p.pan && p.mv < 5 && !multi && !ptrs.size && o.onPick) tap(ev);
      if (!ptrs.size) multi = false;
    };
    listen(cv, 'pointerup', up); listen(cv, 'pointercancel', up);
    listen(cv, 'wheel', ev => { ev.preventDefault(); zoomBy(Math.exp(ev.deltaY * .0015)); touched(); }, { passive: false });
    listen(cv, 'contextmenu', ev => ev.preventDefault());
    listen(cv, 'dblclick', () => goView('angle'));
    listen(ctl, 'click', ev => { const b = ev.target.closest('button'); if (!b) return; if (b.hasAttribute('data-cut')) { cutOn = !cutOn; return syncCut(); } if (b.dataset.view) goView(b.dataset.view); else if (b.dataset.zoom) { zoomBy(b.dataset.zoom > 0 ? 1 / 1.25 : 1.25); touched(); } });
    listen(window, 'resize', invalidate);
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => invalidate()); ro.observe(stage); offs.push(() => ro.disconnect()); }
  }
  // 글자판: ←→ 돌리기, ↑↓ 높이, +/− 확대, 1·2·3 시점, 0 처음 시점
  function key(ev) {
    const k = ev.key, act = { ArrowLeft: () => rotate(-28, 0), ArrowRight: () => rotate(28, 0), ArrowUp: () => rotate(0, -20), ArrowDown: () => rotate(0, 20), '+': () => zoomBy(1 / 1.2), '=': () => zoomBy(1 / 1.2), '-': () => zoomBy(1.2), '_': () => zoomBy(1.2) }[k];
    const pre = { 1: 'front', 2: 'angle', 3: 'top', 0: 'angle', Home: 'angle' }[k];
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((ev.target && ev.target.tagName) || '') && (k === ' ' || k === 'Enter')) return;
    if (act) { ev.preventDefault(); act(); touched(); } else if (pre) { ev.preventDefault(); goView(pre); }
  }
  function dispose() {
    alive = false; if (frame) cancelAnimationFrame(frame); clearTimeout(tick);
    offs.forEach(f => f());
    try { allCards.concat(fxAll, AS0 ? AS0.allCards : []).forEach(c => c.tex && gl.deleteTexture(c.tex)); gl.deleteTexture(shTex); [quad, flat, opB, opB0, ...bufs].forEach(b => b && gl.deleteBuffer(b)); [P_TEX, P_COL, P_GLASS, P_LIQ, P_CAP].forEach(p => gl.deleteProgram(p.p)); const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); } catch (e) { }
    S.host.remove(); if (AS0) AS0.S.host.remove(); stage.innerHTML = '';
  }
  if (o.pick) pick(o.pick);
  invalidate();
  if (!still && !o.inline) setTimeout(() => cv.focus({ preventScroll: true }), 0);
  return { ready, dispose, key, pick, draw: () => draw(), canvas: cv, cards: allCards, objs, view: goView, eyeOf };
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
// 그림 엔진의 입체 보기 창이 부른다: stage에 그림을 채우고 { dispose, key }를 돌려준다
function open(stage, o = {}) { return viewer(stage, o); }
// 점검용 촬영 (check_render.py --3d): 장면마다 그림으로 찍어 한 장에 늘어놓고, 결과를 <html data-lk3d>에 적는다
async function shot(root, scenes, o = {}) {
  injectCss();
  const [w, h] = o.size || [960, 600], report = [];
  const wrap = document.createElement('div'); wrap.className = 'lk3-shots'; wrap.style.gridTemplateColumns = `repeat(${scenes.length > 1 ? 2 : 1},${w}px)`; root.appendChild(wrap);
  for (const sc of scenes) {
    const cell = document.createElement('div'); cell.className = 'lk3-shot'; cell.innerHTML = `<b>${esc(sc.title || '')}</b>`;
    const stage = document.createElement('div'); stage.className = 'v3-stage'; stage.style.width = w + 'px'; stage.style.height = h + 'px'; cell.appendChild(stage); wrap.appendChild(cell);
    const r = { title: sc.title || '', units: 0, meshes: 0, failed: 0, out: [] };
    try {
      const v = viewer(stage, { ...sc, view: o.view, still: true, size: [w, h] }), res = await v.ready;
      v.draw(); r.units = res.units; r.meshes = res.meshes; r.failed = res.failed;
      const { eye, tgt } = v.eyeOf(w / h), PV = mul(persp(FOV, w / h, 1, 1e5), lookAt(eye, tgt));
      const inView = (x, y, z) => { const p = apply(PV, x, y, z), nx = p[0] / p[3], ny = p[1] / p[3]; return p[3] > 0 && Math.abs(nx) <= 1.02 && Math.abs(ny) <= 1.02; };
      v.cards.forEach(c => { if (!inView(c.px + c.ox, c.py + c.h / 2, c.pz)) r.out.push(c.types.join('+')); });
      v.objs.forEach(ob => { if (!inView(ob.cx, ob.cy, ob.az)) r.out.push(ob.d.t); });
      const img = new Image(); img.src = v.canvas.toDataURL('image/png'); img.alt = '';
      const keep = [...stage.querySelectorAll('.v3-lines,.v3-tags')];
      v.dispose(); stage.appendChild(img); keep.forEach(n => stage.appendChild(n));
      if (r.failed) console.error(`[LabKit] 입체 점검: ${r.title} — 그림 카드 ${r.failed}장을 만들지 못했어요`);
      if (r.out.length) console.warn(`[LabKit] 입체 점검: ${r.title} — 화면 밖으로 나간 묶음: ${r.out.join(', ')}`);
    } catch (e) { r.error = String(e && e.message || e); console.error(`[LabKit] 입체 점검: ${r.title} — ${r.error}`); }
    report.push(r);
  }
  document.documentElement.dataset.lk3dV = VERSION;
  document.documentElement.dataset.lk3d = JSON.stringify(report);
  return report;
}

window.LabKit3D = { version: VERSION, open, shot };
})();
