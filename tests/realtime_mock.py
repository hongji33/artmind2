"""In-memory RTDB adapter for UI tests. It does not validate server security rules."""
RTDB=r"""
window.rtData ||= {};window.rtWatches ||= new Map();window.rtWrites ||= [];window.rtRemoves ||= [];window.rtHooks ||= new Set();
export const getDatabase=()=>({});export const ref=(db,path='')=>({path});export const serverTimestamp=()=>({'.sv':'timestamp'});
function getValue(path){return path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],window.rtData)??null}
function put(path,value){const keys=path.split('/').filter(Boolean);let node=window.rtData;for(const k of keys.slice(0,-1))node=node[k] ||= {};if(value===null)delete node[keys.at(-1)];else node[keys.at(-1)]=value}
function resolve(v){if(v&&v['.sv']==='timestamp')return Date.now();if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolve(x)]));return v}
window.fireRT=(path,value)=>{for(const cb of window.rtWatches.get(path)||[])cb({val:()=>value})};
function notify(){for(const path of window.rtWatches.keys())if(!path.startsWith('.info'))window.fireRT(path,getValue(path))}
export const onValue=(reference,cb)=>{const path=reference.path;const list=window.rtWatches.get(path)||new Set();list.add(cb);window.rtWatches.set(path,list);queueMicrotask(()=>{if(list.has(cb))cb({val:()=>path==='.info/connected'?true:path==='.info/serverTimeOffset'?0:getValue(path)})});return ()=>{list.delete(cb);if(!list.size)window.rtWatches.delete(path)}};
export const update=async(reference,data)=>{if(window.failRealtime)throw Error('offline');window.rtWrites.push([reference.path,structuredClone(data)]);for(const [key,value]of Object.entries(data))put([reference.path,key].filter(Boolean).join('/'),resolve(value));notify()};
export const set=async(reference,data)=>{put(reference.path,resolve(data));notify()};export const remove=async reference=>{window.rtRemoves.push(reference.path);put(reference.path,null);notify()};
export const onDisconnect=reference=>({remove:async()=>window.rtHooks.add(reference.path),cancel:async()=>window.rtHooks.delete(reference.path)});
window.injectRT=(path,value)=>{put(path,value);notify()};
"""
