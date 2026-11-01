// One connected gallery. Partitions change the arrangement, never the participant room.
export const WIDTH=28,HEIGHT=22;
export const galleryLayouts={open:'개방형',t:'T자 배치',u:'U자 배치',partitions:'파티션 배치'};
const slot=(x,y,side)=>({x,y,side,px:x+(side==='left'?.85:0),py:y+(side==='back'?.85:0)});
export const rooms=[{name:'우리 반 갤러리',spawn:{x:14,y:18},slots:[],doors:[],props:[{kind:'plant',x:1.5,y:20},{kind:'plant',x:26.5,y:20},{kind:'bench',x:13,y:19},{kind:'bench',x:16,y:19}],partitions:[],layout:'open'}];
function panel(ax,ay,bx,by){return {ax,ay,bx,by,side:ay===by?'back':'left',partition:true}}
export function configureGallery(layout='open',count=30){
 const room=rooms[0];room.layout=layout in galleryLayouts?layout:'open';
 room.partitions=room.layout==='t'?[panel(7,7,21,7),panel(14,7,14,14)]:room.layout==='u'?[panel(7,5,21,5),panel(7,5,7,14),panel(21,5,21,14)]:room.layout==='partitions'?[panel(6,7,11,7),panel(17,7,22,7),panel(6,14,11,14),panel(17,14,22,14)]:[];
 const outer=[...Array.from({length:18},(_,i)=>slot(1+i*1.5,0,'back')),...Array.from({length:14},(_,i)=>slot(0,1+i*1.5,'left'))];
 const onPanel=w=>{const a=[];for(let d=.75;d<Math.hypot(w.bx-w.ax,w.by-w.ay)-.3;d+=1.5)a.push(slot(w.ax+(w.side==='back'?d:0),w.ay+(w.side==='left'?d:0),w.side));return a};
 // Extra display panels only when the existing collection needs additional wall space.
 for(let row=0;row<10&&outer.length+room.partitions.flatMap(onPanel).filter(s=>canStand(0,s.px,s.py)).length<Math.min(100,count);row++){
  const y=2+row*2;for(const [x1,x2]of [[2,6],[10,18],[22,26]]){const w=panel(x1,y,x2,y);if(room.partitions.every(p=>!segmentsNear(p,w,.8)))room.partitions.push(w)}
 }
 const inner=room.partitions.flatMap(onPanel);room.slots=[];
 for(let i=0;i<Math.max(outer.length,inner.length);i++){if(outer[i])room.slots.push(outer[i]);if(inner[i])room.slots.push(inner[i])}
 room.slots=room.slots.filter(s=>canStand(0,s.px,s.py));return room;
}
function segmentsNear(a,b,r){return Math.min(a.ax,a.bx)-r<=Math.max(b.ax,b.bx)&&Math.max(a.ax,a.bx)+r>=Math.min(b.ax,b.bx)&&Math.min(a.ay,a.by)-r<=Math.max(b.ay,b.by)&&Math.max(a.ay,a.by)+r>=Math.min(b.ay,b.by)}
export function floorAt(id,x,y){return id===0&&x>=0&&y>=0&&x<WIDTH&&y<HEIGHT}
export function canStand(id,x,y,r=.28){
 if(!floorAt(id,x-r,y-r)||!floorAt(id,x+r,y+r))return false;
 if(rooms[0].partitions.some(w=>x>=Math.min(w.ax,w.bx)-r&&x<=Math.max(w.ax,w.bx)+r&&y>=Math.min(w.ay,w.by)-r&&y<=Math.max(w.ay,w.by)+r))return false;
 return !rooms[0].props.some(p=>Math.abs(x-p.x)<(p.kind==='bench'?.8:.4)+r&&Math.abs(y-p.y)<.35+r);
}
export function walls(){const surfaces=[{ax:0,ay:0,bx:WIDTH,by:0,side:'back'},{ax:0,ay:0,bx:0,by:HEIGHT,side:'left'},{ax:WIDTH,ay:0,bx:WIDTH,by:HEIGHT,side:'front'},{ax:0,ay:HEIGHT,bx:WIDTH,by:HEIGHT,side:'front'},...rooms[0].partitions];return surfaces.flatMap(w=>{const length=Math.hypot(w.bx-w.ax,w.by-w.ay),count=Math.ceil(length);return Array.from({length:count},(_,i)=>({...w,ax:w.ax+(w.bx-w.ax)*i/count,ay:w.ay+(w.by-w.ay)*i/count,bx:w.ax+(w.bx-w.ax)*(i+1)/count,by:w.ay+(w.by-w.ay)*(i+1)/count}))})}
export const nearDoor=()=>null;
export const exhibitionRange=()=>[0,100];
export const roomForIndex=()=>({id:0,page:0});
export function nearBench(id,x,y){return rooms[0].props.find(p=>p.kind==='bench'&&Math.hypot(p.x-x,p.y-y)<1.8)}
export function standingPosition(id,bench,preferred){if(preferred&&canStand(0,preferred.x,preferred.y))return {...preferred};for(const [dx,dy]of [[0,1.1],[0,-1.1],[1.4,0],[-1.4,0]]){const p={x:bench.x+dx,y:bench.y+dy};if(canStand(0,p.x,p.y))return p}return null}
export function classmateEntryPosition(id,uid,peers=[]){const points=[];let hash=0;for(const c of String(uid))hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;for(let y=2;y<HEIGHT-1;y+=2.4)for(let x=2;x<WIDTH-1;x+=2.4)if(canStand(0,x,y))points.push({x,y});const start=hash%points.length;for(let i=0;i<points.length;i++){const p=points[(start+i)%points.length];if(peers.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=1.7))return p}return {...rooms[0].spawn}}
export function canPassClassmates(x,y,peers,r=.7,previous=null){return peers.every(p=>{const distance=Math.hypot(x-p.x,y-p.y);return distance>=r||previous&&Math.hypot(previous.x-p.x,previous.y-p.y)<r&&distance>Math.hypot(previous.x-p.x,previous.y-p.y)})}
configureGallery();
