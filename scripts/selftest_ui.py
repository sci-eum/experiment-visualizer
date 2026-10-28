#!/usr/bin/env python3
"""수업 조작·저장·답안 백업을 실제 Chrome/Edge에서 검사한다 (Node.js 22+, 외부 패키지 없음).

python scripts/selftest_ui.py [--require-browser]
가상 활동지 하나를 넓은 화면과 휴대폰 너비로 열며, 사용자 실험지는 쓰지 않는다.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import check_render
from build_html import add3d, build

ROOT = Path(__file__).resolve().parent.parent
DATA = {
    "id": "selftest-interactions", "title": "가상 관찰 활동", "steps": [
        {"id": "look", "title": "관찰", "text": "물의 모습을 관찰한다.", "predict": "어떤 모습일까?",
         "sketch": {"id": "view", "shape": "box"},
         "scene": [{"t": "beaker", "id": "b", "x": 240, "fill": .4}],
         "reveal": {"text": "관찰을 마쳤어요.", "change": {"b": {"color": "blue"}}}},
        {"id": "record", "title": "기록", "scene": [{"t": "beaker", "x": 240, "fill": .4}]},
        {"id": "guess", "title": "고르는 예상", "scene": [{"t": "beaker", "id": "g", "x": 240, "fill": .4}],
         "predict": [{"text": "가상 물음 1?", "choices": ["가", "나"], "answer": "가", "why": "가상 까닭"},
                     {"text": "가상 물음 2?", "choices": ["다", "라", "마"], "answer": ["라"]}],
         "reveal": {"text": "가상 결과", "change": {"g": {"color": "blue"}}}},
        {"id": "fill", "title": "이어받아 채우기", "scene": {"from": "prev", "change": {"g": {"fill": .8}}, "add": [{"t": "dropper", "over": "g"}]}},
    ], "results": {"questions": [{"id": "q", "text": "관찰한 점은?"}]},
}

TEST_JS = r"""
window.addEventListener('load', async () => {
  const results = [], errors = [], $ = s => document.querySelector(s);
  const check = (name, ok) => { results.push(name); document.documentElement.dataset.uiStage=name; if (!ok) errors.push(name); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn,n=100) => { for (let i=0;i<n;i++) { if (fn()) return true; await sleep(20); } return false; };
  const count = () => $('.deck-count').textContent;
  const touch = (target, type, xs, ended=[]) => {
    const ev = new Event(type, {bubbles:true});
    Object.defineProperties(ev, {touches:{value:xs.map(x=>({clientX:x}))},changedTouches:{value:ended.map(x=>({clientX:x}))}});
    target.dispatchEvent(ev);
  };
  const swipe = (target, a=250, b=80) => { touch(target,'touchstart',[a]); touch(target,'touchend',[],[b]); };
  const write = text => { const w=$('#deck [data-w]'); w.textContent=text; w.dispatchEvent(new Event('input',{bubbles:true})); return w; };
  const importFile = async data => {
    const f=$('#app [data-answer-file]');
    const status=$('#app [data-import-status]'); status.textContent='';
    Object.defineProperty(f,'files',{configurable:true,value:[new File([typeof data==='string'?data:JSON.stringify(data)],'answers.json',{type:'application/json'})]});
    f.dispatchEvent(new Event('change',{bubbles:true}));
    if (!await until(()=>status.textContent)) throw Error('답안 가져오기 응답 시간 초과');
  };
  try {
    check('실제 CSS 화면 너비',window.innerWidth===__VIEW_WIDTH__);
    localStorage.removeItem('lk:selftest-interactions');
    $('[data-step="0"]').click();
    const first=count();
    $('#deck [data-next]').click(); check('다음 단추',count()!==first);
    $('#deck [data-prev]').click();
    swipe($('#deck .deck-stage')); check('밀어서 다음 단계',count()!==first);
    swipe($('#deck .deck-stage'),80,250); check('반대로 밀어 이전 단계',count()===first);
    swipe($('#deck .deck-stage'),250,225); check('짧은 이동 유지',count()===first);
    touch($('#deck .deck-stage'),'touchstart',[250]); touch($('#deck .deck-stage'),'touchcancel',[]); touch($('#deck .deck-stage'),'touchend',[],[80]);
    check('취소한 터치 유지',count()===first);
    touch($('#deck .deck-stage'),'touchstart',[250]); touch($('#deck .deck-stage'),'touchmove',[250,100]); touch($('#deck .deck-stage'),'touchend',[],[80]);
    check('두 손가락 조작 유지',count()===first);
    const w=write('저장할 가상 답안');
    swipe(w); check('답안 칸 조작 유지',count()===first);
    const sk=$('#deck canvas[data-sk]'); swipe(sk); check('그림 칸 조작 유지',count()===first);
    const rect=sk.getBoundingClientRect();
    sk.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:rect.x+20,clientY:rect.y+20,pointerId:1}));
    sk.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:rect.x+20,clientY:rect.y+20,pointerId:1}));
    check('글과 그림 저장',JSON.parse(localStorage.getItem('lk:selftest-interactions'))['s:view:0'].startsWith('data:image/png'));
    check('저장 성공 표시',$('#deck [data-save-status]').dataset.state==='saved');
    const nativeSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(){throw new Error('test quota');};
    write('저장 실패 중 답안');
    check('저장 실패 표시',$('#deck [data-save-status]').dataset.state==='failed');
    let blob, nativeUrl=URL.createObjectURL, nativeClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=b=>{blob=b;return nativeUrl(b);};
    HTMLAnchorElement.prototype.click=function(){if(!this.download)nativeClick.call(this);};
    $('#deck [data-answer-export]').click();
    const backup=JSON.parse(await blob.text());
    check('저장 실패 중 백업',backup.answers['p:look:0']==='저장 실패 중 답안' && backup.answers['s:view:0'].startsWith('data:image/png'));
    URL.createObjectURL=nativeUrl;HTMLAnchorElement.prototype.click=nativeClick;Storage.prototype.setItem=nativeSet;
    const nativeConfirm=window.confirm;window.confirm=()=>true;
    await importFile({...backup,experiment:'lk:other'});
    check('다른 실험 백업 거절',$('#app [data-import-status]').dataset.state==='error' && w.textContent==='저장 실패 중 답안');
    await importFile('{broken');check('손상된 JSON 거절',$('#app [data-import-status]').dataset.state==='error');
    await importFile({...backup,answers:{bad:{value:1}}});check('답안 자료형 확인',$('#app [data-import-status]').dataset.state==='error');
    window.confirm=()=>false;await importFile({...backup,answers:{'p:look:0':'덮어쓰지 않을 답'}});
    check('가져오기 취소 시 유지',w.textContent==='저장 실패 중 답안');
    sk.getContext('2d').clearRect(0,0,sk.width,sk.height);
    window.confirm=()=>true;backup.answers['p:look:0']='복원한 가상 답안';await importFile(backup);
    check('글과 그림 복원',w.textContent==='복원한 가상 답안' && JSON.parse(localStorage.getItem('lk:selftest-interactions'))['s:view:0']===backup.answers['s:view:0']);
    check('그림을 화면에도 복원',await until(()=>sk.toDataURL('image/png')===backup.answers['s:view:0']));
    check('복원 후 저장 성공 표시',$('#deck [data-save-status]').dataset.state==='saved');window.confirm=nativeConfirm;
    $('#deck [data-v3deck]').click();
    check('3D 시작',await until(()=>$('#deck .v3-cv')));
    const cv=$('#deck .v3-cv'); if(!cv)throw Error('3D canvas missing');
    swipe(cv);check('3D 조작 중 단계 유지',count()===first);
    cv.focus(); const key=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true});cv.dispatchEvent(key);
    check('3D 방향키 분리',key.defaultPrevented && count()===first);
    $('#deck [data-rv]').click();check('3D 결과 보기',await until(()=>$('#deck .v3-cv')) && $('#deck .slide').classList.contains('rv-on'));
    $('#deck [data-next]').click();check('다음 단계 3D 유지',await until(()=>$('#deck .v3-cv')) && count()!==first);
    $('#deck [data-v3deck]').click();check('2D 복귀',!$('#deck .v3-cv')&&!$('#deck .scene-box').classList.contains('v3-on'));
    const nativeOpen=LabKit3D.open;LabKit3D.open=()=>{throw new Error('test WebGL unavailable');};
    $('#deck [data-v3deck]').click();await until(()=>$('#deck .v3-fallback'));
    check('3D 실패 시 2D 복귀',!$('#deck .scene-box').classList.contains('v3-on') && $('#deck [data-v3deck]').getAttribute('aria-pressed')==='false');LabKit3D.open=nativeOpen;
    const store=()=>JSON.parse(localStorage.getItem('lk:selftest-interactions')||'{}'), slide=()=>$('#deck .slide'), pc=(k,v)=>$(`#deck [data-pc="p:guess:${k}"][data-v="${v}"]`);
    $('#deck .dot[aria-label="3단계"]').click(); const c3=count();
    check('예상 전 결과 잠금',slide().classList.contains('pc-wait'));
    $('#deck [data-rv]').click();check('잠긴 결과 보기',!slide().classList.contains('rv-on'));
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'r',bubbles:true}));check('R 키도 잠금',!slide().classList.contains('rv-on'));
    pc(0,0).click();check('예상 고르기 저장',store()['p:guess:0']==='가' && pc(0,0).getAttribute('aria-pressed')==='true');
    check('하나만 고르면 잠금 유지',slide().classList.contains('pc-wait'));
    pc(0,1).click();check('결과 전 바꾸기',store()['p:guess:0']==='나' && pc(0,0).getAttribute('aria-pressed')==='false');
    pc(0,0).click();
    const sp=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});pc(1,0).focus();pc(1,0).dispatchEvent(sp);check('보기에서 Space는 단계 유지',count()===c3);
    pc(1,2).click();check('다 고르면 잠금 풀림',!slide().classList.contains('pc-wait'));
    $('#deck [data-rv]').click();check('예상 뒤 결과 보기',slide().classList.contains('rv-on'));
    check('맞힌 예상 도장',!!$('#deck [data-pcf="p:guess:0"] .pc-stamp'));
    check('틀린 예상 표시',!$('#deck [data-pcf="p:guess:1"] .pc-stamp') && pc(1,2).classList.contains('no') && pc(1,1).classList.contains('ok'));
    check('결과 뒤 예상 굳음',store()['p:guess:0:done']==='1' && store()['p:guess:1:done']==='1');
    pc(0,1).click();check('굳은 예상 유지',store()['p:guess:0']==='가');
    $('#deck .dot[aria-label="결과 정리"]').click();check('예상 도장 모음',/2개 중 1개/.test($('#deck [data-pcsum]').textContent) && !!$('#deck [data-pcsum] .ps.ok'));
    const tw=()=>!!$('#deck .scene-box[data-tw]'), still=()=>$('#deck [data-still]');
    $('#deck .dot[aria-label="3단계"]').click();$('#deck [data-next]').click();check('앞으로 넘기면 시연',tw());
    check('시연이 끝나면 정지 그림',await until(()=>!tw(),200) && $('#deck .sc-main animate')!==null);
    $('#deck [data-prev]').click();check('뒤로 넘기면 시연 없음',!tw());
    $('#deck .play-btn').click();check('결과 시연 다시 보기',tw() && $('#deck .sc-rv svg')!==null);
    still().click();check('움직임 끄기',still().getAttribute('aria-pressed')==='true' && localStorage.getItem('lk-pref:still')==='1' && !tw() && !$('#deck .scene-box animate') && getComputedStyle($('#deck .play-btn')).display==='none');
    $('#deck [data-next]').click();check('움직임 끄면 시연 없음',!tw() && !$('#deck .sc-main animate'));
    still().click();check('움직임 다시 켜기',localStorage.getItem('lk-pref:still')==='0' && !!$('#deck .sc-main animate'));
    const cv3=()=>$('#deck .v3-cv'), fr=()=>(cv3()||{})._frames||0;
    $('#deck [data-v3deck]').click();check('3D 반복 움직임 켜짐',await until(()=>cv3() && cv3().dataset.motion==='on',250));
    let f0=fr();check('3D 움직임 그리기',await until(()=>fr()>f0+4,75));
    $('#deck .dot[aria-label="3단계"]').click();await sleep(100);check('3D 뒤로 넘기면 시연 없음',!!cv3() && !cv3().dataset.tw);
    $('#deck [data-rv]').click();$('#deck [data-rv]').click();check('3D 결과 시연',await until(()=>cv3() && cv3().dataset.tw==='run',100));
    check('3D 결과 시연 끝',await until(()=>cv3() && !cv3().dataset.tw,250));
    $('#deck [data-next]').click();check('3D 단계 시연',await until(()=>cv3() && cv3().dataset.tw==='run',100));
    check('3D 시연 끝·이름표 다시',await until(()=>cv3() && !cv3().dataset.tw,250) && $('#deck .v3-tags').style.visibility==='');
    still().click();check('3D 움직임 끄기',await until(()=>cv3() && cv3().dataset.motion==='off',250));
    await sleep(200);f0=fr();await sleep(400);check('3D 멈춘 그림',fr()-f0<=1);
    still().click();$('#deck [data-v3deck]').click();
    $('#deck [data-close]').click();check('닫은 뒤 답안 유지',$('#app [data-w]').textContent==='복원한 가상 답안');
    check('닫은 뒤 고른 예상 유지',!!$('#app [data-pc="p:guess:0"][aria-pressed="true"]') && $('#app [data-pcg="p:guess:0"]').classList.contains('pc-done'));
    window.confirm=()=>true;$('#app [data-clear]').click();window.confirm=nativeConfirm;
    check('지우면 예상 잠금 다시',$('#app [data-rvs="2"]').classList.contains('pc-wait') && !$('#app [data-rvs="2"]').classList.contains('rv-on') && !$('#app [data-pcg="p:guess:0"]').classList.contains('pc-done'));
  } catch(err) { errors.push(String(err.stack||err)); }
  const out=document.createElement('pre');out.id='lk-ui-test';out.textContent=JSON.stringify({count:results.length,errors});document.body.appendChild(out);
});
"""


def run(exe, width):
    page = build((ROOT / 'assets/template.html').read_text(encoding='utf-8'), 'window.EXPERIMENT = ' + json.dumps(DATA) + ';')
    page = add3d(page, (ROOT / 'assets/labkit3d.js').read_text(encoding='utf-8'))
    page = re.sub(r'<link[^>]*https:[^>]*>', '', page)
    page = page.replace('</body>', '<script>' + TEST_JS.replace('__VIEW_WIDTH__', str(width)) + '</script></body>')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'interactions.html'
        f.write_text(page, encoding='utf-8')
        result = subprocess.run([shutil.which('node'), str(ROOT / 'scripts/browser_probe.js'), exe, f.resolve().as_uri(), str(width)],
                                capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
    if result.returncode:
        return {"count": 0, "errors": [result.stderr or "시험 결과를 읽지 못했습니다"]}
    return json.loads(result.stdout)


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--require-browser', action='store_true')
    ap.add_argument('--width', type=int, help='특정 화면 너비만 검사')
    args = ap.parse_args()
    if not shutil.which('node'):
        print('수업 조작 시험에는 Node.js 22 이상이 필요합니다.')
        return 1
    try:
        exe = check_render.browser()
    except SystemExit:
        print('브라우저가 없어 수업 조작 시험을 건너뜁니다.')
        return 1 if args.require_browser else 0
    bad = 0
    for width in ((args.width,) if args.width else (1100, 390)):
        print(f'조작 시험 시작: {width}', flush=True)
        result = run(exe, width)
        print(f"{'FAIL' if result['errors'] else 'OK'} 조작 시험 너비 {width}: {result['count']}개")
        for error in result['errors']:
            print('  -', error)
        bad += bool(result['errors'])
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
