#!/usr/bin/env python3
"""수업 조작·저장·답안 백업을 실제 Chrome/Edge에서 검사한다 (Node.js 22+, 외부 패키지 없음).

python scripts/selftest_ui.py [--require-browser]
가상 활동지 하나를 넓은 화면과 휴대폰 너비로 열며, 사용자 실험지는 쓰지 않는다.
열린 회로는 결과 보기·다음 단계에서 닫힐 때만 전류가 보이는지(2D·3D), id를 주기 전에 내보낸 답안을 가져오는지도 본다.
인쇄 화면으로도 열어 학생용 인쇄에 결과(결과 그림·예상 결과)가 없고 표지가 결과 전 장면인지 본다 (가상 활동지와 양배추 예시).
배경 그래픽을 끈 인쇄(브라우저 기본)에서도 단계 번호·적는 줄이 남는지, 카드 테두리·바닥글이 쪽 나눔에 맞는지도 본다.
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
    "id": "selftest-interactions", "title": "가상 관찰 활동",
    "materials": [{"name": "가상 비커", "qty": "1개", "icon": "beaker"}], "safety": ["가상 비커는 조심해서 다룬다."], "steps": [
        {"id": "look", "title": "관찰", "text": "물의 모습을 관찰한다.", "predict": "어떤 모습일까?",
         "sketch": {"id": "view", "shape": "box"},
         "scene": [{"t": "beaker", "id": "b", "x": 240, "fill": .4, "label": "가", "info": "가상 원문 설명"}],
         "reveal": {"text": "관찰을 마쳤어요.", "change": {"b": {"color": "blue"}}}},
        {"id": "record", "title": "기록", "scene": [{"t": "beaker", "x": 240, "fill": .4, "info": False}, {"t": "lamp", "id": "lp", "x": 380}, {"t": "heat", "kind": "radiate", "from": "lp"},
                                                {"t": "circuit", "id": "cc", "x": 90, "y": 110, "w": 120, "h": 90}, {"t": "current", "along": "cc", "show": "both"}]},
        {"id": "guess", "title": "고르는 예상", "scene": [{"t": "beaker", "id": "g", "x": 240, "fill": .4}],
         "predict": [{"text": "가상 물음 1?", "choices": ["가", "나"], "answer": "가", "why": "가상 까닭"},
                     {"text": "가상 물음 2?", "choices": ["다", "라", "마"], "answer": ["라"]}],
         "reveal": {"text": "가상 결과", "change": {"g": {"color": "blue"}}}},
        {"id": "fill", "title": "이어받아 채우기", "scene": {"from": "prev", "change": {"g": {"fill": .8}}, "add": [{"t": "dropper", "over": "g"}]}},
        {"id": "open", "title": "열린 회로", "scene": [{"t": "circuit", "id": "oc", "x": 240, "y": 140, "w": 240, "h": 140, "closed": False, "parts": ["battery", "switch", "bulb"]},
                                                      {"t": "current", "along": "oc", "show": "both"}],
         "reveal": {"text": "가상 결과", "change": {"oc": {"closed": True}}, "add": [{"t": "current", "along": "oc", "show": "both"}]}},
        {"id": "close", "title": "스위치 닫기", "scene": {"from": "prev", "change": {"oc": {"closed": True}}, "add": [{"t": "current", "along": "oc", "show": "both"}]}},
    ], "results": {"questions": [{"id": "q", "text": "관찰한 점은?"}]},
}


def hash_str(s):
    """엔진 hashStr과 같은 값: id가 없을 때 제목·물음 글로 정하는 저장 이름 조각"""
    h = 5381
    for ch in s:
        h = (h * 33 + ord(ch)) & 0xFFFFFFFF
    out = ''
    while True:
        h, r = divmod(h, 36)
        out = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + out
        if not h:
            return out


# id를 주기 전(제목·물음 글 이름)에 내보낸 답안
LEGACY = {"experiment": "lk:" + hash_str(DATA["title"]), "p": "p:" + hash_str("어떤 모습일까?"), "q": "q:" + hash_str("관찰한 점은?")}
# 인쇄 시험: 결과 보기가 있는 단계 뒤에 결과 색(#123456)을 이어받은 단계가 있어도 표지·학생용 인쇄에는 결과가 없어야 한다
PRINT_DATA = {
    "id": "selftest-print", "title": "가상 인쇄 시험", "steps": [
        {"id": "set", "title": "장치 꾸미기", "scene": [{"t": "tripod", "id": "tr", "x": 200}, {"t": "lamp", "x": 200},
                                                    {"t": "beaker", "id": "b", "on": "tr", "fill": .5, "color": "clear"}, {"t": "thermometer", "in": "b"}]},
        {"id": "obs", "title": "관찰", "observe": "가상 관찰", "scene": {"from": "prev"}, "reveal": {"text": "가상 결과 글", "change": {"b": {"color": "#123456"}}}},
        {"id": "after", "title": "정리", "scene": {"from": "prev", "change": {"b": {"color": "#123456"}}, "add": [{"t": "stand", "x": 400}, {"t": "flask", "x": 330}]}},
    ], "results": {"expect": "가상 예상 결과", "conclusion": "가상 정리"},
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
    const pu=$('#app [data-us]'), ug=()=>$('#app [data-unseen]');
    check('보이지 않는 것: 처음엔 숨김',!!pu && !!ug() && getComputedStyle(ug()).visibility==='hidden' && $('#app [data-us]')===$('#app [data-rvs="1"] [data-us]'));
    pu.click();check('보이지 않는 것: 페이지에서 켜기',document.documentElement.classList.contains('lk-unseen') && await until(()=>getComputedStyle(ug()).visibility==='visible') && pu.getAttribute('aria-pressed')==='true' && $('#deck').hidden);
    check('전류와 반대로 움직이는 전자',!!$('#app [data-rvs="1"] [data-unseen] circle') && /전류 .*\|.*전자|전자 .*\|.*전류/.test([...document.querySelectorAll('#app [data-rvs="1"] [data-unseen] [data-lk-t=label]')].map(n=>n.textContent).join('|')));
    pu.click();check('보이지 않는 것: 페이지에서 끄기',!document.documentElement.classList.contains('lk-unseen') && pu.getAttribute('aria-pressed')==='false');
    $('[data-step="0"]').click();
    const first=count();
    const pk=()=>$('#deck .pk-card'), clickSvg=n=>n.dispatchEvent(new MouseEvent('click',{bubbles:true})), pkText=()=>pk().textContent.replace(/\s+/g,' ');
    clickSvg($('#deck .sc-main svg [data-lk-k="#0"]'));
    check('부품 누르면 카드',!pk().hidden && /비커/.test(pkText()) && $('#deck .pk-h b').textContent==='가');
    check('부품 빛남',!!$('#deck .sc-main .pk-on'));
    check('카드: 설명·안전 수칙·준비물',/가상 원문 설명/.test(pkText()) && /가상 비커는 조심/.test(pkText()) && /가상 비커 1개/.test(pkText()));
    check('카드: 기구 기본 설명',!!$('#deck .pk-card .pk-base') && /액체를 담거나 섞고 데울 때/.test(pkText()));
    clickSvg($('#deck .sc-main svg [data-lk-k="#0"]'));check('다시 누르면 닫기',pk().hidden && !$('#deck .sc-main .pk-on'));
    clickSvg($('#deck .sc-main svg [data-lk-t="label"][data-lk-k="#0"]'));check('이름표를 눌러도 카드',!pk().hidden);
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));check('Esc는 카드부터 닫기',pk().hidden && !$('#deck').hidden);
    $('#deck [data-pklist]').click();check('부품 살펴보기 목록',!$('#deck .pk-list').hidden && document.querySelectorAll('#deck .pk-list [data-pkk]').length===1);
    $('#deck .pk-list [data-pkk]').click();check('목록에서 고르기',!pk().hidden && $('#deck .pk-list [data-pkk]').getAttribute('aria-pressed')==='true' && !!$('#deck .sc-main .pk-on'));
    $('#deck [data-pkx]').click();check('카드 닫기 단추',pk().hidden);$('#deck [data-pklist]').click();
    $('#deck [data-next]').click();clickSvg($('#deck .sc-main svg [data-lk-k="#0"]'));
    check('info:false면 기본 설명 없음',!pk().hidden && !$('#deck .pk-card .pk-base'));$('#deck [data-prev]').click();
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
    const tap3=async(k,c=cv)=>{let s=null;for(let n=0;n<100&&!s;n++){s=c._spot&&c._spot(k);if(!s)await sleep(20);}if(!s)return false;
      const r=c.getBoundingClientRect(),o={bubbles:true,pointerId:9,button:0,isPrimary:true,pointerType:'mouse',clientX:r.left+s.x,clientY:r.top+s.y};
      c.dispatchEvent(new PointerEvent('pointerdown',o));c.dispatchEvent(new PointerEvent('pointerup',o));return true;};
    check('3D 부품 누르면 카드',await tap3('#0') && !pk().hidden && $('#deck .pk-h b').textContent==='가' && cv.dataset.pick==='#0');
    check('3D 고른 부품 틀',await until(()=>!!$('#deck .v3-lines .v3-pk')));
    const cutB=()=>$('#deck .v3-ctl [data-cut]');check('3D 단면 단추',!!cutB() && !cutB().hidden);
    cutB().click();check('3D 단면 켜기',cv.dataset.cut==='#0' && cutB().getAttribute('aria-pressed')==='true');
    cutB().click();check('3D 단면 끄기',cv.dataset.cut==='' && cutB().getAttribute('aria-pressed')==='false');cutB().click();
    await sleep(400);await tap3('#0');check('3D 다시 누르면 닫기',pk().hidden && cv.dataset.pick==='');
    check('카드 닫으면 단면 끔',cutB().hidden && cv.dataset.cut==='');
    $('#deck [data-pklist]').click();$('#deck .pk-list [data-pkk]').click();check('목록에서 고르면 3D 틀',cv.dataset.pick==='#0' && await until(()=>!!$('#deck .v3-lines .v3-pk')));
    $('#deck [data-pkx]').click();$('#deck [data-pklist]').click();check('카드 닫으면 3D 틀 없음',cv.dataset.pick==='' && await until(()=>!$('#deck .v3-lines .v3-pk')));
    $('#deck [data-rv]').click();check('3D 결과 보기',await until(()=>$('#deck .v3-cv')) && $('#deck .slide').classList.contains('rv-on'));
    $('#deck [data-next]').click();check('다음 단계 3D 유지',await until(()=>$('#deck .v3-cv')) && count()!==first);
    {const c2=$('#deck .v3-cv');const ok=await tap3('#1',c2);cutB().click();
    check('3D 단면 안쪽 이름표',ok && c2.dataset.cut==='#1' && await until(()=>document.querySelectorAll('#deck .v3-tag.sec').length===3) && /심지/.test($('#deck .v3-tags').textContent));
    cutB().click();check('단면 끄면 안쪽 이름표 없음',await until(()=>!document.querySelector('#deck .v3-tag.sec')));$('#deck [data-pkx]').click();}
    {const usB=()=>$('#deck [data-us]'), heat3=()=>$('#deck .v3-lines [marker-end^="url(#lk3h"]');
    check('보이지 않는 것 단추 (수업 모드)',!!usB() && usB().getAttribute('aria-pressed')==='false' && !heat3());
    usB().click();check('보이지 않는 것 켜면 입체에도',document.documentElement.classList.contains('lk-unseen') && await until(()=>!!heat3(),150));
    usB().click();check('보이지 않는 것 끄면 입체에서 빠짐',!document.documentElement.classList.contains('lk-unseen') && await until(()=>$('#deck .v3-cv') && !heat3(),150));}
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
    {const el=s=>document.querySelectorAll(s+' circle[fill="#3f73d6"]').length, slide=()=>$('#deck .slide'), e3=()=>el('#deck .v3-lines');
    check('열린 회로: 페이지 장면에 전류 없음',el('#app [data-rvs="4"] .sc-main')===0 && el('#app [data-rvs="4"] .sc-rv')>0 && el('#app [data-rvs="5"] .sc-main')>0);
    $('#deck .dot[aria-label="5단계"]').click();check('열린 회로: 수업 모드에 전류 없음',el('#deck .slide .sc-main')===0 && !slide().classList.contains('rv-on'));
    $('#deck [data-rv]').click();check('결과 보기로 닫으면 전류와 전자',slide().classList.contains('rv-on') && await until(()=>!tw() && el('#deck .slide .sc-rv')>0,200));
    $('#deck [data-rv]').click();check('결과를 닫으면 다시 없음',!slide().classList.contains('rv-on') && el('#deck .slide .sc-main')===0);
    $('#deck [data-next]').click();check('다음 단계에서 닫으면 전류',await until(()=>!tw() && el('#deck .slide .sc-main')>0,200));
    $('#deck [data-prev]').click();
    const us=$('#deck [data-us]');us.click();$('#deck [data-v3deck]').click();
    check('3D 열린 회로: 전류 없음',await until(()=>cv3(),150) && (await sleep(600),e3()===0));
    let c0=cv3();$('#deck [data-rv]').click();check('3D 결과 보기로 닫으면 전류',await until(()=>cv3() && cv3()!==c0 && !cv3().dataset.tw && e3()>0,250));
    c0=cv3();$('#deck [data-rv]').click();check('3D 결과를 닫으면 다시 없음',await until(()=>cv3() && cv3()!==c0,250) && (await sleep(600),e3()===0));
    $('#deck [data-next]').click();check('3D 다음 단계에서 닫으면 전류',await until(()=>cv3() && !cv3().dataset.tw && e3()>0,250));
    $('#deck [data-v3deck]').click();us.click();}
    $('#deck [data-close]').click();check('닫은 뒤 답안 유지',$('#app [data-w]').textContent==='복원한 가상 답안');
    $('#app [data-pkm="0"]').click();const mc=$('#app .pk-card[data-pkmat]');
    check('준비물 누르면 카드',!mc.hidden && /가상 비커/.test(mc.textContent) && /가상 비커는 조심/.test(mc.textContent) && /액체를 담거나/.test(mc.textContent));
    $('#app [data-pkm="0"]').click();check('준비물 다시 누르면 닫기',mc.hidden);
    check('닫은 뒤 고른 예상 유지',!!$('#app [data-pc="p:guess:0"][aria-pressed="true"]') && $('#app [data-pcg="p:guess:0"]').classList.contains('pc-done'));
    window.confirm=()=>true;$('#app [data-clear]').click();window.confirm=nativeConfirm;
    check('지우면 예상 잠금 다시',$('#app [data-rvs="2"]').classList.contains('pc-wait') && !$('#app [data-rvs="2"]').classList.contains('rv-on') && !$('#app [data-pcg="p:guess:0"]').classList.contains('pc-done'));
    window.confirm=()=>true;
    await importFile({format:'experiment-visualizer-answers',version:1,experiment:'__LEGACY_EXP__',title:'가상 관찰 활동',answers:{'__LEGACY_P__':'예전 판 예상','__LEGACY_Q__':'예전 판 답'}});
    check('id를 주기 전에 내보낸 답안 가져오기',$('#app [data-import-status]').dataset.state==='ok' && store()['p:look:0']==='예전 판 예상' && store()['q:q']==='예전 판 답' && store()['__LEGACY_P__']===undefined && $('#app [data-w="q:q"]').textContent==='예전 판 답');
    window.confirm=nativeConfirm;
  } catch(err) { errors.push(String(err.stack||err)); }
  const out=document.createElement('pre');out.id='lk-ui-test';out.textContent=JSON.stringify({count:results.length,errors});document.body.appendChild(out);
});
"""


# 인쇄 화면: 학생용은 결과 그림·결과 글이 없고, 표지는 결과 전 장면(그 단계 과정 그림에 있는 색만)이다. 교사용은 결과 그림이 있다
PRINT_JS = r"""
window.addEventListener('load', async () => {
  const results = [], errors = [], $ = s => document.querySelector(s), want = __WANT__;
  const check = (name, ok) => { results.push(name); if (!ok) errors.push(name); };
  const shown = n => { for (let x = n; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const fills = root => new Set([...root.querySelectorAll('[fill]')].map(n => n.getAttribute('fill').toLowerCase()).filter(c => /^#[0-9a-f]{3,6}$/.test(c)));
  const visHas = (sel, c) => [...document.querySelectorAll(sel)].filter(shown).some(n => n.innerHTML.toLowerCase().includes(c));
  try {
    check('인쇄 화면으로 열림', matchMedia('print').matches);
    document.documentElement.dataset.print = 'student';
    const art = $('.hero-art'), types = art ? [...art.querySelectorAll('[data-lk-t]')].map(n => n.dataset.lkT) : [];
    check('학생용 인쇄: 표지가 보임', !!art && shown(art) && art.dataset.cover === want.cover);
    check('학생용 인쇄: 표지는 그 실험의 장치', want.types.every(t => types.includes(t)) && !want.not.some(t => types.includes(t)));
    const src = $(`[data-rvs="${+want.cover - 1}"] .sc-main svg`), sf = src ? fills(src) : new Set();
    check('학생용 인쇄: 표지에는 결과 전 과정 그림의 색만', !!src && [...fills(art)].every(c => sf.has(c)));
    check('학생용 인쇄: 결과 그림·결과 글 없음', ![...document.querySelectorAll('.sc-rv, .rv-text, .res-expect, .res-conc')].some(shown) && !(want.result && (visHas('.hero-art', want.result) || visHas('.sc-rv', want.result))));
    if (want.result) { document.documentElement.dataset.print = 'teacher'; check('교사용 인쇄: 결과 그림 있음', visHas('.sc-rv', want.result)); }
    // 브라우저 기본(배경 그래픽 끔)으로 인쇄해도 단계 번호·적는 줄이 보이고, 다음 쪽으로 넘어간 카드의 윗선이 앞쪽에 남지 않게(outline 대신 border), 바닥글은 한 문단
    const cs = s => { const n = $(s); return n ? getComputedStyle(n) : null; }, exact = c => !!c && (c.printColorAdjust || c.webkitPrintColorAdjust) === 'exact';
    check('인쇄: 단계 번호·적는 줄은 배경 그래픽을 꺼도', exact(cs('.num')) && (!$('.write') || exact(cs('.write'))));
    check('인쇄: 카드 테두리는 border (outline 없음)', ['.step', '.mat', '.card'].every(q => { const c = cs(q); return !c || (c.outlineStyle === 'none' && parseFloat(c.borderTopWidth) >= 1); }));
    check('인쇄: 바닥글 한 문단', [...document.querySelectorAll('.foot .fl')].every(n => getComputedStyle(n).display === 'inline'));
  } catch (err) { errors.push(String(err.stack || err)); }
  const out = document.createElement('pre'); out.id = 'lk-ui-test'; out.textContent = JSON.stringify({ count: results.length, errors }); document.body.appendChild(out);
});
"""


def run(exe, width, page=None, js=None, media=None):
    if page is None:
        page = build((ROOT / 'assets/template.html').read_text(encoding='utf-8'), 'window.EXPERIMENT = ' + json.dumps(DATA) + ';')
        page = add3d(page, (ROOT / 'assets/labkit3d.js').read_text(encoding='utf-8'))
        js = TEST_JS.replace('__VIEW_WIDTH__', str(width)).replace('__LEGACY_EXP__', LEGACY['experiment']).replace('__LEGACY_P__', LEGACY['p']).replace('__LEGACY_Q__', LEGACY['q'])
    page = re.sub(r'<link[^>]*https:[^>]*>', '', page)
    page = page.replace('</body>', '<script>' + js + '</script></body>')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'interactions.html'
        f.write_text(page, encoding='utf-8')
        result = subprocess.run([shutil.which('node'), str(ROOT / 'scripts/browser_probe.js'), exe, f.resolve().as_uri(), str(width), *([media] if media else [])],
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
    # 인쇄 화면: 가상 활동지(결과 색 #123456)와 양배추 예시 (붉은 양배추 지시약의 처음 색만, 바뀐 색 없음)
    tpl = (ROOT / 'assets/template.html').read_text(encoding='utf-8')
    cases = [('가상 활동지', build(tpl, 'window.EXPERIMENT = ' + json.dumps(PRINT_DATA) + ';'),
              {"cover": "2", "types": ["tripod", "lamp", "beaker", "thermometer"], "not": ["stand", "flask"], "result": "#123456"}),
             ('양배추 예시', (ROOT / 'examples/red-cabbage/red-cabbage.html').read_text(encoding='utf-8'),
              {"cover": "3", "types": ["rack", "dropper", "cup"], "not": ["flask", "beaker"], "result": ""})]
    for name, page, want in cases:
        result = run(exe, 1100, page, PRINT_JS.replace('__WANT__', json.dumps(want)), 'print')
        print(f"{'FAIL' if result['errors'] else 'OK'} 인쇄 시험 {name}: {result['count']}개")
        for error in result['errors']:
            print('  -', error)
        bad += bool(result['errors'])
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
