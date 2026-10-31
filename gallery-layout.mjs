// One floor plan drives rendering, collision, hanging positions and door proximity.
export const WIDTH = 12, HEIGHT = 10;
const slot = (x,y,side) => ({x,y,side,px:x+(side==='left'?.65:0),py:y+(side==='back'?.65:0)});
const uSlots = [.5,2.5,8.5,10.5].map(x=>slot(x,0,'back'));
for(const y of [.5,2.5,4.5,6.5,7.5,8.5])uSlots.push(slot(0,y,'left'));
for(const y of [.5,1.5,3.5,5.5])uSlots.push(slot(8,y,'left'));
for(const x of [4.5,6.5])uSlots.push(slot(x,6,'back'));
const tSlots=Array.from({length:8},(_,i)=>slot([.5,1.5,3.5,4.5,6.5,7.5,9.5,11.5][i],0,'back'));
for(const y of [.5,2.5])tSlots.push(slot(0,y,'left'));
for(const y of [3.5,5.5,7.5,8.5])tSlots.push(slot(4,y,'left'));
const extraSlots=[...Array.from({length:9},(_,i)=>slot(i+1.5,0,'back')),...Array.from({length:7},(_,i)=>slot(0,i+1.5,'left'))];
export const rooms=[
 {name:'중앙 로비',spawn:{x:6,y:8.6},slots:[],doors:[{x:2,y:0,to:1,label:'U자 전시관'},{x:10,y:0,to:2,label:'T자 전시관'},{x:6,y:0,to:3,label:'특별 전시관'}],props:[{kind:'sculpture',x:6,y:4},{kind:'bench',x:3,y:6},{kind:'bench',x:9,y:6},{kind:'plant',x:1,y:8},{kind:'plant',x:11,y:8}]},
 {name:'U자 전시관',spawn:{x:6,y:8.6},slots:uSlots,doors:[{x:6,y:10,to:0,label:'중앙 로비'}],props:[{kind:'plant',x:2,y:4},{kind:'plant',x:10,y:4},{kind:'bench',x:3,y:8}]},
 {name:'T자 전시관',spawn:{x:6,y:8.6},slots:tSlots,doors:[{x:6,y:10,to:0,label:'중앙 로비'}],props:[{kind:'plant',x:10.5,y:2},{kind:'bench',x:6,y:5.5}]},
 {name:'특별 전시관',spawn:{x:6,y:8.6},slots:extraSlots,doors:[{x:6,y:10,to:0,label:'중앙 로비'}],props:[{kind:'sculpture',x:6,y:4},{kind:'plant',x:10,y:2},{kind:'bench',x:3,y:7}]}
];
export function floorAt(id,x,y){
 if(x<0||y<0||x>=WIDTH||y>=HEIGHT)return false;
 if(id===1)return x<4||x>=8||y>=6;
 if(id===2)return y<3||(x>=4&&x<8);
 return true;
}
export function canStand(id,x,y,r=.23){
 for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]])if(!floorAt(id,x+dx,y+dy))return false;
 return !rooms[id].props.some(p=>Math.abs(x-p.x)<(p.kind==='bench'?.8:.4)+r&&Math.abs(y-p.y)<.35+r);
}
export function walls(id){
 const result=[];
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(floorAt(id,x,y)){
  for(const [dx,dy,ax,ay,bx,by,side] of [[0,-1,x,y,x+1,y,'back'],[-1,0,x,y,x,y+1,'left'],[1,0,x+1,y,x+1,y+1,'front'],[0,1,x,y+1,x+1,y+1,'front']]){
   if(floorAt(id,x+dx,y+dy))continue;
   const door=rooms[id].doors.find(d=>Math.hypot(d.x-(ax+bx)/2,d.y-(ay+by)/2)<1);
   result.push({ax,ay,bx,by,side,door});
  }
 }
 return result;
}
export function nearDoor(id,x,y){return rooms[id].doors.find(d=>Math.hypot(d.x-x,d.y-y)<1.35)}
export function exhibitionRange(id,page=0){return id===1?[0,16]:id===2?[16,30]:id===3?[30+page*16,46+page*16]:[0,0]}
export function roomForIndex(index){return index<16?{id:1,page:0}:index<30?{id:2,page:0}:{id:3,page:Math.floor((index-30)/16)}}
