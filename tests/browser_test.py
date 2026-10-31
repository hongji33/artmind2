import asyncio, json, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',8765),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
Path('work').mkdir(exist_ok=True)
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', '''size();draw();window.__test={move,changeRoom,interact,draw,getPlayer:()=>({...player}),setPlayer:(x,y)=>{player.x=x;player.y=y;draw()},getRoom:()=>currentRoom,getExhibits:()=>roomExhibits(),getKeys:()=>keys.size,getAppearance:()=>({...appearance}),getMotion:()=>({walkPhase,isWalking,seated:!!seated}),benchPoint:(x,y)=>iso(x,y,.55),getSelectedId:()=>selected?.id,getViewed:()=>[...viewed],getFabric:()=>({active:!!fabric,size:fabricScale}),studioPoint:zone=>{const p=rooms[4].props.find(p=>p.zone===zone);return iso(p.x,p.y,1.3)},getScale:()=>scale,artPoint:id=>{const h=hitRegions.find(h=>h.d.id===id);return {x:h.x,y:h.y}},doorPoint:i=>{const d=rooms[currentRoom].doors[i];return iso(d.x,d.y,1.2)}};\n</script>''')
from firebase_mock import FIREBASE_MOCK as mock
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1366,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.context.route('**/*',lambda route: route.fulfill(content_type='text/javascript',body=mock) if 'www.gstatic.com/firebasejs/' in route.request.url else route.fulfill(content_type='text/html',body=source) if route.request.url.split('?')[0].endswith('/metaverse.html') else route.fulfill(content_type='text/html',body='<h1>미술사 활동 테스트</h1>') if route.request.url.startswith('https://hongji33.github.io/arthistory/') or route.request.url.startswith('https://hongji33.github.io/artclass/') else route.fulfill(content_type='text/html',body='<h1>미술 체험 연결 테스트</h1>') if '/activity.html?activity=' in route.request.url else route.continue_() if route.request.url.startswith('http://127.0.0.1') else route.abort())
  await page.goto('http://127.0.0.1:8765/metaverse.html');await page.wait_for_function('window.__test && window.__test.getExhibits && document.querySelector("#status").textContent.includes("가까이")')
  await page.select_option('#appearance-hair','3');await page.select_option('#appearance-outfit','4');await page.select_option('#appearance-skin','2');assert (await page.evaluate('__test.getAppearance()'))['hair']==3
  assert not any(x[0] in ('like','comment') for x in await page.evaluate('window.calls'))
  await page.reload();await page.wait_for_function('window.__test && window.__test.getAppearance().hair===3');assert (await page.evaluate('__test.getAppearance()'))['outfit']==4
  # Expressions persist and each choice changes the rendered face.
  faces=[]
  for expression in range(6):
   await page.select_option('#appearance-expression',str(expression));faces.append(await page.locator('#avatarPreview').evaluate('e=>e.toDataURL()'))
  assert len(set(faces))==6
  await page.select_option('#appearance-expression','5');await page.select_option('#appearance-outfit','0')
  await page.locator('.fabric-tools summary').click();before=await page.locator('#avatarPreview').evaluate('e=>e.toDataURL()')
  pad=await page.locator('#fabricPad').bounding_box();await page.mouse.move(pad['x']+30,pad['y']+30);await page.mouse.down();await page.mouse.move(pad['x']+100,pad['y']+100,steps=8);await page.mouse.up();await page.click('#fabricApply');assert (await page.evaluate('__test.getFabric()'))['active'];assert await page.locator('#avatarPreview').evaluate('e=>e.toDataURL()')!=before
  await page.locator('#fabricScale').fill('36');await page.locator('#fabricScale').dispatch_event('input');assert (await page.evaluate('__test.getFabric()'))['size']==36
  await page.reload();await page.wait_for_function('window.__test && __test.getFabric().active');assert (await page.evaluate('__test.getAppearance()'))['expression']==5;assert (await page.evaluate('__test.getFabric()'))['size']==36
  await page.locator('.fabric-tools summary').click();await page.click('#fabricRemove');assert not (await page.evaluate('__test.getFabric()'))['active'];assert await page.locator('#avatarPreview').evaluate('e=>e.toDataURL()')==before
  # A real local PNG upload takes the same bounded path as the student's image.
  import base64
  png=await page.evaluate("()=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='#dd5577';x.fillRect(0,0,16,16);x.fillStyle='#557799';x.fillRect(0,0,8,8);return c.toDataURL().split(',')[1]}")
  await page.locator('#fabricUpload').set_input_files({'name':'my-fabric.png','mimeType':'image/png','buffer':base64.b64decode(png)});await page.wait_for_function('__test.getFabric().active')
  await page.select_option('#appearance-outfit','4');await page.screenshot(path='work/custom-fabric.png',full_page=True)
  await page.click('[data-room="1"]');assert await page.evaluate('__test.getExhibits().length')==16
  point=await page.evaluate('__test.artPoint("work0")');await page.locator('#scene').hover(position=point)
  tip=page.locator('#artworkTooltip');assert await tip.is_visible()
  assert await page.locator('#hoverTitle').inner_text()=='마음 0';assert await page.locator('#hoverNickname').inner_text()=='학생0';assert await page.locator('#hoverArtist').inner_text()=='윤두서';assert await page.locator('#hoverWork').inner_text()=='자화상'
  assert await page.locator('#scene').evaluate("e=>e.style.cursor")=='pointer'
  await page.screenshot(path='work/artwork-hover.png');assert await tip.is_visible()
  await page.locator('header').hover();assert not await tip.is_visible()
  await page.evaluate('''()=>{const d=__test.getExhibits()[0];d.title='<img src=x onerror="window.__unsafe=true">';d.nickname='<b>학생</b>'}''')
  await page.locator('#scene').hover(position=point);assert await page.locator('#hoverNickname').inner_text()=='<b>학생</b>';assert await tip.locator('img,b').count()==0;assert not await page.evaluate('!!window.__unsafe')
  await page.locator('header').hover();await page.evaluate('''()=>{const d=__test.getExhibits()[0];d.title='';d.nickname='';d.work={}}''')
  await page.locator('#scene').hover(position=point);assert await page.locator('#hoverTitle').inner_text()=='제목 없는 전시';assert await page.locator('#hoverNickname').inner_text()=='친구';assert await page.locator('#hoverArtist').inner_text()=='작가 정보 없음';assert await page.locator('#hoverWork').inner_text()=='작품명 정보 없음'
  await page.locator('header').hover();await page.evaluate('''()=>{const d=__test.getExhibits()[0];d.title='마음 0';d.nickname='학생0';d.work={artist:'윤두서',title:'자화상'}}''')
  await page.locator('#scene').hover(position=point);await page.click('[data-room="0"]');assert not await tip.is_visible()
  # All three lobby doors and every return door use the visible door polygon.
  for index,target,x in [(0,1,2),(1,2,10),(2,3,6)]:
   point=await page.evaluate(f'__test.doorPoint({index})');await page.locator('#scene').click(position=point);assert await page.evaluate('__test.getRoom()')==0
   await page.evaluate(f'__test.setPlayer({x},.9)');await page.locator('#scene').click(position=point);assert await page.evaluate('__test.getRoom()')==target
   await page.evaluate('__test.setPlayer(6,9.2)');point=await page.evaluate('__test.doorPoint(0)');await page.locator('#scene').click(position=point);assert await page.evaluate('__test.getRoom()')==0
  await page.click('[data-room="1"]')
  await page.locator('#scene').focus();start=await page.evaluate('__test.getPlayer()');await page.keyboard.down('a');await page.wait_for_timeout(250);assert (await page.evaluate('__test.getMotion()'))['walkPhase']>0;await page.keyboard.up('a');assert not (await page.evaluate('__test.getMotion()'))['isWalking'];end=await page.evaluate('__test.getPlayer()');assert end['x']<start['x']
  await page.wait_for_timeout(100);assert await page.evaluate('__test.getPlayer()')==end
  await page.evaluate('__test.setPlayer(3.5,3);__test.move(4,0)');assert (await page.evaluate('__test.getPlayer()'))['x']<4;await page.evaluate('__test.move(4,0)');assert not (await page.evaluate('__test.getMotion()'))['isWalking']
  await page.evaluate('__test.setPlayer(.65,1)');await page.keyboard.press('e');await page.wait_for_selector('#overlay.show');assert '마음' in await page.locator('#modalTitle').inner_text()
  viewed_id=await page.evaluate('__test.getSelectedId()');assert viewed_id not in await page.evaluate('__test.getViewed()')
  await page.click('#markViewed');assert await page.locator('#markViewed').get_attribute('aria-pressed')=='true';await page.click('#markViewed');assert await page.locator('#markViewed').get_attribute('aria-pressed')=='false';await page.click('#markViewed');assert viewed_id in await page.evaluate('__test.getViewed()')
  assert not any(x[0] in ('like','comment') for x in await page.evaluate('window.calls'))
  await page.click('#like');await page.fill('#commentText','좋은 작품이에요');await page.click('#send');await page.wait_for_timeout(100)
  calls=await page.evaluate('window.calls');assert any(x[0]=='like' and '/likes/student' in x[1] for x in calls);assert any(x[0]=='comment' and x[2]['classId']=='1-1' for x in calls)
  await page.keyboard.press('Escape');await page.reload();await page.wait_for_function('window.__test && document.querySelector("#status").textContent.includes("가까이")');await page.click('[data-room="1"]');assert viewed_id in await page.evaluate('__test.getViewed()')
  point=await page.evaluate(f'__test.artPoint("{viewed_id}")');await page.locator('#scene').hover(position=point);assert await page.locator('#hoverViewed').inner_text()=='✓ 감상한 작품'
  await page.evaluate('__test.setPlayer(6,9.2)');await page.keyboard.press('e');assert await page.evaluate('__test.getRoom()')==0
  # A distant click cannot teleport the visitor onto a bench.
  await page.evaluate('__test.setPlayer(6,8.6)');point=await page.evaluate('__test.benchPoint(3,6)');await page.locator('#scene').click(position=point);assert not (await page.evaluate('__test.getMotion()'))['seated']
  await page.evaluate('__test.setPlayer(3,7)');point=await page.evaluate('__test.benchPoint(3,6)');await page.locator('#scene').click(position=point);assert (await page.evaluate('__test.getMotion()'))['seated'];assert await page.locator('#standUp').is_visible()
  await page.screenshot(path='work/seated.png',full_page=True)
  await page.click('#standUp');assert not (await page.evaluate('__test.getMotion()'))['seated'];assert await page.evaluate('__test.getPlayer()')=={'x':3,'y':7}
  await page.locator('#scene').click(position=point);await page.keyboard.down('d');await page.wait_for_timeout(120);await page.keyboard.up('d');assert not (await page.evaluate('__test.getMotion()'))['seated']
  await page.click('[data-room="2"]');assert await page.evaluate('__test.getExhibits().length')==14
  await page.screenshot(path='work/t-gallery.png',full_page=True)
  # Warm Canvas timing is diagnostic, not a Chromebook hardware benchmark.
  timing=await page.evaluate('''()=>{const a=[];for(let i=0;i<120;i++){const t=performance.now();__test.draw();a.push(performance.now()-t)}a.sort((a,b)=>a-b);return {median_ms:a[60],p95_ms:a[114]}}''')
  await page.click('[data-room="1"]');await page.screenshot(path='work/u-gallery.png',full_page=True)
  await page.click('[data-room="0"]');await page.screenshot(path='work/lobby.png',full_page=True)
  await page.evaluate('__test.setPlayer(.9,3)');point=await page.evaluate('__test.doorPoint(3)');await page.locator('#scene').click(position=point);assert await page.evaluate('__test.getRoom()')==4
  assert await page.locator('.studio-zone-link').count()==4
  await page.screenshot(path='work/art-studio.png',full_page=True)
  urls=set()
  for zone,count in [('atelier',2),('light',3),('digital',2),('culture',5)]:
   point=await page.evaluate(f'__test.studioPoint("{zone}")');await page.locator('#scene').click(position=point);await page.wait_for_selector('#studioDialog[open]');assert await page.locator('#studioCards .activity-card').count()==count
   for card in await page.locator('#studioCards .activity-card').all():
    assert await card.get_attribute('rel')=='noopener noreferrer';urls.add(await card.get_attribute('href'))
   start=await page.evaluate('__test.getPlayer()');await page.keyboard.press('w');assert await page.evaluate('__test.getPlayer()')==start
   if zone=='light':await page.screenshot(path='work/art-lab-catalogue.png')
   if zone=='atelier':
    async with page.expect_popup() as popup_info:
     await page.locator('[data-activity="draw"]').click()
    popup=await popup_info.value;await popup.wait_for_load_state();assert popup.url=='http://127.0.0.1:8765/activity.html?activity=draw';assert await popup.evaluate('window.opener===null');await popup.close()
   await page.keyboard.press('Escape');assert not await page.locator('#studioDialog').evaluate('e=>e.open')
  assert len(urls)==12;assert await page.evaluate('__test.getRoom()')==4
  await page.click('[data-room="3"]');assert await page.evaluate('__test.getExhibits()[0].id')=='work30' ;await page.click('#nextPage');assert await page.evaluate('__test.getExhibits()[0].id')=='work46'
  await page.goto('http://127.0.0.1:8765/metaverse.html?exhibit=work93');await page.wait_for_selector('#overlay.show');assert await page.evaluate('__test.getRoom()')==3;assert await page.locator('#modalTitle').inner_text()=='마음 93';await page.keyboard.press('Escape')
  await page.evaluate('window.approved=false;window.authCallback(window.mockAuth.currentUser)');await page.wait_for_timeout(100);assert await page.evaluate('__test.getExhibits().length')==0
  assert not errors,errors
  for width in [768,390]:
   await page.set_viewport_size({'width':width,'height':900});await page.wait_for_timeout(100);assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Render all 30 hair/outfit combinations, seated/front/back and both directions.
  await page.evaluate('''async()=>{const {drawPerson}=await import('./avatar-renderer.mjs');const c=document.createElement('canvas');c.width=720;c.height=1100;const ctx=c.getContext('2d');ctx.fillStyle='#e9e5d9';ctx.fillRect(0,0,c.width,c.height);for(let hair=0;hair<6;hair++)for(let outfit=0;outfit<5;outfit++){const x=72+outfit*140,y=185+hair*180;drawPerson(ctx,{x,y,scale:.85,appearance:{hair,outfit,skin:hair%4,hairColor:hair%4,color:outfit},phase:1,walking:true,seated:hair===5,facing:outfit%2?1:-1,back:hair===4})}window.__avatarSheet=c.toDataURL()}''')
  import base64
  Path('work/avatar-styles.png').write_bytes(base64.b64decode((await page.evaluate('window.__avatarSheet')).split(',')[1]))
  await page.emulate_media(reduced_motion='reduce');await page.reload();await page.wait_for_function('window.__test');assert await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
  assert not errors,errors
  await browser.close();print(json.dumps({'browser':'Chromium','checks':['explicit viewed toggle and persisted frame/tooltip state','six facial expressions and persistence','draw/upload/remove/restore fabric and resize pattern','four designed studio zones, 12 exact menu links, modal keyboard and isolated new tab','four-field artwork hover, missing metadata and hide','tooltip treats metadata as text','three nearby lobby door clicks and return doors','distant door click rejected','30 illustrated combinations render','reduced-motion mode loads','appearance persisted after reload','distance-driven gait and idle pose','near-only bench click seating','button and movement stand up','100 mock exhibits','U16/T14','held keyboard movement and stop','U wall collision','E modal','like and comment paths','door E to lobby','overflow pagination','approval missing clears works','768px and 390px responsive','no page errors'],'draw_timing':timing,'errors':errors},ensure_ascii=False,indent=2))
asyncio.run(main())
