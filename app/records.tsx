'use client';
import {useLocale} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUp,GitBranch,MoreHorizontal} from 'lucide-react';
import {Avatar} from './art';
import {DreamCard} from './dream-ui';
import type {View,Message} from '../lib/world';
export type RecordMessage=Message&{meetingId?:string};
export function recordsFor(world:View,target:string):RecordMessage[]{
 const isPair=(a:string,b:string)=>(a===world.me.id&&b===target)||(b===world.me.id&&a===target);
 const all=[...world.threads.filter(t=>isPair(t.a,t.b)).flatMap(t=>t.messages),...world.meetings.filter(m=>isPair(m.a,m.b)).flatMap(m=>m.messages.map(msg=>({...msg,meetingId:m.id})))];
 return Array.from(new Map(all.map(m=>[m.id,m])).values()).sort((a,b)=>a.time-b.time);
}
export const clock=(time:number)=>new Date(time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
export function MessageList({world,messages,onCorrect,busy=false,hypothetical=false,dreams=[],onDream,onUnderstand}:{world:View;messages:RecordMessage[];onCorrect?:(meetingId:string,messageId:string)=>void;busy?:boolean;hypothetical?:boolean;dreams?:View['dreams'];onDream?:(id:string)=>void;onUnderstand?:(msg:RecordMessage)=>void}){const {t,language}=useLocale();
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{ref.current?.scrollTo({top:ref.current.scrollHeight,behavior:'smooth'});},[messages.length]);
 return <div className="message-list" ref={ref}>{!messages.length&&!dreams.length&&<div className="record-empty">{t("暂无记录")}</div>}{[...messages.map(msg=>({type:'message' as const,time:msg.time,msg})),...dreams.map(dream=>({type:'dream' as const,time:dream.recap?.createdAt||dream.createdAt,dream}))].sort((a,b)=>a.time-b.time).map((item,i)=>{if(item.type==='dream')return <DreamCard key={item.dream.id} dream={item.dream} self={world.me.id} onOpen={onDream||(()=>{})}/>;const msg=item.msg;const mine=msg.author===world.me.id,p=mine?world.me:world.people.find(p=>p.id===msg.author);return <React.Fragment key={msg.id}>{(i===0||msg.time-(messages[messages.indexOf(msg)-1]?.time||0)>300000)&&<div className="message-time">{new Date(msg.time).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})} {clock(msg.time)}</div>}<article id={`message-${msg.id}`} className={`chat-message ${mine?'mine':''}`}><Avatar variant={p?.avatar||0} size={40}/><div className="chat-message-content"><span className="message-source">{msg.source==='person'?t("本人"):msg.source==='example'?t("示例 EM"):hypothetical?t("EM · 推演"):'EM'}</span><div className="chat-bubble">{msg.text}</div>{msg.source==='person'&&!mine&&onUnderstand&&<button className="correct-message" onClick={()=>onUnderstand(msg)}>{t("I learned this")}</button>}{!hypothetical&&mine&&msg.source!=='person'&&msg.meetingId&&onCorrect&&<button className="correct-message" onClick={()=>onCorrect(msg.meetingId!,msg.id)}><GitBranch size={12}/>{t("纠正")}</button>}</div></article></React.Fragment>;})}{busy&&<div className="reply-loading">{t("EM 正在回应…")}</div>}</div>;
}
export function Composer({busy,onSend,placeholder='发消息'}:{busy:boolean;onSend:(value:string)=>Promise<boolean>;placeholder?:string}){const {t,language}=useLocale();
 const [value,setValue]=useState('');return <form className="chat-composer" onSubmit={async e=>{e.preventDefault();if(value.trim()&&await onSend(value.trim()))setValue('');}}><input aria-label={t(placeholder)} placeholder={t(placeholder)} value={value} maxLength={800} onChange={e=>setValue(e.target.value)}/><button aria-label={t("发送")} disabled={busy||!value.trim()}><ArrowUp size={20}/></button></form>;
}
export function ChatHeader({name,avatar,onBack,onDetail,sample}:{name:string;avatar:number;onBack:()=>void;onDetail:()=>void;sample:boolean}){const {t,language}=useLocale();return <header className="chat-header"><button className="icon-button" aria-label={t("返回通讯录")} onClick={onBack}><ArrowLeft size={21}/></button><Avatar variant={avatar} size={40}/><div><strong>{name}</strong>{sample&&<small>{t("示例联系人")}</small>}</div><button className="icon-button" aria-label={t("联系人详情")} onClick={onDetail}><MoreHorizontal size={23}/></button></header>;}
