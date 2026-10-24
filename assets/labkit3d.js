/*! experiment-visualizer LabKit3D v1.20.0 | MIT License | https://github.com/sci-eum/experiment-visualizer */
/* 실험 장면을 입체(WebGL)로 보여 준다. 외부 라이브러리 없이 WebGL만 쓴다 (인터넷 없이 여는 한 파일 버전에도 넣을 수 있게).
   - 그릇 13종(비커·플라스크·시험관 …)은 그림 엔진의 윤곽선을 돌려 빚은 유리와, 높이·색·층이 맞는 액체로 (v1.20)
   - 자주 쓰는 기구(삼발이·알코올램프·스탠드·가열판·시험관대·저울 …)는 상자·원기둥으로 빚는다 (v1.20)
   - 나머지 기구는 2D 그림을 카드로 세운다. 불꽃·눈금·거품처럼 얹히는 것은 그 부품의 덧그림 카드로 (v1.19)
   그림 엔진이 '3D' 버튼을 누를 때 불러와 LabKit3D.open(창, { items, title, bench })을 부른다. */
(function () {
'use strict';
const VERSION = '1.20.0'; // labkit.js의 VERSION·첫 줄 머리말과 같게 고친다
const FONT = '"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
const SVGNS = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;
const FOV = 30 * DEG; // 세로 시야각
// 시점: az(좌우로 돈 각도), el(내려다보는 각도). front는 2D 그림과 거의 같은 모습
const VIEWS = { front: { az: 0, el: 5 }, angle: { az: -30, el: 18 }, top: { az: 0, el: 42 } };
// 설명 부품(말풍선·화살표·글자 등)은 기구 바로 앞에 두고 늘 기구 위에 그린다 (2D처럼 가리지 않게)
const OVERLAY = new Set(['note', 'text', 'view', 'zoom', 'label', 'mark', 'eye', 'arrow', 'ray']);
// 입체 장면에서 카메라를 따라 돌지 않고 앞을 보는 카드: 두 기구를 잇는 관·전선, 붓는 장면 (돌리면 끝이 어긋나지 않게)
const FIXED = new Set(['hose', 'wire', 'tubing', 'pour', 'condenser']);
const MAX_TEX = 2048;
const L = [.36, .82, .45], LN = Math.hypot(...L), LIGHT = L.map(v => v / LN);
const GLASS = '#e2effa', INK = '#56617a', METAL = '#b0b7c4', DARK = '#444b5d';

const CSS = `.v3-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none}
.v3-cv.drag{cursor:grabbing}
.v3-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.v3-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.v3-tag{position:absolute;left:0;top:0;white-space:nowrap;padding:4px 10px;border-radius:999px;background:#fff;color:#2b3040;font-size:13px;font-weight:700;line-height:1.3;box-shadow:0 1px 2px rgba(29,33,48,.08),0 4px 10px -4px rgba(29,33,48,.2)}
.v3-tag.hot{background:#ffedef;color:#c7323f}.v3-tag.arrow{background:#fbf4ff;color:#7d2ba6}
.v3-ctl{position:absolute;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100% - 24px)}
.v3-ctl button{appearance:none;border:0;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700;line-height:1.2;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.95);color:#1d2130;box-shadow:0 1px 2px rgba(29,33,48,.06),0 2px 8px rgba(29,33,48,.1)}
.v3-ctl button[aria-pressed=true]{background:#d070fb;color:#fff}
.v3-ctl button:focus-visible{outline:3px solid #e6b8fd;outline-offset:2px}
.v3-ctl .v3-sep{width:6px}
.v3-hint{position:absolute;right:14px;bottom:14px;margin:0;max-width:42%;text-align:right;font-size:12.5px;line-height:1.5;color:#7f8698;pointer-events:none}
.v3-load{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.92);font-size:13px;font-weight:700;color:#4b5265;pointer-events:none}
.v3-load[hidden]{display:none}
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
const VS_COL = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 m;varying vec3 vn;varying vec3 vc;void main(){vn=n;vc=c;gl_Position=m*vec4(p,1.);}';
const FS_COL = 'precision mediump float;uniform vec3 L;varying vec3 vn;varying vec3 vc;void main(){vec3 N=normalize(vn);if(!gl_FrontFacing)N=-N;gl_FragColor=vec4(vc*(.72+.3*max(dot(N,L),0.)),1.);}';
// 유리: 가장자리(비스듬히 보이는 곳)는 2D 그림처럼 진한 선, 가운데는 거의 투명, 빛 반사 한 줄
const VS_SURF = 'attribute vec3 p;attribute vec3 n;uniform mat4 m;varying vec3 vp;varying vec3 vn;void main(){vp=p;vn=n;gl_Position=m*vec4(p,1.);}';
const FS_GLASS = 'precision mediump float;uniform vec3 E;uniform vec3 T;uniform float A;uniform float K;uniform vec3 L;varying vec3 vp;varying vec3 vn;'
  + 'void main(){vec3 N=normalize(vn);if(!gl_FrontFacing)N=-N;vec3 V=normalize(E-vp);float f=1.-abs(dot(N,V));float e=smoothstep(.6,.96,f)*K;'
  + 'float s=pow(max(dot(N,normalize(L+V)),0.),36.);vec3 c=mix(T,vec3(.337,.38,.478),e*.85)+s*.55;float a=clamp(mix(A,.92,e)+s*.45,0.,1.);gl_FragColor=vec4(c*a,a);}';
// 액체: 높이 lo~hi 사이만 칠한다 (기울인 그릇도 수면은 수평)
const FS_LIQ = 'precision mediump float;uniform vec3 C;uniform float A;uniform float lo;uniform float hi;uniform vec3 L;varying vec3 vp;varying vec3 vn;'
  + 'void main(){if(vp.y>hi||vp.y<lo)discard;vec3 N=normalize(vn);if(!gl_FrontFacing)N=-N;gl_FragColor=vec4(C*(.8+.24*max(dot(N,L),0.))*A,A);}';
// 수면: 높이 hi의 수평면에서 그릇 안쪽(돌린 윤곽의 반지름 표, 또는 상자)만 남긴다
const VS_CAP = 'attribute vec3 p;uniform mat4 m;varying vec3 vp;void main(){vp=p;gl_Position=m*vec4(p,1.);}';
const FS_CAP = 'precision mediump float;uniform mat4 IM;uniform float R[32];uniform float h0;uniform float h1;uniform float bx;uniform vec2 hb;uniform vec3 C;uniform float A;varying vec3 vp;'
  + 'void main(){vec4 q=IM*vec4(vp,1.);if(q.y<h0||q.y>h1)discard;'
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
    b.liquid(body, [{ hi: 17, color: b.col(d.p.color, '#f3e4a2'), alpha: .85 }]);
    tube(b.op, b.M, [0, 34, 0], [0, 44, 0], 9, 9, METAL, 20); tube(b.op, b.M, [0, 43, 0], [0, 52, 0], 3, 3, '#f4efe2', 12);
    if (d.p.lit === false) b.glass(o => lathe(o, b.M, [[12, 40], [12, 58], [10, 63.5], [6, 65.5], [0, 66]]), GLASS, .2);
  },
  gasburner(d, b) {
    const { op, M } = b;
    box(op, M, -30, 30, 0, 9, -24, 24, DARK); tube(op, M, [0, 8, 0], [0, 64, 0], 6, 6, METAL, 18); tube(op, M, [0, 19, 0], [0, 30, 0], 8.5, 8.5, '#c9ced8', 18);
    box(op, M, 6, 32, 12, 18, -3, 3, METAL); tube(op, M, [30, 15, 0], [46, 15, 0], 3, 3, '#e39a52', 10);
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
  stirbar(d, b) { tube(b.op, b.M, [-10, 0, 0], [10, 0, 0], 4, 4, '#fbfbfd', 12, false); sphere(b.op, b.M, [-10, 0, 0], 4, '#fbfbfd', 10); sphere(b.op, b.M, [10, 0, 0], 4, '#fbfbfd', 10); }
};
BUILD.burner = BUILD.lamp; BUILD.bunsen = BUILD.gasburner;
// 덧그림을 앞면에 붙이는 부품 (돌리면 함께 돈다): 표시판·글자·눈금
const FRONT_DECAL = new Set(['rack', 'tuberack', 'balance', 'stirrer', 'block', 'magnet']);

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
function cutScene(K, items) {
  const SH = K.shapes3 ? K.shapes3() : {}, types = Object.keys(SH).concat(Object.keys(BUILD));
  const { svg, labels, els = [] } = K.scene3(items || [], { mesh3: types });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:480px;height:300px;opacity:0;pointer-events:none;font-family:' + FONT;
  host.innerHTML = svg; document.body.appendChild(host);
  const root = host.firstElementChild, ser = new XMLSerializer();
  const defs = root.querySelector(':scope > defs'), defsXml = defs ? ser.serializeToString(defs) : '';
  const measure = nodes => { // 여러 마디를 함께 잰 상자 (화면 밖 SVG에 잠깐 붙여서)
    const mg = document.createElementNS(SVGNS, 'g'); nodes.forEach(n => mg.appendChild(n)); root.appendChild(mg);
    let b = null; try { const r = mg.getBBox(); if (r.width + r.height > 0) b = { x: r.x, y: r.y, x2: r.x + r.width, y2: r.y + r.height }; } catch (e) { }
    mg.remove(); return b;
  };
  const card = (nodes, box, extra) => {
    if (!box) return null;
    const pad = 6 + .02 * Math.max(box.x2 - box.x, box.y2 - box.y); // 선 굵기·그림자가 상자 밖으로 나온다
    const x = box.x - pad, y = box.y - pad, w = box.x2 - box.x + 2 * pad, h = box.y2 - box.y + 2 * pad;
    const k = Math.min(3, MAX_TEX / Math.max(w, h)), cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
    const xml = `<svg xmlns="${SVGNS}" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}" font-family='${FONT}'>${defsXml}${nodes.map(n => ser.serializeToString(n)).join('')}</svg>`;
    return { kind: 'card', x, y, w, h, cw, ch, xml, bottom: box.y2, ...extra };
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
        const types = [...un.types], c = card(un.top.map(n => n.cloneNode(true)), measure(un.top.map(n => n.cloneNode(true))), { u: un.u, order: un.order, types, over: types.every(t => OVERLAY.has(t)) });
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
    return { cards, parts, labels, els, SH, host, root };
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
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `${o.title || '실험 장면'} 입체 그림. 끌어서 돌려 볼 수 있어요`);
  const opts = { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: still };
  const gl = cv.getContext('webgl2', opts) || cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
  if (!gl) { const e = new Error('WebGL을 쓸 수 없어요'); e.code = 'nogl'; throw e; }
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  stage.appendChild(cv);
  const lines = document.createElementNS(SVGNS, 'svg'); lines.setAttribute('class', 'v3-lines'); lines.setAttribute('aria-hidden', 'true'); stage.appendChild(lines);
  const tagBox = document.createElement('div'); tagBox.className = 'v3-tags'; tagBox.setAttribute('aria-hidden', 'true'); stage.appendChild(tagBox);
  const load = document.createElement('div'); load.className = 'v3-load'; load.textContent = '실험대를 꾸미는 중…'; stage.appendChild(load);
  let ctl = null;
  if (!still) {
    ctl = document.createElement('div'); ctl.className = 'v3-ctl'; ctl.setAttribute('role', 'toolbar'); ctl.setAttribute('aria-label', '시점 바꾸기');
    ctl.innerHTML = '<button type="button" data-view="front">앞에서</button><button type="button" data-view="angle">비스듬히</button><button type="button" data-view="top">위에서</button><span class="v3-sep"></span><button type="button" data-zoom="1" aria-label="가까이 보기">+</button><button type="button" data-zoom="-1" aria-label="멀리 보기">−</button>';
    stage.appendChild(ctl);
    const hint = document.createElement('p'); hint.className = 'v3-hint';
    hint.textContent = '끌어서 돌리기 · 휠이나 두 손가락으로 확대 · 오른쪽 버튼(Shift+끌기)으로 옮기기. 그릇·자주 쓰는 기구는 입체로, 나머지는 2D 그림 카드로 보여 줘요.';
    stage.appendChild(hint);
  }

  /* 장면: 묶음마다 앞뒤 자리(z). 나중에 그린 묶음이 조금 앞 */
  const P_TEX = program(gl, VS_TEX, FS_TEX), P_COL = program(gl, VS_COL, FS_COL), P_GLASS = program(gl, VS_SURF, FS_GLASS), P_LIQ = program(gl, VS_SURF, FS_LIQ), P_CAP = program(gl, VS_CAP, FS_CAP);
  const S = cutScene(K, o.items), { cards, parts, labels } = S;
  const bench = o.bench !== false;
  const unitZ = new Map(); [...new Set([...cards, ...parts].sort((a, b) => a.order - b.order).map(c => String(c.u)))].forEach((u, i, a) => unitZ.set(u, (i - a.length / 2) * 4));
  let overI = 0;
  cards.forEach(c => {
    c.sign = bench && c.over && c.y + 6 >= B; // 실험대 띠(실험대 선 아래)에 쓴 글자는 실험대 앞면에 붙인다
    c.ax = c.x + c.w / 2; c.ox = 0;
    c.px = c.ax - CX; c.py = c.sign ? -6 - c.h / 2 : B - (c.y + c.h);
    c.pz = c.sign ? 122 + overI * .5 : c.over ? 10 + (overI++) * .5 : unitZ.get(String(c.u)) ?? 0;
    c.mode = c.sign || c.fixedPlane ? 'fixed' : 'bill';
    c.foot = bench && !c.over && Math.abs(c.bottom - B) < 8; // 실험대에 놓인 것 (그림자를 깐다)
  });

  /* 입체 부품 빚기 */
  const opV = [], objs = [], objByE = new Map();
  // 실험대 위 x 범위에 놓인 입체 부품의 앞뒤 반 깊이 (스탠드 받침을 그 뒤로 비키게)
  const halfDepth = d => { const g = d.g || {}, sh = d.shape && S.SH[d.shape]; return d.shape === 'trough' ? 55 : sh ? sh.w * (g.s || 1) / 2 : { hotplate: 44, stirrer: 44, balance: 40, rack: 22 * (g.s || 1), tuberack: 12 * (g.s || 1) }[d.t] || 0; };
  const deepAt = (x0, x1) => parts.reduce((m, d) => { const g = d.g || {}, w = (d.shape && S.SH[d.shape] ? S.SH[d.shape].w * (g.s || 1) : g.w) || 0; return d.t !== 'stand' && g.x != null && g.x + w / 2 > x0 && g.x - w / 2 < x1 && Math.abs((g.y ?? B) - B) < 8 ? Math.max(m, halfDepth(d)) : m; }, 0);
  parts.forEach(d => {
    const g = d.g || {}, z = unitZ.get(String(d.u)) ?? 0, s = g.s || 1, tilt = (g.tilt || 0) * DEG, shape = d.shape && S.SH[d.shape];
    const ob = { kind: 'obj', e: d.e, u: d.u, d, z, glass: [], liquids: [], caps: [], kids: [], decal: d.decal, gx: g.x ?? 240, ax: (g.x ?? 240) - CX, az: z };
    const base = mT((g.x ?? 240) - CX, B - (g.y ?? B), z);
    const bld = { op: opV, B, host: S.root, col: (c, def) => K.col(c, def) || def, front: 0, noScale: false, deepAt, els: S.els };
    bld.M = shape ? chain(base, mT(0, shape.h * s / 2, 0), mRz(-tilt), mT(0, -shape.h * s / 2, 0), mS(s)) : null;
    if (!shape) bld.M = d.t === 'rack' || d.t === 'tuberack' || d.t === 'stand' ? chain(base, mRz(-tilt)) : chain(base, mRz(-tilt), mS(s));
    bld.glass = (fn, tint, alpha, edge = 1) => { const v = []; fn(v); if (v.length) ob.glass.push({ v: new Float32Array(v), tint: hex(tint), alpha, edge }); };
    bld.liquid = (P, bands) => { // P: 안쪽 윤곽 (부품 좌표). bands: [{lo, hi, color, alpha, world}] — world가 아니면 부품 높이
      const v = []; lathe(v, bld.M, P, null, 40); const buf = new Float32Array(v), tb = radiusTable(P), IM = inv(bld.M);
      bands.forEach(bd => {
        const toW = h => h <= -1e8 || h >= 1e8 ? h : bd.world ? h : apply(bld.M, 0, h, 0)[1];
        const lo = toW(bd.lo ?? -1e9), hi = toW(bd.hi ?? 1e9), col = typeof bd.color === 'string' ? hex(bd.color) : bd.color;
        ob.liquids.push({ v: buf, lo, hi, color: col, alpha: bd.alpha });
        if (!bd.noCap && hi < 1e8) ob.caps.push({ y: hi, IM, R: tb.R, h0: tb.h0, h1: tb.h1, bx: 0, color: col, alpha: Math.min(.95, bd.alpha + .06) });
      });
    };
    bld.liquidBox = (hx, hz, h0, h1, fn) => { // 수조: 상자 모양 액체
      const v = []; fn(v); const buf = new Float32Array(v), IM = inv(bld.M);
      if (!(g.fill > 0)) return;
      const col = hex(bld.col(d.p.color, 'water')), hi = B - g.surfaceY;
      ob.liquids.push({ v: buf, lo: -1e9, hi, color: col, alpha: d.p.opacity ?? .7 });
      ob.caps.push({ y: hi, IM, R: new Float32Array(32), h0, h1, bx: 1, hb: [hx, hz], color: col, alpha: .75 });
    };
    try { if (shape) container(d, bld, shape); else BUILD[d.t](d, bld); }
    catch (e) { warn(`${d.t}을(를) 입체로 빚지 못했어요: ${e.message}`); }
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
  const allCards = cards.concat(objs.map(ob => ob.decal).filter(Boolean));

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  allCards.forEach(c => { xmin = Math.min(xmin, c.px + c.ox - c.w / 2); xmax = Math.max(xmax, c.px + c.ox + c.w / 2); ymin = Math.min(ymin, c.py); ymax = Math.max(ymax, c.py + c.h); });
  objs.forEach(ob => { xmin = Math.min(xmin, ob.cx - ob.hw); xmax = Math.max(xmax, ob.cx + ob.hw); ymin = Math.min(ymin, ob.y0); ymax = Math.max(ymax, ob.y1); });
  if (!isFinite(xmin)) { xmin = -CX; xmax = CX; ymin = 0; ymax = 160; }
  const tx0 = (xmin + xmax) / 2, ty0 = (Math.min(ymin, bench ? -20 : ymin) + ymax) / 2, spanX = xmax - xmin, spanY = ymax - ymin;
  // 이 시점에서 모든 것이 화면에 들어오는 거리: 카드·부품의 위아래 끝을 카메라 기준으로 재어 가장 먼 것을 고른다
  const fitPts = allCards.flatMap(c => [[c.px + c.ox, c.py, c.pz, c.w / 2], [c.px + c.ox, c.py + c.h, c.pz, c.w / 2]]).concat(objs.flatMap(ob => [[ob.cx, ob.y0, ob.az, ob.hw], [ob.cx, ob.y1, ob.az, ob.hw]]));
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

  /* WebGL 자원 */
  const quad = buffer(gl, [-.5, 0, 0, 0, 1, .5, 0, 0, 1, 1, .5, 1, 0, 1, 0, -.5, 0, 0, 0, 1, .5, 1, 0, 1, 0, -.5, 1, 0, 0, 0]);
  const flat = buffer(gl, [-.5, 0, -.5, 0, 0, .5, 0, -.5, 1, 0, .5, 0, .5, 1, 1, -.5, 0, -.5, 0, 0, .5, 0, .5, 1, 1, -.5, 0, .5, 0, 1]);
  const roomV = bench ? room(Math.min(-CX - 40, xmin - 40), Math.max(CX + 40, xmax + 40)) : [];
  const opAll = new Float32Array(roomV.concat(opV)), opB = opAll.length ? buffer(gl, opAll) : null, opN = opAll.length / 9;
  const bufs = [];
  objs.forEach(ob => {
    ob.glass.forEach(gp => { gp.b = buffer(gl, gp.v); gp.n = gp.v.length / 9; bufs.push(gp.b); });
    const made = new Map(); ob.liquids.forEach(lq => { if (!made.has(lq.v)) { const b = buffer(gl, lq.v); made.set(lq.v, b); bufs.push(b); } lq.b = made.get(lq.v); lq.n = lq.v.length / 9; });
    ob.caps.forEach(cp => { const r = Math.max(ob.hw * 2.2, 60), v = [-r, 0, -r, r, 0, -r, r, 0, r, -r, 0, -r, r, 0, r, -r, 0, r].map((q, i) => i % 3 === 0 ? q + ob.ax : i % 3 === 1 ? cp.y : q + ob.az); cp.b = buffer(gl, v); bufs.push(cp.b); });
  });
  const shTex = texture(gl, shadowCanvas(), gl2);
  let alive = true, frame = 0, done = 0, failed = 0;
  const ready = Promise.all(allCards.map(c => raster(c).then(img => {
    if (!alive) return;
    try { c.tex = texture(gl, img, gl2); } catch (e) { failed++; warn('그림 카드를 올리지 못했어요 (' + c.types.join(',') + '): ' + e.message); }
    done++; load.textContent = `실험대를 꾸미는 중… ${done}/${allCards.length}`; invalidate();
  }, e => { failed++; done++; warn(e.message); invalidate(); }))).then(() => { load.hidden = true; invalidate(); return { units: cards.length, meshes: objs.length, failed }; });
  if (!allCards.length) load.hidden = true;

  /* 카메라 */
  const v0 = VIEWS[o.view] || VIEWS.angle;
  const cam = { az: v0.az, el: v0.el, zoom: 1, panX: 0, panY: 0, faz: v0.az, fel: v0.el }; // faz·fel: 거리를 맞춘 시점 (끌어 돌릴 때는 그대로 둔다)
  let anim = null, view = VIEWS[o.view] ? o.view : 'angle';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setPressed = () => { if (ctl) ctl.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view)); };
  setPressed();
  function goView(name) {
    const v = VIEWS[name]; if (!v) return; view = name; setPressed();
    const from = { ...cam }, to = { az: v.az, el: v.el, zoom: 1, panX: 0, panY: 0, faz: v.az, fel: v.el };
    while (from.az - to.az > 180) from.az -= 360; while (to.az - from.az > 180) from.az += 360;
    if (reduce || still) { Object.assign(cam, to); anim = null; return invalidate(); }
    anim = { from, to, t0: performance.now(), dur: 450 }; invalidate();
  }
  const eyeOf = asp => {
    const d = fitDist(cam.faz, cam.fel, asp) * cam.zoom, a = cam.az * DEG, e = cam.el * DEG;
    const tgt = [tx0 + cam.panX, ty0 + cam.panY, 0];
    return { d, tgt, eye: [tgt[0] + d * Math.cos(e) * Math.sin(a), tgt[1] + d * Math.sin(e), tgt[2] + d * Math.cos(e) * Math.cos(a)] };
  };

  /* 그리기 */
  let W = 0, H = 0, PV = null, EYE = [0, 0, 1];
  function invalidate() { if (alive && !frame) frame = requestAnimationFrame(draw); }
  const surfAttr = (prog, b) => { const a = prog.at; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 36, 0); if (a.n != null && a.n >= 0) { gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 36, 12); } };
  const offAttr = prog => Object.values(prog.at).forEach(i => i >= 0 && gl.disableVertexAttribArray(i));
  function drawCard(c, lean) {
    if (!c.tex) return;
    const th = c.mode === 'fixed' ? 0 : Math.atan2(EYE[0] - c.px, EYE[2] - c.pz);
    c.m = cardMat(c.px, c.py, c.pz, th, c.mode === 'fixed' || c.e != null ? 0 : lean, c.w, c.h, c.ox); // 입체 부품 곁의 카드는 곧게 (유리와 어긋나지 않게)
    gl.useProgram(P_TEX.p); gl.disable(gl.CULL_FACE); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const at = P_TEX.at; gl.enableVertexAttribArray(at.p); gl.vertexAttribPointer(at.p, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(at.q); gl.vertexAttribPointer(at.q, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniform1i(P_TEX.un.t, 0); gl.uniform1f(P_TEX.un.a, 1);
    gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, c.m)); gl.drawArrays(gl.TRIANGLES, 0, 6); offAttr(P_TEX);
  }
  function drawGlass(ob, face) {
    if (!ob.glass.length) return;
    gl.useProgram(P_GLASS.p); gl.enable(gl.CULL_FACE); gl.cullFace(face);
    gl.uniformMatrix4fv(P_GLASS.un.m, false, PV); gl.uniform3fv(P_GLASS.un.E, EYE); gl.uniform3fv(P_GLASS.un.L, LIGHT);
    ob.glass.forEach(gp => { gl.uniform3fv(P_GLASS.un.T, gp.tint); gl.uniform1f(P_GLASS.un.A, gp.alpha); gl.uniform1f(P_GLASS.un.K, gp.edge); surfAttr(P_GLASS, gp.b); gl.drawArrays(gl.TRIANGLES, 0, gp.n); });
    offAttr(P_GLASS); gl.disable(gl.CULL_FACE);
  }
  function drawLiquid(ob) {
    if (ob.liquids.length) {
      gl.useProgram(P_LIQ.p); gl.enable(gl.CULL_FACE); gl.uniformMatrix4fv(P_LIQ.un.m, false, PV); gl.uniform3fv(P_LIQ.un.L, LIGHT);
      [gl.FRONT, gl.BACK].forEach(face => { gl.cullFace(face); ob.liquids.forEach(lq => { gl.uniform3fv(P_LIQ.un.C, lq.color); gl.uniform1f(P_LIQ.un.A, lq.alpha); gl.uniform1f(P_LIQ.un.lo, lq.lo); gl.uniform1f(P_LIQ.un.hi, lq.hi); surfAttr(P_LIQ, lq.b); gl.drawArrays(gl.TRIANGLES, 0, lq.n); }); });
      offAttr(P_LIQ); gl.disable(gl.CULL_FACE);
    }
    if (ob.caps.length) {
      gl.useProgram(P_CAP.p); gl.uniformMatrix4fv(P_CAP.un.m, false, PV);
      ob.caps.forEach(cp => {
        gl.uniformMatrix4fv(P_CAP.un.IM, false, cp.IM); gl.uniform1fv(P_CAP.un.R, cp.R); gl.uniform1f(P_CAP.un.h0, cp.h0); gl.uniform1f(P_CAP.un.h1, cp.h1);
        gl.uniform1f(P_CAP.un.bx, cp.bx); gl.uniform2fv(P_CAP.un.hb, cp.hb || [0, 0]); gl.uniform3fv(P_CAP.un.C, cp.color); gl.uniform1f(P_CAP.un.A, cp.alpha);
        gl.bindBuffer(gl.ARRAY_BUFFER, cp.b); gl.enableVertexAttribArray(P_CAP.at.p); gl.vertexAttribPointer(P_CAP.at.p, 3, gl.FLOAT, false, 12, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
      offAttr(P_CAP);
    }
  }
  const distOf = it => it.kind === 'obj' ? Math.hypot(EYE[0] - it.cx, EYE[1] - it.cy, EYE[2] - it.az) : Math.hypot(EYE[0] - (it.px + it.ox), EYE[1] - (it.py + it.h / 2), EYE[2] - it.pz);
  const byFar = list => list.map(it => [distOf(it), it]).sort((a, b) => b[0] - a[0] || (a[1].order ?? 0) - (b[1].order ?? 0)).map(x => x[1]);
  function drawItem(it, lean) {
    if (it.kind !== 'obj') return drawCard(it, lean);
    drawGlass(it, gl.FRONT);                       // 유리 뒷면
    byFar(it.kids).forEach(k => drawItem(k, lean)); // 그릇 안의 것
    drawLiquid(it);                                 // 액체와 수면
    drawGlass(it, gl.BACK);                        // 유리 앞면
    if (it.decal) drawCard(it.decal, lean);         // 눈금·거품·불꽃 같은 덧그림
  }
  function draw(now) {
    frame = 0; if (!alive) return;
    if (anim) { const k = clamp(((now || performance.now()) - anim.t0) / anim.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; Object.keys(anim.to).forEach(p => { cam[p] = anim.from[p] + (anim.to[p] - anim.from[p]) * e; }); if (k >= 1) anim = null; else invalidate(); }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = (o.size && o.size[0]) || stage.clientWidth || 960, ch = (o.size && o.size[1]) || stage.clientHeight || 600;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    W = cw; H = ch;
    const { d, eye, tgt } = eyeOf(cw / ch), P = persp(FOV, cw / ch, d * .05, d * 12), V = lookAt(eye, tgt);
    PV = mul(P, V); EYE = eye;
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    if (opB) { // 실험대와 불투명한 부품
      gl.disable(gl.BLEND); gl.depthMask(true); gl.useProgram(P_COL.p); gl.bindBuffer(gl.ARRAY_BUFFER, opB);
      const a = P_COL.at; gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(a.c); gl.vertexAttribPointer(a.c, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(P_COL.un.m, false, PV); gl.uniform3fv(P_COL.un.L, LIGHT);
      gl.drawArrays(gl.TRIANGLES, 0, opN); offAttr(P_COL);
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    // 그림자: 실험대에 닿은 곳에만
    gl.useProgram(P_TEX.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P_TEX.un.t, 0); gl.uniform1f(P_TEX.un.a, 1); gl.bindBuffer(gl.ARRAY_BUFFER, flat);
    { const at = P_TEX.at; gl.enableVertexAttribArray(at.p); gl.vertexAttribPointer(at.p, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(at.q); gl.vertexAttribPointer(at.q, 2, gl.FLOAT, false, 20, 12); }
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    const shade = (f, z) => { const w = (f.x2 - f.x) * 1.1 + 12, sx = (f.x + f.x2) / 2 - CX, m = new Float32Array([w, 0, 0, 0, 0, 1, 0, 0, 0, 0, clamp(w * .5, 22, 70), 0, sx, .3, z, 1]); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, m)); gl.drawArrays(gl.TRIANGLES, 0, 6); };
    cards.forEach(c => { if (c.foot && c.tex && c.feet) shade(c.feet, c.pz); });
    objs.forEach(ob => { if (ob.foot) shade(ob.foot, ob.az); });
    offAttr(P_TEX);
    const lean = clamp(cam.el * .3, 0, 14) * DEG; // 높이서 볼 때 카드를 조금 눕혀 덜 납작하게
    byFar(top.filter(it => !(it.kind !== 'obj' && it.over && !it.sign))).forEach(it => drawItem(it, lean));
    byFar(top.filter(it => it.kind !== 'obj' && it.over && !it.sign)).forEach(it => drawCard(it, lean)); // 설명 카드는 맨 나중에
    gl.depthMask(true);
    placeTags();
  }

  /* 이름표: 카드(또는 입체 부품의 축) 위의 점을 화면에 비춰 글자로 띄운다 (가리지 않게 위아래로 비켜 놓는다) */
  const unitCard = new Map(cards.filter(c => c.e == null).map(c => [String(c.u), c]));
  const tags = labels.map(l => {
    let c = null, ob = null;
    if (l.e != null) { c = cardOfE.get(l.e) || null; ob = objByE.get(l.e) || null; if (!c && ob) c = ob.decal || null; } // 부품 카드 → 입체 부품의 덧그림 → 그 축
    if (!c && !ob) c = unitCard.get(String(l.u)) || null; // 묶음 카드 (v1.19)
    const wz = !c && !ob ? unitZ.get(String(l.u)) ?? 0 : null; // 그린 것이 없는 이름표(label 부품)는 가리키는 곳 그대로
    const n = document.createElement('span'); n.className = 'v3-tag' + (l.tone === 'hot' || l.tone === 'arrow' ? ' ' + l.tone : ''); n.textContent = l.text; tagBox.appendChild(n);
    return { l, c, ob, wz, n, w: 0, h: 0 };
  }).filter(Boolean);
  function screenOf(t) {
    const { l, c, ob } = t; let p;
    if (c) { if (!c.m || !c.tex) return null; p = apply(mul(PV, c.m), (l.x - c.x) / c.w - .5, (c.y + c.h - l.y) / c.h, 0); }
    else if (!ob) p = apply(PV, l.x - CX, B - l.y, t.wz);
    else { const th = Math.atan2(EYE[0] - ob.ax, EYE[2] - ob.az), dx = l.x - ob.gx; p = apply(PV, ob.ax + dx * Math.cos(th), B - l.y, ob.az - dx * Math.sin(th)); }
    return p[3] > 0 ? { x: (p[0] / p[3] * .5 + .5) * W, y: (.5 - p[1] / p[3] * .5) * H } : null;
  }
  function placeTags() {
    if (!tags.length) return;
    const boxes = [], hit = b => boxes.some(q => b.x < q.x + q.w + 4 && b.x + b.w + 4 > q.x && b.y < q.y + q.h + 3 && b.y + b.h + 3 > q.y);
    let svg = '';
    tags.forEach(t => {
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
    lines.innerHTML = svg;
  }

  /* 조작: 끌어서 돌리기, 오른쪽 버튼·Shift로 옮기기, 휠·두 손가락으로 확대 */
  const ptrs = new Map(); let pinch = null;
  const rotate = (dx, dy) => { cam.az -= dx * .35; cam.el = clamp(cam.el + dy * .3, 0, 75); };
  const zoomBy = f => { cam.zoom = clamp(cam.zoom * f, .3, 2.6); };
  const pan = (dx, dy) => { const s = eyeOf(W / H).d * 2 * Math.tan(FOV / 2) / H, a = cam.az * DEG; cam.panX = clamp(cam.panX - dx * s * Math.cos(a), -spanX, spanX); cam.panY = clamp(cam.panY + dy * s, -spanY, spanY); };
  const touched = () => { anim = null; if (view) { view = null; setPressed(); } invalidate(); };
  const offs = [];
  const listen = (t, ev, f, op) => { t.addEventListener(ev, f, op); offs.push(() => t.removeEventListener(ev, f, op)); };
  if (!still) {
    listen(cv, 'pointerdown', ev => { cv.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, pan: ev.button === 2 || ev.shiftKey || ev.ctrlKey }); cv.classList.add('drag'); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; } });
    listen(cv, 'pointermove', ev => {
      const p = ptrs.get(ev.pointerId); if (!p) return;
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
      if (ptrs.size >= 2 && pinch) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomBy(pinch.d / d); pan(mx - pinch.mx, my - pinch.my); pinch = { d, mx, my }; }
      else if (p.pan) pan(dx, dy); else rotate(dx, dy);
      touched();
    });
    const up = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) cv.classList.remove('drag'); };
    listen(cv, 'pointerup', up); listen(cv, 'pointercancel', up);
    listen(cv, 'wheel', ev => { ev.preventDefault(); zoomBy(Math.exp(ev.deltaY * .0015)); touched(); }, { passive: false });
    listen(cv, 'contextmenu', ev => ev.preventDefault());
    listen(cv, 'dblclick', () => goView('angle'));
    listen(ctl, 'click', ev => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.view) goView(b.dataset.view); else if (b.dataset.zoom) { zoomBy(b.dataset.zoom > 0 ? 1 / 1.25 : 1.25); touched(); } });
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
    alive = false; if (frame) cancelAnimationFrame(frame);
    offs.forEach(f => f());
    try { allCards.forEach(c => c.tex && gl.deleteTexture(c.tex)); gl.deleteTexture(shTex); [quad, flat, opB, ...bufs].forEach(b => b && gl.deleteBuffer(b)); [P_TEX, P_COL, P_GLASS, P_LIQ, P_CAP].forEach(p => gl.deleteProgram(p.p)); const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); } catch (e) { }
    S.host.remove(); stage.innerHTML = '';
  }
  invalidate();
  if (!still) setTimeout(() => cv.focus({ preventScroll: true }), 0);
  return { ready, dispose, key, draw: () => draw(), canvas: cv, cards: allCards, objs, view: goView, eyeOf };
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
