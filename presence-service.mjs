import {databaseURL} from './realtime-config.mjs';
import {createPresenceSession} from './presence-core.mjs';
import {validTeacherId} from './workspace-paths.mjs';
export const realtimeConfigured=()=>/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)?\.(?:firebasedatabase\.app|firebaseio\.com)\/?$/.test(databaseURL);
async function database(app){if(!realtimeConfigured())return null;const sdk=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');return {sdk,db:sdk.getDatabase(app,databaseURL)}}
export async function joinPresence(app,{host,classId,uid,nickname,passwordProof}){
 if(!host||!validTeacherId(host))return false;const value=await database(app);if(!value)return false;const {sdk,db}=value,member=sdk.ref(db,`museum_members/${host}/${uid}`);
 await sdk.set(member,{classId,nickname,passwordProof,joinedAt:sdk.serverTimestamp()});
 try{await sdk.update(member,{passwordProof:null})}catch{}
 return true;
}
const pendingSync=new Map();let syncGeneration=0;
export function clearPresenceSync(){++syncGeneration;pendingSync.clear()}
export function hasPendingPresenceSync(host){return !!pendingSync.get(host)?.size}
export async function syncPresenceClasses(app,host,updates){
 if(!realtimeConfigured())return false;if(!validTeacherId(host))throw Error('invalid-host');
 const queue=pendingSync.get(host)||new Map();pendingSync.set(host,queue);
 for(const {classId,config}of updates)queue.set(classId,{...(queue.get(classId)||{}),...config});
 if(!queue.size)return true;
 const snapshot=[...queue],generation=syncGeneration,changes={};
 for(const [classId,config]of snapshot)for(const [key,data]of Object.entries(config))changes[`museum_classes/${host}/${classId}/${key}`]=data;
 const value=await database(app);if(generation!==syncGeneration)return false;
 await value.sdk.update(value.sdk.ref(value.db),changes);
 if(generation===syncGeneration)for(const [classId,config]of snapshot)if(queue.get(classId)===config)queue.delete(classId);
 return true;
}
export function retryPresenceSync(app,host){return syncPresenceClasses(app,host,[])}
export async function connectPresence(app,options){
 if(!validTeacherId(options.host)||!validTeacherId(options.uid)||!/^([1-3])-([1-9]|1[0-9]|20)$/.test(options.classId))throw Error('invalid-presence-scope');
 const value=await database(app);if(!value)return null;const {sdk,db}=value;
 const transport={timestamp:()=>sdk.serverTimestamp(),update:(path,data)=>sdk.update(sdk.ref(db,path),data),remove:path=>sdk.remove(sdk.ref(db,path)),watch:(path,fn,error)=>sdk.onValue(sdk.ref(db,path),s=>fn(s.val()),error),async removeOnDisconnect(path){const hook=sdk.onDisconnect(sdk.ref(db,path));await hook.remove();return ()=>hook.cancel()}};
 return createPresenceSession(transport,options);
}
