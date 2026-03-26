import React from 'react'
import { fmtDate, fmtTime } from '../../lib/utils.js'
import { Card, Lbl } from '../ui.jsx'

const addMins=(time,mins)=>{if(!time)return'';const[h,m]=time.split(':').map(Number);const total=h*60+m+mins;const nh=Math.floor(((total%1440)+1440)%1440/60);const nm=((total%1440)+1440)%1440%60;return`${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;};

export default function ResultTab({plan,rs,total,c,mc,lang,t,isOrg,confirmDate,conf}){
  const planDate=plan.date||plan.dates?.[0]||null;
  const planTime=plan.time||plan.startTimes?.[0]||null;
  const planPlace=plan.place||plan.stops?.[0]?.options?.[0]||null;
  const stop=plan.stops?.[0]||{};
  const attending=rs.filter(r=>{const v4=r.dateOk!==undefined;return v4?(r.dateOk&&r.timeOk):r.avail&&Object.values(r.avail).some(v=>v==='yes');});
  const meetPoint=rs.filter(r=>r.meetOk===true);
  const goingDirect=rs.filter(r=>r.meetOk===false);
  const lateOnes=rs.filter(r=>r.lateMin>0);

  return<div id="plan-result">
    {/* Header */}
    <div style={{textAlign:'center',marginBottom:'16px'}}>
      <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'18px',color:mc,letterSpacing:'.06em',marginBottom:'4px'}}>queda.</div>
      <h3 style={{fontFamily:"'Syne',serif",fontSize:'22px',fontWeight:'800',color:c.T,margin:'0 0 4px'}}>{plan.name||t.untitled}</h3>
      {plan.desc&&<div style={{fontSize:'13px',color:c.M2,lineHeight:1.4}}>{plan.desc}</div>}
    </div>

    {/* Plan details */}
    <Card c={c} style={{marginBottom:'12px'}}>
      <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'10px'}}>
        {planPlace?.photo&&<img src={planPlace.photo} alt={planPlace?.name||'Venue'} style={{width:'50px',height:'50px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
        <div>
          <div style={{fontSize:'15px',color:c.T,fontWeight:'700'}}>{planPlace?.name||'—'}</div>
          {planPlace?.address&&<div style={{fontSize:'11px',color:c.M2}}>📍 {planPlace.address}</div>}
        </div>
      </div>
      <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
        {planDate&&<div style={{flex:1,padding:'10px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px',textAlign:'center'}}>
          <div style={{fontSize:'11px',color:c.M}}>📅</div>
          <div style={{fontSize:'14px',color:c.T,fontWeight:'700',textTransform:'capitalize'}}>{fmtDate(planDate,lang)}</div>
        </div>}
        {planTime&&<div style={{flex:1,padding:'10px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px',textAlign:'center'}}>
          <div style={{fontSize:'11px',color:c.M}}>🕐</div>
          <div style={{fontSize:'14px',color:c.T,fontWeight:'700'}}>{fmtTime(planTime)}</div>
        </div>}
      </div>
      <div style={{fontSize:'12px',color:c.M2}}>
        <span>👤 {plan.organizer}</span> · <span style={{color:mc,fontWeight:'700',fontFamily:'monospace'}}>{plan.id}</span>
        {stop.maxCapacity&&<span> · 👥 max {stop.maxCapacity}</span>}
      </div>
    </Card>

    {/* Attendance */}
    <Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>👥 {t.attendanceLbl||'Attendance'} ({attending.length}/{total})</Lbl>
      {attending.length>0?<div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
        {attending.map((r,i)=><span key={i} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:'#22c55e18',color:'#22c55e',border:'1px solid #22c55e40'}}>{r.name}{r.lateMin>0?` (+${r.lateMin}min)`:''}</span>)}
      </div>:<div style={{fontSize:'12px',color:c.M2,fontStyle:'italic'}}>{t.noDataYet}</div>}
    </Card>

    {/* Meeting point */}
    {stop.meetingPoint&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>📍 {stop.meetingPoint}</Lbl>
      {meetPoint.length>0&&<div style={{marginBottom:'6px'}}>
        <div style={{fontSize:'11px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>{t.meetYes} ({meetPoint.length})</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
          {meetPoint.map((r,i)=><span key={i} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'14px',background:'#f59e0b15',color:'#f59e0b',border:'1px solid #f59e0b30'}}>{r.name}</span>)}
        </div>
      </div>}
      {goingDirect.length>0&&<div>
        <div style={{fontSize:'11px',color:'#22c55e',fontWeight:'600',marginBottom:'4px'}}>{t.meetNo} ({goingDirect.length})</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
          {goingDirect.map((r,i)=><span key={i} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'14px',background:'#22c55e15',color:'#22c55e',border:'1px solid #22c55e30'}}>{r.name}</span>)}
        </div>
      </div>}
    </Card>}

    {/* Late arrivals */}
    {lateOnes.length>0&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>⏰ {t.lateArrivals}</Lbl>
      {lateOnes.map((r,i)=><div key={i} style={{fontSize:'12px',color:c.M2,marginBottom:'2px'}}>{r.name}: +{r.lateMin} min ({addMins(planTime,r.lateMin)})</div>)}
    </Card>}

    {/* Screenshot */}
    <button onClick={async()=>{
      try{
        const el=document.getElementById('plan-result');if(!el)return;
        const{default:h2c}=await import('html2canvas');
        const canvas=await h2c(el,{backgroundColor:c.BG,scale:2});
        const link=document.createElement('a');link.download=`queda-${plan.id}.png`;link.href=canvas.toDataURL();link.click();
      }catch{alert('Screenshot failed');}
    }} style={{width:'100%',padding:'14px',background:mc,border:'none',borderRadius:'12px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>📸 {t.screenshotBtn||'Download as image'}</button>

    {/* Confirm (organizer) */}
    {isOrg&&!plan.confirmedDate&&planDate&&<button onClick={()=>confirmDate(planDate,planTime)} disabled={conf} style={{width:'100%',padding:'14px',background:'#22c55e',border:'none',borderRadius:'12px',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',marginTop:'8px',opacity:conf?0.5:1}}>📌 {conf?'...':(t.confirmPlanBtn||'Confirm this plan')}</button>}
    {plan.confirmedDate&&<div style={{marginTop:'8px',padding:'12px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'12px',textAlign:'center',fontSize:'14px',color:'#22c55e',fontWeight:'700'}}>📌 {t.planConfirmed||'Plan confirmed!'}</div>}
  </div>;
}
