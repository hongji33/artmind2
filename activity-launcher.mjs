import {studioActivities} from './personal-gallery.mjs';
const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('activity');
const activity=studioActivities.find(a=>a.id===id&&a.url.startsWith('https://hongji33.github.io/artclass/'));
if(!activity){$('activityTitle').textContent='활동을 선택해 주세요';$('message').textContent='미술관 체험실에서 원하는 활동을 선택해 주세요.';$('activityFrame').hidden=true}
else{
 const target=new URL(activity.url);$('activityTitle').textContent=activity.title;$('originalLink').href=target.href;
 let finished=false;
 function fallback(){if(finished)return;$('fallback').classList.add('show');$('message').textContent='원본 앱에서 직접 메뉴를 선택할 수도 있어요.'}
 const timeout=setTimeout(fallback,12000);
 $('activityFrame').addEventListener('load',()=>{
  try{
   const win=$('activityFrame').contentWindow,doc=win.document,tab=target.searchParams.get('tab'),sub=target.searchParams.get('sub');
   if(typeof win.go!=='function')throw Error('menu unavailable');
   if(tab==='play'){
    const button=doc.querySelector('#sub-play [data-sub="'+sub+'"]');if(!button)throw Error('activity unavailable');win.go('play',button,sub);doc.getElementById('sub-play').classList.add('open');doc.querySelector('[data-tab="play"] .caret').classList.add('rot');
   }else{const button=doc.querySelector('.nav [data-tab="'+tab+'"]');if(!button)throw Error('activity unavailable');win.go(tab,button)}
   win.scrollTo(0,0);finished=true;clearTimeout(timeout);$('message').textContent='활동 중인 내용은 이 탭에서 진행됩니다. 그림은 원본 앱의 저장 버튼으로 내려받아 주세요.';$('fallback').classList.remove('show');document.title=activity.title+' | 마음의 미술관';
  }catch{fallback()}
 });
 $('activityFrame').addEventListener('error',fallback);$('activityFrame').src='https://hongji33.github.io/artclass/';
}
