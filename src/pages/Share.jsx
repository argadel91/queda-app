import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { ls, getMyPlans } from '../lib/storage.js'
import { loadResps } from '../lib/supabase.js'
import { Btn, Card, Lbl, Back, ModeBadge, HR } from '../components/ui.jsx'
import PersonalisedLink from '../components/PersonalisedLink.jsx'
import SavedGroups from '../components/SavedGroups.jsx'

export default function Share({plan,onViewResults,onBack,c,lang}){
  const t=T[lang];const mc=getMC(plan.mode,c);
  const[copied,setCopied]=useState(false);const[count,setCount]=useState(null);
  const url=location.href.split('?')[0]+'?code='+plan.id;
  const copy=()=>{navigator.clipboard?.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const msgs={social:(n,u,id)=>lang==='es'?`¡Oye! Únete al plan *${n}*.\n\nMarca cuándo puedes:\n${u}\n\nCódigo: *${id}*`:`Hey! Join *${n}*.\n\nMark when you can:\n${u}\n\nCode: *${id}*`,intimate:(n,u)=>lang==='es'?`Te tengo una propuesta... 👀\n\n${u}`:`I have a proposal for you 👀\n\n${u}`,professional:(n,u,id)=>lang==='es'?`Le convoco a *${n}*.\n\nConfirme asistencia:\n${u}\n\nCódigo: *${id}*`:`You are invited to *${n}*.\n\nConfirm attendance:\n${u}\n\nCode: *${id}*`};
  const wa=()=>window.open('https://wa.me/?text='+encodeURIComponent((msgs[plan.mode||'social']||msgs.social)(plan.name,url,plan.id)),'_blank');
  useEffect(()=>{const f=async()=>{const rs=await loadResps(plan.id);setCount(rs.length);};f();const iv=setInterval(f,15000);return()=>clearInterval(iv);},[plan.id]);
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <div style={{textAlign:'center',marginBottom:'28px'}}>
      <div style={{fontSize:'52px',marginBottom:'14px'}}>{plan.mode==='intimate'?'💘':plan.mode==='professional'?'💼':'🎉'}</div>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:c.T,marginBottom:'8px'}}>{t.planCreated}</h2>
      <p style={{color:c.M2,fontSize:'14px'}}>{t.shareWith}</p>
    </div>
    <div style={{background:c.CARD,border:`1px solid ${mc}40`,borderRadius:'14px',padding:'20px',textAlign:'center',marginBottom:'14px'}}>
      <ModeBadge mode={plan.mode||'social'} lang={lang} c={c}/>
      <div style={{fontFamily:'monospace',fontSize:'58px',fontWeight:'900',color:mc,letterSpacing:'.2em',lineHeight:1,margin:'16px 0 12px'}}>{plan.id}</div>
      <div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{plan.name}</div>
      <div style={{fontSize:'13px',color:c.M2}}>@ {plan.organizer} · {plan.dates?.length||0} {lang==='es'?'fecha':'date'}{plan.dates?.length!==1?'s':''}</div>
    </div>
    {count!==null&&<div style={{textAlign:'center',padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',marginBottom:'14px',fontSize:'14px',color:c.T}}>
      {count===0?(lang==='es'?'Nadie ha respondido aún':'Nobody has responded yet'):<><span style={{color:mc,fontWeight:'800',fontSize:'20px'}}>{count}</span> {lang==='es'?`persona${count!==1?'s':''} ha${count!==1?'n':''} respondido`:`person${count!==1?'s':''} responded`}</>}
    </div>}
    <button onClick={wa} style={{width:'100%',padding:'15px',borderRadius:'12px',border:'none',background:'#25D366',color:'#fff',fontSize:'15px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginBottom:'10px'}}>{t.shareWa}</button>
    <Btn onClick={copy} full style={{marginBottom:'10px',padding:'14px'}} c={c}>{copied?t.copied:t.copyLink}</Btn>
    <HR c={c}/>
    <PersonalisedLink plan={plan} c={c} lang={lang}/>
    <HR c={c}/>
    <SavedGroups plan={plan} c={c} lang={lang}/>
    <div style={{height:'12px'}}/>
    <Btn onClick={onViewResults} v="secondary" full style={{padding:'14px'}} c={c}>{t.viewRes}</Btn>
  </div>);
}

// ─── PERSONALISED LINK ───────────────────────────────
