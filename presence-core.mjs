import {normalizeAppearance} from './avatar-renderer.mjs';
export const GREETINGS=['','안녕 👋','반가워 😊','같이 감상하자 🎨','멋진 작품이야 ✨'];
export const POSITION_INTERVAL=1200,HEARTBEAT_INTERVAL=20000,STALE_AFTER=90000,GREETING_COOLDOWN=5000;
export function safeState(value={}){
 if(!Number.isFinite(value.x)||!Number.isFinite(value.y)||value.x<0||value.x>12||value.y<0||value.y>10||!Number.isInteger(value.roomId)||value.roomId<0||value.roomId>3)throw Error('invalid-position');
 return {x:Math.round(value.x*1000)/1000,y:Math.round(value.y*1000)/1000,roomId:value.roomId,page:value.roomId===3?Math.max(0,Math.min(5,(Number.isInteger(value.page)?value.page:0))):0,facing:value.facing===-1?-1:1,back:!!value.back,seated:!!value.seated,walking:!!value.walking,appearance:normalizeAppearance(value.appearance)};
}
export function readPeers(raw,ownUid,now=Date.now()){
 const peers=[];
 for(const [uid,sessions]of Object.entries(raw||{})){
  if(uid===ownUid||!sessions||typeof sessions!=='object')continue;
  const latest=Object.values(sessions).filter(v=>v&&Number.isFinite(v.lastSeen)&&v.lastSeen>=now-STALE_AFTER&&v.lastSeen<=now+5000).sort((a,b)=>b.lastSeen-a.lastSeen)[0];
  if(!latest)continue;
  try{const state=safeState(latest);peers.push({...state,uid,nickname:String(latest.nickname||'친구').replace(/[\u0000-\u001f]/g,'').slice(0,20),lastSeen:latest.lastSeen,speechCode:Number.isInteger(latest.speechCode)&&GREETINGS[latest.speechCode]&&now-latest.speechAt<GREETING_COOLDOWN&&latest.speechAt<=now+1000?latest.speechCode:0,speechAt:Number(latest.speechAt)||0})}catch{}
 }
 return peers.sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,59);
}
export function roomPeers(peers,roomId,page=0){return peers.filter(p=>p.roomId===roomId&&(roomId!==3||p.page===page))}
export function createPresenceSession(transport,{host,classId,uid,nickname,getState,onPeers=()=>{},onStatus=()=>{},now=Date.now,sessionId=crypto.randomUUID().replaceAll('-','')}){
 let closed=false,connected=false,snapshot={},offset=0,lastWrite=-Infinity,lastSignature='',lastPayload=null,pending=false,lastGreeting=-Infinity,pendingGreeting=null,greetingSequence=0,cancelDisconnect=null,connectionGeneration=0,wireConnected=false,accessValid=false,connecting=false;
 const path=`museum_presence/${host}/${classId}/${uid}/${sessionId}`,unsubscribers=[];
 const emit=()=>onPeers(readPeers(snapshot,uid,now()+offset));
 async function flush(force=false){if(closed||!connected||pending)return;const time=now();if(time-lastWrite<POSITION_INTERVAL)return;
  let state;try{state=safeState(getState())}catch{return}
  const signature=JSON.stringify(state);if(!force&&!pendingGreeting&&signature===lastSignature&&time-lastWrite<HEARTBEAT_INTERVAL)return;
  const connection=connectionGeneration;pending=true;try{const payload={...state,nickname},greeting=pendingGreeting,delta={lastSeen:transport.timestamp()};if(!lastPayload){delta.speechCode=0;delta.speechAt=0}else if(greeting){delta.speechCode=greeting.code;delta.speechAt=transport.timestamp()}for(const [key,value]of Object.entries(payload))if(!lastPayload||JSON.stringify(lastPayload[key])!==JSON.stringify(value))delta[key]=value;await transport.update(path,delta);if(!closed&&connection===connectionGeneration){lastWrite=time;lastSignature=signature;if(greeting&&lastPayload&&pendingGreeting?.sequence===greeting.sequence){pendingGreeting=null;lastGreeting=now()}lastPayload=payload;onStatus('connected')}}catch{if(!closed&&connection===connectionGeneration){connected=false;onStatus('error');onPeers([])}}finally{pending=false;if(!closed&&connected&&connection!==connectionGeneration)queueMicrotask(()=>flush(true))}
 }
 async function activate(){
  if(closed||!wireConnected||!accessValid||connecting||connected)return;
  connecting=true;const generation=++connectionGeneration;
  try{const cancel=await transport.removeOnDisconnect(path);if(closed||generation!==connectionGeneration||!wireConnected||!accessValid){await cancel();return}cancelDisconnect=cancel;connected=true;lastWrite=-Infinity;lastSignature='';lastPayload=null;emit();await flush(true)}catch{if(!closed){onStatus('error');onPeers([])}}finally{connecting=false;if(!closed&&generation!==connectionGeneration&&wireConnected&&accessValid&&!connected)queueMicrotask(activate)}
 }
 unsubscribers.push(transport.watch(`museum_members/${host}/${uid}`,v=>{accessValid=!!v&&v.classId===classId&&Number.isFinite(v.joinedAt)&&now()+offset-v.joinedAt<12*60*60*1000&&v.joinedAt<=now()+offset+5000;if(!accessValid){connected=false;++connectionGeneration;onStatus('denied');onPeers([])}else activate()},()=>{accessValid=false;connected=false;++connectionGeneration;onStatus('denied');onPeers([])}));
 unsubscribers.push(transport.watch(`museum_presence/${host}/${classId}`,v=>{snapshot=v||{};if(connected)emit()},()=>{accessValid=false;connected=false;++connectionGeneration;onStatus('denied');onPeers([])}));
 unsubscribers.push(transport.watch('.info/serverTimeOffset',v=>{offset=Number(v)||0}));
 unsubscribers.push(transport.watch('.info/connected',value=>{
  wireConnected=!!value;
  if(!value){pendingGreeting=null;connected=false;++connectionGeneration;if(!closed){onStatus('reconnecting');onPeers([])}return}
  activate();
 }));
 const interval=setInterval(()=>{flush()},300);
 return {path,serverNow:()=>now()+offset,greetingReadyAt:()=>lastGreeting+GREETING_COOLDOWN,publish:()=>flush(),async greet(code){if(closed||!connected||!lastPayload||pendingGreeting||!Number.isInteger(code)||!GREETINGS[code])return false;const t=now();if(t-lastGreeting<GREETING_COOLDOWN)return false;lastGreeting=t;pendingGreeting={code,sequence:++greetingSequence};lastSignature='';await flush(true);return true},async close(){if(closed)return;closed=true;connected=false;++connectionGeneration;clearInterval(interval);for(const unsubscribe of unsubscribers)unsubscribe?.();onPeers([]);let removed=false;try{await transport.remove(path);removed=true}catch{}if(removed)try{await cancelDisconnect?.()}catch{}}};
}
