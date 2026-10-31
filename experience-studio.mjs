import {studioZones,studioActivities,activityHref} from './personal-gallery.mjs';
export function initStudio({beforeOpen,onClose}){
 const dialog=document.getElementById('studioDialog'),tabs=document.getElementById('studioTabs'),cards=document.getElementById('studioCards'),sidebar=document.getElementById('studioZoneLinks');let selected='atelier';
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
 function render(id){const zone=studioZones.find(z=>z.id===id)||studioZones[0];selected=zone.id;dialog.style.setProperty('--zone-color',zone.color);document.getElementById('studioZoneTitle').textContent=zone.title;document.getElementById('studioZoneSubtitle').textContent=zone.subtitle;cards.replaceChildren();
  for(const tab of tabs.children){const yes=tab.dataset.zone===zone.id;tab.setAttribute('aria-pressed',String(yes))}
  studioActivities.filter(a=>a.zone===zone.id).forEach((activity,i)=>{
   const card=make('a','activity-card');card.href=activityHref(activity);card.target='_blank';card.rel='noopener noreferrer';card.dataset.activity=activity.id;
   const art=make('div','activity-art '+zone.motif);art.setAttribute('aria-hidden','true');art.append(make('span','activity-index',String(i+1).padStart(2,'0')));for(let n=0;n<3;n++)art.append(make('i','shape shape-'+n));
   const copy=make('div','activity-copy');copy.append(make('span','activity-eyebrow',activity.url.includes('/artclass/')?'즐거운 미술시간':'마음의 미술사'),make('h3','',activity.title),make('p','',activity.description));if(activity.note)copy.append(make('small','activity-note',activity.note));copy.append(make('span','activity-open','활동 시작하기 ↗'));card.append(art,copy);cards.append(card);
  });
  document.getElementById('studioActivityCount').textContent=`${zone.number} / ${studioZones.length}개 코너 · ${cards.children.length}개 활동`;
 }
 function open(id=selected){beforeOpen();render(id);if(!dialog.open)dialog.showModal();document.getElementById('studioClose').focus()}
 for(const zone of studioZones){const tab=make('button','studio-tab',zone.title);tab.type='button';tab.dataset.zone=zone.id;tab.onclick=()=>render(zone.id);tabs.append(tab);const button=make('button','studio-zone-link');button.style.setProperty('--zone-color',zone.color);button.append(make('span','zone-number',zone.number),make('span','',zone.title),make('span','zone-arrow','↗'));button.onclick=()=>open(zone.id);sidebar.append(button)}
 document.getElementById('studioClose').onclick=()=>dialog.close();dialog.addEventListener('close',onClose);dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close()});
 return {open,close:()=>{if(dialog.open)dialog.close()}};
}
