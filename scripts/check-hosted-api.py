"""Online smoke check using disposable accounts; never copies local user data."""
import argparse, http.client, http.cookiejar, ipaddress, json, pathlib, secrets, ssl, time, urllib.error, urllib.parse, urllib.request, uuid

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',required=True)
parser.add_argument('--receipt',required=True,help='Ignored local file with exact test IDs for cleanup')
parser.add_argument('--proxy-resolve',help='Optional independently verified IP for proxy CONNECT; preserves hostname and TLS verification')
args=parser.parse_args()
BASE=args.base_url.rstrip('/')
assert urllib.parse.urlparse(BASE).scheme=='https','Use the published HTTPS origin'
receipt={'base_url':BASE,'user_ids':[],'world_ids':[]}
if args.proxy_resolve:ipaddress.ip_address(args.proxy_resolve)
class ResolvedConnection(http.client.HTTPSConnection):
 def _tunnel(self):
  original=self._tunnel_host
  if original==urllib.parse.urlparse(BASE).hostname:self._tunnel_host=args.proxy_resolve
  try:super()._tunnel()
  finally:self._tunnel_host=original
class ResolvedHTTPSHandler(urllib.request.HTTPSHandler):
 def https_open(self,req):return self.do_open(ResolvedConnection,req,context=ssl.create_default_context())
def remember():
 pathlib.Path(args.receipt).write_text(json.dumps(receipt,indent=2)+'\n')
class Client:
 def __init__(self):
  self.jar=http.cookiejar.CookieJar()
  handlers=[urllib.request.HTTPCookieProcessor(self.jar)]
  if args.proxy_resolve:handlers.append(ResolvedHTTPSHandler())
  self.http=urllib.request.build_opener(*handlers)
 def call(self,path,body=None,status=200,origin=BASE):
  req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','Origin':origin,'User-Agent':'Aivow-deployment-check/1.0'})
  try:
   r=self.http.open(req,timeout=50);code=r.status;data=json.load(r)
  except urllib.error.HTTPError as e:
   code=e.code
   try:data=json.load(e)
   except Exception:data={'error':'Non-JSON HTTP response'}
  assert code==status,(path,code,data)
  return data
 def world(self):return self.call('/api/world')
 def op(self,op,**body):return self.call('/api/world',{'op':op,**body})
 def dream(self,op,**body):return self.call('/api/dreams',{'op':op,**body})

def create(name):
 c=Client();email='hosted-check-'+uuid.uuid4().hex+'@demo.test';password=secrets.token_urlsafe(24)
 user=c.call('/api/auth',{'op':'register','email':email,'password':password})['user']
 receipt['user_ids'].append(user['id']);remember()
 w=c.world();receipt['world_ids'].append(w['id']);remember()
 assert w['me']['guideVersion']==0 and not w['me']['ready']
 cookie=next(k for k in c.jar if k.name=='aivow_session')
 assert cookie.secure and cookie.has_nonstandard_attr('HttpOnly') and cookie.get_nonstandard_attr('SameSite')=='Lax'
 c.call('/api/auth',{'op':'register','email':email,'password':password},409)
 c.call('/api/auth',{'op':'login','email':email,'password':password},403,origin='https://foreign-origin.invalid')
 c.call('/api/auth',{'op':'logout'})
 c.call('/api/world',status=401)
 c.call('/api/auth',{'op':'login','email':email,'password':password})
 assert c.world()['me']['id']==w['me']['id']
 c.op('profile',name=name,settings={'language':'en'})
 c.op('guideSeen');c.op('open',value=True)
 return c

remember()
a,b=create('Hosted River'),create('Hosted Sky')
try:
 w=a.world();me=w['me']['id'];auto=next(p for p in w['people'] if p.get('sampleMode')=='auto');dead=next(p for p in w['people'] if p.get('sampleMode')=='dead')
 assert not a.call('/api/ai-settings')['configured']
 a.call('/api/world',{'op':'chat','target':auto['id'],'text':'Hello'},400)
 assert not a.world()['threads']
 b.op('join',code=w['code']);bid=b.world()['me']['id']
 a.op('friend',target=bid)
 invitation=next(i for i in b.world()['introductions'] if i['from']==me and i['target']==me)
 b.op('intro',id=invitation['id'],accept=True)
 a.op('chat',target=bid,text='I prefer asking before changing plans.')
 thread=next(t for t in b.world()['threads'] if me in (t['a'],t['b']))
 assert thread['messages'][-1]['text']=='I prefer asking before changing plans.'
 b.dream('understanding',peer=me,sourceIds=[thread['messages'][-1]['id']],text=thread['messages'][-1]['text'])
 d=a.dream('create',peer=bid,mode='accelerated',place='cafe')['id']
 assert d not in [x['id'] for x in b.world()['dreams']]
 a.dream('invite',id=d,previewIds=[]);joined=b.dream('accept',id=d,accept=True)['id']
 assert joined in [x['id'] for x in a.world()['dreams'] if x['visibility']=='shared']
 b.dream('pause',id=joined)
 offline=a.dream('create',peer=dead['id'])['id'];a.dream('invite',id=offline,previewIds=[])
 a.call('/api/dreams',{'op':'sampleJoin','id':offline},400)
 print('PASS: HTTPS registration/login, secure session, origin checks, setup/guide, missing-key error, two-account friendship/chat, private/shared permissions and offline role.',flush=True)
 # A deliberately invalid fixture tests encryption and actual background jobs.
 # It is not a user's API key and cannot consume billable model tokens.
 fake='sk-invalid-hosted-fixture-'+uuid.uuid4().hex
 status=a.call('/api/ai-settings',{'op':'save','key':fake})
 assert status['configured'] and fake not in json.dumps(status)
 assert not b.call('/api/ai-settings')['configured']
 a.op('chat',target=auto['id'],text='Hello from a disposable deployment check.')
 for _ in range(35):
  thread=next(t for t in a.world()['threads'] if auto['id'] in (t['a'],t['b']))
  if not thread.get('pending'):break
  time.sleep(1)
 assert thread.get('autoError',{}).get('code')=='AI_AUTH_FAILED',thread.get('autoError')
 scene=a.dream('create',peer=auto['id'],mode='realtime')['id'];a.dream('run',id=scene)
 for _ in range(35):
  state=next(d for d in a.world()['dreams'] if d['id']==scene)
  if state.get('error'):break
  time.sleep(1)
 assert state.get('error',{}).get('code')=='AI_AUTH_FAILED' and not state['events']
 print('PASS: per-account encrypted key storage, both online Durable Object alarms, real provider auth error and no fake AI reply.',flush=True)
finally:
 for c in (a,b):
  try:c.call('/api/ai-settings',{'op':'remove'});c.call('/api/auth',{'op':'logout'})
  except Exception:pass
 remember()
