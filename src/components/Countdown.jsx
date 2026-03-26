import React, { useState, useEffect } from 'react'
import { fmtDate } from '../lib/utils.js'

export default function Countdown({deadline,lang,c,t,mc,onExpired}){
  const[now,setNow]=useState(Date.now());
  useEffect(()=>{const iv=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(iv);},[]);
  const dl=new Date(deadline);
  const diff=dl-now;
  if(diff<=0)return<div style={{marginTop:'8px',padding:'12px',background:'#ef444410',border:'1px solid #ef444430',borderRadius:'10px',textAlign:'center'}}>
    <div style={{fontSize:'13px',color:'#ef4444',fontWeight:'600',marginBottom:'8px'}}>⏰ {t.deadlinePassed}</div>
    {onExpired&&<button onClick={onExpired} style={{padding:'8px 16px',background:mc,border:'none',borderRadius:'8px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.goToResults} →</button>}
  </div>;
  const d=Math.floor(diff/86400000);
  const h=Math.floor((diff%86400000)/3600000);
  const m=Math.floor((diff%3600000)/60000);
  const s=Math.floor((diff%60000)/1000);
  return<div style={{marginTop:'8px',padding:'10px',background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'10px',textAlign:'center',fontSize:'12px',color:'#f59e0b'}}>
    <div style={{fontWeight:'600',marginBottom:'2px'}}>⏰ {t.deadlineLbl}</div>
    <div>{fmtDate(deadline.split('T')[0],lang)}{deadline.includes('T')?' · '+deadline.split('T')[1]?.slice(0,5):''}</div>
    <div style={{fontSize:'13px',fontWeight:'700',fontFamily:'monospace',marginTop:'4px'}}>{d>0?`${d}d `:''}{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</div>
  </div>;
}
