"""Controlled SDK contract for account UI tests. Not a security-rules emulator."""
MOCK=r"""
const cloud=()=>JSON.parse(localStorage.getItem('mock-cloud')||'{"accounts":{},"records":{},"sequence":0}');const save=c=>localStorage.setItem('mock-cloud',JSON.stringify(c));window.auths ||= new Map();
export const initializeApp=(options,name='default')=>({options,name});export const deleteApp=async app=>window.auths.delete(app.name);
const user=(uid,email=null)=>({uid,email,isAnonymous:!email,getIdToken:async()=>''});
export function getAuth(app){if(!window.auths.has(app.name)){const stored=JSON.parse(sessionStorage.getItem('mock-auth:'+app.name)||'null');window.auths.set(app.name,{name:app.name,currentUser:stored?user(stored.uid,stored.email):null})}return window.auths.get(app.name)}
async function change(auth,value){auth.currentUser=value;if(!auth.memory)sessionStorage.setItem('mock-auth:'+auth.name,JSON.stringify(value?{uid:value.uid,email:value.email}:null));await auth.cb?.(value)}
export const onAuthStateChanged=(auth,cb)=>{auth.cb=cb;queueMicrotask(()=>cb(auth.currentUser));return ()=>auth.cb=null};
export const inMemoryPersistence={kind:'memory'},browserSessionPersistence={kind:'session'};export const setPersistence=async(auth,persistence)=>auth.memory=persistence===inMemoryPersistence;
export const EmailAuthProvider={credential:(email,password)=>({email,password})};
export async function signInAnonymously(auth){const c=cloud();c.sequence++;save(c);const u=user('student'+c.sequence);await change(auth,u);return {user:u}}
export async function linkWithCredential(u,credential){const c=cloud();if(c.accounts[credential.email])throw Object.assign(Error('taken'),{code:'auth/email-already-in-use'});c.accounts[credential.email]={uid:u.uid,password:credential.password};save(c);const auth=[...window.auths.values()].find(a=>a.currentUser?.uid===u.uid),next=user(u.uid,credential.email);await change(auth,next);return {user:next}}
export async function signInWithEmailAndPassword(auth,email,password){const account=cloud().accounts[email];if(!account||account.password!==password)throw Object.assign(Error('wrong'),{code:'auth/invalid-credential'});const u=user(account.uid,email);await change(auth,u);return {user:u}}
export async function signOut(auth){if(window.failSignOut)throw Error('offline');await change(auth,null)}
export async function updatePassword(u,pin){if(window.failPasswordUpdate)throw Error('offline');const c=cloud();c.accounts[u.email].password=pin;save(c)}
export const createUserWithEmailAndPassword=async()=>{throw Error('unused')};export const sendPasswordResetEmail=async()=>{};
export const getFirestore=app=>({app});export const doc=(db,...path)=>path.join('/');export const collection=doc;export const serverTimestamp=()=>Date.now();export const deleteField=()=>({remove:true});
const snapshot=path=>({id:path.split('/').at(-1),exists:()=>path in cloud().records,data:()=>structuredClone(cloud().records[path])});
export const getDoc=async path=>snapshot(path);
function apply(path,data,merge=false){if(window.failWrite)throw Error('offline');const c=cloud(),next=merge?{...c.records[path]}:{};for(const [key,value]of Object.entries(data)){if(value?.remove)delete next[key];else next[key]=structuredClone(value)}c.records[path]=next;save(c)}
export const setDoc=async(path,data,options={})=>{if(window.failAccountRecord&&path.includes('/student_accounts/'))throw Error('offline');apply(path,data,!!options.merge)};
export const updateDoc=async(path,data)=>{if(window.failPromotion&&'pin' in data)throw Error('offline');apply(path,data,true)};
export const query=(path,...filters)=>({path,filters});export const where=(...where)=>({where});export const limit=limit=>({limit});export const startAfter=value=>({after:value.id});export const orderBy=()=>({});
export async function getDocs(q){const path=typeof q==='string'?q:q.path;let docs=Object.keys(cloud().records).filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).sort().map(snapshot);for(const filter of q.filters||[]){if(filter.where)docs=docs.filter(d=>d.data()[filter.where[0]]===filter.where[2]);if(filter.limit)docs=docs.slice(0,filter.limit)}return {docs,size:docs.length,empty:!docs.length,forEach:fn=>docs.forEach(fn)}}
export const addDoc=async(path,data)=>apply(path+'/comment',data);
export const writeBatch=()=>{const writes=[];return {set:(...args)=>writes.push(['set',...args]),update:(...args)=>writes.push(['update',...args]),commit:async()=>{for(const [kind,path,data]of writes)apply(path,data,kind==='update')}}};
export const runTransaction=async(db,fn)=>fn({get:getDoc,set:(path,data)=>apply(path,data)});
"""
