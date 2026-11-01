"""Native touch scroll over the gallery canvas; Firebase mocked."""
import asyncio,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8892),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script("sessionStorage.setItem('artmind2-class-entry-v1',JSON.stringify({uid:'student',classId:'1-1'}))")
  await page.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=FIREBASE_MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8892') else r.abort())
  await page.goto('http://127.0.0.1:8892/metaverse.html');await page.wait_for_function('document.querySelector("#identity").textContent.includes("테스트")');assert await page.evaluate('document.querySelector(".live-panel").getBoundingClientRect().bottom<=document.querySelector(".scene").getBoundingClientRect().top');assert 'pan-y' in await page.locator('#scene').evaluate('(el)=>getComputedStyle(el).touchAction')
  await page.locator('#scene').scroll_into_view_if_needed();before=await page.evaluate('scrollY');r=await page.locator('#scene').bounding_box();x=r['x']+r['width']*.25;y=min(680,r['y']+r['height']*.8);session=await context.new_cdp_session(page)
  await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for step in range(1,9):
   await session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-step*25}]});await page.wait_for_timeout(30)
  await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await page.wait_for_timeout(250);assert await page.evaluate('scrollY')>before+60
  await page.evaluate('scrollTo(0,0)');await page.screenshot(path='work/mobile-gallery-scroll.png',full_page=True)
  for width in [360,390,768]:
   await page.set_viewport_size({'width':width,'height':844});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;await browser.close();print('PASS: live panel before scene, native touch swipe scrolls over canvas, 360/390/768 no horizontal overflow; mocked Firebase')
asyncio.run(main())
