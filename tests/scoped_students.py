"""Student invite/workspace routing, mocked Firebase, no live student data."""
import asyncio,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from class_mock import MOCK
MOCK=MOCK.replace("window.calls.push(['like',...x]);","window.calls.push(['like',...x]);if(x[0].startsWith('artmind2_spaces/'))sessionStorage.setItem('scoped-publish-path',x[0]);").replace("title:'마음 '+i","hidden:i===0,title:'마음 '+i")
MOCK=MOCK.replace("q.path==='artmind2_exhibits'", "(q.path==='artmind2_exhibits'||q.path.endsWith('/exhibits'))")
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8886),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8886') else r.abort())
  await page.goto('http://127.0.0.1:8886/index.html?teacher=TeacherA&class=1-1');assert await page.locator('#loginGrade').input_value()=='1';assert await page.locator('#loginClass').input_value()=='1'
  await page.fill('#loginNickname','우리반친구');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('document.querySelector("#lessonLoginForm").hidden');assert await page.evaluate("JSON.parse(sessionStorage.getItem('mock-member')).teacherId")=='TeacherA'
  await page.locator('button[data-pick]').first.click();await page.locator('[data-page="exhibition"]').click();await page.fill('#exTitle','우리 반 전시');await page.fill('#exIntent','색을 보고 느낀 마음');await page.locator('[data-mind-element="color"]').click();await page.fill('#mind-color','색을 관찰했어요');await page.locator('[data-mind-tab="1"]').first.click();await page.fill('#mindFeeling','따뜻해요');await page.locator('[data-mind-tab="2"]').first.click();await page.fill('#mindReflect','친구를 생각해요');await page.locator('#exPublicConfirm').check();await page.click('#exSave');page.once('dialog',lambda d:d.accept());await page.click('#onlinePublish');await page.wait_for_url('**/metaverse.html?exhibit=student-1&teacher=TeacherA');assert await page.evaluate("sessionStorage.getItem('scoped-publish-path')")=='artmind2_spaces/TeacherA/exhibits/student-1'
  await page.wait_for_function('document.querySelector("#count").textContent.includes("99")');calls=await page.evaluate('window.calls');assert any(c[0]=='read' and c[1]['path']=='artmind2_spaces/TeacherA/exhibits' for c in calls);assert not any(c[0]=='read' and c[1]['path']=='artmind2_exhibits' for c in calls)
  assert 'teacher=TeacherA' in await page.locator('header a').get_attribute('href');page.once('dialog',lambda d:d.accept());await page.click('#logout');await page.wait_for_function('document.querySelector("#identity").textContent==="로그아웃 상태"');await page.click('#login');await page.wait_for_url('**/index.html?teacher=TeacherA');assert await page.locator('#lessonLoginForm').is_visible();assert not errors,errors;await browser.close();print('PASS: teacher invite prefill, membership scope, scoped publication, gallery path/hidden filtering, scoped return link; Firebase mocked')
asyncio.run(main())
