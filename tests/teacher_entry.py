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
  await page.evaluate('window.approved=true');await page.click('#refresh');await page.wait_for_function('!document.querySelector("#settings").disabled');assert await page.locator('#pinRows tr').count()==2
  first=page.locator('[data-pin="3-1"]');second=page.locator('[data-pin="3-2"]')
  await page.click('#save');assert '입력' in await page.locator('#status').inner_text();assert await page.evaluate('window.commits||0')==0
  await first.fill('123');await page.click('#save');assert await page.evaluate('window.commits||0')==0
  await first.fill('1111');await second.fill('2222');await page.locator('#showPin').uncheck();assert await first.get_attribute('type')=='password';await page.locator('#showPin').check()
  await page.click('#save');await page.wait_for_function('!document.querySelector("#settings").disabled');assert '2개 반 비밀번호를 저장했습니다' in await page.locator('#status').inner_text();assert await page.evaluate('window.commits')==1
  saved=await page.evaluate('window.saved');assert len(saved)==4
  for index,(class_id,pin) in enumerate([('3-1','1111'),('3-2','2222')]):
   public,private=saved[index*2:index*2+2];assert public[0]=='artmind2_class_public/'+class_id;assert private[0]=='artmind2_class_access/'+class_id;assert private[1]['passwordHash']==hashlib.pbkdf2_hmac('sha256',pin.encode(),bytes.fromhex(public[1]['salt']),210000).hex()
  assert saved[0][1]['salt']!=saved[2][1]['salt'];assert await first.input_value()=='';assert await second.input_value()==''
  await first.fill('0123');await page.locator('[aria-label="3-1 새 입장 허용"]').uncheck();await page.click('#save');await page.wait_for_function('!document.querySelector("#settings").disabled');saved=await page.evaluate('window.saved');assert len(saved)==2;assert all('/3-1' in item[0] for item in saved);assert saved[1][1]['enabled'] is False;assert saved[1][1]['passwordHash']==hashlib.pbkdf2_hmac('sha256',b'0123',bytes.fromhex(saved[0][1]['salt']),210000).hex()
  before=await page.evaluate('JSON.stringify(window.saved)');await page.evaluate('window.failSave=true');await first.fill('3333');await second.fill('4444');await page.click('#save');await page.wait_for_function('!document.querySelector("#settings").disabled');assert '저장하지 못했습니다' in await page.locator('#status').inner_text();assert await page.evaluate('JSON.stringify(window.saved)')==before;assert await first.input_value()=='3333';assert await second.input_value()=='4444'
  assert await page.evaluate("localStorage.getItem('artmind-gallery-signed-out-v1')")=='student-marker'
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;await browser.close();print('PASS: teacher approval gate, assigned-class table, two PINs in one batch, blank rows unchanged, leading zeros, validation, show/hide PINs, atomic failure with retry values, separate app, responsive UI')
asyncio.run(main())
