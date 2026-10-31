"""Thirty isolated local-browser sessions. Firebase is mocked; this is NOT a backend load test."""
import asyncio,base64,json,threading,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
class Server(ThreadingHTTPServer):request_queue_size=128
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=Server(('127.0.0.1',8879),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', 'size();draw();window.__classTest={move,changeRoom,player,keys};\n</script>')
sdk=FIREBASE_MOCK.replace('length:100','length:30')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  contexts=await asyncio.gather(*[browser.new_context(viewport={'width':1100,'height':780}) for _ in range(30)])
  errors=[];pages=[];started=time.monotonic()
  async def create(context,index):
   student_sdk=sdk.replace("uid:'student'","uid:'student-"+str(index)+"'")
   await context.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=student_sdk) if 'www.gstatic.com/firebasejs/' in r.request.url else r.fulfill(content_type='text/html',body=source) if r.request.url.endswith('/metaverse.html') else r.continue_() if r.request.url.startswith('http://127.0.0.1:8879') else r.abort())
   page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));pages.append(page)
   await page.goto('http://127.0.0.1:8879/metaverse.html',timeout=90000)
   await page.wait_for_function('window.__classTest && document.querySelector("#count").textContent.includes("30점")',timeout=90000)
   return page
  pages=await asyncio.gather(*[create(c,i) for i,c in enumerate(contexts)]);load_seconds=round(time.monotonic()-started,2)
  fixture=base64.b64decode(await pages[0].evaluate("()=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='teal';x.fillRect(0,0,16,16);return c.toDataURL().split(',')[1]}"))
  async def exercise(page):
   await page.locator('#fabricUpload').set_input_files({'name':'student-pattern.png','mimeType':'image/png','buffer':fixture})
   await page.wait_for_function('document.getElementById("fabricStatus").textContent.includes("적용했어요")',timeout=90000)
   result=await page.evaluate('''()=>{__classTest.changeRoom(1);const before=__classTest.player.x;for(let i=0;i<50;i++)__classTest.move(-.04,0);return {moved:__classTest.player.x<before,room:document.getElementById('roomTitle').textContent,writes:window.calls.filter(c=>['like','comment'].includes(c[0])).length}}''')
   assert result['moved'] and result['writes']==0,result
   assert await page.locator('#appearance-expression').count()==1
  await asyncio.gather(*[exercise(page) for page in pages]);assert not errors,errors
  print(json.dumps({'sessions':30,'success':30,'concurrent_load_seconds_on_this_host':load_seconds,'pattern_imports':30,'movement_sessions':30,'movement_or_pattern_Firebase_writes':0,'page_errors':errors,'limitation':'Local Chromium and mocked Firebase only; not 30 Chromebooks, school Wi-Fi, actual Firestore or external AI'},indent=2))
  await browser.close()
asyncio.run(main())
