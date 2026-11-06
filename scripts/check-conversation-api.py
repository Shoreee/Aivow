"""Local-only integration for auto/dead demos, EM controls and grounded recap references."""
import json,urllib.request,urllib.error,http.cookiejar,time,uuid,pathlib,sys
BASE='http://127.0.0.1:5173'
class Client:
 def __init__(self):self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,path,body=None,status=200):
  req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json'})
  try:r=self.http.open(req,timeout=45);code=r.status;data=json.load(r)
  except urllib.error.HTTPError as e:code=e.code;data=json.load(e)
  assert code==status,(path,code,data)
  return data
 def world(self):return self.call('/api/world')
 def op(self,op,**b):return self.call('/api/world',{'op':op,**b})
 def dream(self,op,**b):return self.call('/api/dreams',{'op':op,**b})
def register(c):
 c.call('/api/auth',{'op':'register','email':'conversation-'+uuid.uuid4().hex+'@demo.test','password':'test-fixture-2026'});assert c.world()['me']['guideVersion']==0
 c.op('guideSeen');assert c.world()['me']['guideVersion']==1
 c.op('profile',name='Test River',settings={'language':'en','behavior':{'destinations':['park'],'autopilot':True}})
def thread(w,peer):return next((t for t in w['threads'] if peer in (t['a'],t['b'])),None)
def await_reply(c,peer,expect_error=False):
 for _ in range(35):
  w=c.world();t=thread(w,peer)
  if t and not t.get('pending'):
   if expect_error:assert t.get('autoError'),t
   else:assert t['messages'][-1]['source']=='auto',t
   return t
  time.sleep(1)
 raise AssertionError('No auto reply or error within deadline')
a,b=Client(),Client();register(a);register(b);w=a.world();me=w['me']['id'];auto=next(p for p in w['people'] if p.get('sampleMode')=='auto');dead=next(p for p in w['people'] if p.get('sampleMode')=='dead');assert auto['name']=='Mina (auto)' and dead['name']=='Mina (dead)'
a.call('/api/world',{'op':'chat','target':auto['id'],'text':'Hi'},400);assert not thread(a.world(),auto['id'])
a.op('chat',target=dead['id'],text='A message for when you return.');assert not thread(a.world(),dead['id']).get('pending')
d=a.dream('create',peer=dead['id']);a.dream('invite',id=d['id'],previewIds=[]);a.call('/api/dreams',{'op':'sampleJoin','id':d['id']},400)
a.op('open',value=True);w=a.op('lifeStep');assert w['me']['life']['path'] and w['me']['life']['arriveAt']>w['me']['life']['startedAt'];a.op('open',value=False);assert a.world()['me']['life']['pausedAt'];a.op('open',value=True);assert not a.world()['me']['life'].get('pausedAt')
b.op('join',code=w['code']);bid=b.world()['me']['id'];a.op('friend',target=bid);request=next(i for i in b.world()['introductions'] if i['from']==me and i['target']==me);b.op('intro',id=request['id'],accept=True);assert next(p for p in a.world()['people'] if p['id']==bid)['connection']=='朋友';b.op('chat',target=me,text='I prefer asking before changing a plan.');aw=a.world();source=thread(aw,bid)['messages'][-1];a.dream('understanding',peer=bid,sourceIds=[source['id']],text=source['text']);assert next(r for r in a.world()['relationships'] if r['peer']==bid)['understood']
print('PASS: stable auto/dead roles, missing-key error, offline no-reply/no-shared-join, actual Life motion pause/resume, two real accounts and human understanding',flush=True)
if '--real-ai' in sys.argv:
 fake='sk-'+('invalid-fixture-'*3);a.call('/api/ai-settings',{'op':'save','key':fake});a.op('chat',target=auto['id'],text='Hello.');t=await_reply(a,auto['id'],True);assert t['autoError']['code']=='AI_AUTH_FAILED'
 values=dict(l.split('=',1) for l in pathlib.Path('.dev.vars').read_text().splitlines() if '=' in l);a.call('/api/ai-settings',{'op':'save','key':values['DEEPSEEK_API_KEY']})
 a.op('chat',target=auto['id'],text='Would you choose coffee or a quiet walk after work?');t=await_reply(a,auto['id']);reply=t['messages'][-1];assert reply['text'] and reply['source']=='auto'
 a.call('/api/dreams',{'op':'understanding','peer':auto['id'],'sourceIds':[reply['id']]},400)
 created=a.dream('create',peer=auto['id'],place='cafe',mode='accelerated');did=created['id'];controlled=a.dream('command',id=did,peer=auto['id'],text='Suggest two specific questions about a quiet weekend. Do not start a scene.');did=controlled['id'];d=next(d for d in a.world()['dreams'] if d['id']==did);assert len(d['controls'])==2 and d['controls'][-1].get('topics') and d['status']!='running'
 a.dream('run',id=did)
 for _ in range(30):
  d=next(d for d in a.world()['dreams'] if d['id']==did)
  if len(d['events'])>=2 or d['status'] in ('error','waiting'):break
  time.sleep(1)
 assert d['events'] and not d.get('error'),d
 a.dream('pause',id=did);a.dream('end',id=did);a.dream('recap',id=did);d=next(d for d in a.world()['dreams'] if d['id']==did);assert d['recap']['text'] and len(d['recap']['highlights'])<=3 and len(d['recap']['topics'])<=2
 e=d['events'][0];a.op('chat',target=auto['id'],text='In this imagined scene, would you prefer a quieter place?',sceneRef={'dreamId':did,'eventId':e['id']});t=await_reply(a,auto['id']);ref=next(m['sceneRef'] for m in reversed(t['messages']) if m['author']==me and m.get('sceneRef'));assert ref['quote']==e['text'] and 'snapshot' not in ref and 'controls' not in ref
 a.call('/api/ai-settings',{'op':'remove'})
 print('PASS: invalid-key inline failure, real persona reply, auto dialogue cannot increase rapport, natural EM control and topics, scene generation, summary + emoji highlights + topics, selected scene reference in human chat',flush=True)
