import test from 'node:test';import assert from 'node:assert/strict';
import {safeState,readPeers,roomPeers,createPresenceSession,POSITION_INTERVAL,HEARTBEAT_INTERVAL,STALE_AFTER} from '../presence-core.mjs';
const state=()=>({x:6,y:8,roomId:0,page:0,facing:1,back:false,seated:false,walking:false,appearance:{}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('30 classmates: one person across tabs, room/page isolation and invalid/stale states',()=>{
 const now=1000000,raw={};for(let i=0;i<30;i++)raw['u'+i]={tab:{...state(),nickname:'친구'+i,lastSeen:now,roomId:i%3,speechCode:0,speechAt:0}};
 raw.u1.older={...state(),nickname:'old tab',lastSeen:now-10};raw.stale={tab:{...state(),lastSeen:now-STALE_AFTER-1}};raw.invalid={tab:{...state(),x:Infinity,lastSeen:now}};
 const peers=readPeers(raw,'u0',now);assert.equal(peers.length,29);assert.equal(peers.find(p=>p.uid==='u1').nickname,'친구1');assert.equal(roomPeers(peers,0).length,9);assert.throws(()=>safeState({...state(),x:13}));
 const pages=[{...state(),roomId:3,page:0},{...state(),roomId:3,page:1}];assert.equal(roomPeers(pages,3,1).length,1);
});
test('presence auth gate, disconnect registration, throttled deltas, greeting cooldown and cleanup',async()=>{
 let time=100000,position=state();const watchers=new Map(),updates=[],removed=[],hooks=[],statuses=[],lists=[];
 const transport={timestamp:()=>time,watch:(path,fn)=>{watchers.set(path,fn);return ()=>watchers.delete(path)},update:async(path,data)=>updates.push({path,data}),remove:async path=>removed.push(path),removeOnDisconnect:async path=>{hooks.push(path);return async()=>hooks.push('cancel:'+path)}};
 const session=createPresenceSession(transport,{host:'TeacherA',classId:'3-1',uid:'self',nickname:'나',getState:()=>position,onPeers:p=>lists.push(p),onStatus:s=>statuses.push(s),now:()=>time,sessionId:'tab'});
 try{
  watchers.get('.info/connected')(true);await settle();assert.equal(updates.length,0);
  watchers.get('museum_members/TeacherA/self')({classId:'3-1',joinedAt:time});await settle();await settle();assert.equal(updates.length,1);assert.equal(hooks[0],session.path);assert.ok(updates[0].data.appearance);assert.equal(updates[0].data.speechAt,0);
  time+=300;position={...position,x:7};await session.publish();assert.equal(updates.length,1);
  time+=POSITION_INTERVAL;await session.publish();assert.equal(updates.length,2);assert.equal(updates[1].data.x,7);assert.equal('appearance' in updates[1].data,false);assert.equal('nickname' in updates[1].data,false);
  time+=1500;await session.publish();assert.equal(updates.length,2);time+=HEARTBEAT_INTERVAL;await session.publish();assert.deepEqual(Object.keys(updates.at(-1).data),['lastSeen']);
  time+=POSITION_INTERVAL;assert.equal(await session.greet(1),true);assert.equal(updates.at(-1).data.speechCode,1);const saidAt=updates.at(-1).data.speechAt;assert.equal(typeof saidAt,'number');assert.equal(await session.greet(2),false);assert.equal(await session.greet(99),false);
  time+=POSITION_INTERVAL;position={...position,y:7};await session.publish();assert.equal('speechAt' in updates.at(-1).data,false,'movement must not repeat or extend a greeting');
  watchers.get('museum_presence/TeacherA/3-1')({friend:{tab:{...state(),nickname:'친구',lastSeen:time}}});assert.equal(lists.at(-1).length,1);
  watchers.get('.info/connected')(false);assert.equal(statuses.at(-1),'reconnecting');assert.deepEqual(lists.at(-1),[]);
  watchers.get('.info/connected')(true);await settle();await settle();assert.ok(updates.at(-1).data.appearance,'reconnect rebuilds complete session after onDisconnect removal');
  watchers.get('museum_members/TeacherA/self')(null);assert.equal(statuses.at(-1),'denied');time+=5000;const length=updates.length;await session.publish();assert.equal(updates.length,length);
 }finally{await session.close()}
 assert.deepEqual(removed,[session.path]);assert.equal(watchers.size,0);assert.ok(hooks.includes('cancel:'+session.path));
});
test('a reconnect during an in-flight first write rebuilds the complete record',async()=>{
 let time=100000,release;const watchers=new Map(),writes=[];
 const transport={timestamp:()=>time,watch:(p,fn)=>{watchers.set(p,fn);return()=>watchers.delete(p)},remove:async()=>{},removeOnDisconnect:async()=>async()=>{},update:async(p,data)=>{writes.push(data);if(writes.length===1)await new Promise(r=>release=r)}};
 const session=createPresenceSession(transport,{host:'TeacherA',classId:'1-1',uid:'self',nickname:'나',getState:state,now:()=>time});
 try{watchers.get('museum_members/TeacherA/self')({classId:'1-1',joinedAt:time});watchers.get('.info/connected')(true);await settle();assert.equal(writes.length,1);watchers.get('.info/connected')(false);watchers.get('.info/connected')(true);time+=2000;release();await settle();await settle();await settle();assert.equal(writes.length,2);assert.ok(writes[1].appearance);assert.equal(writes[1].nickname,'나')}finally{await session.close()}
});
