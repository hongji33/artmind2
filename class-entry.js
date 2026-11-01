import {doc,getDoc,setDoc,updateDoc,deleteField,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {derivePasswordProof,validClassId,ITERATIONS} from './class-access/password-crypto.mjs';
// Firestore rules verify the proof against a document that students cannot read.
export async function enterClass(db,uid,{classId,nickname,password}){
 if(!uid||!validClassId(classId)||typeof nickname!=='string'||!nickname.trim()||nickname.trim().length>20)throw Error('invalid-class-entry');
 const config=await getDoc(doc(db,'artmind2_class_public',classId));
 if(!config.exists()){const e=Error('class-not-found');e.code='permission-denied';throw e}
 const {salt,iterations}=config.data();
 if(iterations!==ITERATIONS)throw Error('invalid-class-config');
 const passwordProof=await derivePasswordProof(password,salt,iterations);
 const ref=doc(db,'artmind2_members',uid);
 await setDoc(ref,{classId,nickname:nickname.trim(),passwordProof,joinedAt:serverTimestamp()});
 // Membership is already verified. Remove the temporary credential field.
 // A failed cleanup does not grant extra rights: this document is owner-readable only.
 try{await updateDoc(ref,{passwordProof:deleteField()})}catch{}
}
