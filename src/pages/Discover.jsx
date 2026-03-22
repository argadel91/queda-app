import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { loadPublicPlans } from '../lib/supabase.js'
import { daysUntil, fmtDate } from '../lib/utils.js'
import { Btn, Card, Lbl, Back, ModeBadge } from '../components/ui.jsx'

const haversine=(lat1,lon1,lat2,lon2)=>{const R=6371;const dLat=(lat2-lat1)*Math.PI/180;const dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};

export default function Discover({onBack,onJoin,c,lang,profile}){
  const t=T[lang];
  const[plans,setPlans]=useState([]);const[ldg,setL]=useState(true);
  const[fc,setFC]=useState('');const[modeF,setModeF]=useState('all');
  useEffect(()=>{(async()=>{setL(true);setPlans(await loadPublicPlans());setL(false);})();},[]);
  const userAge=profile?.birthdate?Math.floor((Date.now()-new Date(profile.birthdate).getTime())/31557600000):null;
  const filtered=plans.filter(p=>{
    const matchText=!fc||p.city?.toLowerCase().includes(fc.toLowerCase())||p.name?.toLowerCase().includes(fc.toLowerCase());
    const matchMode=modeF==='all'||p.mode===modeF;
    if(!matchText||!matchMode)return false;
    // Apply plan's public filters
    const f=p.pubFilter;
    if(!f)return true;
    if(f.gender&&f.gender!=='any'&&profile?.gender&&profile.gender!==f.gender)return false;
    if(f.ageMin&&userAge!=null&&userAge<parseInt(f.ageMin))return false;
    if(f.ageMax&&userAge!=null&&userAge>parseInt(f.ageMax))return false;
    if(f.radius&&profile?.lat&&profile?.lon&&p.cityLat&&p.cityLon){
      const dist=haversine(profile.lat,profile.lon,p.cityLat,p.cityLon);
      if(dist>parseInt(f.radius))return false;
    }
    return true;
  });
  const modes=[{k:'all',l:t.allLbl},{k:'social',l:'👥 Social'},{k:'intimate',l:'💘 Íntimo'},{k:'professional',l:'💼 Pro'}];
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'4px'}}>{t.discoverT}</h2>
    <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.discoverS}</p>
    {(!profile?.gender||!profile?.birthdate||!profile?.city)&&<div style={{background:`${c.A}10`,border:`1px solid ${c.A}30`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:c.A}}>{t.completeProfileDiscover||'Complete your profile to see plans tailored to you'}</div>}
    <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap'}}>
      {modes.map(m=>{const mc2=m.k==='all'?c.A:getMC(m.k,c);return(<button key={m.k} onClick={()=>setModeF(m.k)} style={{padding:'6px 12px',borderRadius:'20px',border:`1px solid ${modeF===m.k?mc2+'60':c.BD}`,background:modeF===m.k?`${mc2}15`:c.CARD,color:modeF===m.k?mc2:c.M2,fontSize:'12px',fontWeight:modeF===m.k?'700':'400',cursor:'pointer',fontFamily:'inherit'}}>{m.l}</button>);})}
    </div>
    <input value={fc} onChange={e=>setFC(e.target.value)} placeholder={t.discoverSearch} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'16px'}}/>
    {ldg&&<div style={{textAlign:'center',color:c.M,padding:'48px'}}>...</div>}
    {!ldg&&filtered.length===0&&<Card c={c} style={{textAlign:'center',padding:'32px'}}><div style={{fontSize:'36px',marginBottom:'10px'}}>🔍</div><div style={{color:c.M2,fontSize:'14px'}}>{t.noPublic}</div></Card>}
    {!ldg&&filtered.map(p=><Card key={p.id} c={c} style={{cursor:'pointer'}} onClick={()=>onJoin(p.id)}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
        <div><div style={{fontSize:'16px',color:c.T,fontWeight:'600',marginBottom:'3px'}}>{p.name}</div><div style={{fontSize:'12px',color:c.M2}}>@ {p.organizer}{p.city?` · ${p.city}`:''}</div></div>
        <ModeBadge mode={p.mode||'social'} lang={lang} c={c}/>
      </div>
      {p.desc&&<div style={{fontSize:'13px',color:c.M2,marginBottom:'8px',lineHeight:1.5}}>{p.desc.slice(0,100)}{p.desc.length>100?'...':''}</div>}
      <div style={{display:'flex',justifyContent:'flex-end'}}><span style={{fontSize:'12px',color:c.A,fontWeight:'700'}}>{t.joinPlan}</span></div>
    </Card>)}
  </div>);
}

// ─── CREATE ───────────────────────────────────────────
