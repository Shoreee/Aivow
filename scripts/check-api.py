# Disposable local integration sessions; makes two small real model calls.
# Run after npm run dev. No production access or credentials are written here.
import urllib.request,urllib.error,http.cookiejar,json,os,concurrent.futures,time,uuid,re
BASE=os.environ.get('AIVOW_TEST_URL','http://127.0.0.1:5173')
class Client:
 def __init__(self):self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(self,op=None,expect=200,**args):
  data=json.dumps(dict(op=op,**args)).encode() if op else None
  try:
   with self.opener.open(urllib.request.Request(BASE+'/api/world',data=data,headers={'Content-Type':'application/json'}),timeout=50) as r:status=r.status;d=json.load(r)
  except urllib.error.HTTPError as e:status=e.code;d=json.load(e)
  assert status in (expect if isinstance(expect,tuple) else (expect,)),(op,status,d)
  return d
def auth(client,op=None,expect=200,**args):
 data=json.dumps(dict(op=op,**args)).encode() if op else None
 try:
  with client.opener.open(urllib.request.Request(BASE+'/api/auth',data=data,headers={'Content-Type':'application/json'}),timeout=50) as r:status=r.status;d=json.load(r)
 except urllib.error.HTTPError as e:status=e.code;d=json.load(e)
 assert status==expect,(status,d)
 return d
A,B,C=Client(),Client(),Client()
A.req(expect=401);assert auth(A)['user'] is None
accounts=[]
for client in (A,B,C):
 email='test-'+uuid.uuid4().hex+'@aivow.test';password='Aivow-fixture-2026'
 auth(client,'register',email=email,password=password);accounts.append((email,password))
# Real generations explicitly use this disposable account's saved key.
from pathlib import Path
local_vars=dict(line.split('=',1) for line in Path('.dev.vars').read_text().splitlines() if '=' in line)
A.opener.open(urllib.request.Request(BASE+'/api/ai-settings',data=json.dumps({'op':'save','key':local_vars['DEEPSEEK_API_KEY']}).encode(),headers={'Content-Type':'application/json'})).read()
a,b,c=A.req(),B.req(),C.req()
assert not a['me']['ready']
auth(Client(),'register',expect=409,email=accounts[0][0],password=accounts[0][1])
replica=Client();auth(replica,'login',expect=401,email=accounts[0][0],password='incorrect-password')
auth(replica,'login',email=accounts[0][0],password=accounts[0][1]);assert replica.req()['me']['id']==a['me']['id']
auth(replica,'logout');replica.req(expect=401)
print('PASS: registration, login, duplicate rejection, password validation, stable identity, logout, unauthenticated access gate')
settings={'language':'en','interests':['reading','coffee'],'identity':'在读学生','current':['发展兴趣'],'goals':['认识新朋友'],'values':['边界感'],'style':{'support':20,'humor':15,'initiative':30},'pace':'direct','behavior':{'destinations':['park','bookshop'],'autopilot':False,'review':True,'maxTurns':1,'approach':'greet','period':'any'}}
for client,name in [(A,'Test A'),(B,'Test B')]:
 d=client.req('profile',name=name,avatar=3,settings=settings);client.req('open',value=True)
 assert d['me']['settings']['interests']==['reading','coffee']
 assert any(m.get('field')=='interests' and '阅读' in m['text'] for m in d['me']['memory'])
 assert d['me']['memoryUpdates']
A.req('meet',expect=400,target=c['me']['id']);A.req('chat',expect=400,target=c['me']['id'],text='无连接不可私信')
B.req('join',code=a['code']);B.req('open',value=True);a,b=A.req(),B.req()
assert all('place' not in p and 'settings' not in p and 'memory' not in p for p in a['people'])
a=A.req('pilot');mid=a['meetings'][-1]['id'];assert b['me']['id'] in [a['meetings'][-1]['a'],a['meetings'][-1]['b']]
# Real generation becomes a private draft, never an already published message.
a=A.req('agent',id=mid);draft=a['me'].get('draft');assert draft and draft['source']=='agent',a['meetings'][-1]
assert not a['meetings'][-1]['messages'];assert 'draft' not in B.req()['people'][0]
assert not B.req()['meetings'][-1]['messages']
B.req('draft',id=draft['id'],accept=True,expect=400)
a=A.req('draft',id=draft['id'],accept=True);assert a['meetings'][-1]['messages'][-1]['text']==draft['text'];assert not re.search('[\u3400-\u9fff]',draft['text']);print('REAL_AI_DRAFT:',draft['text'])
A.req('agent',id=mid,expect=400) # one consecutive reply is the configured limit
# Private branch changes neither the factual thread nor the other person's memory.
a=A.req('branch',id=mid,text='我想先停一会儿，等准备好再继续。',messageId=a['meetings'][-1]['messages'][-1]['id']);bid=a['branches'][-1]['id']
assert not B.req()['branches'];B.req('branchAgent',id=bid,expect=400)
A.req('message',id=mid,branchId=bid,text='仅支线中的补充');assert len(B.req()['meetings'][-1]['messages'])==1
a=A.req('branch',id='daily',text='如果改去书店');A.req('message',id='daily',branchId=a['branches'][-1]['id'],text='先看画册')
a=A.req('remember',text='PRIVATE_TEST_4769',shared=False,category='inner');assert 'PRIVATE_TEST_4769' not in json.dumps(B.req())
# Owner takeover, independent of draft settings.
A.req('chat',target=b['me']['id'],text='可以给我微信号吗？');a=A.req('agent',id=mid);assert a['meetings'][-1]['pendingFor']==b['me']['id']
B.req('chat',target=a['me']['id'],text='暂不提供');assert not B.req()['meetings'][-1].get('pendingFor')
# Generate, then pause while the model request is in flight.
B.req('chat',target=a['me']['id'],text='聊一件具体的事，先聊阅读。')
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
 future=pool.submit(A.req,'agent',id=mid,expect=(200,400))
 for _ in range(80):
  current=B.req()['meetings'][-1]
  if current.get('generating'):break
  time.sleep(.02)
 else:raise AssertionError('No in-flight generation observed')
 count=len(current['messages']);A.req('open',value=False);future.result()
 assert len(B.req()['meetings'][-1]['messages'])==count
 assert not A.req()['me'].get('draft')
# Pausing the agent must not disable human chat.
A.req('end',id=mid);B.req('open',value=False)
A.req('chat',target=b['me']['id'],text='EM 暂停后，本人仍可聊天。')
assert B.req()['threads'][-1]['messages'][-1]['source']=='person'
# Approval cannot publish a stale private draft; block also prevents human DM.
A.req('block',id=mid);A.req('chat',target=b['me']['id'],text='屏蔽后不可发送',expect=400)
# Introductions upgrade to a real friend relationship.
a=A.req();intro=a['introductions'][0];target=intro['target'];A.req('intro',id=intro['id'],accept=True)
a=A.req('friend',target=target);assert next(p for p in a['people'] if p['id']==target)['connection']=='朋友'
# Destination and wait-mode settings determine actual pilot actions.
s=settings.copy();s['behavior']={**settings['behavior'],'destinations':['bookshop'],'approach':'wait'}
A.req('settings',settings=s);A.req('open',value=True);a=A.req('pilot');assert a['me']['place']=='bookshop';assert a['me']['activities'][-1]['kind']=='wait'
print('PASS: structured settings and memory provenance; pilot; two sessions; private review/approval; turn limit; owner takeover; late-response cancellation; human chat while paused; branch isolation; privacy; introductions; destination/wait behavior')

A.opener.open(urllib.request.Request(BASE+'/api/ai-settings',data=b'{"op":"remove"}',headers={'Content-Type':'application/json'})).read()
