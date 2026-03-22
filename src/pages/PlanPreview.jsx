import React from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { daysUntil, fmtDate, fmtShort } from '../lib/utils.js'
import { Btn, Card, Lbl, ModeBadge, Back } from '../components/ui.jsx'
import { ls } from '../lib/storage.js'

export default function PlanPreview({plan,onRespond,onBack,c,lang}){
  const t=T[lang];const mc=getMC(plan.mode,c);
  const budget=(plan.stops||[]).reduce((s,p)=>s+(parseFloat(p.cost)||0),0);
  const prev=ls.get('q_myresp_'+plan.id,null);
  const hasPrev=!!prev;
  const AVCOL={yes:'#22c55e',maybe:'#f59e0b',no:'#ef4444'};
  const AVICON={yes:'✅',maybe:'🤔',no:'❌'};
  return(<div style={{padding:'0',maxWidth:'420px',margin:'0 auto'}}>
    <div style={{background:`${mc}15`,borderBottom:`1px solid ${mc}30`,padding:'32px 24px 24px',textAlign:'center'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>{plan.mode==='intimate'?'💘':plan.mode==='professional'?'💼':'🎉'}</div>
      <ModeBadge mode={plan.mode||'social'} lang={plan.lang||lang} c={c}/>
      <h1 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:c.T,margin:'12px 0 6px',lineHeight:1.1}}>{plan.name}</h1>
      <div style={{fontSize:'14px',color:c.M2}}>{t.previewBy} <span style={{color:c.T,fontWeight:'600'}}>{plan.organizer}</span></div>
    </div>
    <div style={{padding:'24px'}}>
      {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}><div style={{fontSize:'18px'}}>📌</div><div><div style={{fontSize:'11px',color:mc,fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'2px'}}>{t.confirmedDate}</div><div style={{fontSize:'14px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}</div></div></div>}
      {plan.desc&&<p style={{fontSize:'14px',color:c.T,lineHeight:1.7,marginBottom:'16px',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px'}}>{plan.desc}</p>}
      {plan.surpriseMode&&!plan.confirmedDate&&<div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'14px',marginBottom:'16px',textAlign:'center'}}><div style={{fontSize:'28px',marginBottom:'6px'}}>🎭</div><div style={{fontSize:'14px',color:mc,fontWeight:'600',marginBottom:'4px'}}>{t.surpriseReveal}</div><div style={{fontSize:'12px',color:c.M2}}>{t.surpriseSub}</div></div>}
      {plan.dates?.length>0&&<div style={{marginBottom:'16px'}}>
        <Lbl c={c}>📅 {t.previewDates}</Lbl>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
          {plan.dates.slice(0,4).map(d=><span key={d} style={{fontSize:'12px',padding:'5px 12px',borderRadius:'20px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`,fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(d,lang)}</span>)}
          {plan.dates.length>4&&<span style={{fontSize:'12px',padding:'5px 12px',borderRadius:'20px',background:c.CARD2,color:c.M2}}>+{plan.dates.length-4}</span>}
        </div>
      </div>}
      {plan.dressCode&&<div style={{background:`${mc}0D`,border:`1px solid ${mc}25`,borderRadius:'10px',padding:'12px 14px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}><span style={{fontSize:'18px'}}>👗</span><div><div style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{t.dcLbl.replace('👗 ','')}</div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{t.dressCodes.find(d=>d.k===plan.dressCode)?.l||plan.dressCode}</div>{plan.dressNote&&<div style={{fontSize:'12px',color:c.M2,fontStyle:'italic'}}>"{plan.dressNote}"</div>}</div></div>}
      {budget>0&&<div style={{background:`${mc}0D`,border:`1px solid ${mc}25`,borderRadius:'10px',padding:'12px 14px',marginBottom:'16px',display:'flex',justifyContent:'space-between'}}><span style={{fontSize:'13px',color:c.M2}}>{t.previewBudget}</span><span style={{color:mc,fontWeight:'700'}}>{budget.toFixed(0)}€/{t.personLbl}</span></div>}
      {hasPrev&&prev&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
        <div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'10px'}}>✓ {t.prevRespLbl}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:prev.comment?'8px':'0'}}>
          {(plan.dates||[]).map(d=>{const v=prev.avail?.[d];if(!v||v==='no')return null;const col2=AVCOL[v]||c.M;return(<span key={d} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:`${col2}20`,color:col2,border:`1px solid ${col2}30`,fontWeight:'600',textTransform:'capitalize'}}>{AVICON[v]} {fmtShort(d,lang)}</span>);})}
        </div>
        {prev.comment&&<div style={{fontSize:'12px',color:c.M2,fontStyle:'italic',marginTop:'4px'}}>"{prev.comment}"</div>}
      </div>}
      <button onClick={onRespond} style={{width:'100%',padding:'16px',borderRadius:'14px',border:'none',background:mc,color:'#0A0A0A',fontSize:'16px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginBottom:'10px'}}>{hasPrev?t.editAvail:t.previewJoin}</button>
      <button onClick={onBack} style={{width:'100%',padding:'12px',borderRadius:'14px',border:`1px solid ${c.BD}`,background:'transparent',color:c.M2,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>{t.back}</button>
      <div style={{textAlign:'center',padding:'20px 0',fontSize:'12px',color:c.M}}>
        <span style={{fontFamily:"'Syne',serif",fontWeight:'800'}}>queda<span style={{color:c.A}}>.</span></span> — {t.landingFooter||'Group plans, zero chaos.'}
      </div>
    </div>
  </div>);
}

// ─── RESPOND ─────────────────────────────────────────
