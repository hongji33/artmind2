"""Real lesson UI with mocked Firebase only. Does not write operating student data."""
import asyncio,json,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8881),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1440,'height':1000});page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
  await context.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=FIREBASE_MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.fulfill(content_type='text/html',body='<h1>메타버스 연결 검증</h1>') if '/metaverse.html' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8881') else r.abort())
  await page.goto('http://127.0.0.1:8881/index.html');await page.wait_for_function('document.querySelector("#lessonAuthStatus").textContent.includes("승인된 학급")')
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','푸른별');await page.click('#lessonLogin');assert '푸른별' in await page.locator('#lessonStudentName').inner_text()
  assert await page.locator('#exGrade').input_value()=='1';assert await page.locator('#exClass').input_value()=='1';assert await page.locator('#exNickname').input_value()=='푸른별'
  await page.evaluate('window.scrollTo(0,0)');await page.screenshot(path='work/lesson-entry.png')
  await page.select_option('#loginClass','2');await page.click('#lessonLogin');assert '승인된 학급은 1-1' in await page.locator('#lessonAuthStatus').inner_text();assert await page.locator('#exClass').input_value()=='1';await page.select_option('#loginClass','1')
  # Existing artwork selection and the local appreciation flow remain available.
  pick=page.locator('button[data-pick]').first
  assert await pick.count()==1
  await pick.click();await page.locator('[data-page="exhibition"]').click();await page.wait_for_selector('#exTitle',state='visible')
  assert await page.locator('#exNickname').input_value()=='푸른별'
  await page.fill('#exTitle','내 마음의 빛');await page.fill('#exIntent','색과 선을 관찰하며 내 마음을 돌아보았습니다.')
  await page.locator('[data-mind-element="color"]').click();await page.fill('#mind-color','화면 속 색의 대비를 관찰했습니다.')
  await page.locator('[data-mind-tab="1"]').first.click();await page.fill('#mindFeeling','차분하고 따뜻한 마음이 들었습니다.')
  await page.locator('[data-mind-tab="2"]').first.click();await page.fill('#mindReflect','친구와 함께했던 순간을 떠올렸습니다.')
  await page.locator('#exPublicConfirm').check();await page.click('#exSave');assert '저장했어요' in await page.locator('#exSaved').inner_text();assert '/index.html' in page.url
  await page.evaluate('window.savedStudentDraft=JSON.stringify(JSON.parse(localStorage.getItem("maeum-v1")))')
  await page.locator('#exPublicConfirm').uncheck();await page.click('#onlinePublish');assert '/index.html' in page.url;assert not any(c[0]=='like' for c in await page.evaluate('window.calls'))
  await page.locator('#exPublicConfirm').check();page.once('dialog',lambda d:d.dismiss());await page.click('#onlinePublish');assert '/index.html' in page.url
  await page.evaluate('window.failWrite=true');page.once('dialog',lambda d:d.accept());await page.click('#onlinePublish');await page.wait_for_function('document.querySelector("#onlineStatus").textContent.includes("저장 실패")');assert '/index.html' in page.url
  # Logout preserves local work and blocks re-entry after refresh until the login button is used.
  page.once('dialog',lambda d:d.accept());await page.click('#lessonLogout');await page.wait_for_function('document.querySelector("#lessonStudentName").textContent==="로그아웃 상태"');assert await page.evaluate('JSON.stringify(JSON.parse(localStorage.getItem("maeum-v1")))===window.savedStudentDraft')
  await page.reload();await page.wait_for_function('document.querySelector("#lessonStudentName").textContent==="로그아웃 상태"');assert await page.evaluate('window.authSignIns||0')==0
  await page.evaluate('window.approved=false');await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','다음별');await page.click('#lessonLogin');await page.wait_for_function('document.querySelector("#lessonAuthStatus").textContent.includes("교사에게")');assert 'student-1' in await page.locator('#lessonAuthStatus').inner_text();assert await page.locator('#onlinePublish').is_disabled()
  # Fresh, approved session: a successful explicit public save navigates to its exact exhibit.
  second=await browser.new_context(viewport={'width':1366,'height':900});other=await second.new_page();other.on('pageerror',lambda e:errors.append(e.stack))
  publish_mock=FIREBASE_MOCK.replace("window.calls.push(['like',...x]);","window.calls.push(['like',...x]);if(x[0]==='artmind2_exhibits/student')sessionStorage.setItem('published-exhibit',JSON.stringify({...x[1],updatedAt:{seconds:999}}));")
  publish_mock=publish_mock.replace('return {docs:a,',"if(q.path==='artmind2_exhibits'&&sessionStorage.getItem('published-exhibit')){const saved=JSON.parse(sessionStorage.getItem('published-exhibit'));a.unshift({id:'student',data:()=>saved})};return {docs:a,")
  async def route_other(r):
   if 'www.gstatic.com/firebasejs/' in r.request.url:return await r.fulfill(content_type='text/javascript',body=publish_mock)
   return await r.continue_() if r.request.url.startswith('http://127.0.0.1:8881') else await r.abort()
  await second.route('**/*',route_other)
  await other.add_init_script("localStorage.setItem('artmind2-student-identity-v1',JSON.stringify({grade:'1',classroom:'1',nickname:'새별'}));localStorage.setItem('maeum-v1',JSON.stringify({exhibit:{grade:'1',classroom:'1',nickname:'새별',title:'나의 전시',intent:'내 감상문',works:{ko:{id:'test-work',artist:'윤두서',title:'자화상'}}}}))")
  await other.goto('http://127.0.0.1:8881/index.html#exhibition');await other.wait_for_function('document.querySelector("#onlinePublish").disabled===false');await other.locator('#exPublicConfirm').check();other.once('dialog',lambda d:d.accept());await other.click('#onlinePublish');await other.wait_for_url('**/metaverse.html?exhibit=student');await other.wait_for_selector('#overlay.show');assert await other.locator('#modalTitle').inner_text()=='나의 전시';assert await other.locator('#modalStory').inner_text()=='내 감상문'
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  await browser.close();print(json.dumps({'passed':['header grade/class/nickname entry and original fields synced','approved classroom mismatch rejected','existing artwork selection and appreciation form','no consent/cancel/write failure do not navigate','anonymous logout and persisted signed-out state','local draft unchanged on logout','new UID waits for teacher approval','successful publish opens the saved exhibit in the actual metaverse page','768/390 responsive','no JS errors'],'errors':errors},ensure_ascii=False,indent=2))
asyncio.run(main())
