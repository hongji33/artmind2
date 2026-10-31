import asyncio, json, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',8765),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
Path('work').mkdir(exist_ok=True)
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', '''size();draw();window.__test={move,changeRoom,interact,draw,getPlayer:()=>({...player}),setPlayer:(x,y)=>{player.x=x;player.y=y;draw()},getRoom:()=>currentRoom,getExhibits:()=>roomExhibits(),getKeys:()=>keys.size};\n</script>''')
mock='''window.calls=[];export const initializeApp=()=>({});export const getAuth=()=>window.mockAuth={currentUser:{uid:'student'}};export const onAuthStateChanged=(a,cb)=>window.authCallback=cb;export const signInAnonymously=async()=>{await window.authCallback(window.mockAuth.currentUser)};export const getFirestore=()=>({});export const doc=(db,...p)=>p.join('/');export const collection=doc;export const query=(path,...filters)=>({path,filters});export const where=(...x)=>x;export const limit=x=>x;export const serverTimestamp=()=>123;export const getDoc=async()=>({exists:()=>window.approved!==false,data:()=>({classId:'1-1',nickname:'테스트'})});export const getDocs=async q=>{window.calls.push(['read',q]);let a=[];if(q.path==='artmind2_exhibits')a=Array.from({length:100},(_,i)=>({id:'work'+i,data:()=>({classId:'1-1',nickname:'학생'+i,title:'마음 '+i,story:'감상문 '+i,work:{artist:'윤두서',title:'자화상'},updatedAt:{seconds:100-i}})}));if(q.path.endsWith('/comments'))a=[{id:'c1',data:()=>({nickname:'친구',text:'멋진 감상',createdAt:{seconds:1}})}];return {docs:a,size:a.length}};export const setDoc=async(...x)=>window.calls.push(['like',...x]);export const addDoc=async(...x)=>window.calls.push(['comment',...x]);'''
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1366,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/*',lambda route: route.fulfill(content_type='text/javascript',body=mock) if 'www.gstatic.com/firebasejs/' in route.request.url else route.fulfill(content_type='text/html',body=source) if route.request.url.split('?')[0].endswith('/metaverse.html') else route.continue_() if route.request.url.startswith('http://127.0.0.1') else route.abort())
  await page.goto('http://127.0.0.1:8765/metaverse.html');await page.wait_for_function('window.__test && window.__test.getExhibits && document.querySelector("#status").textContent.includes("가까이")')
  await page.click('[data-room="1"]');assert await page.evaluate('__test.getExhibits().length')==16
  await page.click('#scene');start=await page.evaluate('__test.getPlayer()');await page.keyboard.down('a');await page.wait_for_timeout(250);await page.keyboard.up('a');end=await page.evaluate('__test.getPlayer()');assert end['x']<start['x']
  await page.wait_for_timeout(100);assert await page.evaluate('__test.getPlayer()')==end
  await page.evaluate('__test.setPlayer(3.5,3);__test.move(4,0)');assert (await page.evaluate('__test.getPlayer()'))['x']<4
  await page.evaluate('__test.setPlayer(.65,1)');await page.keyboard.press('e');await page.wait_for_selector('#overlay.show');assert '마음' in await page.locator('#modalTitle').inner_text()
  await page.click('#like');await page.fill('#commentText','좋은 작품이에요');await page.click('#send');await page.wait_for_timeout(100)
  calls=await page.evaluate('window.calls');assert any(x[0]=='like' and '/likes/student' in x[1] for x in calls);assert any(x[0]=='comment' and x[2]['classId']=='1-1' for x in calls)
  await page.keyboard.press('Escape');await page.evaluate('__test.setPlayer(6,9.2)');await page.keyboard.press('e');assert await page.evaluate('__test.getRoom()')==0
  await page.click('[data-room="2"]');assert await page.evaluate('__test.getExhibits().length')==14
  await page.screenshot(path='work/t-gallery.png',full_page=True)
  # Warm Canvas timing is diagnostic, not a Chromebook hardware benchmark.
  timing=await page.evaluate('''()=>{const a=[];for(let i=0;i<120;i++){const t=performance.now();__test.draw();a.push(performance.now()-t)}a.sort((a,b)=>a-b);return {median_ms:a[60],p95_ms:a[114]}}''')
  await page.click('[data-room="1"]');await page.screenshot(path='work/u-gallery.png',full_page=True)
  await page.click('[data-room="0"]');await page.screenshot(path='work/lobby.png',full_page=True)
  await page.click('[data-room="3"]');assert await page.evaluate('__test.getExhibits()[0].id')=='work30';await page.click('#nextPage');assert await page.evaluate('__test.getExhibits()[0].id')=='work46'
  await page.goto('http://127.0.0.1:8765/metaverse.html?exhibit=work93');await page.wait_for_selector('#overlay.show');assert await page.evaluate('__test.getRoom()')==3;assert await page.locator('#modalTitle').inner_text()=='마음 93';await page.keyboard.press('Escape')
  await page.evaluate('window.approved=false;window.authCallback(window.mockAuth.currentUser)');await page.wait_for_timeout(100);assert await page.evaluate('__test.getExhibits().length')==0
  assert not errors,errors
  await page.set_viewport_size({'width':768,'height':900});await page.wait_for_timeout(100);assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await browser.close();print(json.dumps({'browser':'Chromium','checks':['100 mock exhibits','U16/T14','held keyboard movement and stop','U wall collision','E modal','like and comment paths','door E to lobby','overflow pagination','approval missing clears works','768px responsive','no page errors'],'draw_timing':timing,'errors':errors},ensure_ascii=False,indent=2))
asyncio.run(main())
