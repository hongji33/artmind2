"""Same-origin production-URL routing using an unmodified local artclass checkout.
Prerequisite: git clone https://github.com/hongji33/artclass.git work/artclass
Run from artmind2 root: python tests/activity_launch_test.py
"""
import asyncio,base64,mimetypes
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page();errors=[];posts=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:posts.append(r.url) if r.method!='GET' else None)
  async def route(r):
   u=urlparse(r.request.url)
   if u.netloc!='hongji33.github.io':return await r.abort()
   if u.path.startswith('/artmind2/'):path=Path(u.path.removeprefix('/artmind2/'))
   elif u.path.startswith('/artclass/'):path=Path('work/artclass')/(u.path.removeprefix('/artclass/') or 'index.html')
   else:return await r.abort()
   if not path.is_file():return await r.abort()
   await r.fulfill(body=path.read_bytes(),content_type='text/javascript' if path.suffix=='.mjs' else mimetypes.guess_type(str(path))[0] or 'text/plain')
  await page.context.route('**/*',route)
  for activity,tab,sub in [('draw','play','draw'),('color','play','color'),('value','play','value'),('comp','play','comp'),('materials','materials',None),('ai','ai',None),('artist','artist',None),('expo','expo',None),('market','market',None),('school','school',None),('job','job',None)]:
   await page.goto('https://hongji33.github.io/artmind2/activity.html?activity='+activity)
   frame=page.frame_locator('#activityFrame');await frame.locator('#page-'+tab).wait_for(state='visible')
   if sub:assert await frame.locator('.sub-play[data-sub="'+sub+'"]').is_visible()
   assert not await page.locator('#fallback').evaluate('e=>e.classList.contains("show")')
  await page.goto('https://hongji33.github.io/artmind2/activity.html?activity=draw');frame=page.frame_locator('#activityFrame');await frame.locator('#page-play').wait_for(state='visible')
  data=await page.evaluate("()=>{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(0,0,8,8);return c.toDataURL().split(',')[1]}")
  await frame.locator('#imgInput').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':base64.b64decode(data)})
  await page.frames[1].wait_for_function("document.getElementById('paint').getContext('2d').getImageData(320,230,1,1).data[0]===255")
  await page.goto('https://hongji33.github.io/artmind2/activity.html?activity=unknown');assert await page.locator('#activityFrame').evaluate('e=>e.hidden')
  assert not errors,errors;assert not posts,posts
  await browser.close();print('PASS: original artclass 11 menus via same-origin launcher; local photo import; no POST; unknown id safe; no JS errors')
asyncio.run(main())
