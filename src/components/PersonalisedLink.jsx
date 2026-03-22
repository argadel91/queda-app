import React, { useState } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'

export default function PersonalisedLink({plan,c,lang}){
  const t=T[lang]; const mc=getMC(plan.mode,c);
  const[name,setName]=useState('');const[copied,setCopied]=useState(false);
  const base=location.href.split('?')[0];
  const url=name.trim()?`${base}?code=${plan.id}&name=${encodeURIComponent(name.trim())}`:null;
  const copy=()=>{if(!url)return;navigator.clipboard?.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2500);};
  return(<div style={{background:`${mc}08`,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
    <div style={{fontSize:'14px',color:mc,fontWeight:'700',marginBottom:'6px'}}>🎯 {t.personalisedLinkLbl}</div>
    <div style={{fontSize:'12px',color:c.M2,marginBottom:'12px',lineHeight:1.5}}>{t.personalisedLinkHint||'Type a name below to create a unique link for each person — their name will appear pre-filled when they open it.'}</div>
    <div style={{display:'flex',gap:'8px'}}>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.guestNamePh} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
      <button onClick={copy} disabled={!name.trim()} style={{padding:'9px 14px',background:name.trim()?`${mc}20`:'transparent',border:`1px solid ${name.trim()?mc+'50':c.BD}`,borderRadius:'8px',color:name.trim()?mc:c.M,cursor:name.trim()?'pointer':'not-allowed',fontSize:'12px',fontWeight:'600',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{copied?(t.copiedLbl):(t.copyLbl)}</button>
    </div>
    {url&&<div style={{marginTop:'8px',fontSize:'11px',color:c.M2,wordBreak:'break-all',padding:'6px 10px',background:c.CARD,borderRadius:'6px',lineHeight:1.4}}>{url}</div>}
  </div>);
}

// ─── PLAN PREVIEW ─────────────────────────────────────
