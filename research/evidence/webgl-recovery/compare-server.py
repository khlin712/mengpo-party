from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import urllib.parse
OLD=Path('/tmp/island-baseline/dist');NEW=Path('/tmp/island-webgl-recovery/dist')
probe='''<script>window.__contextProbe={lost:0,restored:0,events:[]};for(const n of ['webglcontextlost','webglcontextrestored'])document.addEventListener(n,e=>{const p=window.__contextProbe;p[n==='webglcontextlost'?'lost':'restored']++;const row={type:n,time:performance.now(),status:e.statusMessage||'',canvas:e.target.parentElement?.id};p.events.push(row);if(p.events.length>80)p.events.shift();setTimeout(()=>row.prevented=e.defaultPrevented,0);},true);</script>'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=urllib.parse.urlsplit(self.path).path;new=path.startswith('/new/');prefix='/new/' if new else '/old/';self.directory=str(NEW if new else OLD)
  if path==prefix:
   data=(Path(self.directory)/'index.html').read_text().replace('<head>','<head>'+probe,1).encode();self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data);return
  self.path='/'+self.path.removeprefix(prefix);super().do_GET()
ThreadingHTTPServer(('127.0.0.1',4207),Handler).serve_forever()
