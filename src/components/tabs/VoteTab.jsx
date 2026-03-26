import React from 'react'
import { fmtShort } from '../../lib/utils.js'
import { Card } from '../ui.jsx'

export default function VoteTab({plan,rs,total,c,mc,lang,t,openSection,setOpenSection}){
  const isV4=r=>r.placeOk!==undefined;
  const planTime=plan.time||plan.startTimes?.[0]||null;
  const timeRanges=rs.filter(r=>r.availTimeFrom&&r.availTimeTo).map(r=>({name:r.name,from:r.availTimeFrom,to:r.availTimeTo}));
  const altDates=rs.filter(r=>r.availDates?.length>0);
  const altDateMap={};altDates.forEach(r=>(r.availDates||[]).forEach(d=>{if(!altDateMap[d])altDateMap[d]=[];altDateMap[d].push(r.name);}));
  const altDateKeys=Object.keys(altDateMap).sort();
  const going=rs.filter(r=>isV4(r)?(r.placeOk===true&&r.dateOk===true&&r.timeOk===true):(r.avail&&Object.values(r.avail).some(v=>v==='yes')));
  const notGoing=rs.filter(r=>isV4(r)?(r.placeOk===false||r.dateOk===false||r.timeOk===false||r.dateOk===null||r.timeOk===null):(!(r.avail&&Object.values(r.avail).some(v=>v==='yes'))));
  const allTimes=[...timeRanges];
  const minH=allTimes.length>0?Math.min(...allTimes.map(r=>parseInt(r.from))):0;
  const maxH=allTimes.length>0?Math.max(...allTimes.map(r=>parseInt(r.to)+1)):24;
  const barStart=Math.max(0,minH-1);const barEnd=Math.min(24,maxH+1);const barSpan=barEnd-barStart||1;
  const timeToX=t2=>{const[h,m]=(t2||'00:00').split(':').map(Number);return((h+m/60-barStart)/barSpan)*100;};

  if(total===0)return<Card c={c} style={{textAlign:'center',padding:'32px'}}>
    <div style={{fontSize:'36px',marginBottom:'10px'}}>🗳️</div>
    <div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{t.noDataYet}</div>
    <div style={{color:c.M2,fontSize:'13px'}}>{t.noDataHint}</div>
  </Card>;

  return<>
    {/* 1. Alternative dates */}
    {altDateKeys.length>0&&<div style={{marginBottom:'16px'}}>
      <div style={{fontSize:'14px',fontWeight:'700',color:mc,marginBottom:'8px'}}>📅 {t.altDatesLbl} ({altDateKeys.length})</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
        {altDateKeys.map(d=><div key={d} style={{padding:'8px 12px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px',textAlign:'center',minWidth:'70px'}}>
          <div style={{fontSize:'12px',fontWeight:'700',color:mc,textTransform:'capitalize'}}>{fmtShort(d,lang)}</div>
          <div style={{fontSize:'10px',color:c.M2,marginTop:'2px'}}>{altDateMap[d].join(', ')}</div>
        </div>)}
      </div>
    </div>}

    {/* 2. Availability bars */}
    {timeRanges.length>0&&<div style={{marginBottom:'16px'}}>
      <div style={{fontSize:'14px',fontWeight:'700',color:mc,marginBottom:'8px'}}>🕐 {t.availabilityLbl}</div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'9px',color:c.M,marginBottom:'4px',padding:'0 2px'}}>
        {Array.from({length:Math.min(barEnd-barStart+1,7)}).map((_,i)=>{const h=barStart+Math.round(i*(barEnd-barStart)/6);return<span key={i}>{String(h).padStart(2,'0')}:00</span>;})}
      </div>
      {timeRanges.map((r,i)=><div key={i} style={{marginBottom:'8px'}}>
        <div style={{fontSize:'11px',color:c.M2,marginBottom:'2px'}}>{r.name}</div>
        <div style={{position:'relative',height:'14px',background:c.CARD2,borderRadius:'7px',border:`1px solid ${c.BD}`}}>
          <div style={{position:'absolute',left:`${timeToX(r.from)}%`,width:`${Math.max(timeToX(r.to)-timeToX(r.from),2)}%`,height:'100%',background:'#22c55e40',borderRadius:'7px'}}/>
          <span style={{position:'absolute',left:`${timeToX(r.from)}%`,top:'-14px',fontSize:'8px',color:'#22c55e',fontWeight:'600',transform:'translateX(-50%)'}}>{r.from}</span>
          <span style={{position:'absolute',left:`${timeToX(r.to)}%`,top:'-14px',fontSize:'8px',color:'#22c55e',fontWeight:'600',transform:'translateX(-50%)'}}>{r.to}</span>
        </div>
      </div>)}
    </div>}

    {/* 3. Going / Not Going */}
    <div style={{fontSize:'14px',fontWeight:'700',color:'#22c55e',marginBottom:'8px'}}>✓ {t.goingLbl} ({going.length} {t.ofLbl} {total})</div>
    {going.map((r,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',background:'#22c55e08',border:'1px solid #22c55e30',borderRadius:'8px',padding:'6px 10px'}}>
      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>
      <span style={{flex:1,fontSize:'13px',color:c.T,fontWeight:'600'}}>{r.name}</span>
      {r.meetOk===true&&<span style={{fontSize:'9px',padding:'2px 6px',borderRadius:'8px',background:'#f59e0b15',color:'#f59e0b',border:'1px solid #f59e0b30',whiteSpace:'nowrap'}}>{t.meetYes}</span>}
      {r.meetOk===false&&<span style={{fontSize:'9px',padding:'2px 6px',borderRadius:'8px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`,whiteSpace:'nowrap'}}>{t.meetNo}</span>}
      {r.lateMin>0?<span style={{fontSize:'9px',padding:'2px 6px',borderRadius:'8px',background:'#f59e0b15',color:'#f59e0b',border:'1px solid #f59e0b30',whiteSpace:'nowrap'}}>+{r.lateMin}min</span>
      :<span style={{fontSize:'9px',padding:'2px 6px',borderRadius:'8px',background:'#22c55e15',color:'#22c55e',border:'1px solid #22c55e30',whiteSpace:'nowrap'}}>{t.onTimeLbl}</span>}
    </div>)}

    {notGoing.length>0&&<>
      <div style={{fontSize:'14px',fontWeight:'700',color:'#ef4444',marginTop:'12px',marginBottom:'8px'}}>✗ {t.notGoingLbl} ({notGoing.length})</div>
      {notGoing.map((r,i)=>{
        const expanded2=openSection['vn_'+i];
        return<div key={i} style={{marginBottom:'4px',background:'#ef444408',border:'1px solid #ef444430',borderRadius:'8px',overflow:'hidden'}}>
          <div role="button" tabIndex={0} aria-expanded={!!expanded2} onKeyDown={e=>{if(e.key==='Enter')setOpenSection(p=>({...p,['vn_'+i]:!p['vn_'+i]}));}} onClick={()=>setOpenSection(p=>({...p,['vn_'+i]:!p['vn_'+i]}))} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',cursor:'pointer'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ef4444',flexShrink:0}}/>
            <span style={{flex:1,fontSize:'13px',color:c.M2}}>{r.name}</span>
            <span style={{fontSize:'10px',color:c.M2}}>{r.placeOk===false?'📍✗ ':''}{r.dateOk===false?'📅✗ ':''}{r.timeOk===false?'🕐✗':''}</span>
            <span style={{fontSize:'11px',color:c.M2}}>{expanded2?'▾':'▸'}</span>
          </div>
          {expanded2&&<div style={{padding:'6px 12px 10px',borderTop:'1px solid #ef444420',fontSize:'12px',color:c.M2}}>
            {r.dateOk===false&&r.availDates?.length>0&&<div style={{marginBottom:'4px'}}>📅 {r.availDates.map(d=>fmtShort(d,lang)).join(', ')}</div>}
            {r.timeOk===false&&r.availTimeFrom&&<div style={{marginBottom:'4px'}}>🕐 {r.availTimeFrom} → {r.availTimeTo}</div>}
            {r.placeOk===false&&r.placeComment&&<div style={{marginBottom:'4px'}}>📍 "{r.placeComment}"</div>}
            {r.comment&&<div style={{fontStyle:'italic',padding:'4px 8px',background:c.CARD2,borderRadius:'6px'}}>"{r.comment}"</div>}
          </div>}
        </div>;
      })}
    </>}
  </>;
}
