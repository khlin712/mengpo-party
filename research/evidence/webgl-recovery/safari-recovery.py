import subprocess,json,time
from pathlib import Path
created=[];out={'browser':'Safari desktop on this Mac','faults':'WEBGL_lose_context simulation in owned localhost QA windows only','samples':{}}
def osa(s):
 r=subprocess.run(['osascript','-e',s],capture_output=True,text=True,timeout=25)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def js(w,s):return osa('tell application "Safari" to do JavaScript '+json.dumps(s,ensure_ascii=False)+' in current tab of window id '+str(w))
def get(w):return json.loads(js(w,'JSON.stringify({origin:performance.timeOrigin,view:window.__islandView?.(),title:document.querySelector("#detail-title")?.textContent,glLost:document.querySelector("#map canvas")?.getContext("webgl2")?.isContextLost()})'))
def wait(w,pred,seconds=25):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  try:
   s=get(w)
   if pred(s):return s
  except (ValueError,KeyError,TypeError):pass
  time.sleep(.3)
 raise TimeoutError(str(get(w)))
def openqa(tag):
 url='http://127.0.0.1:4205/?recovery-qa='+tag
 w=int(osa('tell application "Safari"\nmake new document with properties {URL:'+json.dumps(url)+'}\nreturn id of front window\nend tell'))
 created.append(w);osa('tell application "Safari" to activate');osa('tell application "Safari" to set index of window id '+str(w)+' to 1');wait(w,lambda s:bool(s.get('view')))
 js(w,'[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="略過")?.click();if(document.querySelector("#modal").open)document.querySelector("#modal").close();')
 return w
try:
 w=openqa('restore')
 js(w,'document.querySelector("#pause").click();[...document.querySelectorAll(".station-label")].find(e=>e.textContent.includes("服務台")).click();')
 before=wait(w,lambda s:not s['view']['flying']);time.sleep(.8);before=get(w);out['samples']['before']=before
 js(w,'window.__loss=document.querySelector("#map canvas").getContext("webgl2").getExtension("WEBGL_lose_context");__loss.loseContext();')
 out['samples']['waiting']=wait(w,lambda s:s['view']['recovery']['phase']=='waiting')
 js(w,'__loss.restoreContext()');safe=wait(w,lambda s:s['view']['recovery']['phase']=='safe');out['samples']['safe']=safe
 assert abs(safe['origin']-before['origin'])<20
 assert safe['title']==before['title'];assert safe['view']['position']==before['view']['position'];assert safe['view']['target']==before['view']['target']
 assert safe['view']['pixelRatio']==1 and not safe['view']['shadows'] and not safe['view']['signLock']
 subprocess.run(['screencapture','-x','-o','-l'+str(w),'/tmp/fork-browser/safari-recovery-safe.png'],check=True)
 js(w,'__loss.loseContext()');out['samples']['repeat']=wait(w,lambda s:s['view']['recovery']['phase']=='manual')
 time.sleep(1);stopped=get(w);assert stopped['view']['recovery']['losses']==2 and stopped['glLost'];out['samples']['repeatStopped']=stopped
 osa('tell application "Safari" to close window id '+str(w));created.remove(w)
 w=openqa('timeout');before=get(w)
 js(w,'window.__loss=document.querySelector("#map canvas").getContext("webgl2").getExtension("WEBGL_lose_context");__loss.loseContext()')
 out['samples']['timeout']=wait(w,lambda s:s['view']['recovery']['phase']=='manual',15)
 assert abs(out['samples']['timeout']['origin']-before['origin'])<20
 assert '手動重新整理頁面' in js(w,'document.querySelector(".recovery-message").textContent')
 js(w,'__loss.restoreContext()');wait(w,lambda s:not s['view']['recovery']['contextLost']);assert get(w)['view']['recovery']['phase']=='manual'
 js(w,'document.querySelector(".recovery-message button").click()');out['samples']['lateRetry']=wait(w,lambda s:s['view']['recovery']['phase']=='safe')
 js(w,'__loss.loseContext()');wait(w,lambda s:s['view']['recovery']['phase']=='manual')
 js(w,'document.querySelector(".recovery-message button").click()')
 reloaded=wait(w,lambda s:s.get('view',{}).get('lowLoad',False) and s['origin']>before['origin']+20)
 assert reloaded['view']['pixelRatio']==1 and not reloaded['view']['shadows'];out['samples']['manualReload']=reloaded
 out['result']='pass';Path('/tmp/fork-browser/safari-recovery.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps(out,ensure_ascii=False))
finally:
 Path('/tmp/fork-browser/safari-recovery-progress.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
 for w in created:
  try:
   url=osa('tell application "Safari" to get URL of current tab of window id '+str(w))
   if url.startswith('http://127.0.0.1:4205/?recovery-qa='):osa('tell application "Safari" to close current tab of window id '+str(w))
  except Exception:pass
