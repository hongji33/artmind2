"""Teacher viewer uses teacher auth and reads peers without creating a student session."""
import asyncio,threading,json
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from teacher_mock import MOCK
from realtime_mock import RTDB
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8891),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
SDK=MOCK+"export const signInAnonymously=async()=>{throw Error('not a student')};export const addDoc=async()=>{throw Error('observer cannot post')};"
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=await browser.new_context(viewport={'width':1366,'height':900});page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("""window.teacherAuth={currentUser:{uid:'TeacherA',isAnonymous:false}};localStorage.setItem('artmind-gallery-signed-out-v1','1');window.records={'artmind2_spaces/TeacherA/classes/3-1':{classId:'3-1',label:'3-1',enabled:true},'artmind2_spaces/TeacherA/exhibits/student':{owner:'student',classId:'3-1',nickname:'별',title:'친구 전시',story:'내가 쓴 감상문',work:{artist:'윤두서',title:'자화상'}}};const pose={nickname:'별',x:6,y:8,roomId:0,page:0,facing:1,back:false,seated:false,walking:false,appearance:{},lastSeen:Date.now(),speechCode:0,speechAt:0};window.rtData={museum_presence:{TeacherA:{'3-1':{student:{tab:pose}}}}};""")
  async def route(r):
   if r.request.url.endswith('firebase-database.js'):await r.fulfill(content_type='text/javascript',body=RTDB)
   elif 'www.gstatic.com/firebasejs/' in r.request.url:await r.fulfill(content_type='text/javascript',body=SDK)
   elif r.request.url.startswith('http://127.0.0.1:8891'):await r.continue_()
   else:await r.abort()
  await context.route('**/*',route);await page.goto('http://127.0.0.1:8891/metaverse.html?mode=teacher&teacher=TeacherA&class=3-1');await page.wait_for_function('document.querySelector("#identity").textContent.includes("교사 관람")');await page.wait_for_function('document.querySelector("#liveCount").textContent.includes("1명")');assert await page.evaluate('window.appName')=='artmind-teacher';assert '1점' in await page.locator('#count').inner_text();assert await page.locator('[data-greeting="1"]').is_disabled();assert not await page.evaluate('(window.rtWrites||[]).length');assert not await page.evaluate('window.rtHooks.size');await page.screenshot(path='work/teacher-gallery.png')
  await page.goto('http://127.0.0.1:8891/metaverse.html?mode=teacher&teacher=TeacherB&class=3-1');await page.wait_for_function('document.querySelector("#status").textContent.includes("본인 담당 반")');assert not await page.evaluate('(window.rtWrites||[]).length')
  await page.goto('http://127.0.0.1:8891/metaverse.html?mode=teacher&teacher=TeacherA&class=3-9');await page.wait_for_function('document.querySelector("#status").textContent.includes("담당 반을 찾을 수 없습니다")');assert not errors,errors;await browser.close();print('PASS: teacher named auth despite student logout, own class artwork + live peers, read-only presence/no student session, rejects another owner or unassigned class; mocked backend')
asyncio.run(main())
