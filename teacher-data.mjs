import {doc,getDoc,setDoc,getDocs,collection,query,where,limit,startAfter,writeBatch,runTransaction,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {derivePasswordProof,validClassId,ITERATIONS} from './class-access/password-crypto.mjs';
import {classSegments,exhibitSegments} from './workspace-paths.mjs';
const salt=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function profile(db,uid,name){const ref=doc(db,'artmind2_teacher_profiles',uid),snap=await getDoc(ref);if(snap.exists())return snap.data();const data={displayName:(name||'미술 선생님').trim().slice(0,40),createdAt:serverTimestamp()};await setDoc(ref,data);return data}
export async function listClasses(db,uid){
 const [legacy,scoped]=await Promise.all([getDoc(doc(db,'artmind2_teachers',uid)),getDocs(collection(db,'artmind2_spaces',uid,'classes'))]);
 const items=scoped.docs.map(d=>({...d.data(),key:'space:'+d.id,legacy:false}));
 const role=legacy.exists()?legacy.data():null;
 if(role?.enabled===true&&Array.isArray(role.classIds))for(const classId of [...new Set(role.classIds.filter(validClassId))]){
  const [pub,secret]=await Promise.all([getDoc(doc(db,...classSegments('',classId))),getDoc(doc(db,...classSegments('',classId,true)))]);
  items.push({classId,label:classId,key:'legacy:'+classId,legacy:true,enabled:secret.exists()&&secret.data().enabled===true,configured:pub.exists()&&secret.exists(),archived:false});
 }
 return items.sort((a,b)=>a.classId.localeCompare(b.classId,undefined,{numeric:true}));
}
export async function createClass(db,uid,{classId,label,pin}){
 if(!validClassId(classId)||!String(label).trim()||String(label).length>60)throw Error('invalid-class');
 const s=salt(),passwordHash=await derivePasswordProof(pin,s),pub=doc(db,...classSegments(uid,classId)),secret=doc(db,...classSegments(uid,classId,true));
 await runTransaction(db,async tx=>{if((await tx.get(pub)).exists())throw Error('class-exists');tx.set(pub,{classId,label:label.trim(),salt:s,iterations:ITERATIONS,enabled:true,archived:false});tx.set(secret,{enabled:true,passwordHash})});
}
export async function saveClassChanges(db,uid,changes){
 const batch=writeBatch(db);
 for(const {item,pin,label,enabled,archived} of changes){
  if(!validClassId(item.classId))throw Error('invalid-class');
  const owner=item.legacy?'':uid,pub=doc(db,...classSegments(owner,item.classId)),secret=doc(db,...classSegments(owner,item.classId,true));
  if(pin){const s=salt(),passwordHash=await derivePasswordProof(pin,s);batch.set(pub,item.legacy?{salt:s,iterations:ITERATIONS}:{classId:item.classId,label:label.trim(),salt:s,iterations:ITERATIONS,enabled,archived});batch.set(secret,{enabled,passwordHash})}
  else if(item.legacy){if(!item.configured)throw Error('pin-required');batch.update(secret,{enabled})}
  else {batch.update(pub,{label:label.trim(),enabled,archived});batch.update(secret,{enabled})}
 }
 await batch.commit();
}
export async function listArtworks(db,uid,item,cursor=null){const filters=[where('classId','==',item.classId),...(cursor?[startAfter(cursor)]:[]),limit(100)],snap=await getDocs(query(collection(db,...exhibitSegments(item.legacy?'':uid)),...filters));return {items:snap.docs.map(d=>({id:d.id,...d.data()})),cursor:snap.docs.at(-1)||null,more:snap.docs.length===100}}
export async function setArtworkHidden(db,uid,item,id,hidden){await updateDoc(doc(db,...exhibitSegments(item.legacy?'':uid,id)),{hidden})}
