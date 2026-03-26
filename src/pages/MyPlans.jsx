import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { ls, getMyPlans, removeMyPlan } from '../lib/storage.js'
import { loadPlan, deletePlan } from '../lib/supabase.js'
import { daysUntil, fmtShort, dayStart } from '../lib/utils.js'
import { Back } from '../components/ui.jsx'

export default function MyPlans({onBack,onOpen,c,lang}){
  const t=T[lang];
  const[plans,setPlans]=useState(getMyPlans());
  const[confirm,setConfirm]=useState(null);
  const[tab,setTab]=useState('upcoming');
  const[dates,setDates]=useState({});const[fullPlans,setFullPlans]=useState({});
  const now=dayStart();

  useEffect(()=>{plans.forEach(async p=>{if(!dates[p.id]){const full=await loadPlan(p.id);if(full){setDates(prev=>({...prev,[p.id]:full.confirmedDate||full.dates?.[0]||null}));setFullPlans(prev=>({...prev,[p.id]:full}));}}})},[plans.length]);

  const isPast=id=>{const d=dates[id];if(!d)return false;return new Date(d+'T23:59:59')<now;};
  const sortByDate=arr=>[...arr].sort((a,b)=>(dates[a.id]||'9999').localeCompare(dates[b.id]||'9999'));
  const upcoming=sortByDate(plans.filter(p=>!isPast(p.id)));
  const past=sortByDate(plans.filter(p=>isPast(p.id))).reverse();
  const shown=tab==='upcoming'?upcoming:past;
  const removeLocal=id=>{removeMyPlan(id);setPlans(getMyPlans());setConfirm(null);};
  const delFull=id=>{
    removeLocal(id);
    deletePlan(id).then(()=>{},e=>console.error('DB delete:',e));
  };

  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'20px'}}>{t.myPlansTitle||'My plans'}</h2>

    {confirm&&<div role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape')setConfirm(null);}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setConfirm(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px'}}>
        <div style={{fontSize:'32px',textAlign:'center',marginBottom:'12px'}}>{confirm.role==='organizer'?'🗑️':'👋'}</div>
        <div style={{fontSize:'16px',fontWeight:'700',color:c.T,textAlign:'center',marginBottom:'8px'}}>{confirm.role==='organizer'?(t.delConfirm||'Delete plan?'):(t.leaveConfirm||'Leave plan?')}</div>
        <div style={{fontSize:'13px',color:c.M2,textAlign:'center',marginBottom:'20px'}}>{confirm.role==='organizer'?(t.delWarn||'This cannot be undone'):(t.leaveWarn||'You will be removed')}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
          <button onClick={()=>confirm.role==='organizer'?delFull(confirm.id):removeLocal(confirm.id)} style={{flex:1,padding:'12px',background:'#ff4444',border:'none',borderRadius:'10px',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{confirm.role==='organizer'?(t.del||'Delete'):(t.leave||'Leave')}</button>
        </div>
      </div>
    </div>}

    <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
      {['upcoming','past'].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`1px solid ${tab===tb?c.A+'60':c.BD}`,background:tab===tb?`${c.A}15`:c.CARD,color:tab===tb?c.A:c.M2,fontSize:'13px',fontWeight:tab===tb?'700':'400',cursor:'pointer',fontFamily:'inherit'}}>
        {tb==='upcoming'?`${t.upcoming||'📅 Upcoming'} (${upcoming.length})`:`${t.pastTab||'✅ Past'} (${past.length})`}
      </button>)}
    </div>

    {shown.length===0?<div style={{textAlign:'center',padding:'32px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px'}}>
      <div style={{fontSize:'36px',marginBottom:'12px'}}>📋</div>
      <div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{tab==='upcoming'?(t.noPlansUp||'No upcoming plans'):(t.noPlansPast||'No past plans')}</div>
    </div>
    :shown.map(p=>{
      const mc=c.A;const d=dates[p.id];
      const du=d?daysUntil(d):null;const isToday=du===0;const isTmrw=du===1;const isSoon=du!=null&&du<=3&&du>=0;
      const fp=fullPlans[p.id];
      const loading=!fp;
      const title=fp?.name||p.name||null;
      const desc=fp?.desc||null;
      const truncate=(s,n)=>s&&s.length>n?s.slice(0,n)+'…':s;
      const place=fp?.place||fp?.stops?.[0]?.options?.[0]||null;
      return(<div key={p.id} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onOpen(p.id);}} onClick={()=>{ls.set('q_seen_'+p.id,Date.now());onOpen(p.id);}} style={{background:`linear-gradient(135deg,${mc}12,${mc}04)`,border:`2px solid ${mc}30`,borderRadius:'16px',padding:'16px',marginBottom:'12px',cursor:'pointer',opacity:isPast(p.id)?0.6:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'11px',color:mc,letterSpacing:'.08em',textTransform:'uppercase'}}>queda.</div>
          <button aria-label="Delete plan" onClick={e=>{e.stopPropagation();setConfirm(p);}} style={{background:'none',border:'1px solid #ff444430',borderRadius:'6px',color:'#ff6666',cursor:'pointer',fontSize:'13px',padding:'4px 8px'}}>×</button>
        </div>
        {loading?<div style={{marginBottom:'8px'}}>
          <div style={{height:'16px',background:c.CARD2,borderRadius:'6px',width:'70%',marginBottom:'6px',animation:'pulse 1.5s ease infinite'}}/>
          <div style={{height:'12px',background:c.CARD2,borderRadius:'6px',width:'50%',marginBottom:'6px',animation:'pulse 1.5s ease infinite'}}/>
          <div style={{height:'10px',background:c.CARD2,borderRadius:'6px',width:'30%',animation:'pulse 1.5s ease infinite'}}/>
        </div>
        :<>
        <div style={{marginBottom:'8px'}}>
          <div style={{fontSize:'16px',color:c.T,fontWeight:'700',marginBottom:'2px'}}>{truncate(title,60)||(t.untitled||'Sin título')}</div>
          <div style={{fontSize:'12px',color:c.M2,marginBottom:'4px'}}>{truncate(desc,120)||(t.noDesc||'Sin descripción')}</div>
          <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:c.M2}}>
            <span style={{color:mc,fontWeight:'700',letterSpacing:'.1em',fontFamily:'monospace'}}>{p.id}</span>
            <span>·</span>
            <span>{p.role==='organizer'?(t.organizer||'Organizer'):(t.guest||'Guest')}</span>
            {fp?.organizer&&<><span>·</span><span>{fp.organizer}</span></>}
          </div>
        </div>
        {d&&<div style={{marginBottom:'6px'}}>
          <span style={{fontSize:'13px',padding:'3px 12px',borderRadius:'10px',background:isSoon?`${mc}20`:c.CARD2,color:isSoon?mc:c.T,border:`1px solid ${isSoon?mc+'40':c.BD}`,fontWeight:'600',textTransform:'capitalize'}}>{isToday?(t.todayLbl||'Today'):isTmrw?(t.tomorrowLbl||'Tomorrow'):fmtShort(d,lang)}{fp?.startTimes?.[0]?' · '+fp.startTimes[0]:''}</span>
        </div>}
        {place?.name&&<div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:c.M2,marginTop:'4px'}}>
          {place.photo&&<img src={place.photo} alt={place.name||'Venue photo'} style={{width:'20px',height:'20px',borderRadius:'4px',objectFit:'cover'}}/>}
          <span>📍 {truncate(place.name,30)}</span>
          {place.rating&&<span style={{color:mc,fontSize:'10px'}}>⭐{place.rating}</span>}
        </div>}
        </>}
      </div>);
    })}
  </div>);
}
