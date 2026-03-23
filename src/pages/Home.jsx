import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { Btn, Inp, Badge } from '../components/ui.jsx'
import { getMyPlans } from '../lib/storage.js'
import { daysUntil, fmtShort } from '../lib/utils.js'
import { loadPlan } from '../lib/supabase.js'

export default function Home({onCreate,onJoin,onProfile,onDiscover,c,lang}){
  const t=T[lang];const[code,setCode]=useState('');const[err,setErr]=useState('');const[ldg,setL]=useState(false);
  const[nextPlan,setNextPlan]=useState(null);
  useEffect(()=>{
    const plans=getMyPlans();
    if(!plans.length)return;
    Promise.all(plans.slice(0,10).map(async p=>{
      const full=await loadPlan(p.id);
      if(!full)return null;
      const d=full.confirmedDate||full.dates?.[0];
      if(!d)return null;
      const du=daysUntil(d);
      if(du<0)return null;
      return{...p,date:d,du,full};
    })).then(results=>{
      const valid=results.filter(Boolean).sort((a,b)=>a.du-b.du);
      if(valid.length>0)setNextPlan(valid[0]);
    });
  },[]);
  const go=async()=>{setErr('');setL(true);const ok=await onJoin(code.trim().toUpperCase());setL(false);if(!ok)setErr(t.notFound);};
  return(<div style={{padding:'52px 24px 40px',maxWidth:'420px',margin:'0 auto'}}>
    {nextPlan&&<div onClick={()=>onProfile()} style={{background:c.CARD,border:`1px solid ${c.A}40`,borderRadius:'14px',padding:'14px 16px',marginBottom:'20px',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
      <div style={{fontSize:'24px'}}>{nextPlan.du===0?'🎉':nextPlan.du===1?'⏰':'📅'}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nextPlan.name}</div>
        <div style={{fontSize:'12px',color:c.M2,textTransform:'capitalize'}}>{fmtShort(nextPlan.date,lang)}</div>
      </div>
      <div style={{fontSize:'13px',color:c.A,fontWeight:'700',flexShrink:0}}>{nextPlan.du===0?t.todayLbl:nextPlan.du===1?t.tomorrowLbl:`${nextPlan.du}d`}</div>
    </div>}
    <div style={{marginBottom:'48px'}}>
      <Badge color={c.A}>QUEDA</Badge>
      <h1 style={{fontFamily:"'Syne',serif",fontSize:'48px',fontWeight:'800',color:c.T,margin:'20px 0 16px',lineHeight:1}}>{t.tagline.split(' ').slice(0,-1).join(' ')}<br/><span style={{color:c.A}}>{t.tagline.split(' ').slice(-1)[0]}</span></h1>
      <p style={{color:c.M2,fontSize:'15px',lineHeight:1.7}}>{t.sub}</p>
    </div>
    <Btn onClick={onCreate} full style={{padding:'16px',fontSize:'16px',marginBottom:'10px'}} c={c}>{t.create}</Btn>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
      <Btn onClick={onProfile} v="secondary" full style={{padding:'12px',fontSize:'14px'}} c={c}>{t.myPlans}</Btn>
      <Btn onClick={onDiscover} v="secondary" full style={{padding:'12px',fontSize:'14px'}} c={c}>{t.discover}</Btn>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}><div style={{flex:1,height:'1px',background:c.BD}}/><span style={{color:c.M,fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.08em'}}>{t.orJoin}</span><div style={{flex:1,height:'1px',background:c.BD}}/></div>
    <div style={{display:'flex',gap:'8px'}}>
      <Inp value={code} onChange={v=>setCode(v.toUpperCase())} onKey={e=>e.key==='Enter'&&code.length>=4&&go()} placeholder={t.codePh} mono c={c}/>
      <Btn onClick={go} v="secondary" disabled={code.length<4||ldg} style={{flexShrink:0}} c={c}>{ldg?'...':t.go}</Btn>
    </div>
    {err&&<div style={{color:'#ff6b6b',fontSize:'13px',marginTop:'10px'}}>{err}</div>}
  </div>);
}

// ─── PROFILE ─────────────────────────────────────────
