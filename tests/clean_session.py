import asyncio,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from class_mock import MOCK as FIREBASE_MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8883),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def logout(page):
 page.once('dialog',lambda d:d.accept());await page.click('#lessonLogout');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');assert await page.locator('#lessonLoginForm').is_visible()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
  await page.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=FIREBASE_MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8883') else r.abort())
  await page.goto('http://127.0.0.1:8883/index.html');await page.wait_for_selector('#lessonLogin')
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','첫학생');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');await page.locator('button[data-pick]').first.click();await page.locator('[data-page="exhibition"]').click();await page.fill('#exTitle','이전제목');await page.fill('#exIntent','이전 친구에게 전할 마음')
  await page.reload();await page.wait_for_function('!document.querySelector("#lessonLogout").hidden');assert await page.locator('#lessonLoginForm').is_hidden();assert await page.locator('#exTitle').input_value()=='';assert await page.locator('#exIntent').input_value()=='';assert await page.evaluate("localStorage.getItem('maeum-v1')") is None
  await logout(page)
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','다음학생');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');await page.locator('button[data-pick]').first.click();await page.locator('[data-page="exhibition"]').click();await page.fill('#exIntent','새 감상')
  await page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");assert await page.locator('#exIntent').input_value()=='';assert await page.locator('#exGrade').input_value()=='1';assert await page.locator('#exNickname').input_value()=='다음학생'
  await logout(page)
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','둘째학생');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');await page.locator('button[data-pick]').first.click();await page.locator('[data-page="exhibition"]').click();await page.fill('#exIntent','둘째학생의 감상')
  await logout(page)
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','셋째학생');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');assert await page.locator('#exIntent').input_value()=='';assert await page.locator('#exPublicConfirm').is_checked()==False
  assert not errors,errors;await browser.close();print('PASS: reload, cached-page restoration and student logout/change leave all appreciation fields blank')
asyncio.run(main())
