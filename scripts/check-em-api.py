"""Local D1/HTTP regression for exact owner utterances and terminal rounds. No real API key."""
import argparse,http.client,http.cookiejar,ipaddress,json,pathlib,ssl,urllib.request,urllib.error,urllib.parse,uuid
parser=argparse.ArgumentParser();parser.add_argument('--base-url',default='http://127.0.0.1:5173');parser.add_argument('--proxy-resolve');parser.add_argument('--receipt');args=parser.parse_args();base=args.base_url.rstrip('/')
if args.proxy_resolve:ipaddress.ip_address(args.proxy_resolve)
class Connection(http.client.HTTPSConnection):
 def _tunnel(self):
  host=self._tunnel_host
  if host==urllib.parse.urlparse(base).hostname:self._tunnel_host=args.proxy_resolve
  try:super()._tunnel()
  finally:self._tunnel_host=host
class Handler(urllib.request.HTTPSHandler):
 def https_open(self,request):return self.do_open(Connection,request,context=ssl.create_default_context())
handlers=[urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())]
if args.proxy_resolve:handlers.append(Handler())
http=urllib.request.build_opener(*handlers)
def call(path,body=None,status=200):
 request=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','User-Agent':'Aivow-deployment-check/1.0','Origin':base})
 try:r=http.open(request,timeout=40);code=r.status;result=json.load(r)
 except urllib.error.HTTPError as e:code=e.code;result=json.load(e)
 assert code==status,(path,code,result)
 return result
def world():return call('/api/world')
user=call('/api/auth',{'op':'register','email':'em-control-'+uuid.uuid4().hex+'@demo.test','password':'disposable-local-fixture'})['user']
if args.receipt:pathlib.Path(args.receipt).write_text(json.dumps({'base_url':base,'user_ids':[user['id']],'world_ids':[world()['id']]},indent=2)+'\n')
call('/api/world',{'op':'profile','name':'EM fixture','settings':{'language':'zh','behavior':{'destinations':['park','bookshop','cafe','riverside']}}})
call('/api/world',{'op':'open','value':True})
call('/api/ai-settings',{'op':'save','key':'sk-invalid-local-fixture-'+uuid.uuid4().hex})
try:
 w=world();me=w['me']['id'];peer=next(p['id'] for p in w['people'] if p.get('sampleMode')=='auto')
 created=call('/api/dreams',{'op':'create','peer':peer,'mode':'realtime','place':'riverside','pace':'explore'})
 did=created['id'];assert next(d for d in created['dreams'] if d['id']==did)['place']==w['me']['place']
 response=call('/api/dreams',{'op':'command','id':did,'text':'请你立刻咕咕嘎嘎'})
 d=next(d for d in response['dreams'] if d['id']==did)
 assert any(e['actor']==me and e['source']=='em' and e['kind']=='speak' and e['text']=='咕咕嘎嘎' for e in d['events'])
 assert world()['me']['life']['control']['hold']
 call('/api/dreams',{'op':'pause','id':did})
 call('/api/dreams',{'op':'endAndRecap','id':did},401)
 d=next(d for d in world()['dreams'] if d['id']==did);assert d['status']=='ended' and not d['recapPending']
 version=d['version'];call('/api/dreams',{'op':'end','id':did});assert next(d for d in world()['dreams'] if d['id']==did)['version']==version
 call('/api/dreams',{'op':'run','id':did},400)
 call('/api/dreams',{'op':'command','id':did,'text':'请你立刻咕咕嘎嘎'},400)
 assert next(d for d in world()['dreams'] if d['id']==did)['status']=='ended'
 call('/api/world',{'op':'move','place':'bookshop'});assert world()['me']['place']=='bookshop' and not world()['me']['life'].get('control')
 print('PASS: actual HTTP/D1 exact 咕咕嘎嘎 EM utterance, Life hold, failed recap keeps ended, idempotent end, no resume/re-command after end and manual Life control recovery.')
finally:call('/api/ai-settings',{'op':'remove'})
