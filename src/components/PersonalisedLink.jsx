import React, { useState } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'

export default function PersonalisedLink({plan,c,lang}){
  const t=T[lang];const isEs=lang==='es'; const mc=getMC(plan.mode,c);
  const[name,setName]=useState('');const[copied,setCopied]=useState(false);
  const base=location.href.split('?')[0];
  const url=name.trim()?`${base}?code=${plan.id}&name=${encodeURIComponent(name.trim())}`:null;
  const copy=()=>{if(!url)return;navigator.clipboard?.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2500);};
  return(<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px'}}>
    <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'8px'}}>🔗 {t.personalisedLinkLbl}</div>
    <div style={{fontSize:'12px',color:c.M2,marginBottom:'10px',lineHeight:1.5}}>{{es:'Genera un link con el nombre del invitado ya relleno.',en:"Generate a link with the guest's name pre-filled.",pt:'Gera um link com o nome do convidado já preenchido.',fr:"Génère un lien avec le nom de l'invité pré-rempli.",de:'Erstelle einen Link mit dem Namen des Gastes vorausgefüllt.',it:"Genera un link con il nome dell'invitato già compilato."}[lang]||"Generate a link with the guest's name pre-filled."}</div>
    <div style={{display:'flex',gap:'8px'}}>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.guestNamePh} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
      <button onClick={copy} disabled={!name.trim()} style={{padding:'9px 14px',background:name.trim()?`${mc}20`:'transparent',border:`1px solid ${name.trim()?mc+'50':c.BD}`,borderRadius:'8px',color:name.trim()?mc:c.M,cursor:name.trim()?'pointer':'not-allowed',fontSize:'12px',fontWeight:'600',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{copied?(t.copiedLbl):(t.copyLbl)}</button>
    </div>
    {url&&<div style={{marginTop:'8px',fontSize:'11px',color:c.M2,wordBreak:'break-all',padding:'6px 10px',background:c.CARD,borderRadius:'6px',lineHeight:1.4}}>{url}</div>}
  </div>);
}

// ─── PLAN PREVIEW ─────────────────────────────────────
