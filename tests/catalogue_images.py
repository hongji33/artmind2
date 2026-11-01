"""Catalogue filtering/fallbacks in Chromium with controlled image responses."""
import asyncio,json,re,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
from image_fixture import PNG
from class_mock import MOCK
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8889),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
s=Path('index.html').read_text()
constants={name:json.loads(re.search(r'const '+name+r'=(.*);',s).group(1)) for name in ['DATA','IMAGE_LIBRARY','FIXED_IMAGES','EMBEDDED_IMAGES']}
def key(w):return w['artist']+'|'+re.sub(r'\s*\([^)]*\)','',w['title']).strip()
def provided(w):return any(key(w) in constants[n] for n in ['IMAGE_LIBRARY','FIXED_IMAGES','EMBEDDED_IMAGES'])
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page(viewport={'width':1366,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  blocked={constants[n]['강희안|고사관수도']['image'] for n in ['IMAGE_LIBRARY','FIXED_IMAGES']};requests=[]
  async def route(r):
   if r.request.resource_type=='image':
    requests.append(r.request.url)
    if r.request.url in blocked:await r.abort()
    else:await r.fulfill(content_type='image/png',body=PNG)
   elif 'www.gstatic.com/firebasejs/' in r.request.url:await r.fulfill(content_type='text/javascript',body=MOCK)
   elif r.request.url.startswith('http://127.0.0.1:8889'):await r.continue_()
   else:await r.abort()
  await page.route('**/*',route);await page.goto('http://127.0.0.1:8889/index.html');await page.wait_for_selector('[data-group]')
  await page.click('#helpBtn');guide=await page.locator('#help').inner_text();assert '감정에서 나만의 전시까지' in guide;assert '한 점' in guide;assert '온라인에 전시한 감상문은 반에 저장' in guide;assert 'Apps Script' not in guide and '영상' not in guide;await page.locator('#help [data-close]').click()
  omitted=0
  for i,e in enumerate(constants['DATA']):
   await page.locator('[data-group="'+str(e['group'])+'"]').click();await page.locator('[data-emotion="'+str(i)+'"]').click()
   for w in e['works']:
    if not provided(w):
     omitted+=1;assert await page.locator('[data-card="'+w['id']+'"]').count()==0,w
   assert await page.locator('#koGrid [data-card],#westGrid [data-card]').count()>0,e['name']
   for region in ['ko','west']:
    assert await page.locator('#'+region+'WorkCount').inner_text()==str(await page.locator('#'+region+'Grid [data-card]').count())+'점'
  await page.locator('[data-group="0"]').click();await page.locator('[data-emotion="0"]').click()
  await page.evaluate('window.scrollTo(0,document.body.scrollHeight)');await page.wait_for_function('!document.querySelector("[data-card=\\"0-ko-2\\"]")');assert all(u in requests for u in blocked)
  assert await page.locator('[data-card="0-ko-1"]').count()==0
  await page.locator('[data-pick="0-west-0"]').scroll_into_view_if_needed();await page.wait_for_function('!document.querySelector("[data-pick=\\"0-west-0\\"]").disabled');assert await page.locator('[data-card="0-west-0"] img').evaluate('(img)=>img.naturalWidth>0')
  await page.locator('[data-pick="0-west-0"]').click();assert await page.locator('#startBtn').is_enabled()
  await page.locator('[data-group="0"]').click();await page.locator('[data-emotion="1"]').click();await page.locator('[data-emotion="0"]').click();assert await page.locator('[data-card="0-ko-2"]').count()==0
  assert not errors,errors;await browser.close();print(f'PASS: {omitted} image-less recommendations omitted across 30 emotions; all emotions retain choices; all fallbacks fail -> remove; embedded image decodes and permits selection; no repeated failed cards; Firebase/images mocked')
asyncio.run(main())
