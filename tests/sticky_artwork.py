"""Ensure selected artwork stays visible while writing. Firebase is mocked."""
import asyncio,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from class_mock import MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8887),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def visible_art(page,side_by_side=True):
 await page.wait_for_function('''()=>{const img=document.querySelector('#artworkReference .mind-art-image'),header=document.querySelector('body>header');if(!img)return false;const a=img.getBoundingClientRect(),h=header.getBoundingClientRect();return a.width>0&&a.top>=h.bottom-2&&a.bottom<=innerHeight-2}''')
 if side_by_side:
  assert await page.evaluate("document.querySelector('#artworkReference').getBoundingClientRect().right < document.querySelector('.exhibit-writing').getBoundingClientRect().left")
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page(viewport={'width':1366,'height':768});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8887') else r.abort())
  await page.goto('http://127.0.0.1:8887/index.html');await page.evaluate("document.documentElement.style.scrollBehavior='auto'")
  await page.select_option('#loginGrade','3');await page.select_option('#loginClass','1');await page.fill('#loginNickname','작품보며쓰기');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('document.querySelector("#lessonLoginForm").hidden')
  await page.locator('button[data-pick]').first.click();await page.click('#startBtn');await page.wait_for_selector('#artworkReference .mind-art-image');await page.locator('[data-mind-element="color"]').click();await page.fill('#mind-color','밝은 색을 관찰했어요.')
  await page.locator('[data-mind-tab="1"]').first.click();await page.fill('#mindFeeling','따뜻한 느낌이 들어요.');await page.locator('[data-mind-tab="2"]').first.click();await page.fill('#mindReflect','작품을 보며 나의 경험을 쓰고 있어요.');await visible_art(page)
  await page.locator('#exIntent').scroll_into_view_if_needed();await page.fill('#exIntent','마지막 감상문을 쓰는 동안에도 그림이 보여요.');await visible_art(page);await page.screenshot(path='work/sticky-artwork-desktop.png')
  assert await page.locator('#exhibitWorks .mind-art').count()==0;assert await page.locator('#artworkReference .mind-art').count()==1
  for width,height in [(1024,600),(390,844)]:
   await page.set_viewport_size({'width':width,'height':height});await page.locator('#exIntent').scroll_into_view_if_needed();await page.fill('#exIntent','크기가 달라도 작품을 보며 씁니다.');await visible_art(page,width>850);assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await page.screenshot(path='work/sticky-artwork-mobile.png');assert await page.locator('#mindReflect').input_value()=='작품을 보며 나의 경험을 쓰고 있어요.'
  await page.set_viewport_size({'width':1366,'height':768});await page.evaluate("window.oldReference=document.querySelector('#artworkReference .mind-art')");await page.locator('[data-page="explore"]').click();page.once('dialog',lambda d:d.accept());await page.locator('button[data-pick]').nth(1).click();await page.click('#startBtn');assert await page.locator('#artworkReference .mind-art').count()==1;assert await page.evaluate('!window.oldReference.isConnected')
  assert not errors,errors;await browser.close();print('PASS: fixed artwork during reflection and final writing, 1366x768/1024x600/390x844, complete image bounds below header, single updated reference, preserved draft; Firebase mocked')
asyncio.run(main())
