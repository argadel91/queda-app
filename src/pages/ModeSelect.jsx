import React from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { Back } from '../components/ui.jsx'

export default function ModeSelect({onSelect,onBack,c,lang}){
  const t=T[lang];
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.modeQ}</h2>
    <p style={{color:c.M2,fontSize:'13px',marginBottom:'24px'}}>{t.modeSubQ}</p>
    {['social','intimate','professional'].map(mk=>{const m=t.modes[mk];const col=getMC(mk,c);return(
      <div key={mk} onClick={()=>onSelect(mk)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'20px',marginBottom:'12px',cursor:'pointer',position:'relative',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=col+'80';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=c.BD;}}>
        <div style={{position:'absolute',top:0,left:0,width:'4px',height:'100%',background:col}}/>
        <div style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'12px',background:`${col}20`,border:`1.5px solid ${col}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{m.label.split(' ')[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'17px',fontWeight:'700',color:c.T,marginBottom:'2px'}}>{m.label}</div>
            <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{m.vibe}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>{m.ex.map((ex,i)=><span key={i} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:c.CARD2,color:c.M2,border:`1px solid ${c.BD}`}}>{ex}</span>)}</div>
          </div>
          <span style={{color:c.M2,fontSize:'20px',flexShrink:0}}>→</span>
        </div>
      </div>);
    })}
  </div>);
}

// ─── HOME ─────────────────────────────────────────────
