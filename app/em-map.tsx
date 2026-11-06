'use client';
import {useLocale} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import type {Map as LibreMap,Marker as LibreMarker} from 'maplibre-gl';
import {LocateFixed,Minus,Plus,RefreshCw} from 'lucide-react';
import {LIFE_POINTS,lifePosition,type LifeMotion} from '../lib/life';
import {PLACES,type PlaceId} from '../lib/world';
const icons:Record<PlaceId,string>={park:'park',bookshop:'books',cafe:'coffee',riverside:'tree'};
type Props={life?:LifeMotion;compact?:boolean;focus?:PlaceId|null;place:PlaceId;avatar:number;open:boolean;other?:{avatar:number;name:string;place:PlaceId};onSelect:(id:PlaceId)=>void;onAvatar:()=>void};
export default function EMMap(props:Props){const {t,language}=useLocale();
 const container=useRef<HTMLDivElement>(null),map=useRef<LibreMap|null>(null),markers=useRef<LibreMarker[]>([]),ownMarker=useRef<LibreMarker|null>(null),latest=useRef({...props,language});latest.current={...props,language};
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(0);
 useEffect(()=>{
  let disposed=false;let timeout:ReturnType<typeof setTimeout>;
  setStatus('loading');
  import('maplibre-gl').then(lib=>{
   if(disposed||!container.current)return;lib.setWorkerUrl('/vendor/maplibre-worker.mjs');
   const m=new lib.Map({container:container.current,style:'/maps/openfreemap-bright.json',center:[121.475,31.227],zoom:14,pitch:0,attributionControl:false,dragRotate:false,touchPitch:false});map.current=m;
   m.addControl(new lib.AttributionControl({compact:false}),'bottom-left');
   const fit=()=>{const p=PLACES.find(p=>p.id===latest.current.place)!;m.jumpTo({center:[p.lng,p.lat],zoom:latest.current.compact?14:14.85,padding:latest.current.compact?{top:8,bottom:8,left:8,right:8}:{top:45,bottom:170,left:35,right:35}});};
   m.on('load',()=>{if(disposed)return;for(const layer of m.getStyle().layers||[])if(layer.type==='symbol'&&layer.layout?.['text-field'])m.setLayoutProperty(layer.id,'text-field',latest.current.language==='zh'?['coalesce',['get','name:zh'],['get','name:nonlatin'],['get','name']]:['coalesce',['get','name:en'],['get','name:latin'],['get','name']]);clearTimeout(timeout);setStatus('ready');setLoaded(n=>n+1);fit();});
   timeout=setTimeout(()=>{if(!disposed&&!m.isStyleLoaded())setStatus('error');},18000);
   m.on('error',()=>{if(!disposed&&!m.isStyleLoaded())setStatus('error');});
   new ResizeObserver(()=>{if(!disposed){m.resize();}}).observe(container.current);
  }).catch(()=>{if(!disposed)setStatus('error');});
  return()=>{disposed=true;clearTimeout(timeout);markers.current.forEach(m=>m.remove());markers.current=[];map.current?.remove();map.current=null;};
 },[attempt]);
 useEffect(()=>{
  if(!map.current||!loaded)return;
  let alive=true;import('maplibre-gl').then(lib=>{
   if(!alive||!map.current)return;markers.current.forEach(m=>m.remove());markers.current=[];
   for(const p of PLACES){const button=document.createElement('button');button.className='geo-place';button.setAttribute('aria-label',t('前往{0}',t(p.name)));const img=document.createElement('img');img.src=`/assets/city/${icons[p.id]}.svg`;img.alt='';const span=document.createElement('span');span.textContent=t(p.name);button.appendChild(img);button.appendChild(span);button.onclick=()=>latest.current.onSelect(p.id);markers.current.push(new lib.Marker({element:button,anchor:'bottom',offset:[0,20]}).setLngLat([p.lng,p.lat]).addTo(map.current));}
   if(!props.compact)for(const poi of LIFE_POINTS){const element=document.createElement('button');element.className=`map-poi poi-${poi.kind}`;element.title=language==='zh'?poi.name:poi.nameEn;const icon=document.createElement('img');icon.src=`/assets/city/${poi.kind==='cafe'?'coffee':poi.kind==='bookshop'?'books':poi.kind==='park'?'park':'art'}.svg`;icon.alt='';const label=document.createElement('span');label.textContent=language==='zh'?poi.name:poi.nameEn;element.appendChild(icon);element.appendChild(label);element.onclick=()=>{const popup=new lib.Popup({offset:12,closeButton:true}).setLngLat([poi.lng,poi.lat]);const body=document.createElement('div');body.className='poi-detail';const title=document.createElement('strong');title.textContent=language==='zh'?poi.name:poi.nameEn;body.appendChild(title);const link=document.createElement('a');link.href=`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lng}#map=18/${poi.lat}/${poi.lng}`;link.target='_blank';link.rel='noreferrer';link.textContent=language==='zh'?'OpenStreetMap 地点':'OpenStreetMap place';body.appendChild(link);popup.setDOMContent(body).addTo(map.current!);};markers.current.push(new lib.Marker({element,anchor:'bottom'}).setLngLat([poi.lng,poi.lat]).addTo(map.current));}
   const addAvatar=(variant:number,location:PlaceId,mine:boolean,name='EM')=>{const p=PLACES.find(p=>p.id===location)!;const button=document.createElement('button');button.className=`geo-avatar ${mine?'own-avatar':''} ${mine&&!props.open?'paused-avatar':''}`;button.setAttribute('aria-label',mine?t('查看 EM 动态'):`${name} EM`);const img=document.createElement('img');img.src=`/assets/avatars/person-${variant%6}.svg?v=2`;img.alt='';const label=document.createElement('b');label.textContent=mine?'EM':name;button.appendChild(img);button.appendChild(label);button.onclick=()=>latest.current.onAvatar();const marker=new lib.Marker({element:button,anchor:'bottom',offset:[mine?0:30,-15]}).setLngLat(mine&&latest.current.life?lifePosition(latest.current.life):[p.lng,p.lat]).addTo(map.current!);if(mine)ownMarker.current=marker;markers.current.push(marker);};
   addAvatar(props.avatar,props.place,true);if(props.other)addAvatar(props.other.avatar,props.other.place,false,props.other.name);
  });return()=>{alive=false;};
 },[loaded,props.compact,props.place,props.avatar,props.open,props.other?.avatar,props.other?.name,props.other?.place,language]);
 useEffect(()=>{if(!map.current||!loaded)return;const m=map.current;let frame=0;const source='em-walk';if(!m.getSource(source)){m.addSource(source,{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'em-walk-path',type:'line',source,paint:{'line-color':'#8f77cf','line-width':3,'line-opacity':.7,'line-dasharray':[2,2]}});}const route=m.getSource(source) as import('maplibre-gl').GeoJSONSource;route.setData({type:'FeatureCollection',features:props.life?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:props.life.path}}]:[]});const animate=()=>{if(props.life&&ownMarker.current)ownMarker.current.setLngLat(lifePosition(props.life));if(props.open&&props.life&&!props.life.pausedAt)frame=requestAnimationFrame(animate);};animate();return()=>cancelAnimationFrame(frame);},[loaded,props.open,props.life]);
 useEffect(()=>{const p=PLACES.find(p=>p.id===(props.focus||props.place));if(map.current&&loaded&&p)map.current.flyTo({center:[p.lng,p.lat],zoom:props.compact?14:15.65,duration:500});},[props.focus,props.place,loaded]);
 return <div className="geo-map-wrap"><div className="geo-map" ref={container} aria-label={t("上海 EM 活动地图")}/>{status==='loading'&&<div className="map-state">{t("加载地图…")}</div>}{status==='error'&&<div className="map-state map-error"><span>{t("地图暂时不可用")}</span><button onClick={()=>{setLoaded(0);setAttempt(x=>x+1);}}><RefreshCw size={16}/>{t("重试")}</button></div>}<div className="geo-controls"><button aria-label={t("放大地图")} onClick={()=>map.current?.zoomIn()}><Plus size={19}/></button><button aria-label={t("缩小地图")} onClick={()=>map.current?.zoomOut()}><Minus size={19}/></button><button aria-label={t("定位 EM")} onClick={()=>{const p=PLACES.find(p=>p.id===props.place)!;map.current?.flyTo({center:[p.lng,p.lat],zoom:15,duration:600});}}><LocateFixed size={19}/></button></div></div>;
}
