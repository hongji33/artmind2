MOCK=r"""
window.records ||= {};window.writes ||= [];window.authEvents ||= [];
export const initializeApp=(c,name)=>{window.appName=name;return {}};
export const getAuth=()=>window.teacherAuth ||= {currentUser:window.initialAnon?{uid:'LegacyTeacher',isAnonymous:true,getIdToken:async()=>''}:null};
export const onAuthStateChanged=(a,cb)=>{window.authCB=cb;cb(a.currentUser)};
function makeUser(uid,email){return {uid,email,isAnonymous:false,getIdToken:async()=>''}}
export const EmailAuthProvider={credential:(email,password)=>({email,password})};
export const linkWithCredential=async(user,c)=>{window.authEvents.push(['link',user.uid]);window.teacherAuth.currentUser=makeUser(user.uid,c.email);await window.authCB(window.teacherAuth.currentUser);return {user:window.teacherAuth.currentUser}};
export const createUserWithEmailAndPassword=async(a,email,p)=>{a.currentUser=makeUser(email.includes('second')?'TeacherB':'TeacherA',email);window.authEvents.push(['create',a.currentUser.uid]);await window.authCB(a.currentUser);return {user:a.currentUser}};
export const signInWithEmailAndPassword=async(a,email,p)=>{if(p!=='teacher-pass'){const e=Error('wrong');e.code='auth/invalid-credential';throw e}a.currentUser=makeUser(email.includes('second')?'TeacherB':'TeacherA',email);await window.authCB(a.currentUser);return {user:a.currentUser}};
export const signOut=async a=>{a.currentUser=null;await window.authCB(null)};
export const sendPasswordResetEmail=async()=>{window.resetSent=(window.resetSent||0)+1};
export const getFirestore=()=>({});export const doc=(db,...p)=>p.join('/');export const collection=doc;
const snap=path=>({id:path.split('/').at(-1),exists:()=>path in window.records,data:()=>structuredClone(window.records[path])});
export const getDoc=async path=>snap(path);export const serverTimestamp=()=>123;
export const where=(...args)=>({where:args});export const limit=value=>({limit:value});export const startAfter=value=>({after:value.id});export const query=(path,...filters)=>({path,filters});
export const getDocs=async q=>{const path=typeof q==='string'?q:q.path,filters=q.filters||[];window.lastQuery=path;let items=Object.keys(window.records).filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).sort().map(snap);for(const f of filters){if(f.where)items=items.filter(d=>d.data()[f.where[0]]===f.where[2]);if(f.after)items=items.filter(d=>d.id>f.after);if(f.limit)items=items.slice(0,f.limit)}return {docs:items,empty:items.length===0,size:items.length}};
function apply(writes){if(window.failWrite)throw Error('offline');const uid=window.teacherAuth?.currentUser?.uid;for(const [kind,path,value]of writes){if(path.startsWith('artmind2_spaces/')&&path.split('/')[1]!==uid)throw Error('permission-denied');if(kind==='update'&&!(path in window.records))throw Error('not-found')}for(const [kind,path,value]of writes){window.records[path]=kind==='update'?{...window.records[path],...value}:structuredClone(value);window.writes.push([kind,path,value])}}
export const setDoc=async(path,value)=>apply([['set',path,value]]);export const updateDoc=async(path,value)=>apply([['update',path,value]]);
export const writeBatch=()=>{const writes=[];return {set:(p,v)=>writes.push(['set',p,v]),update:(p,v)=>writes.push(['update',p,v]),commit:async()=>apply(writes)}};
export const runTransaction=async(db,fn)=>{const writes=[];await fn({get:async p=>snap(p),set:(p,v)=>writes.push(['set',p,v])});apply(writes)};
"""

MOCK+="export const deleteField=()=>({remove:true});"
