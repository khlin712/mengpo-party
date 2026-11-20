import subprocess,json,time
from pathlib import Path
def osa(s):
 r=subprocess.run(['osascript','-e',s],capture_output=True,text=True,timeout=20)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
out={}
for version in ['old','new']:
 url='http://127.0.0.1:4207/'+version+'/'
 w=int(osa('tell application "Safari"\nmake new document with properties {URL:'+json.dumps(url)+'}\nreturn id of front window\nend tell'))
 try:
  samples=[]
  for delay in [2,3,5]:
   time.sleep(delay);js='JSON.stringify({url:location.href,view:window.__islandView?.(),probe:window.__contextProbe,message:document.querySelector(".webgl-message")?.textContent})';samples.append(json.loads(osa('tell application "Safari" to do JavaScript '+json.dumps(js)+' in current tab of window id '+str(w))))
  out[version]=samples;print(version,json.dumps(samples,ensure_ascii=False),flush=True)
 finally:osa('tell application "Safari" to close current tab of window id '+str(w))
Path('/tmp/fork-browser/safari-compare.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
