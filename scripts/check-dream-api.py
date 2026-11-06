"""Local-only Dream integration. Uses disposable accounts and, with --real-ai, the existing local test key without printing it."""
import json,urllib.request,urllib.error,http.cookiejar,time,uuid,sys,pathlib
BASE='http://127.0.0.1:5173'
class Client:
 def __init__(self):self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,path,body=None,expected=200):
  request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
  try:r=self.http.open(request,timeout=45);status=r.status;data=json.load(r)
  except urllib.error.HTTPError as e:status=e.code;data=json.load(e)
  assert status==expected,(path,status,data)
  return data
 def world(self):return self.call('/api/world')
 def op(self,op,**kw):return self.call('/api/world',{'op':op,**kw})
 def dream(self,op,**kw):return self.call('/api/dreams',{'op':op,**kw})
a,b=Client(),Client();suffix=uuid.uuid4().hex[:10]
for c,n in [(a,'A'),(b,'B')]:
 c.call('/api/auth',{'op':'register','email':f'dream-{n}-{suffix}@demo.test','password':'local-fixture-2026'})
 c.op('profile',name=n,avatar=0,settings={'language':'en','interests':['reading']})
w=a.world();b.op('join',code=w['code']);w=a.world();aid=w['me']['id'];bid=b.world()['me']['id']
a.op('remember',text='PRIVATE_ONLY_SENTINEL',shared=True,category='inner')
w=a.world();secret=next(m for m in w['me']['memory'] if m['text']=='PRIVATE_ONLY_SENTINEL')
assert 'PRIVATE_ONLY_SENTINEL' not in json.dumps(b.world())
created=a.dream('create',peer=bid,correction='UNSHARED_BRANCH_SENTINEL',mode='accelerated');did=created['id']
assert did not in [d['id'] for d in b.world()['dreams']]
missing=a.call('/api/dreams',{'op':'run','id':did},400);assert missing['code']=='AI_NOT_CONFIGURED'
a.call('/api/world',{'op':'agent','id':'missing'},400)
a.dream('disclosure',peer=bid,memoryIds=[secret['id']]);assert 'PRIVATE_ONLY_SENTINEL' in json.dumps(b.world())
a.dream('disclosure',peer=bid,memoryIds=[]);assert 'PRIVATE_ONLY_SENTINEL' not in json.dumps(b.world())
a.dream('invite',id=did,previewIds=[]);bw=b.world();invite=next(d for d in bw['dreams'] if d['id']==did);assert 'UNSHARED_BRANCH_SENTINEL' not in json.dumps(invite)
shared=b.dream('accept',id=did,accept=True);sid=shared['id'];sd=next(d for d in shared['dreams'] if d['id']==sid);assert sd['visibility']=='shared' and not sd['correction'] and sd['events']==[]
a.dream('message',id=sid,text='I sometimes need a quiet walk.')
b.dream('message',id=sid,text='I prefer asking before changing plans.')
events=next(d for d in a.world()['dreams'] if d['id']==sid)['events']
for c,peer,author in [(a,bid,bid),(b,aid,aid)]:
 e=next(e for e in events if e['actor']==author)
 c.dream('understanding',peer=peer,dreamId=sid,sourceIds=[e['id']],text=e['text'])
a.dream('stage',peer=bid);assert next(r for r in a.world()['relationships'] if r['peer']==bid)['stage']=='introduced'
b.dream('stage',peer=aid);assert next(r for r in a.world()['relationships'] if r['peer']==bid)['stage']=='exploring'
f=a.dream('fork',id=sid,correction='I would like some quiet.');fid=f['id'];assert fid not in [d['id'] for d in b.world()['dreams']]
a.dream('fork',id=sid,correction='I would like some quiet.');assert a.world()['preferenceSuggestions'];assert not any(m['text']=='I would like some quiet.' for m in a.world()['me']['memory'])
suggestion=a.world()['preferenceSuggestions'][0];a.dream('preference',suggestionId=suggestion['id'],accept=True);assert any(m['text']=='I would like some quiet.' for m in a.world()['me']['memory'])
b.dream('withdraw',id=sid)
assert len(next(d for d in a.world()['dreams'] if d['id']==sid)['participants'])==1
fake='sk-'+('invalid-test-fixture-'*2)
a.call('/api/ai-settings',{'op':'save','key':fake});status=a.call('/api/ai-settings');assert status['configured'] and fake not in json.dumps(status)
a.call('/api/ai-settings',{'op':'remove'});assert not a.call('/api/ai-settings')['configured']
print('PASS: account isolation, no env fallback, pair disclosure/revocation, private branch redaction, shared invitation, evidence, two-person stage approval, private forks, preference confirmation, withdrawal, masked key storage',flush=True)
if '--real-ai' in sys.argv:
 vars=dict(line.split('=',1) for line in pathlib.Path('.dev.vars').read_text().splitlines() if '=' in line)
 a.call('/api/ai-settings',{'op':'save','key':vars['DEEPSEEK_API_KEY']})
 assert a.call('/api/ai-settings',{'op':'test'})['tested']
 assert not b.call('/api/ai-settings')['configured']
 b.dream('rejoin',id=sid)
 a.dream('run',id=sid)

 for _ in range(12):
  time.sleep(2)
  a.world()
 shared_run=next(d for d in a.world()['dreams'] if d['id']==sid)
 assert any(e['source']=='em' and e['actor']==aid for e in shared_run['events'])
 assert any(e['source']=='em' and e['actor']==bid for e in shared_run['events'])
 a.dream('pause',id=sid)
 # Start a private run. No UI or requests are needed to make its first two steps happen.
 run=a.dream('create',peer=bid,mode='accelerated',place='park');rid=run['id'];a.dream('run',id=rid)

 for _ in range(12):
  time.sleep(2)
  a.world()
 d=next(d for d in a.world()['dreams'] if d['id']==rid)
 assert d['events'],d
 a.dream('pause',id=rid);count=len(next(d for d in a.world()['dreams'] if d['id']==rid)['events'])
 time.sleep(5)
 assert len(next(d for d in a.world()['dreams'] if d['id']==rid)['events'])==count
 # A second independent run is left completely unattended until its bounded completion.
 run=a.dream('create',peer=bid,mode='accelerated',place='bookshop');rid=run['id'];a.dream('run',id=rid)

 for index in range(75):
  time.sleep(2)
  d=next(d for d in a.world()['dreams'] if d['id']==rid)
  if d.get('recap') or d.get('error'):break
  if index%15==0:print('Background round:',d['status'],'events:',len(d['events']),flush=True)
 d=next(d for d in a.world()['dreams'] if d['id']==rid)
 assert d['status']=='ended',d
 if d['status']=='waiting':
  a.dream('end',id=rid);a.dream('recap',id=rid);d=next(d for d in a.world()['dreams'] if d['id']==rid)
 assert d.get('recap') and len(d['recap']['eventIds'])<=3,d
 assert len(d['events'])<=8
 assert next(r for r in a.world()['relationships'] if r['peer']==bid)['stage']=='exploring'
 print('PASS: real DeepSeek key test; Durable Object advances without browser requests; pause cancels late writes; unattended bounded run ends with up to three grounded recap moments; EM autoplay does not advance relationship stage',flush=True)
 a.call('/api/ai-settings',{'op':'remove'})
