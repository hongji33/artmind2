import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged,signOut,EmailAuthProvider,linkWithCredential,signInWithEmailAndPassword,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {derivePasswordProof,validClassId,ITERATIONS} from './class-access/password-crypto.mjs';
const config={apiKey:'AIzaSyCMOfNf_Klgklok0vWYnOwnfOIMw2ixtoQ',authDomain:'artmind2-2edd4.firebaseapp.com',projectId:'artmind2-2edd4',storageBucket:'artmind2-2edd4.firebasestorage.app',messagingSenderId:'733626442696',appId:'1:733626442696:web:e9ad3e3ba86bd3a90796fd'};
// Named app isolates the teacher credential from the student anonymous session.
const app=initializeApp(config,'artmind-teacher'),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
let user=null,classes=[],epoch=0,busy=false;
async function readTeacherRole(uid){let timer;try{return await Promise.race([getDoc(doc(db,'artmind2_teachers',uid)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('role-timeout')),12000)})])}finally{clearTimeout(timer)}}
function progress(message){$('status').textContent=message;$('status').scrollIntoView({block:'nearest',behavior:'smooth'})}

function accountError(error){return ({'auth/operation-not-allowed':'앱 설정 때문에 계정을 만들거나 로그인할 수 없습니다. Firebase 콘솔 → Authentication → 로그인 방법 → 이메일/비밀번호를 사용 설정해야 합니다. 최초 한 번만 필요합니다.', 'auth/email-already-in-use':'이미 등록된 이메일입니다. 로그인 버튼을 눌러 주세요. 기존 기기 권한은 자동으로 합쳐지지 않습니다.', 'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.', 'auth/invalid-email':'이메일 주소를 확인해 주세요.', 'auth/weak-password':'비밀번호는 6자 이상 입력해 주세요.', 'auth/too-many-requests':'요청이 많습니다. 잠시 후 다시 시도해 주세요.', 'auth/network-request-failed':'인터넷 연결을 확인해 주세요.', 'auth/requires-recent-login':'다시 로그인한 뒤 시도해 주세요.'})[error?.code]||'계정 작업을 완료하지 못했습니다. 입력 내용과 연결 상태를 확인해 주세요.'}

const rows=new Map();
function renderRows(){rows.clear();$('pinRows').replaceChildren();for(const classId of classes){const tr=document.createElement('tr'),name=document.createElement('th'),pinCell=document.createElement('td'),allowCell=document.createElement('td'),pin=document.createElement('input'),enabled=document.createElement('input');name.scope='row';name.textContent=classId;pin.type=$('showPin').checked?'text':'password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.minLength=pin.maxLength=4;pin.autocomplete='off';pin.placeholder='4자리';pin.dataset.pin=classId;pin.setAttribute('aria-label',classId+' 새 비밀번호');enabled.type='checkbox';enabled.checked=true;enabled.setAttribute('aria-label',classId+' 새 입장 허용');pinCell.append(pin);allowCell.append(enabled);tr.append(name,pinCell,allowCell);$('pinRows').append(tr);rows.set(classId,{pin,enabled})}}
function controls(){ $('accountForm').hidden=!!user&&!user.isAnonymous;$('accountActions').hidden=!user||user.isAnonymous;$('accountName').textContent=user&&!user.isAnonymous?(user.email||'교사 계정'):'';for(const el of $('accountForm').elements)el.disabled=busy;$('connect').textContent='기존 기기 연결'; $('settings').disabled=busy||!user||!classes.length;$('connect').disabled=busy;$('connect').hidden=!!user;$('logout').hidden=$('copy').hidden=!user;$('logout').disabled=busy;$('refresh').disabled=busy; }
async function load(u){const ticket=++epoch;user=u;classes=[];$('showPin').checked=true;renderRows();$('registration').hidden=!u;$('teacherId').textContent=u?.uid||'';$('teacherPath').textContent=u?'artmind2_teachers/'+u.uid:'';$('identity').textContent='';controls();if(!u){$('status').textContent='처음 사용하면 ‘처음 계정 만들기’, 이미 등록했다면 ‘로그인’을 누르세요.';return}
 try{const snap=await readTeacherRole(u.uid);if(ticket!==epoch)return;const role=snap.exists()?snap.data():null;classes=role?.enabled===true&&Array.isArray(role.classIds)?[...new Set(role.classIds.filter(validClassId))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})):[];
 renderRows();$('identity').textContent=classes.length?'관리 가능한 학반: '+classes.join(', '):'교사 등록 대기';$('registration').hidden=!!classes.length;$('status').textContent=classes.length?'표에 반별 숫자 4자리를 입력하고 한 번에 저장하세요.':'아직 교사 승인이 완료되지 않았습니다. 처음 사용하는 교사는 관리자에게 담당 반 등록을 요청해야 합니다. 계정 생성만으로 반 관리가 열리지는 않습니다.';
 }catch{if(ticket===epoch)$('status').textContent='교사 권한 확인에 실패했습니다. 인터넷 연결을 확인한 뒤 승인 확인을 눌러 주세요. 계속 실패하면 관리자 설정이 필요합니다.'}finally{if(ticket===epoch)controls()}}
onAuthStateChanged(auth,load);
$('connect').onclick=async()=>{if(busy)return;busy=true;controls();try{const result=await signInAnonymously(auth);await load(result.user)}catch{$('status').textContent='교사 기기를 연결하지 못했습니다.'}finally{busy=false;controls()}};

$('accountForm').onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 const email=$('teacherEmail').value.trim(),password=$('teacherPassword').value;
 if(!$('accountForm').reportValidity())return;
 const register=e.submitter?.id==='registerAccount';
 if(register&&password.length<6){$('status').textContent='등록할 비밀번호는 6자 이상 입력해 주세요.';return}
 if(!register&&user?.isAnonymous&&classes.length&&!confirm('이 기기의 교사 권한을 유지하려면 먼저 교사 계정 등록을 이용하세요. 다른 계정으로 로그인할까요?'))return;
 busy=true;controls();progress(register?'교사 계정을 만들고 있습니다…':'로그인하고 있습니다…');
 try{
  if(register){
   const current=auth.currentUser;
   if(current&&!current.isAnonymous)throw Error('already-signed-in');
   const anonymous=current||(await signInAnonymously(auth)).user;
   await linkWithCredential(anonymous,EmailAuthProvider.credential(email,password));
  }else await signInWithEmailAndPassword(auth,email,password);
  $('teacherPassword').value='';
  await load(auth.currentUser);
 }catch(error){$('status').textContent=accountError(error)}
 finally{busy=false;controls()}
};
$('resetPassword').onclick=async()=>{
 if(busy)return;const email=$('teacherEmail').value.trim();
 if(!$('teacherEmail').reportValidity())return;
 busy=true;controls();progress('비밀번호 재설정 메일을 요청하고 있습니다…');
 try{await sendPasswordResetEmail(auth,email);$('status').textContent='등록된 이메일이면 비밀번호 재설정 안내가 발송됩니다. 메일함과 스팸함을 확인해 주세요.'}
 catch(error){$('status').textContent=accountError(error)}
 finally{busy=false;controls()}
};
$('refresh').onclick=()=>{if(!busy)load(auth.currentUser)};

$('copy').onclick=async()=>{if(!user)return;try{await navigator.clipboard.writeText(user.uid);$('status').textContent='교사 ID를 복사했습니다.'}catch{$('status').textContent='표시된 교사 ID를 직접 복사해 주세요.'}};
$('logout').onclick=async()=>{if(busy||!user)return;if(!confirm(user.isAnonymous?'이 기기는 아직 이메일 계정과 연결되지 않았습니다. 먼저 교사 계정을 등록하면 같은 ID로 다시 로그인할 수 있습니다. 그래도 연결을 해제할까요?':'교사 계정에서 로그아웃할까요?'))return;busy=true;controls();try{await signOut(auth);await load(null)}catch{$('status').textContent='연결을 해제하지 못했습니다.'}finally{busy=false;controls()}};
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
