// Small local drawing pad. Only a 128px repeating tile is kept in memory/storage.
export function initFabricStudio(onChange){
 const $=id=>document.getElementById(id),pad=$('fabricPad'),ctx=pad.getContext('2d');let tile=null,revision=0,painting=false,last=null;
 const status=t=>$('fabricStatus').textContent=t;
 function blank(){ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,pad.width,pad.height)}blank();
 function size(){return Math.max(12,Math.min(48,Number($('fabricScale').value)||24))}
 function apply(persist=true){
  tile=document.createElement('canvas');tile.width=tile.height=128;tile.getContext('2d').drawImage(pad,0,0,128,128);onChange(tile,size());
  if(persist){try{localStorage.setItem('artmind-fabric-v1',JSON.stringify({data:tile.toDataURL('image/png'),scale:size()}));status('내 원단을 옷에 적용했어요. 이 기기에만 저장됩니다.')}catch{status('옷에는 적용했지만 기기에 저장하지 못했어요.')}}
 }
 function point(e){const r=pad.getBoundingClientRect();return {x:(e.clientX-r.left)*pad.width/r.width,y:(e.clientY-r.top)*pad.height/r.height}}
 function stroke(p){ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=$('fabricInk').value;ctx.lineWidth=Number($('fabricBrush').value)||8;ctx.beginPath();ctx.moveTo(last?.x??p.x,last?.y??p.y);ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();last=p}
 pad.addEventListener('pointerdown',e=>{e.preventDefault();revision++;painting=true;pad.setPointerCapture(e.pointerId);last=point(e);stroke(last)});
 pad.addEventListener('pointermove',e=>{if(painting)stroke(point(e))});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,()=>{painting=false;last=null});
 $('fabricApply').onclick=()=>{revision++;apply()};$('fabricClear').onclick=()=>{revision++;blank();status('그림판을 비웠어요. 새 무늬를 그리고 적용해 주세요.')};
 $('fabricRemove').onclick=()=>{revision++;tile=null;onChange(null,size());try{localStorage.removeItem('artmind-fabric-v1')}catch{}status('옷의 패턴을 해제했어요.')};
 $('fabricScale').oninput=()=>{onChange(tile,size());if(tile){try{localStorage.setItem('artmind-fabric-v1',JSON.stringify({data:tile.toDataURL('image/png'),scale:size()}))}catch{status('현재 크기를 기기에 저장하지 못했어요.')}}};
 $('fabricUpload').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;const version=++revision;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){status('2MB 이하 PNG/JPG/WebP 이미지를 선택해 주세요.');return}
  try{const image=await createImageBitmap(file,{resizeWidth:256,resizeQuality:'high'});if(version!==revision){image.close();return}blank();const fit=Math.min(pad.width/image.width,pad.height/image.height);ctx.drawImage(image,(pad.width-image.width*fit)/2,(pad.height-image.height*fit)/2,image.width*fit,image.height*fit);image.close();apply()}
  catch{if(version===revision)status('원단 이미지를 읽지 못했어요. 다른 파일을 선택해 주세요.')}finally{e.target.value=''}
 };
 try{const saved=JSON.parse(localStorage.getItem('artmind-fabric-v1')||'null');if(saved&&typeof saved.data==='string'&&saved.data.startsWith('data:image/png;base64,')&&saved.data.length<200000){const version=revision,img=new Image();img.onload=()=>{if(version!==revision)return;blank();ctx.drawImage(img,0,0,pad.width,pad.height);$('fabricScale').value=Math.max(12,Math.min(48,Number(saved.scale)||24));apply(false);status('이 기기에 저장된 내 원단을 불러왔어요.')};img.src=saved.data}}catch{}
}
