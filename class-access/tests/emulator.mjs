import assert from 'node:assert/strict';
import {initializeApp} from '../functions/node_modules/firebase-admin/lib/esm/app/index.js';
import {getFirestore} from '../functions/node_modules/firebase-admin/lib/esm/firestore/index.js';
import {hashPassword} from '../functions/class-password.mjs';
const project='demo-artmind-class';
assert.equal(process.env.GCLOUD_PROJECT,project,'Only the isolated demo emulator may run this test');
assert.ok(process.env.FIRESTORE_EMULATOR_HOST);assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
initializeApp({projectId:project});const db=getFirestore();
await db.doc('artmind2_class_access/1-1').set({...await hashPassword('emulator-password'),enabled:true});
async function student(){const r=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});assert.equal(r.status,200);return r.json()}
async function join(s,password='emulator-password'){const r=await fetch('http://127.0.0.1:5002/'+project+'/asia-northeast3/joinClass',{method:'POST',headers:{'Content-Type':'application/json',...(s?{Authorization:'Bearer '+s.idToken}:{})},body:JSON.stringify({data:{classId:'1-1',nickname:'별',password}})});return {status:r.status,...await r.json()}}
assert.equal((await join(null)).error.status,'UNAUTHENTICATED');
const group=await Promise.all(Array.from({length:30},student));
const results=await Promise.all(group.map(s=>join(s)));
assert.ok(results.every(r=>r.status===200),JSON.stringify(results));
for(const s of group){const doc=await db.doc('artmind2_members/'+s.localId).get();assert.equal(doc.data().classId,'1-1');assert.equal(doc.data().approvedVia,'class-password')}
const denied=await fetch('http://'+process.env.FIRESTORE_EMULATOR_HOST+'/v1/projects/'+project+'/databases/(default)/documents/artmind2_class_access/1-1',{headers:{Authorization:'Bearer '+group[0].idToken}});assert.equal(denied.status,403);
const wrong=await student();for(let n=0;n<5;n++)assert.equal((await join(wrong,'incorrect-password')).error.status,'PERMISSION_DENIED');assert.equal((await join(wrong)).error.status,'RESOURCE_EXHAUSTED');assert.equal((await db.doc('artmind2_members/'+wrong.localId).get()).exists,false);
console.log('PASS: actual callable + Auth/Firestore emulators: 30 simultaneous students, member creation, wrong password, rate limit, unauthenticated rejection and private hash access denied');
