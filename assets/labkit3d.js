/*! experiment-visualizer LabKit3D v1.19.0 | MIT License | https://github.com/sci-eum/experiment-visualizer */
/* 실험 장면을 입체(WebGL)로 보여 준다. 그림 엔진(LabKit)이 그린 장면을 기구 묶음마다 그림 카드로 잘라 실험대 위에 세운다.
   외부 라이브러리 없이 WebGL만 쓴다 (인터넷 없이 여는 한 파일 버전에도 그대로 넣을 수 있게).
   그림 엔진이 '3D' 버튼을 누를 때 불러와 LabKit3D.open(창, { items, title, bench })을 부른다. */
(function () {
'use strict';
const VERSION = '1.19.0'; // labkit.js의 VERSION·첫 줄 머리말과 같게 고친다
const FONT = '"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",sans-serif';
const DEG = Math.PI / 180;
const FOV = 30 * DEG; // 세로 시야각
// 시점: az(좌우로 돈 각도), el(내려다보는 각도). front는 2D 그림과 거의 같은 모습
const VIEWS = { front: { az: 0, el: 5 }, angle: { az: -30, el: 18 }, top: { az: 0, el: 42 } };
// 설명 부품(말풍선·화살표·글자 등)은 기구 바로 앞에 두고 늘 기구 위에 그린다 (2D처럼 가리지 않게)
const OVERLAY = new Set(['note', 'text', 'view', 'zoom', 'label', 'mark', 'eye', 'arrow', 'ray']);
const MAX_TEX = 2048;

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

/* ---------- 행렬 (열 우선, WebGL과 같은 순서) ---------- */
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}
function persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
function lookAt(e, c) {
  let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]], l = Math.hypot(...z); z = z.map(v => v / l);
  let x = [z[2], 0, -z[0]]; l = Math.hypot(...x) || 1; x = x.map(v => v / l); // 위쪽(0,1,0)과 z의 외적
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]], d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, e), -d(y, e), -d(z, e), 1]);
}
// 카드: 아래 가운데를 (px,py,pz)에 두고, 세로축으로 th만큼 돌리고(카메라 쪽으로), 아래 모서리를 축으로 lean만큼 뒤로 눕힌다
function cardMat(px, py, pz, th, lean, w, h) {
  const cs = Math.cos(th), sn = Math.sin(th), cl = Math.cos(lean), sl = Math.sin(lean);
  return new Float32Array([w * cs, 0, -w * sn, 0, -h * sl * sn, h * cl, -h * sl * cs, 0, cl * sn, sl, cl * cs, 0, px, py, pz, 1]);
}
function apply(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }

/* ---------- WebGL 준비 ---------- */
const VS_TEX = 'attribute vec3 p;attribute vec2 q;uniform mat4 m;varying vec2 v;void main(){v=q;gl_Position=m*vec4(p,1.);}';
const FS_TEX = 'precision mediump float;uniform sampler2D t;uniform float a;varying vec2 v;void main(){gl_FragColor=texture2D(t,v)*a;}';
const VS_COL = 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 m;uniform vec3 L;varying vec3 k;void main(){k=c*(.66+.34*max(dot(n,L),0.));gl_Position=m*vec4(p,1.);}';
const FS_COL = 'precision mediump float;varying vec3 k;void main(){gl_FragColor=vec4(k,1.);}';
function program(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('셰이더: ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('셰이더 연결: ' + gl.getProgramInfoLog(p));
  const at = {}, un = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const a = gl.getActiveAttrib(p, i); at[a.name] = gl.getAttribLocation(p, a.name); }
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const u = gl.getActiveUniform(p, i); un[u.name] = gl.getUniformLocation(p, u.name); }
  return { p, at, un };
}
function buffer(gl, data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; }
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
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function box(out, x0, x1, y0, y1, z0, z1, color, sides = 'tbfklr') {
  const c = hex(color), f = (n, ...v) => { [0, 1, 2, 0, 2, 3].forEach(i => out.push(...v[i], ...n, ...c)); };
  if (sides.includes('t')) f([0, 1, 0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  if (sides.includes('b')) f([0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  if (sides.includes('f')) f([0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  if (sides.includes('k')) f([0, 0, -1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  if (sides.includes('l')) f([-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  if (sides.includes('r')) f([1, 0, 0], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
}
function room(x0, x1) {
  const v = [], D = 120, cab = -150, w = x1 - x0;
  box(v, x0, x1, -12, 0, -D, D, '#f4eefb');                 // 상판
  box(v, x0, x1, -12, -10.5, -D, D + .4, '#e2d6f0', 'f');   // 상판 앞 모서리 띠
  box(v, x0 + 12, x1 - 12, cab, -12, -D + 10, D - 14, '#ebe4f4'); // 서랍장
  const n = Math.max(2, Math.round(w / 190)), dw = (w - 24) / n;
  for (let i = 0; i < n; i++) { // 문 사이 틈과 손잡이
    const a = x0 + 12 + i * dw;
    if (i) box(v, a - .8, a + .8, cab + 6, -18, D - 14, D - 13.4, '#d8cbe8', 'f');
    box(v, a + dw / 2 - 22, a + dw / 2 + 22, -34, -28, D - 14, D - 10, '#cbbbdf', 'tfb');
  }
  return v;
}

/* ---------- 장면 → 그림 카드 ---------- */
// LabKit.scene3이 그린 SVG를 화면 밖에 잠깐 붙여 묶음(data-u3)마다 상자를 재고, 그 묶음만 담은 SVG를 그림으로 바꾼다
function cutCards(K, items) {
  const { svg, labels } = K.scene3(items || [], {});
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:480px;height:300px;opacity:0;pointer-events:none;font-family:' + FONT;
  host.innerHTML = svg; document.body.appendChild(host);
  const root = host.firstElementChild, units = new Map(), ser = new XMLSerializer();
  try {
    const defs = root.querySelector(':scope > defs'), defsXml = defs ? ser.serializeToString(defs) : '';
    [...root.children].forEach((g, i) => {
      if (!g.matches('g[data-u3]')) return;
      const u = g.getAttribute('data-u3');
      let b = null; try { b = g.getBBox(); } catch (e) { }
      const un = units.get(u) || { u, order: i, nodes: [], types: new Set(), box: null };
      un.nodes.push(g); un.types.add(g.getAttribute('data-u3t'));
      if (b && b.width + b.height > 0) un.box = un.box ? { x: Math.min(un.box.x, b.x), y: Math.min(un.box.y, b.y), x2: Math.max(un.box.x2, b.x + b.width), y2: Math.max(un.box.y2, b.y + b.height) } : { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height };
      units.set(u, un);
    });
    const cards = [];
    units.forEach(un => {
      if (!un.box) return;
      const p = 6 + .02 * Math.max(un.box.x2 - un.box.x, un.box.y2 - un.box.y); // 선 굵기·그림자가 상자 밖으로 나온다
      const x = un.box.x - p, y = un.box.y - p, w = un.box.x2 - un.box.x + 2 * p, h = un.box.y2 - un.box.y + 2 * p;
      const k = Math.min(3, MAX_TEX / Math.max(w, h)), cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
      const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}" font-family='${FONT}'>${defsXml}${un.nodes.map(n => ser.serializeToString(n)).join('')}</svg>`;
      const types = [...un.types], over = types.every(t => OVERLAY.has(t));
      cards.push({ u: un.u, order: un.order, types, over, x, y, w, h, cw, ch, xml, bottom: un.box.y2 });
    });
    return { cards, labels };
  } finally { host.remove(); }
}
// 실험대 선 바로 위 12만큼의 줄에서 칠해진 곳의 왼쪽·오른쪽 끝 (그림자를 실험대에 닿은 곳에만 깐다)
function footOf(card, cv) {
  try {
    const k = card.cw / card.w, y0 = Math.max(0, Math.floor((card.bottom - 12 - card.y) * k)), y1 = Math.min(card.ch, Math.ceil((card.bottom - card.y) * k));
    if (y1 <= y0) return null;
    const d = cv.getContext('2d').getImageData(0, y0, card.cw, y1 - y0).data;
    let a = Infinity, b = -Infinity;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = (i >> 2) % card.cw; if (x < a) a = x; if (x > b) b = x; }
    return a <= b ? { x: card.x + a / k, x2: card.x + (b + 1) / k } : null;
  } catch (e) { return null; } // 그림을 읽을 수 없는 브라우저면 카드 너비로
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
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); lines.setAttribute('class', 'v3-lines'); lines.setAttribute('aria-hidden', 'true'); stage.appendChild(lines);
  const tagBox = document.createElement('div'); tagBox.className = 'v3-tags'; tagBox.setAttribute('aria-hidden', 'true'); stage.appendChild(tagBox);
  const load = document.createElement('div'); load.className = 'v3-load'; load.textContent = '그림 카드를 세우는 중…'; stage.appendChild(load);
  let ctl = null;
  if (!still) {
    ctl = document.createElement('div'); ctl.className = 'v3-ctl'; ctl.setAttribute('role', 'toolbar'); ctl.setAttribute('aria-label', '시점 바꾸기');
    ctl.innerHTML = '<button type="button" data-view="front">앞에서</button><button type="button" data-view="angle">비스듬히</button><button type="button" data-view="top">위에서</button><span class="v3-sep"></span><button type="button" data-zoom="1" aria-label="가까이 보기">+</button><button type="button" data-zoom="-1" aria-label="멀리 보기">−</button>';
    stage.appendChild(ctl);
    const hint = document.createElement('p'); hint.className = 'v3-hint';
    hint.textContent = '끌어서 돌리기 · 휠이나 두 손가락으로 확대 · 오른쪽 버튼(Shift+끌기)으로 옮기기. 기구는 2D 그림을 카드로 세워 보여 줘요.';
    stage.appendChild(hint);
  }

  /* 장면 */
  const { cards, labels } = cutCards(K, o.items);
  const bench = o.bench !== false;
  const order = [...cards].sort((a, b) => a.order - b.order);
  order.forEach((c, i) => {
    c.sign = bench && c.over && c.y + 6 >= B; // 실험대 띠(실험대 선 아래)에 쓴 글자는 실험대 앞면에 붙인다
    c.px = c.x + c.w / 2 - CX; c.py = c.sign ? -6 - c.h / 2 : B - (c.y + c.h); c.pz = c.sign ? 122 + i * .5 : c.over ? 10 + i * .5 : (i - order.length / 2) * 4; // 나중에 그린 묶음이 조금 앞
    c.foot = bench && !c.over && Math.abs(c.bottom - B) < 8; // 실험대에 놓인 묶음 (그림자를 깐다)
  });
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  cards.forEach(c => { xmin = Math.min(xmin, c.px - c.w / 2); xmax = Math.max(xmax, c.px + c.w / 2); ymin = Math.min(ymin, c.py); ymax = Math.max(ymax, c.py + c.h); });
  if (!cards.length) { xmin = -CX; xmax = CX; ymin = 0; ymax = 160; }
  const tx0 = (xmin + xmax) / 2, ty0 = (Math.min(ymin, bench ? -20 : ymin) + ymax) / 2, spanX = xmax - xmin, spanY = ymax - ymin;
  // 이 시점에서 모든 카드가 화면에 들어오는 거리: 카드 네 귀퉁이를 카메라 기준으로 재어 가장 먼 것을 고른다
  const fitPts = cards.length ? cards.flatMap(c => [[c.px, c.py, c.pz, c.w / 2], [c.px, c.py + c.h, c.pz, c.w / 2]]) : [[xmin, ymin, 0, 0], [xmax, ymax, 0, 0]];
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
  const P_TEX = program(gl, VS_TEX, FS_TEX), P_COL = program(gl, VS_COL, FS_COL);
  const quad = buffer(gl, [-.5, 0, 0, 0, 1, .5, 0, 0, 1, 1, .5, 1, 0, 1, 0, -.5, 0, 0, 0, 1, .5, 1, 0, 1, 0, -.5, 1, 0, 0, 0]);
  const flat = buffer(gl, [-.5, 0, -.5, 0, 0, .5, 0, -.5, 1, 0, .5, 0, .5, 1, 1, -.5, 0, -.5, 0, 0, .5, 0, .5, 1, 1, -.5, 0, .5, 0, 1]);
  const roomV = bench ? room(Math.min(-CX - 40, xmin - 40), Math.max(CX + 40, xmax + 40)) : [], roomB = bench ? buffer(gl, roomV) : null, roomN = roomV.length / 9;
  const shTex = texture(gl, shadowCanvas(), gl2);
  let alive = true, frame = 0, done = 0, failed = 0;
  const ready = Promise.all(cards.map(c => raster(c).then(img => {
    if (!alive) return;
    try { c.tex = texture(gl, img, gl2); } catch (e) { failed++; warn('그림 카드를 올리지 못했어요 (' + c.types.join(',') + '): ' + e.message); }
    done++; load.textContent = `그림 카드를 세우는 중… ${done}/${cards.length}`; invalidate();
  }, e => { failed++; done++; warn(e.message); invalidate(); }))).then(() => { load.hidden = true; invalidate(); return { units: cards.length, failed }; });
  if (!cards.length) load.hidden = true;

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
  let W = 0, H = 0, PV = null, last = null;
  function invalidate() { if (alive && !frame) frame = requestAnimationFrame(draw); }
  function draw(now) {
    frame = 0; if (!alive) return;
    if (anim) { const k = clamp(((now || performance.now()) - anim.t0) / anim.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; Object.keys(anim.to).forEach(p => { cam[p] = anim.from[p] + (anim.to[p] - anim.from[p]) * e; }); if (k >= 1) anim = null; else invalidate(); }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = (o.size && o.size[0]) || stage.clientWidth || 960, ch = (o.size && o.size[1]) || stage.clientHeight || 600;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    W = cw; H = ch;
    const { d, eye, tgt } = eyeOf(cw / ch), P = persp(FOV, cw / ch, d * .05, d * 12), V = lookAt(eye, tgt);
    PV = mul(P, V);
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    if (roomB) { // 실험대
      gl.disable(gl.BLEND); gl.depthMask(true); gl.useProgram(P_COL.p); gl.bindBuffer(gl.ARRAY_BUFFER, roomB);
      const a = P_COL.at; gl.enableVertexAttribArray(a.p); gl.vertexAttribPointer(a.p, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(a.n); gl.vertexAttribPointer(a.n, 3, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(a.c); gl.vertexAttribPointer(a.c, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(P_COL.un.m, false, PV); gl.uniform3f(P_COL.un.L, .36, .82, .45);
      gl.drawArrays(gl.TRIANGLES, 0, roomN);
      [a.p, a.n, a.c].forEach(i => gl.disableVertexAttribArray(i));
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.useProgram(P_TEX.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P_TEX.un.t, 0); gl.uniform1f(P_TEX.un.a, 1);
    const at = P_TEX.at, bind = b => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(at.p); gl.vertexAttribPointer(at.p, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(at.q); gl.vertexAttribPointer(at.q, 2, gl.FLOAT, false, 20, 12); };
    bind(flat); gl.bindTexture(gl.TEXTURE_2D, shTex); // 그림자
    cards.forEach(c => {
      if (!c.foot || !c.tex) return;
      const f = c.feet || { x: c.x, x2: c.x + c.w }, w = (f.x2 - f.x) * 1.1 + 12, sx = (f.x + f.x2) / 2 - CX;
      const m = new Float32Array([w, 0, 0, 0, 0, 1, 0, 0, 0, 0, clamp(w * .5, 22, 70), 0, sx, .3, c.pz, 1]); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, m)); gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    bind(quad); // 카드: 카메라 쪽으로 돌려 세우고, 먼 것부터 (설명 카드는 맨 나중에)
    const lean = clamp(cam.el * .3, 0, 14) * DEG; // 높이서 볼 때 카드를 조금 눕혀 덜 납작하게
    cards.forEach(c => { c.m = c.sign ? cardMat(c.px, c.py, c.pz, 0, 0, c.w, c.h) : cardMat(c.px, c.py, c.pz, Math.atan2(eye[0] - c.px, eye[2] - c.pz), lean, c.w, c.h); c.dist = Math.hypot(eye[0] - c.px, eye[1] - (c.py + c.h / 2), eye[2] - c.pz); });
    [...cards].sort((a, b) => (a.over && !a.sign) - (b.over && !b.sign) || b.dist - a.dist || a.order - b.order).forEach(c => { if (!c.tex) return; gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniformMatrix4fv(P_TEX.un.m, false, mul(PV, c.m)); gl.drawArrays(gl.TRIANGLES, 0, 6); });
    gl.disableVertexAttribArray(at.p); gl.disableVertexAttribArray(at.q); gl.depthMask(true);
    last = { eye }; placeTags();
  }

  /* 이름표: 카드 위의 점을 화면에 비춰 글자로 띄운다 (가리지 않게 위아래로 비켜 놓는다) */
  const byU = new Map(cards.map(c => [String(c.u), c]));
  const tags = labels.map(l => { const c = byU.get(String(l.u)); if (!c) return null; const n = document.createElement('span'); n.className = 'v3-tag' + (l.tone === 'hot' || l.tone === 'arrow' ? ' ' + l.tone : ''); n.textContent = l.text; tagBox.appendChild(n); return { l, c, n, w: 0, h: 0 }; }).filter(Boolean);
  function screenOf(c, x, y) {
    const p = apply(mul(PV, c.m), (x - c.x) / c.w - .5, (c.y + c.h - y) / c.h, 0);
    return p[3] > 0 ? { x: (p[0] / p[3] * .5 + .5) * W, y: (.5 - p[1] / p[3] * .5) * H } : null;
  }
  function placeTags() {
    if (!tags.length) return;
    const boxes = [], hit = b => boxes.some(q => b.x < q.x + q.w + 4 && b.x + b.w + 4 > q.x && b.y < q.y + q.h + 3 && b.y + b.h + 3 > q.y);
    let svg = '';
    tags.forEach(t => {
      if (!t.c.tex) { t.n.style.display = 'none'; return; }
      const s = screenOf(t.c, t.l.x, t.l.y); if (!s) { t.n.style.display = 'none'; return; }
      t.n.style.display = ''; if (!t.w) { t.w = t.n.offsetWidth; t.h = t.n.offsetHeight; }
      const w = t.w, h = t.h;
      let b;
      if (!t.l.pin) b = { x: s.x - w / 2, y: s.y - h / 2, w, h };
      else {
        let side = s.x + 22 + w > W - 6 ? -1 : 1;
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
    try { cards.forEach(c => c.tex && gl.deleteTexture(c.tex)); gl.deleteTexture(shTex); [quad, flat, roomB].forEach(b => b && gl.deleteBuffer(b)); gl.deleteProgram(P_TEX.p); gl.deleteProgram(P_COL.p); const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); } catch (e) { }
    stage.innerHTML = '';
  }
  invalidate();
  if (!still) setTimeout(() => cv.focus({ preventScroll: true }), 0);
  return { ready, dispose, key, draw: () => draw(), canvas: cv, cards, view: goView, eyeOf };
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
    const r = { title: sc.title || '', units: 0, failed: 0, out: [] };
    try {
      const v = viewer(stage, { ...sc, view: o.view, still: true, size: [w, h] }), res = await v.ready;
      v.draw(); r.units = res.units; r.failed = res.failed;
      const { eye } = v.eyeOf(w / h), PV = mul(persp(FOV, w / h, 1, 1e5), lookAt(eye, v.eyeOf(w / h).tgt));
      v.cards.forEach(c => { const p = apply(PV, c.px, c.py + c.h / 2, c.pz); const nx = p[0] / p[3], ny = p[1] / p[3]; if (!(p[3] > 0 && Math.abs(nx) <= 1.02 && Math.abs(ny) <= 1.02)) r.out.push(c.types.join('+')); });
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
