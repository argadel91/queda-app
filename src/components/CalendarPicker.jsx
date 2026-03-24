import React, { useState } from 'react'
import T from '../constants/translations.js'
import { addDays, toISO, dayStart, fmtShort, fmtMonthYear } from '../lib/utils.js'

export default function CalendarPicker({selected,onChange,c,lang,max:maxDates=3}){
  const t=T[lang];
  const now=dayStart();const max=addDays(now,365);
  const[vy,setVy]=useState(now.getFullYear());const[vm,setVm]=useState(now.getMonth());
  const[limitMsg,setLimitMsg]=useState(false);
  const days=new Date(vy,vm+1,0).getDate();const first=(new Date(vy,vm,1).getDay()+6)%7;
  const dl=({es:['L','M','X','J','V','S','D'],en:['M','T','W','T','F','S','S'],pt:['S','T','Q','Q','S','S','D'],fr:['L','M','M','J','V','S','D'],de:['M','D','M','D','F','S','S'],it:['L','M','M','G','V','S','D']})[lang]||['M','T','W','T','F','S','S'];
  const prev=()=>{const p=vm===0?new Date(vy-1,11,1):new Date(vy,vm-1,1);if(p<new Date(now.getFullYear(),now.getMonth(),1))return;if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1);};
  const next=()=>{const n=new Date(vy,vm+1,1);if(n<=max){if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1);}};
  const tog=iso=>{
    if(selected.includes(iso))return onChange(selected.filter(d=>d!==iso));
    if(selected.length>=maxDates){setLimitMsg(true);setTimeout(()=>setLimitMsg(false),2000);return;}
    onChange([...selected,iso]);
  };
  return(<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
      <button onClick={prev} title={t.prevMonth||'Previous month'} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'20px',padding:'2px 8px'}}>‹</button>
      <span style={{fontSize:'14px',fontWeight:'600',color:c.T,textTransform:'capitalize'}}>{fmtMonthYear(vy,vm,lang)}</span>
      <button onClick={next} title={t.nextMonth||'Next month'} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'20px',padding:'2px 8px'}}>›</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px',marginBottom:'4px'}}>
      {dl.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:'11px',color:c.M,fontWeight:'600',padding:'4px'}}>{d}</div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px'}}>
      {Array.from({length:first}).map((_,i)=><div key={'e'+i}/>)}
      {Array.from({length:days}).map((_,i)=>{const date=new Date(vy,vm,i+1);const iso=toISO(date);const dis=date<now||date>max;const sel=selected.includes(iso);return<div key={i} onClick={()=>!dis&&tog(iso)} style={{textAlign:'center',padding:'7px 2px',borderRadius:'8px',fontSize:'13px',cursor:dis?'default':'pointer',background:sel?c.A:dis?'transparent':c.CARD,color:sel?'#0A0A0A':dis?c.BD:c.T,fontWeight:sel?'700':'400',border:sel?'none':`1px solid ${dis?'transparent':c.BD}`}}>{i+1}</div>;})}
    </div>
    {limitMsg&&<div style={{marginTop:'8px',fontSize:'12px',color:'#f59e0b',textAlign:'center',fontWeight:'600'}}>{T[lang]?.maxDatesMsg?T[lang].maxDatesMsg(maxDates):`Max ${maxDates}`}</div>}
    {selected.length>0&&<div style={{marginTop:'10px',display:'flex',flexWrap:'wrap',gap:'4px'}}>
      {selected.sort().map(d=><span key={d} onClick={()=>tog(d)} style={{padding:'3px 8px',background:`${c.A}20`,color:c.A,border:`1px solid ${c.A}40`,borderRadius:'20px',cursor:'pointer',fontSize:'11px',fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(d,lang)} ×</span>)}
    </div>}
  </div>);
}

// ─── TIME PICKER ──────────────────────────────────────
