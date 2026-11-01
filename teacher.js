import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {derivePasswordProof,validClassId,ITERATIONS} from './class-access/password-crypto.mjs';
const config={apiKey:'AIzaSyCMOfNf_Klgklok0vWYnOwnfOIMw2ixtoQ',authDomain:'artmind2-2edd4.firebaseapp.com',projectId:'artmind2-2edd4',storageBucket:'artmind2-2edd4.firebasestorage.app',messagingSenderId:'733626442696',appId:'1:733626442696:web:e9ad3e3ba86bd3a90796fd'};
// Named app isolates the teacher credential from the student anonymous session.
const app=initializeApp(config,'artmind-teacher'),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
let user=null,classes=[],epoch=0,busy=false;
const rows=new Map();
function renderRows(){rows.clear();$('pinRows').replaceChildren();for(const classId of classes){const tr=document.createElement('tr'),name=document.createElement('th'),pinCell=document.createElement('td'),allowCell=document.createElement('td'),pin=document.createElement('input'),enabled=document.createElement('input');name.scope='row';name.textContent=classId;pin.type=$('showPin').checked?'text':'password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.minLength=pin.maxLength=4;pin.autocomplete='off';pin.placeholder='4자리';pin.dataset.pin=classId;pin.setAttribute('aria-label',classId+' 새 비밀번호');enabled.type='checkbox';enabled.checked=true;enabled.setAttribute('aria-label',classId+' 새 입장 허용');pinCell.append(pin);allowCell.append(enabled);tr.append(name,pinCell,allowCell);$('pinRows').append(tr);rows.set(classId,{pin,enabled})}}
function controls(){ $('settings').disabled=busy||!user||!classes.length;$('connect').disabled=busy;$('connect').hidden=!!user;$('logout').hidden=$('copy').hidden=!user;$('logout').disabled=busy;$('refresh').disabled=busy; }
async function load(u){const ticket=++epoch;user=u;classes=[];$('showPin').checked=true;renderRows();$('registration').hidden=!u;$('teacherId').textContent=u?.uid||'';$('teacherPath').textContent=u?'artmind2_teachers/'+u.uid:'';$('identity').textContent='';controls();if(!u){$('status').textContent='교사 기기를 연결해 주세요.';return}
 try{const snap=await getDoc(doc(db,'artmind2_teachers',u.uid));if(ticket!==epoch)return;const role=snap.exists()?snap.data():null;classes=role?.enabled===true&&Array.isArray(role.classIds)?[...new Set(role.classIds.filter(validClassId))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})):[];
 renderRows();$('identity').textContent=classes.length?'관리 가능한 학반: '+classes.join(', '):'교사 등록 대기';$('registration').hidden=!!classes.length;$('status').textContent=classes.length?'표에 반별 숫자 4자리를 입력하고 한 번에 저장하세요.':'Firebase 관리자에게 위 교사 ID와 담당 학반 등록을 요청해 주세요.';
 }catch{if(ticket===epoch)$('status').textContent='교사 권한을 확인하지 못했습니다. 연결과 보안 규칙을 확인해 주세요.'}finally{if(ticket===epoch)controls()}}
onAuthStateChanged(auth,load);
$('connect').onclick=async()=>{if(busy)return;busy=true;controls();try{const result=await signInAnonymously(auth);await load(result.user)}catch{$('status').textContent='교사 기기를 연결하지 못했습니다.'}finally{busy=false;controls()}};
$('refresh').onclick=()=>load(auth.currentUser);
$('copy').onclick=async()=>{if(!user)return;try{await navigator.clipboard.writeText(user.uid);$('status').textContent='교사 ID를 복사했습니다.'}catch{$('status').textContent='표시된 교사 ID를 직접 복사해 주세요.'}};
$('logout').onclick=async()=>{if(busy||!user)return;if(!confirm('연결을 해제하면 같은 교사 ID를 복구하지 못할 수 있습니다. 이 기기의 교사 연결을 해제할까요?'))return;busy=true;controls();try{await signOut(auth);await load(null)}catch{$('status').textContent='연결을 해제하지 못했습니다.'}finally{busy=false;controls()}};
$('showPin').onchange=()=>{for(const {pin} of rows.values())pin.type=$('showPin').checked?'text':'password'};
$('pinForm').onsubmit=async e=>{
 e.preventDefault();if(busy||!user||!classes.length||!$('pinForm').reportValidity())return;
 const entries=classes.map(classId=>({classId,pin:rows.get(classId)?.pin.value||'',enabled:rows.get(classId)?.enabled.checked===true})).filter(entry=>entry.pin!=='');
 if(!entries.length){$('status').textContent='변경할 반의 새 비밀번호를 입력해 주세요.';return}
 const owner=user.uid,ticket=epoch;busy=true;controls();
 try{
  const batch=writeBatch(db);
  for(let i=0;i<entries.length;i++){
   $('status').textContent=`반 비밀번호를 준비하고 있습니다… ${i+1}/${entries.length}`;
   const {classId,pin,enabled}=entries[i],salt=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join(''),passwordHash=await derivePasswordProof(pin,salt);
   if(ticket!==epoch||user?.uid!==owner)return;
   batch.set(doc(db,'artmind2_class_public',classId),{salt,iterations:ITERATIONS});
   batch.set(doc(db,'artmind2_class_access',classId),{enabled,passwordHash});
  }
  $('status').textContent=entries.length+'개 반 비밀번호를 저장하고 있습니다…';
  await batch.commit();
  if(ticket===epoch){for(const {classId} of entries)rows.get(classId).pin.value='';$('status').textContent=entries.length+'개 반 비밀번호를 저장했습니다. ('+entries.map(e=>e.classId).join(', ')+') 새 입장부터 적용됩니다.'}
 }catch{if(ticket===epoch)$('status').textContent='저장하지 못했습니다. 입력한 번호는 유지됩니다. 교사 승인·담당 학반·연결 상태를 확인한 뒤 다시 저장해 주세요.'}
 finally{busy=false;controls()}
};
