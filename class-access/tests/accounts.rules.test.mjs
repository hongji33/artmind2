import test from 'node:test';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,serverTimestamp,writeBatch,updateDoc} from 'firebase/firestore';
import {derivePasswordProof} from '../password-crypto.mjs';
test('teacher accounts, namespace isolation, scoped students and teacher moderation',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-artmind-accounts',firestore:{host:'127.0.0.1',port:8086,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try{
  const teacher=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'},email:uid+'@example.com'}).firestore();
  const a=teacher('TeacherA'),b=teacher('TeacherB'),anon=env.authenticatedContext('anon',{firebase:{sign_in_provider:'anonymous'}}).firestore();
  await assertFails(setDoc(doc(anon,'artmind2_teacher_profiles','anon'),{displayName:'선생님',createdAt:serverTimestamp()}));
  for(const [uid,db]of [['TeacherA',a],['TeacherB',b]])await assertSucceeds(setDoc(doc(db,'artmind2_teacher_profiles',uid),{displayName:uid,createdAt:serverTimestamp()}));
  const salt='0123456789abcdef0123456789abcdef',proof=await derivePasswordProof('1111',salt),other=await derivePasswordProof('2222',salt),config={classId:'3-1',label:'미술반',salt,iterations:210000,enabled:true,archived:false};
  for(const [uid,db,p]of [['TeacherA',a,proof],['TeacherB',b,other]]){const batch=writeBatch(db);batch.set(doc(db,'artmind2_spaces',uid,'classes','3-1'),config);batch.set(doc(db,'artmind2_spaces',uid,'private_classes','3-1'),{enabled:true,passwordHash:p});await assertSucceeds(batch.commit())}
  await assertFails(setDoc(doc(b,'artmind2_spaces','TeacherA','classes','3-1'),config));
  await assertFails(getDocs(collection(b,'artmind2_spaces','TeacherA','classes')));
  await assertFails(setDoc(doc(a,'artmind2_teachers','TeacherA'),{enabled:true,classIds:['3-1']}));
  const student=env.authenticatedContext('student',{firebase:{sign_in_provider:'anonymous'}}).firestore();
  const entry={classId:'3-1',teacherId:'TeacherA',nickname:'별',passwordProof:proof,joinedAt:serverTimestamp()};
  await assertFails(setDoc(doc(student,'artmind2_members','student'),{...entry,teacherId:'TeacherB'}));
  await assertFails(getDoc(doc(student,'artmind2_spaces','TeacherA','private_classes','3-1')));
  await assertSucceeds(setDoc(doc(student,'artmind2_members','student'),entry));
  const exhibit={owner:'student',classId:'3-1',nickname:'별',title:'마음',story:'감상문',work:{artist:'작가',title:'작품'}};
  const art=doc(student,'artmind2_spaces','TeacherA','exhibits','student');
  await assertSucceeds(setDoc(art,exhibit));
  await assertFails(setDoc(doc(student,'artmind2_spaces','TeacherB','exhibits','student'),exhibit));
  await assertFails(getDocs(query(collection(student,'artmind2_exhibits'),where('classId','==','3-1'))));
  await assertFails(getDoc(doc(b,'artmind2_spaces','TeacherA','exhibits','student')));
  await assertSucceeds(getDoc(doc(a,'artmind2_spaces','TeacherA','exhibits','student')));
  await assertSucceeds(updateDoc(doc(a,'artmind2_spaces','TeacherA','exhibits','student'),{hidden:true}));
  await assertFails(updateDoc(art,{hidden:false}));
  await assertSucceeds(updateDoc(doc(a,'artmind2_spaces','TeacherA','exhibits','student'),{hidden:false}));
  await assertFails(updateDoc(doc(a,'artmind2_spaces','TeacherA','exhibits','student'),{owner:'TeacherA'}));
  await assertFails(setDoc(doc(student,'artmind2_spaces','TeacherA','classes','3-2'),{...config,classId:'3-2'}));
 }finally{await env.cleanup()}
});
