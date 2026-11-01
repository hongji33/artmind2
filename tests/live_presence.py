"""Render real classmates and greetings against an in-memory RTDB adapter."""
import asyncio,threading,json
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
from realtime_mock import RTDB
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8888),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', "size();draw();window.__liveTest={draw,room:()=>currentRoom,peers:()=>liveFrames.size,visible:()=>liveVisible().length};\n</script>")
MOCK=FIREBASE_MOCK.replace("data:()=>({classId:'1-1',nickname:'테스트'})", "data:()=>({classId:'1-1',nickname:'테스트',teacherId:'TeacherA'})")
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page(viewport={'width':1366,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("""sessionStorage.setItem('artmind2-class-entry-v1',JSON.stringify({uid:'student',classId:'1-1',teacherId:'TeacherA'}));const now=Date.now(),peers={};for(let i=0;i<29;i++)peers['friend'+i]={tab:{nickname:'친구'+i,x:1.5+(i%8)*1.2,y:2+Math.floor(i/8)*1.9,roomId:0,page:0,facing:1,back:false,seated:false,walking:false,appearance:{hair:i%6,outfit:i%5,skin:i%4,hairColor:i%4,color:i%6,expression:i%6},lastSeen:now,speechCode:0,speechAt:0}};window.rtData={museum_members:{TeacherA:{student:{classId:'1-1',nickname:'테스트',joinedAt:now}}},museum_presence:{TeacherA:{'1-1':peers}}};""")
  async def route(r):
   url=r.request.url
   if url.endswith('firebase-database.js'):return await r.fulfill(content_type='text/javascript',body=RTDB)
   if 'www.gstatic.com/firebasejs/' in url:return await r.fulfill(content_type='text/javascript',body=MOCK)
   if url.split('?')[0].endswith('/metaverse.html'):return await r.fulfill(content_type='text/html',body=source)
   return await r.continue_() if url.startswith('http://127.0.0.1:8888') else await r.abort()
  await page.route('**/*',route);await page.goto('http://127.0.0.1:8888/metaverse.html?teacher=TeacherA');await page.wait_for_function('window.__liveTest&&__liveTest.peers()===29&&document.querySelector("#liveCount").textContent.includes("30")');assert await page.evaluate('__liveTest.visible()')==29
  await page.click('[data-greeting="1"]');await page.wait_for_function('window.rtWrites.some(w=>w[1].speechCode===1)');assert await page.locator('[data-greeting="1"]').is_disabled()
  await page.evaluate("window.injectRT('museum_presence/TeacherA/1-1/friend0/tab',{...window.rtData.museum_presence.TeacherA['1-1'].friend0.tab,speechCode:1,speechAt:Date.now(),lastSeen:Date.now()})");await page.wait_for_function('document.querySelector("#liveGreeting").textContent.includes("친구0: 안녕")')
  timing=await page.evaluate('''()=>{const times=[];for(let i=0;i<40;i++){const t=performance.now();__liveTest.draw();times.push(performance.now()-t)}times.sort((a,b)=>a-b);return {median:times[20],p95:times[38]}}''')
  await page.click('[data-view="all"]');await page.screenshot(path='work/classmates-greeting.png');assert await page.locator('[data-room]').count()==0;assert '30명' in await page.locator('#liveCount').inner_text()
  before=await page.evaluate('window.rtWrites.length');await page.wait_for_timeout(1600);assert await page.evaluate('window.rtWrites.length')-before<=2
  page.once('dialog',lambda d:d.accept());await page.click('#logout');await page.wait_for_function('document.querySelector("#identity").textContent==="로그아웃 상태"');assert await page.evaluate('window.rtRemoves.some(p=>p.startsWith("museum_presence/TeacherA/1-1/student/"))');assert await page.evaluate('__liveTest.peers()')==0;assert await page.locator('[data-greeting="1"]').is_disabled();assert not errors,errors
  await browser.close();print(json.dumps({'passed':['29 classmates + self','same-room filtering','hello cooldown','remote speech bubble','bounded idle writes','logout cleanup'],'draw_ms':timing,'server':'mock RTDB; operating rules and 30 devices not tested'},ensure_ascii=False))
asyncio.run(main())
