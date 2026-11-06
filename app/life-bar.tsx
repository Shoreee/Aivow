'use client';
import {Sparkles} from 'lucide-react';
import {Avatar} from './art';
import {useLocale} from './i18n';
export default function LifeBar({avatar,running,place,onDream}:{avatar:number;running:boolean;place:string;onDream:()=>void;}){const {t}=useLocale();return <div className={`life-control-bar ${running?'is-roaming':''}`}><span className="life-control-avatar"><Avatar variant={avatar} size={42}/></span><div className="life-control-copy"><strong>EM</strong><small>{running?<><span className="life-walking-dots"/>{t('Exploring {0}',place)}</>:t('At {0}',place)}</small></div><button className="life-dream-tool" onClick={onDream}><Sparkles size={17}/><span>Dream</span></button></div>;}
