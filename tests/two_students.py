"""Two isolated browser identities sharing a controlled RTDB transport (not production rules)."""
import asyncio,json,threading,time,copy
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from firebase_mock import FIREBASE_MOCK
from realtime_mock import RTDB
from image_fixture import PNG
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8890),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
source=Path('metaverse.html').read_text().replace('size();draw();\n</script>', 'size();draw();window.__liveTest={player,sharedImages,peers:()=>[...liveFrames.values()]};\n</script>')
shared={'museum_members':{'TeacherA':{uid:{'classId':'1-1','nickname':nick,'joinedAt':int(time.time()*1000)} for uid,nick in [('studentA','별'),('studentB','달')]}}}
pages=[];mock_sources={}
def resolve(v):
 if isinstance(v,dict):return int(time.time()*1000) if v.get('.sv')=='timestamp' else {k:resolve(x) for k,x in v.items()}
 return v
def put(path,value):
 keys=path.split('/');node=shared
 for k in keys[:-1]:node=node.setdefault(k,{})
 if value is None:node.pop(keys[-1],None)
 else:node[keys[-1]]=resolve(value)
async def commit(source,method,path,value):
 if method=='update':
  for k,v in value.items():put(path+'/'+k,v)
 else:put(path,value)
 snapshot=copy.deepcopy(shared)
 for page in pages:
  if not page.is_closed():await page.evaluate('''data=>{window.rtData=data;for(const path of window.rtWatches.keys())if(!path.startsWith('.info'))window.fireRT(path,path.split('/').reduce((v,k)=>v?.[k],data)??null)}''',snapshot)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
  bridged=RTDB.replace('notify()};\nexport const set=',"notify();await window.commitRT('update',reference.path,data)};\nexport const set=").replace('put(reference.path,null);notify()};',"put(reference.path,null);notify();await window.commitRT('remove',reference.path,null)};")
  for uid,nick in [('studentA','별'),('studentB','달')]:
   context=await browser.new_context(viewport={'width':1366,'height':900});await context.expose_binding('commitRT',commit)
   await context.add_init_script("sessionStorage.setItem('artmind2-class-entry-v1',JSON.stringify("+json.dumps({'uid':uid,'classId':'1-1','teacherId':'TeacherA'})+"));window.rtData="+json.dumps(shared,ensure_ascii=False))
   mock=FIREBASE_MOCK.replace("uid:'student'",f"uid:'{uid}'").replace("data:()=>({classId:'1-1',nickname:'테스트'})",f"data:()=>({{classId:'1-1',nickname:'{nick}',teacherId:'TeacherA'}})")
   mock_sources[context]=mock
   async def route(r):
    url=r.request.url
    if url.split('?')[0].endswith('firebase-database.js'):return await r.fulfill(content_type='text/javascript',body=bridged)
    if 'www.gstatic.com/firebasejs/' in url:return await r.fulfill(content_type='text/javascript',body=mock_sources[r.request.frame.page.context])
    if url.split('?')[0].endswith('/metaverse.html'):return await r.fulfill(content_type='text/html',body=source)
    return await r.continue_() if url.startswith('http://127.0.0.1:8890') else await r.abort()
   await context.route('**/*',route);page=await context.new_page();pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:8890/metaverse.html?teacher=TeacherA&v=classmates-3');await page.wait_for_function('!document.querySelector("[data-greeting]").disabled')
  for page in pages:await page.wait_for_function('document.querySelector("#liveCount").textContent.includes("2명")');assert '2명' in await page.locator('#liveHudCount').inner_text()
  a,b=[await page.evaluate('({...__liveTest.player})') for page in pages];assert ((a['x']-b['x'])**2+(a['y']-b['y'])**2)**.5>=.85
  await pages[0].locator('.customization>summary').click();await pages[0].select_option('#appearance-outfit','2');await pages[0].select_option('#appearance-color','3');await pages[1].wait_for_function('__liveTest.peers().find(p=>p.uid==="studentA")?.appearance.outfit===2&&__liveTest.peers().find(p=>p.uid==="studentA")?.appearance.color===3')
  await pages[0].evaluate("const p=document.querySelector('#fabricPad');p.getContext('2d').fillStyle='#ff2255';p.getContext('2d').fillRect(0,0,p.width,p.height);document.querySelector('#fabricApply').click()");await pages[1].wait_for_function('__liveTest.peers().find(p=>p.uid==="studentA")?.visual?.fabric?.startsWith("data:image/")');await pages[1].wait_for_function('[...__liveTest.sharedImages.values()].some(img=>img?.complete&&img.naturalWidth>0)');await pages[1].screenshot(path='work/friend-shared-fabric.png')
  await pages[0].set_input_files('#avatarUpload',{'name':'character.png','mimeType':'image/png','buffer':PNG});await pages[1].wait_for_function('__liveTest.peers().find(p=>p.uid==="studentA")?.visual?.avatar?.startsWith("data:image/")');await pages[1].screenshot(path='work/friend-shared-avatar.png')
  await pages[0].click('#avatarReset');await pages[0].evaluate("document.querySelector('#fabricRemove').click()");await pages[1].wait_for_function('!__liveTest.peers().find(p=>p.uid==="studentA")?.visual');
  await pages[0].click('[data-greeting="1"]');await pages[1].wait_for_function('document.querySelector("#liveGreeting").textContent.includes("별: 안녕")');await pages[1].screenshot(path='work/two-students-connected.png')
  await pages[0].click('#scene');await pages[0].keyboard.down('ArrowLeft');await pages[0].wait_for_timeout(300);await pages[0].keyboard.up('ArrowLeft');await pages[0].wait_for_timeout(1500)
  own=await pages[0].evaluate('({...__liveTest.player})');remote=await pages[1].evaluate('__liveTest.peers().find(p=>p.uid==="studentA")');assert abs(own['x']-remote['x'])<.002
  pages[0].once('dialog',lambda d:d.accept());await pages[0].click('#logout');await pages[1].wait_for_function('document.querySelector("#liveCount").textContent.includes("1명")');assert not errors,errors
  await browser.close();print('PASS: two isolated identities, shared transport, mutual count, separate walkable arrival, outfit/color, shared fabric/avatar/reset, greeting, movement and logout; production backend not tested')
asyncio.run(main())
