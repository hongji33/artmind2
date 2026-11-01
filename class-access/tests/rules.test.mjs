import test from 'node:test';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteField,serverTimestamp,getDocs,collection,query,where} from 'firebase/firestore';
import {derivePasswordProof} from '../password-crypto.mjs';
test('free membership rules: 30 students, wrong/disabled class, privilege isolation and cleanup',async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
 const env=await initializeTestEnvironment({projectId:'demo-artmind-free',firestore:{host:'127.0.0.1',port:8086,rules}});
 try{
  const salt='0123456789abcdef0123456789abcdef',proof=await derivePasswordProof('emulator-password',salt);
  await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,'artmind2_class_access','1-1'),{enabled:true,passwordHash:proof});await setDoc(doc(db,'artmind2_class_access','1-2'),{enabled:false,passwordHash:proof});await setDoc(doc(db,'artmind2_class_public','1-1'),{salt,iterations:210000})});
  const entry=()=>({classId:'1-1',nickname:'별',passwordProof:proof,joinedAt:serverTimestamp()});
  const db=env.authenticatedContext('student').firestore(),self=doc(db,'artmind2_members','student');
  await assertFails(getDoc(doc(db,'artmind2_class_access','1-1')));
  await assertSucceeds(getDoc(doc(db,'artmind2_class_public','1-1')));
  await assertFails(setDoc(doc(db,'artmind2_class_public','1-1'),{salt:'tampered'}));
  await assertFails(setDoc(self,{...entry(),passwordProof:'0'.repeat(64)}));
  await assertFails(setDoc(self,{...entry(),classId:'1-2'}));
  await assertFails(setDoc(self,{...entry(),classId:'1-3'}));
  await assertFails(setDoc(self,{...entry(),admin:true}));
  await assertFails(setDoc(doc(db,'artmind2_members','someone-else'),entry()));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'artmind2_members','student'),entry()));
  await assertSucceeds(setDoc(self,entry()));
  await assertFails(updateDoc(self,{classId:'1-2'}));
  await assertFails(updateDoc(self,{nickname:'tampered'}));
  await assertSucceeds(updateDoc(self,{passwordProof:deleteField()}));
  await assertSucceeds(getDoc(self));
  const exhibit={owner:'student',classId:'1-1',nickname:'별',title:'마음',story:'나의 감상',work:{artist:'작가',title:'작품'},updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(db,'artmind2_exhibits','student'),exhibit));
  await assertSucceeds(updateDoc(doc(db,'artmind2_exhibits','student'),{story:'새 감상'}));
  await assertFails(updateDoc(doc(db,'artmind2_exhibits','student'),{classId:'1-2'}));
  await assertSucceeds(getDocs(query(collection(db,'artmind2_exhibits'),where('classId','==','1-1'))));
  await assertFails(getDocs(collection(db,'artmind2_exhibits')));
  const peer=env.authenticatedContext('peer').firestore();
  await assertSucceeds(setDoc(doc(peer,'artmind2_members','peer'),entry()));
  await assertSucceeds(getDoc(doc(peer,'artmind2_exhibits','student')));
  await assertSucceeds(setDoc(doc(peer,'artmind2_exhibits','student','comments','comment'),{uid:'peer',classId:'1-1',nickname:'친구',text:'멋진 감상',createdAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(peer,'artmind2_exhibits','student','likes','peer'),{uid:'peer',classId:'1-1',createdAt:serverTimestamp()}));
  await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'artmind2_members','other-class'),{classId:'1-2',nickname:'다른 반'})});
  const other=env.authenticatedContext('other-class').firestore();
  await assertFails(getDoc(doc(other,'artmind2_exhibits','student')));
  await assertFails(getDocs(collection(other,'artmind2_exhibits','student','comments')));
  await assertFails(setDoc(doc(other,'artmind2_exhibits','student','likes','other-class'),{uid:'other-class',classId:'1-2'}));

  await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(),'artmind2_members','student')));
  await Promise.all(Array.from({length:30},(_,i)=>{const uid='classmate-'+i;return assertSucceeds(setDoc(doc(env.authenticatedContext(uid).firestore(),'artmind2_members',uid),entry()))}));
 }finally{await env.cleanup()}
});
