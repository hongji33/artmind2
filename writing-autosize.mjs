// Compact fields grow with the student's own text, up to a readable viewport height.
export function installWritingAutosize(selector){
 let frame=0;
 function fit(field){if(!field.getClientRects().length)return;const min=Number(field.dataset.minHeight)||76,max=Math.max(min,Math.min(320,innerHeight*.42));field.style.height='auto';const height=Math.max(min,field.scrollHeight+2);field.style.height=Math.min(max,height)+'px';field.style.overflowY=height>max?'auto':'hidden'}
 function refresh(){frame=0;document.querySelectorAll(selector).forEach(fit)}
 function schedule(){if(!frame)frame=requestAnimationFrame(refresh)}
 document.addEventListener('input',e=>{if(e.target.matches(selector))fit(e.target)});
 document.addEventListener('click',schedule);window.addEventListener('resize',schedule);
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(node=>node instanceof Element&&(node.matches(selector)||node.querySelector(selector)))))schedule()}).observe(document.body,{childList:true,subtree:true});schedule();
}
