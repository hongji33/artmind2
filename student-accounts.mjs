import {doc,getDoc,setDoc,updateDoc,deleteField,collection,query,where,limit,getDocs,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {enterClass} from './class-entry.js?v=personal-accounts-1';
import {validTeacherId} from './workspace-paths.mjs';
export const validStudentPin=value=>typeof value==='string'&&/^[0-9]{6}$/.test(value);
export async function studentEmail(host,classId,nickname){
 const name=String(nickname).normalize('NFKC').trim();if(!validTeacherId(host)||!/^([1-3])-([1-9]|1[0-9]|20)$/.test(classId)||!name||name.length>20)throw Error('invalid-student-account');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([host,classId,name])));
 return 's-'+[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')+'@students.artmind.invalid';
}
const accountRef=(db,host,uid)=>doc(db,'artmind2_spaces',host,'student_accounts',uid);
const draftRef=(db,host,uid)=>doc(db,'artmind2_spaces',host,'student_drafts',uid);
export async function enterStudentAccount({app,auth,db,host,teacherId='',classId,nickname,classPassword,pin,register=false,preserveAnonymous=false}){
 if(!validStudentPin(pin))throw Error('invalid-personal-pin');const name=nickname.normalize('NFKC').trim(),email=await studentEmail(host,classId,name);
 const sdk=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');await sdk.setPersistence(auth,sdk.browserSessionPersistence);let credential;
 if(register){
  if(!preserveAnonymous||!auth.currentUser?.isAnonymous){if(auth.currentUser)await sdk.signOut(auth);await sdk.signInAnonymously(auth)}
  await enterClass(db,auth.currentUser.uid,{classId,nickname:name,password:classPassword,teacherId,presenceHost:host});
  credential=await sdk.linkWithCredential(auth.currentUser,sdk.EmailAuthProvider.credential(email,pin));
 }else{
  if(auth.currentUser)await sdk.signOut(auth);credential=await sdk.signInWithEmailAndPassword(auth,email,pin);
  await enterClass(db,credential.user.uid,{classId,nickname:name,password:classPassword,teacherId,presenceHost:host});
 }
 if(credential.user.getIdToken)await credential.user.getIdToken(true);
 // The student deliberately shares this dedicated classroom PIN with their teacher.
 // Account records are teacher-readable, never readable by classmates.
 try{await setDoc(accountRef(db,host,credential.user.uid),{uid:credential.user.uid,classId,nickname:name,email,pin,updatedAt:serverTimestamp()},{merge:true})}catch{const e=Error('account-record-write-failed');e.code='account-record-write-failed';throw e}
 return {...credential,nickname:name};
}
export async function saveStudentDraft(db,{host,uid,classId,nickname,activity}){
 if(!validTeacherId(host)||!uid||!activity)throw Error('invalid-draft');await setDoc(draftRef(db,host,uid),{uid,classId,nickname,activity,updatedAt:serverTimestamp()});
}
export async function loadStudentDraft(db,{host,uid}){const snap=await getDoc(draftRef(db,host,uid));return snap.exists()?snap.data().activity:null}
export async function listStudentAccounts(db,host,classId){const result=await getDocs(query(collection(db,'artmind2_spaces',host,'student_accounts'),where('classId','==',classId),limit(100)));return result.docs.map(d=>({...d.data(),uid:d.id})).sort((a,b)=>a.nickname.localeCompare(b.nickname,'ko'))}
export async function resetStudentPin({app,db,host,account,pin}){
 if(!validStudentPin(pin)||!validTeacherId(host)||!account?.uid)throw Error('invalid-personal-pin');
 const appSdk=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),sdk=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
 const isolated=appSdk.initializeApp(app.options,'student-reset-'+crypto.randomUUID()),auth=sdk.getAuth(isolated);let changed=false;
 try{
  await sdk.setPersistence(auth,sdk.inMemoryPersistence);let signedIn=false;
  for(const candidate of [...new Set([account.pendingPin,account.pin].filter(Boolean))]){try{await sdk.signInWithEmailAndPassword(auth,account.email,candidate);signedIn=true;break}catch(e){if(!['auth/invalid-credential','auth/wrong-password'].includes(e.code))throw e}}
  if(!signedIn||auth.currentUser.uid!==account.uid)throw Error('account-recovery-mismatch');
  // Keep both candidates until the Auth + Firestore change is confirmed.
  await updateDoc(accountRef(db,host,account.uid),{pendingPin:pin,updatedAt:serverTimestamp()});
  await sdk.updatePassword(auth.currentUser,pin);changed=true;
  try{await updateDoc(accountRef(db,host,account.uid),{pin,pendingPin:deleteField(),updatedAt:serverTimestamp()});return {pin,pending:false}}catch{return {pin,pending:true}}
 }catch(e){if(!changed)try{await updateDoc(accountRef(db,host,account.uid),{pendingPin:deleteField(),updatedAt:serverTimestamp()})}catch{}throw e}
 finally{try{await sdk.signOut(auth)}catch{}try{await appSdk.deleteApp(isolated)}catch{}}
}
