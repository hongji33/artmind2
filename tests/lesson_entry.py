"""Real lesson UI with mocked Firebase only. Does not write operating student data."""
import asyncio,json,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from class_mock import MOCK as FIREBASE_MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8881),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1440,'height':1000});page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
  await context.route('**/*',lambda r:r.fulfill(content_type='text/javascript',body=FIREBASE_MOCK) if 'www.gstatic.com/firebasejs/' in r.request.url else r.fulfill(content_type='text/html',body='<h1>메타버스 연결 검증</h1>') if '/metaverse.html' in r.request.url else r.continue_() if r.request.url.startswith('http://127.0.0.1:8881') else r.abort())
  await context.add_init_script("localStorage.setItem('maeum-v1',JSON.stringify({draft:'이전 학생 대본',name:'이전 이름',collection:[{draft:'이전 작품'}],exhibit:{title:'이전 전시',intent:'이전 친구에게 전할 마음'}}));localStorage.setItem('artmind2-student-identity-v1',JSON.stringify({grade:'3',classroom:'9',nickname:'이전 학생'}))")
  await page.goto('http://127.0.0.1:8881/index.html');await page.wait_for_selector('#lessonLogin')
  assert await page.locator('#exIntent').input_value()=='';assert await page.locator('#exTitle').input_value()=='';assert await page.evaluate("localStorage.getItem('maeum-v1')") is None
  await page.select_option('#loginGrade','1');await page.select_option('#loginClass','1');await page.fill('#loginNickname','푸른별');await page.fill('#loginPassword','1111');await page.click('#lessonLogin');await page.wait_for_function('!document.querySelector("#lessonLogin").disabled');assert '푸른별' in await page.locator('#lessonStudentName').inner_text()
  assert await page.locator('#exGrade').input_value()=='1';assert await page.locator('#exClass').input_value()=='1';assert await page.locator('#exNickname').input_value()=='푸른별'
  await page.evaluate('window.scrollTo(0,0)');await page.screenshot(path='work/lesson-entry.png')
  # Existing artwork selection and the local appreciation flow remain available.
  pick=page.locator('button[data-pick]').first
  assert await pick.count()==1
  await pick.click();assert await page.locator('#dock .dock-actions button').count()==1;assert await page.locator('#startBtn').inner_text()=='감상문 작성하기 →';await page.click('#startBtn');await page.wait_for_selector('#exTitle',state='visible')
  assert await page.locator('.ex-identity').is_hidden();assert await page.locator('#exGrade').input_value()=='1';assert await page.locator('#exNickname').input_value()=='푸른별'
  await page.screenshot(path='work/compact-exhibition.png',full_page=True)
  assert await page.locator('#exNickname').input_value()=='푸른별'
  await page.fill('#exTitle','내 마음의 빛');await page.fill('#exIntent','색과 선을 관찰하며 내 마음을 돌아보았습니다.')
  await page.locator('[data-mind-element="color"]').click();await page.fill('#mind-color','화면 속 색의 대비를 관찰했습니다.')
  await page.locator('[data-mind-tab="1"]').first.click();await page.fill('#mindFeeling','차분하고 따뜻한 마음이 들었습니다.')
  await page.locator('[data-mind-tab="2"]').first.click();await page.fill('#mindReflect','친구와 함께했던 순간을 떠올렸습니다.')
  await page.locator('#exPublicConfirm').check();await page.click('#exSave');assert '임시 저장했어요' in await page.locator('#exSaved').inner_text();assert '/index.html' in page.url
  await page.evaluate('window.savedStudentDraft=JSON.stringify(JSON.parse(sessionStorage.getItem("artmind2-working-draft-v2")))')
  await page.locator('#exPublicConfirm').uncheck();await page.click('#onlinePublish');assert '/index.html' in page.url;assert not any(c[0]=='like' for c in await page.evaluate('window.calls'))
  await page.locator('#exPublicConfirm').check();page.once('dialog',lambda d:d.dismiss());await page.click('#onlinePublish');assert '/index.html' in page.url
  await page.evaluate('window.failWrite=true');page.once('dialog',lambda d:d.accept());await page.click('#onlinePublish');await page.wait_for_function('document.querySelector("#onlineStatus").textContent.includes("저장 실패")');assert '/index.html' in page.url
  # Logout removes local work and blocks re-entry after refresh until the login button is used.
  page.once('dialog',lambda d:d.accept());await page.click('#lessonLogout');await page.wait_for_function('document.querySelector("#lessonStudentName").textContent==="로그아웃 상태"');assert await page.evaluate("sessionStorage.getItem('artmind2-working-draft-v2')") is None;assert await page.locator('#exIntent').input_value()==''
  await page.reload();await page.wait_for_function('document.querySelector("#lessonStudentName").textContent==="로그아웃 상태"');assert await page.evaluate('window.authSignIns||0')==0
  # Fresh, approved session: a successful explicit public save navigates to its exact exhibit.
  second=await browser.new_context(viewport={'width':1366,'height':900});other=await second.new_page();other.on('pageerror',lambda e:errors.append(e.stack))
  publish_mock=FIREBASE_MOCK.replace("window.calls.push(['like',...x]);","window.calls.push(['like',...x]);if(x[0]==='artmind2_exhibits/student-1')sessionStorage.setItem('published-exhibit',JSON.stringify({...x[1],updatedAt:{seconds:999}}));")
  publish_mock=publish_mock.replace('return {docs:a,',"if(q.path==='artmind2_exhibits'&&sessionStorage.getItem('published-exhibit')){const saved=JSON.parse(sessionStorage.getItem('published-exhibit'));a.unshift({id:'student-1',data:()=>saved})};return {docs:a,")
  async def route_other(r):
   if 'www.gstatic.com/firebasejs/' in r.request.url:return await r.fulfill(content_type='text/javascript',body=publish_mock)
   return await r.continue_() if r.request.url.startswith('http://127.0.0.1:8881') else await r.abort()
  await second.route('**/*',route_other)
  await other.goto('http://127.0.0.1:8881/index.html');await other.wait_for_selector('#lessonLogin')
  await other.select_option('#loginGrade','1');await other.select_option('#loginClass','1');await other.fill('#loginNickname','새별');await other.fill('#loginPassword','1111');await other.click('#lessonLogin');await other.wait_for_function('!document.querySelector("#lessonLogin").disabled');await other.locator('button[data-pick]').first.click();await other.locator('[data-page="exhibition"]').click()
  await other.fill('#exTitle','나의 전시');await other.fill('#exIntent','내 감상문');await other.locator('[data-mind-element="color"]').click();await other.fill('#mind-color','색을 관찰했어요');await other.locator('[data-mind-tab="1"]').first.click();await other.fill('#mindFeeling','따뜻해요');await other.locator('[data-mind-tab="2"]').first.click();await other.fill('#mindReflect','친구를 생각해요');await other.locator('#exPublicConfirm').check();await other.click('#exSave')
  other.once('dialog',lambda d:d.accept());await other.click('#onlinePublish');await other.wait_for_url('**/metaverse.html?exhibit=student-1');await other.wait_for_selector('#overlay.show');assert await other.locator('#modalTitle').inner_text()=='나의 전시';assert await other.locator('#modalStory').inner_text()=='내 감상문'
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  await browser.close();print(json.dumps({'passed':['header grade/class/nickname entry and original fields synced','existing artwork selection and appreciation form','no consent/cancel/write failure do not navigate','anonymous logout and persisted signed-out state','legacy browser data ignored and removed; all drafts empty after logout','successful publish opens the saved exhibit in the actual metaverse page','768/390 responsive','no JS errors'],'errors':errors},ensure_ascii=False,indent=2))
asyncio.run(main())
