import test from 'node:test';
import assert from 'node:assert/strict';
import {rooms,floorAt,canStand,walls,nearDoor,exhibitionRange,roomForIndex} from '../gallery-layout.mjs';
for(let id=0;id<rooms.length;id++)test(`room ${id}: floor, walls, reachable exhibits and doors`,()=>{
 const r=rooms[id];assert.ok(canStand(id,r.spawn.x,r.spawn.y));
 // Flood fill a .25-unit grid, respecting avatar clearance and furniture.
 const visited=new Set(),queue=[[24,35]];const key=(x,y)=>`${x},${y}`;
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!visited.has(k)&&canStand(id,nx/4,ny/4)){visited.add(k);queue.push([nx,ny])}}}
 for(const s of r.slots){assert.ok(floorAt(id,s.px,s.py));assert.ok([...visited].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x/4-s.px,y/4-s.py)<.6}),`unreachable slot ${JSON.stringify(s)}`);assert.ok(walls(id).some(w=>w.side===s.side&&(s.side==='back'?w.ay===s.y&&s.x>=w.ax&&s.x<=w.bx:w.ax===s.x&&s.y>=w.ay&&s.y<=w.by)), 'frame must be on a wall');}
 for(const d of r.doors)assert.ok([...visited].some(k=>{const[x,y]=k.split(',').map(Number);return nearDoor(id,x/4,y/4)===d}));
 assert.equal(canStand(id,-.1,2),false);
});
test('U/T voids and corners block walking',()=>{assert.equal(canStand(1,6,3),false);assert.equal(canStand(1,3.9,3),false);assert.equal(canStand(2,2,6),false);assert.equal(canStand(2,4.1,5),false);assert.equal(nearDoor(0,6,5),undefined)});
test('30 unique exhibits plus every overflow page and deep link',()=>{assert.equal(rooms[1].slots.length,16);assert.equal(rooms[2].slots.length,14);const indexes=[];for(let id=1;id<4;id++)for(let p=0;p<(id===3?5:1);p++){const[a,b]=exhibitionRange(id,p);for(let n=a;n<b&&n<100;n++){indexes.push(n);assert.deepEqual(roomForIndex(n),{id,page:p})}}assert.deepEqual(indexes,Array.from({length:100},(_,i)=>i))});

test('every bench has a safe place to stand up', async()=>{
 const {nearBench,standingPosition}=await import('../gallery-layout.mjs');
 for(let id=0;id<rooms.length;id++)for(const b of rooms[id].props.filter(p=>p.kind==='bench')){
  const stand=standingPosition(id,b);assert.ok(stand);assert.ok(canStand(id,stand.x,stand.y));assert.equal(nearBench(id,stand.x,stand.y),b);
  assert.deepEqual(standingPosition(id,b,stand),stand);assert.equal(nearBench(id,100,100),undefined);
 }
});
test('malformed avatar choices fall back to valid defaults',async()=>{
 const {normalizeAppearance,defaultAppearance}=await import('../avatar-renderer.mjs');
 assert.deepEqual(normalizeAppearance(null),defaultAppearance);
 assert.deepEqual(normalizeAppearance({hair:99,skin:-1,outfit:'4',hairColor:NaN,color:Infinity}),defaultAppearance);
 assert.equal(normalizeAppearance({hair:5,outfit:4}).hair,5);
});


test('viewed records are isolated by account and classroom and tolerate invalid storage',async()=>{
 const {progressKey,readViewed,saveViewed}=await import('../personal-gallery.mjs');
 const db=new Map(),storage={getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)};
 const key=progressKey('student-a','1-1');assert.ok(saveViewed(storage,key,new Set(['work1'])));
 assert.deepEqual([...readViewed(storage,key)],['work1']);assert.equal(readViewed(storage,progressKey('student-b','1-1')).size,0);assert.equal(readViewed(storage,progressKey('student-a','1-2')).size,0);
 db.set(key,'bad json');assert.equal(readViewed(storage,key).size,0);assert.equal(progressKey(null,'1-1'),null);
 assert.equal(saveViewed({setItem(){throw Error('quota')}},key,new Set()),false);
});
test('only gallery rooms remain and the studio doorway is closed',()=>{
 assert.equal(rooms.length,4);assert.equal(rooms[0].doors.length,3);
 for(const room of rooms)for(const door of room.doors)assert.ok(door.to>=0&&door.to<4);
 assert.equal(nearDoor(0,.9,3),undefined);assert.equal(canStand(0,.1,3),false);
 assert.ok(!rooms.some(r=>r.name.includes('체험')));
});
