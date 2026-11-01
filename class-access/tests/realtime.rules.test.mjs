import test from 'node:test';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {ref,set,get,update,remove,serverTimestamp} from 'firebase/database';
import {derivePasswordProof} from '../password-crypto.mjs';
import {defaultAppearance} from '../../avatar-renderer.mjs';
test('RTDB teacher-owned configuration, class PIN membership, peer scope, preset/cooldown and self cleanup',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-artmind-live',database:{host:'127.0.0.1',port:9000,rules:await readFile(new URL('../../realtime.rules.json',import.meta.url),'utf8')}});
 try{
  const account=(uid,provider)=>env.authenticatedContext(uid,{firebase:{sign_in_provider:provider}}).database(),a=account('TeacherA','password'),b=account('TeacherB','password'),student=account('student','anonymous'),other=account('other','anonymous');
  const salt='0123456789abcdef0123456789abcdef',passwordHash=await derivePasswordProof('1111',salt),config={salt,iterations:210000,passwordHash,enabled:true};
  await assertSucceeds(set(ref(a,'museum_classes/TeacherA/1-1'),config));await assertSucceeds(set(ref(a,'museum_classes/TeacherA/1-2'),config));
  await assertFails(set(ref(b,'museum_classes/TeacherA/1-1'),config));await assertFails(set(ref(student,'museum_classes/student/1-1'),config));await assertFails(get(ref(student,'museum_classes/TeacherA/1-1')));
  const member=ref(student,'museum_members/TeacherA/student'),entry={classId:'1-1',nickname:'별',joinedAt:serverTimestamp(),passwordProof:passwordHash};
  await assertFails(set(member,{...entry,passwordProof:'0'.repeat(64)}));await assertSucceeds(set(member,entry));await assertSucceeds(update(member,{passwordProof:null}));await assertSucceeds(get(member));await assertFails(get(ref(other,'museum_members/TeacherA/student')));await assertFails(update(member,{classId:'1-2'}));
  await assertSucceeds(set(ref(other,'museum_members/TeacherA/other'),{...entry,classId:'1-2'}));
  const path='museum_presence/TeacherA/1-1/student/tab',pose={nickname:'별',x:6,y:8,roomId:0,page:0,facing:1,back:false,seated:false,walking:false,appearance:defaultAppearance,lastSeen:serverTimestamp(),speechCode:0,speechAt:0};
  await assertSucceeds(set(ref(student,path),pose));await assertSucceeds(get(ref(student,'museum_presence/TeacherA/1-1')));await assertFails(get(ref(other,'museum_presence/TeacherA/1-1')));await assertSucceeds(get(ref(a,'museum_presence/TeacherA/1-1')));await assertFails(get(ref(b,'museum_presence/TeacherA/1-1')));await assertFails(set(ref(a,'museum_presence/TeacherA/1-1/student/fake'),pose));await assertFails(set(ref(student,'museum_presence/TeacherA/1-1/other/tab'),pose));
  await assertSucceeds(update(ref(student,path),{speechCode:1,speechAt:Date.now(),lastSeen:serverTimestamp()}));await assertFails(update(ref(student,path),{speechCode:2,speechAt:Date.now()+1,lastSeen:serverTimestamp()}));await assertSucceeds(update(ref(student,path),{x:7,lastSeen:serverTimestamp()}));
  await assertFails(update(ref(student,path),{speechCode:99,lastSeen:serverTimestamp()}));await assertFails(update(ref(student,path),{message:'free text',lastSeen:serverTimestamp()}));await assertFails(update(ref(student,path),{x:100,lastSeen:serverTimestamp()}));
  await assertSucceeds(set(ref(a,'museum_layouts/TeacherA/1-1'),'u'));await assertSucceeds(get(ref(student,'museum_layouts/TeacherA/1-1')));await assertFails(get(ref(other,'museum_layouts/TeacherA/1-1')));await assertFails(set(ref(student,'museum_layouts/TeacherA/1-1'),'t'));await assertFails(set(ref(b,'museum_layouts/TeacherA/1-1'),'t'));await assertFails(set(ref(a,'museum_layouts/TeacherA/1-1'),'invalid'));
  await assertSucceeds(update(ref(student,path),{x:27,y:21,lastSeen:serverTimestamp(),visual:{fabric:'data:image/webp;base64,QUFB',avatar:'',fabricScale:24}}));await assertFails(update(ref(student,path),{visual:{fabric:'https://example.com/image.png',avatar:'',fabricScale:24}}));await assertFails(update(ref(student,path),{visual:{fabric:'data:image/png;base64,'+'A'.repeat(24000),avatar:'',fabricScale:24}}));await assertSucceeds(update(ref(student,path),{visual:null,lastSeen:serverTimestamp()}));
  await assertSucceeds(remove(member));await assertSucceeds(remove(ref(student,path)));
 }finally{await env.cleanup()}
});
