"""Thirty students and artworks in one large gallery; mock Firebase and RTDB."""
import asyncio,threading,json
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
from realtime_mock import RTDB
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8893),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', 'size();draw();window.__one={rooms,player,move,draw,labels:()=>labelBoxes,hits:()=>hitRegions.length};\n</script>')
MOCK=FIREBASE_MOCK.replace("data:()=>({classId:'1-1',nickname:'테스트'})", "data:()=>({classId:'1-1',nickname:'내별',teacherId:'TeacherA'})").replace("q.path==='artmind2_exhibits'", "q.path==='artmind2_spaces/TeacherA/exhibits'").replace('Array.from({length:100}', 'Array.from({length:30}').replace("work:{artist:'윤두서',title:'자화상'}", "work:{artist:'정선',title:'인왕제색도'}")
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("""sessionStorage.setItem('artmind2-class-entry-v1',JSON.stringify({uid:'student',classId:'1-1',teacherId:'TeacherA'}));const peers={},now=Date.now();for(let i=0;i<29;i++)peers['friend'+i]={tab:{nickname:'친구'+i,x:2+(i%7)*4,y:2+Math.floor(i/7)*3,roomId:0,page:0,facing:1,back:false,seated:false,walking:false,appearance:{color:i%6},lastSeen:now,speechCode:0,speechAt:0}};window.rtData={museum_members:{TeacherA:{student:{classId:'1-1',nickname:'내별',joinedAt:now}}},museum_presence:{TeacherA:{'1-1':peers}}};window.paintedNames=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(name,...args){if(String(name).includes(' · 나'))window.paintedNames.push(String(name));return original.call(this,name,...args)};""")
  async def route(r):
   if r.request.url.endswith('firebase-database.js'):await r.fulfill(content_type='text/javascript',body=RTDB)
   elif 'www.gstatic.com/firebasejs/' in r.request.url:await r.fulfill(content_type='text/javascript',body=MOCK)
   elif r.request.url.split('?')[0].endswith('/metaverse.html'):await r.fulfill(content_type='text/html',body=source)
   elif r.request.url.startswith('http://127.0.0.1:8893'):await r.continue_()
   else:await r.abort()
  await page.route('**/*',route);await page.goto('http://127.0.0.1:8893/metaverse.html?teacher=TeacherA');await page.wait_for_function('document.querySelector("#liveCount").textContent.includes("30명")');await page.click('[data-view="all"]');await page.wait_for_function('__one.hits()===30');assert await page.evaluate('__one.rooms.length')==1;assert await page.evaluate('paintedNames.includes("내별 · 나")')
  assert await page.evaluate('''()=>{const a=__one.labels();return a.length>=20&&a.every((x,i)=>a.every((y,j)=>i===j||x.right+3<y.left||x.left-3>y.right||x.bottom+3<y.top||x.top-3>y.bottom))}''')
  await page.screenshot(path='work/one-gallery-30.png');await page.evaluate('__one.player.x=1;__one.player.y=2;__one.move(.8,0)');assert await page.evaluate('__one.player.x<=1.31')
  await page.evaluate("window.injectRT('museum_layouts/TeacherA/1-1','u')");await page.wait_for_function('__one.rooms[0].layout==="u"');assert await page.evaluate('__one.rooms[0].slots.length')>=30;await page.screenshot(path='work/one-gallery-u.png');assert not errors,errors;await browser.close();print('PASS: 30 connected avatars + 30 artworks, one gallery, non-overlapping visible name labels, own label, player collision, live U layout change; mock backend')
asyncio.run(main())
