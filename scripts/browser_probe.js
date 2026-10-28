/* 실제 CSS 화면 너비를 지정해 조작 시험 HTML을 연다. Node.js 22+, 외부 패키지 없음. */
'use strict';
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function run(exe, url, width) {
  if (typeof WebSocket !== 'function') throw new Error('조작 시험에는 Node.js 22 이상이 필요합니다.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-ui-'));
  const args = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--user-data-dir=' + profile, 'about:blank'];
  if (process.env.CI) args.unshift('--no-sandbox', '--disable-dev-shm-usage');
  const browser = cp.spawn(exe, args, { stdio: 'ignore', windowsHide: true });
  let socket, closed = false, browserError = null, id = 0;
  browser.on('error', err => { browserError = err; });
  browser.on('exit', () => { closed = true; });
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(method + ' 응답 시간 초과')); }, 10000);
    pending.set(key, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: key, method, params }));
  });
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile); i++) {
      if (browserError) throw browserError;
      if (closed || i >= 200) throw new Error('브라우저 디버깅 포트를 열지 못했습니다.');
      await sleep(50);
    }
    let port = 0; // Windows에서는 브라우저가 파일을 다 쓰기 전에 열면 EBUSY가 나거나 비어 있다
    for (let i = 0; !port; i++) {
      try { port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]); } catch (err) { if (err.code !== 'EBUSY') throw err; }
      if (!port) { if (i >= 40) throw new Error('브라우저 디버깅 포트를 읽지 못했습니다.'); await sleep(50); }
    }
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('브라우저 탭을 찾지 못했습니다.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data), p = pending.get(msg.id);
      if (!p) return;
      clearTimeout(p.timer); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
    });
    socket.addEventListener('close', () => {
      for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('브라우저 연결이 닫혔습니다.')); }
      pending.clear();
    });
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    await send('Page.navigate', { url });
    let result;
    for (let i = 0; i < 600; i++) {
      const r = await send('Runtime.evaluate', { expression: "document.getElementById('lk-ui-test')?.textContent || ''", returnByValue: true });
      if (r.result && r.result.value) { result = JSON.parse(r.result.value); break; }
      await sleep(50);
    }
    if (!result) {
      const stage = await send('Runtime.evaluate', { expression: 'document.documentElement.dataset.uiStage', returnByValue: true });
      throw new Error('조작 시험 시간 초과: ' + (stage.result && stage.result.value || '시작 전'));
    }
    return result;
  } finally {
    if (socket && socket.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch (err) { } }
    if (socket) socket.close();
    for (let i = 0; !closed && i < 40; i++) await sleep(50);
    if (!closed) browser.kill();
    // 직접 만든 임시 프로필만 지운다.
    if (path.resolve(profile).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(profile).startsWith('ev-ui-')) {
      try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch (err) { }
    }
  }
}

run(process.argv[2], process.argv[3], Number(process.argv[4])).then(
  result => process.stdout.write(JSON.stringify(result)),
  err => { process.stderr.write(String(err.stack || err)); process.exitCode = 1; }
);
