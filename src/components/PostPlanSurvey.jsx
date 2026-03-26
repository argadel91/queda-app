import React, { useState } from 'react'
import T from '../constants/translations.js'
import { ls } from '../lib/storage.js'
import { daysUntil } from '../lib/utils.js'
import { Btn } from './ui.jsx'

export default function PostPlanSurvey({plan, c, lang, mc}){
  const t=T[lang];
  const key='q_survey_'+plan.id;
  const[done,setDone]=useState(!!ls.get(key,null));
  const[rating,setRating]=useState(0);
  const[repeat,setRepeat]=useState(null);
  const[feedback,setFeedback]=useState('');
  if(done)return null;
  if(!plan.confirmedDate||daysUntil(plan.confirmedDate)>-1)return null;
  const submit=()=>{ls.set(key,{rating,repeat,feedback,at:new Date().toISOString()});setDone(true);};
  return(<div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'16px',padding:'20px',marginBottom:'16px'}}>
    <div style={{fontSize:'13px',fontWeight:'700',color:mc,marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.07em'}}>📋 {t.howWasIt}</div>
    <div style={{fontSize:'14px',color:c.T,marginBottom:'14px'}}>{plan.name}</div>
    <div style={{marginBottom:'14px'}}>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{t.rateThePlan}</div>
      <div style={{display:'flex',gap:'6px'}}>
        {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} style={{fontSize:'22px',background:'none',border:'none',cursor:'pointer',opacity:n<=rating?1:0.3,transform:n<=rating?'scale(1.1)':'scale(1)',transition:'all .1s'}}>⭐</button>)}
      </div>
    </div>
    <div style={{marginBottom:'14px'}}>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{t.wouldRepeat}</div>
      <div style={{display:'flex',gap:'8px'}}>
        {[{v:true,l:t.yesLbl||'Yes'},{v:false,l:'No'},{v:'maybe',l:t.maybeLbl}].map(o=><button key={String(o.v)} onClick={()=>setRepeat(o.v)} style={{flex:1,padding:'8px',borderRadius:'10px',border:`1px solid ${repeat===o.v?mc+'60':c.BD}`,background:repeat===o.v?`${mc}20`:c.CARD,color:repeat===o.v?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:repeat===o.v?'700':'400'}}>{o.l}</button>)}
      </div>
    </div>
    <textarea value={feedback} onChange={e=>setFeedback(e.target.value.slice(0,500))} maxLength={500} placeholder={t.improveNext} rows={2} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',resize:'none',boxSizing:'border-box',marginBottom:'10px',lineHeight:1.5}}/>
    <Btn onClick={submit} disabled={!rating||repeat===null} full style={{background:mc,color:'#0A0A0A',padding:'12px'}} c={c}>{t.submitSurvey}</Btn>
    <button onClick={()=>setDone(true)} style={{display:'block',width:'100%',background:'none',border:'none',color:c.M,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',marginTop:'8px'}}>{t.skipSurvey}</button>
  </div>);
}

