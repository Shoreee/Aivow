'use client';
import {useState} from 'react';
import type {View,PlaceId} from '../lib/world';
import ChatWorkspace from './chat-workspace';
import DreamSetup,{type SceneChoice} from './dream-setup';
import {dreamAction} from './dream-ui';
import type {SceneReference} from '../lib/conversation-types';
import {useLocale} from './i18n';
export default function LifeDream({world,place,onBack,onRefresh,onSettings,onChat}:{world:View;place:PlaceId;onBack:()=>void;onRefresh:()=>Promise<void>;onSettings:()=>void;onChat:(peer:string,reference:SceneReference,text:string)=>void}){
 const {t}=useLocale(),[active,setActive]=useState<{id:string;peer:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function start(choice:SceneChoice){setBusy(true);setError('');let created:{id:string;peer:string}|null=null;try{const result=await dreamAction('create',{...choice,activity:choice.place==='bookshop'?'browse':'walk'});created={id:result.id,peer:choice.peer};await onRefresh();setActive(created);await dreamAction('run',{id:result.id});await onRefresh();}catch(e){setError(e instanceof Error?e.message:'Unable to start Dream.');}finally{setBusy(false);}}
 return <section className={`life-dream-page ${active?'has-scene':''}`}>
  {active?<ChatWorkspace key={active.id} world={world} peer={active.peer} request={active} surface="life" onBack={onBack} onNewScene={()=>{setActive(null);setError('');}} onQuote={(reference,text)=>onChat(active.peer,reference,text)} onDetail={()=>{}} onRefresh={onRefresh} onSettings={onSettings}/>:<DreamSetup world={world} initialPlace={place} onStart={start} busy={busy} onCancel={onBack}/>}
  {error&&<div className="life-dream-error workspace-error" role="alert"><p>{t(error)}</p><button onClick={onSettings}>{t('Open Settings')}</button><button onClick={()=>setError('')}>{t('关闭')}</button></div>}
 </section>;
}
