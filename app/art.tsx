'use client';
import React from 'react';
export function Avatar({variant=0,size=76,mood='happy',className=''}:{variant?:number;size?:number;mood?:string;className?:string}){return <img src={`/assets/avatars/person-${Math.abs(variant)%6}.svg?v=2`} width={size} height={size} alt="EM avatar" className={`avatar-art ${className} mood-${mood}`} draggable={false}/>;}
