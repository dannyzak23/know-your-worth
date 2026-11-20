# Rebuild after editing a module file in this folder: swaps the last three modules into taxpot.html and rewrites wrapped.html, all.js and the test file.
import sys
p='taxpot.html'; s=open(p,encoding='utf-8').read()
a=s.index("// ===================== MODULE: plain lists and the how-to guide"); b=s.rindex("\nrender();")
s=s[:a].rstrip('\n')+'\n\n'+''.join(open(f,encoding='utf-8').read().rstrip('\n')+"\n" for f in ('module_help.js','module_pricelist.js','module_hours.js'))+s[b:]
open(p,'w',encoding='utf-8').write(s)
w='<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Know Your Worth"><meta name="theme-color" content="#a3285f"><link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="icon-192.png"><style>body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'+s+'</body></html>'
open('wrapped.html','w',encoding='utf-8').write(w)
open('tester.html','w',encoding='utf-8').write(w.replace('content="Know Your Worth"','content="Know Your Worth test"').replace('href="icon-192.png"','href="../icon-192.png"'))  # goes to ../test/index.html; the /test/ address hides tax, money and marketing
js=s[s.index('<script>')+8:s.rindex('</script>')]; open('all.js','w',encoding='utf-8').write(js); js=js[:js.rindex('render();')]
src,dst=sys.argv[1],sys.argv[2]; old=open(src,encoding='utf-8').read()
extra=open(sys.argv[3],encoding='utf-8').read() if len(sys.argv)>3 else ''
open(dst,'w',encoding='utf-8').write(old[:old.index('\n',old.index("globalThis.window="))+1]+js+old[old.index("\nlet errs=0;"):]+extra)
print('saved',len(s))
