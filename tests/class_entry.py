"""Class-password entry integration using mocked Firebase, never operating data."""
import asyncio,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
from class_mock import MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8884),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def enter(page,password='test-class-password',nickname='푸른별'):
 await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname',nickname);await page.fill('#loginPassword',password);await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=await browser.new_context();page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
  await context.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8884') else r.abort())
  await page.goto('http://127.0.0.1:8884/index.html');assert await page.locator('#lessonLogout').is_hidden();assert await page.evaluate('window.authSignIns||0')==0
  await enter(page,'wrong-password');assert '맞지 않습니다' in await page.locator('#lessonAuthStatus').inner_text();assert await page.locator('#onlinePublish').is_disabled();assert await page.locator('#loginPassword').input_value()==''
  await page.evaluate('window.serverDown=true');await enter(page);assert '확인하지 못했습니다' in await page.locator('#lessonAuthStatus').inner_text();assert await page.locator('#onlinePublish').is_disabled()
  await page.evaluate('window.serverDown=false');await enter(page);assert '입장 완료' in await page.locator('#lessonAuthStatus').inner_text();assert '푸른별' in await page.locator('#lessonStudentName').inner_text();assert await page.locator('#onlinePublish').is_enabled()
  assert not await page.evaluate("JSON.stringify({...localStorage,...sessionStorage}).includes('test-class-password')")
  await page.locator('button[data-pick]').first.click();await page.locator('[data-page="exhibition"]').click();await page.fill('#exIntent','이전 학생 자료')
  await enter(page,nickname='다음별');assert await page.locator('#exIntent').input_value()=='';assert '다음별' in await page.locator('#lessonStudentName').inner_text()
  await page.goto('http://127.0.0.1:8884/metaverse.html');await page.wait_for_function('document.querySelector("#identity").textContent.includes("다음별")');assert '1-1' in await page.locator('#identity').inner_text()
  page.once('dialog',lambda d:d.accept());await page.click('#logout');await page.wait_for_function('document.querySelector("#identity").textContent==="로그아웃 상태"');assert await page.evaluate("sessionStorage.getItem('artmind2-class-entry-v1')") is None
  await page.reload();assert await page.evaluate('window.authSignIns||0')==0;await page.click('#login');await page.wait_for_url('**/index.html');assert await page.locator('#lessonLogout').is_hidden();assert await page.locator('#exIntent').input_value()==''
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;await browser.close();print('PASS: class password success/wrong/server outage, no password storage, next student cleanup, gallery session/logout and responsive UI')
asyncio.run(main())
