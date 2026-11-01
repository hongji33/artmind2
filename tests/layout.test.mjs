import test from 'node:test';import assert from 'node:assert/strict';
import {WIDTH,HEIGHT,rooms,configureGallery,canStand,classmateEntryPosition,canPassClassmates,roomForIndex,exhibitionRange} from '../gallery-layout.mjs';
for(const layout of ['open','t','u','partitions'])for(const count of [30,100])test(`${layout}: ${count} artworks, one connected floor and dispersed arrivals`,()=>{
 const room=configureGallery(layout,count);assert.equal(rooms.length,1);assert.ok(WIDTH*HEIGHT>=600);assert.ok(room.slots.length>=count,`${room.slots.length} slots`);
 const visited=new Set(),queue=[[28,36]];visited.add('28,36');for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!visited.has(key)&&canStand(0,nx/2,ny/2)){visited.add(key);queue.push([nx,ny])}}}
 for(const s of room.slots.slice(0,count))assert.ok([...visited].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x/2-s.px,y/2-s.py)<.5}),JSON.stringify(s));
 const peers=[];for(let i=0;i<30;i++){const p=classmateEntryPosition(0,'student'+i,peers);assert.ok(canStand(0,p.x,p.y));assert.ok(peers.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=1.7));peers.push(p)}
 assert.ok(new Set(peers.map(p=>Math.floor(p.x/7)+','+Math.floor(p.y/6))).size>=6);assert.deepEqual(roomForIndex(99),{id:0,page:0});assert.deepEqual(exhibitionRange(0),[0,100]);
});
test('peer collision prevents entering and permits leaving an existing overlap',()=>{assert.equal(canPassClassmates(5,5,[{x:5.1,y:5}]),false);assert.equal(canPassClassmates(8,8,[{x:5,y:5}]),true);assert.equal(canPassClassmates(5.2,5,[{x:5,y:5}],.7,{x:5.1,y:5}),true)});
