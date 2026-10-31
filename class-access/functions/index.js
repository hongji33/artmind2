import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {normalizeEntry,verifyPassword,attemptKeys} from './class-password.mjs';
initializeApp();const db=getFirestore();
export const joinClass=onCall({region:'asia-northeast3',maxInstances:5,timeoutSeconds:30,cors:['https://hongji33.github.io']},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','학생 연결을 다시 시도해 주세요.');
 let entry;try{entry=normalizeEntry(request.data)}catch{throw new HttpsError('invalid-argument','학반·닉네임·반 비밀번호를 확인해 주세요.')}
 const uid=request.auth.uid,keys=attemptKeys(uid,entry.classId,request.rawRequest.ip),now=Date.now();
 const refs=keys.map(k=>db.collection('artmind2_class_rate_limits').doc(k.id));
 // Count attempts atomically. Shared classroom Wi-Fi permits all 30 students.
 await db.runTransaction(async tx=>{
  const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
  const values=snapshots.map(s=>s.exists?s.data():{});
  for(let i=0;i<keys.length;i++){const fresh=now-Number(values[i].startedAt||0)<600000;if(fresh&&Number(values[i].attempts||0)>=keys[i].limit)throw new HttpsError('resource-exhausted','시도가 많습니다. 잠시 후 다시 시도해 주세요.')}
  refs.forEach((ref,i)=>{const fresh=now-Number(values[i].startedAt||0)<600000;tx.set(ref,{startedAt:fresh?values[i].startedAt:now,attempts:fresh?Number(values[i].attempts||0)+1:1})});
 });
 const record=await db.collection('artmind2_class_access').doc(entry.classId).get();
 if(!await verifyPassword(entry.password,record.exists?record.data():null))throw new HttpsError('permission-denied','학반 또는 반 비밀번호가 맞지 않습니다.');
 await db.collection('artmind2_members').doc(uid).set({classId:entry.classId,nickname:entry.nickname,approvedVia:'class-password',updatedAt:FieldValue.serverTimestamp()});
 await refs[0].delete();
 return {classId:entry.classId,nickname:entry.nickname};
});
