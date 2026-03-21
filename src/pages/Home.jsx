import React, { useState } from 'react'
import T from '../constants/translations.js'
import { Btn, Inp, Badge } from '../components/ui.jsx'

export default function Home({onCreate,onJoin,onProfile,onDiscover,c,lang}){
  const t=T[lang];const[code,setCode]=useState('');const[err,setErr]=useState('');const[ldg,setL]=useState(false);
  const go=async()=>{setErr('');setL(true);const ok=await onJoin(code.trim().toUpperCase());setL(false);if(!ok)setErr(t.notFound);};
  return(<div style={{padding:'52px 24px 40px',maxWidth:'420px',margin:'0 auto'}}>
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
    <div style={{marginTop:'48px',padding:'20px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px'}}>
      <div style={{fontSize:'11px',color:c.M,fontWeight:'700',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'14px'}}>{t.howWorks}</div>
      {[t.s1,t.s2,t.s3,t.s4].map((tx,i)=><div key={i} style={{display:'flex',gap:'12px',marginBottom:'10px',fontSize:'14px'}}><span style={{color:c.A,fontWeight:'700',minWidth:'18px'}}>{i+1}.</span><span style={{color:c.T}}>{tx}</span></div>)}
    </div>
  </div>);
}

// ─── PROFILE ─────────────────────────────────────────
