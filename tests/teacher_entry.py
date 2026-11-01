"""Teacher management UI with mocked Auth/Firestore. Never changes live data."""
import asyncio,threading,json,hashlib
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
MOCK="""export const initializeApp=(config,name)=>{window.appName=name;return {}};export const getAuth=()=>window.auth={currentUser:null};export const onAuthStateChanged=(a,cb)=>{window.cb=cb;cb(a.currentUser)};export const signInAnonymously=async a=>{a.currentUser={uid:'teacher-device'};await window.cb(a.currentUser);return {user:a.currentUser}};export const signOut=async a=>{a.currentUser=null;await window.cb(null)};export const getFirestore=()=>({});export const doc=(db,...p)=>p.join('/');export const getDoc=async()=>({exists:()=>window.approved===true,data:()=>({enabled:true,classIds:['3-1','3-2']})});export const writeBatch=()=>{const pending=[];return {set:(...p)=>pending.push(p),commit:async()=>{if(window.failSave)throw Error('permission-denied');window.saved=pending;window.commits=(window.commits||0)+1}}};"""
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8885),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("localStorage.setItem('artmind-gallery-signed-out-v1','student-marker')")
  await page.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8885') else r.abort())
  await page.goto('http://127.0.0.1:8885/teacher.html');await page.wait_for_function('window.appName===\"artmind-teacher\"');await page.click('#connect');assert await page.locator('#settings').evaluate('(el)=>el.disabled');assert 'teacher-device' in await page.locator('#teacherId').inner_text()
  await page.evaluate('window.approved=true');await page.click('#refresh');await page.wait_for_function('!document.querySelector("#settings").disabled');assert await page.locator('#classId option').count()==3
  await page.fill('#pin','1111');await page.fill('#pinConfirm','2222');await page.click('#save');assert '다릅니다' in await page.locator('#status').inner_text();assert await page.evaluate('window.commits||0')==0
  for pin in ['1111','0123']:
   await page.fill('#pin',pin);await page.fill('#pinConfirm',pin);await page.click('#save');await page.wait_for_function('!document.querySelector("#settings").disabled');assert '저장했습니다' in await page.locator('#status').inner_text()
   saved=await page.evaluate('window.saved');assert saved[0][0]=='artmind2_class_public/3-1';assert saved[1][0]=='artmind2_class_access/3-1';salt=saved[0][1]['salt'];assert saved[1][1]['passwordHash']==hashlib.pbkdf2_hmac('sha256',pin.encode(),bytes.fromhex(salt),210000).hex();assert await page.locator('#pin').input_value()=='';assert await page.locator('#pinConfirm').input_value()==''
  before=await page.evaluate('JSON.stringify(window.saved)');await page.evaluate('window.failSave=true');await page.fill('#pin','2222');await page.fill('#pinConfirm','2222');await page.click('#save');await page.wait_for_function('!document.querySelector("#settings").disabled');assert '저장하지 못했습니다' in await page.locator('#status').inner_text();assert await page.evaluate('JSON.stringify(window.saved)')==before
  assert await page.evaluate("localStorage.getItem('artmind-gallery-signed-out-v1')")=='student-marker'
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;await browser.close();print('PASS: teacher approval gate, assigned classes, 1111 create / 0123 change, PIN confirmation, atomic failure, credential clearing, separate app, responsive UI')
asyncio.run(main())
