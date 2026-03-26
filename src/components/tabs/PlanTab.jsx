import React from 'react'
import { useResults, addMins, fmtMinsToH } from '../ResultsContext.jsx'
import { fmtShort, fmtTime, fmtDate } from '../../lib/utils.js'
import { updatePlan } from '../../lib/supabase.js'
import ClockPicker from '../ClockPicker.jsx'
import CalendarPicker from '../CalendarPicker.jsx'
import Countdown from '../Countdown.jsx'
const RouteMap = React.lazy(() => import('../RouteMap.jsx'))

const calcEnd=(start,dur)=>{if(!start||!dur)return'';const[h,m]=start.split(':').map(Number);const mins=dur==='30min'?30:dur==='1h'?60:dur==='1h30'?90:dur==='2h'?120:dur==='3h'?180:dur==='4h+'?240:0;if(!mins)return'';const d=new Date(2000,0,1,h,m+mins);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const durLabel=(d)=>({['30min']:'30 min',['1h']:'1h',['1h30']:'1h30',['2h']:'2h',['3h']:'3h',['4h+']:'4h+'}[d]||'');

export default function PlanTab(){
  const{planState,myVote,setMyVote,editState,setEditState,ui,helpers}=useResults();
  const{plan,setPlan,isOrg,authUser}=planState;
  const{openSection,setOpenSection,setTab}=ui;
  const{mc,c,t,lang,planDate,planTime,planPlace,stop:firstStop,tolerance,saveMyResp}=helpers;
  const allStops=(plan.stops||[]).filter(s=>(s.options||[]).some(o=>o.name));
  const canVote=!isOrg&&(!plan.requireLogin||authUser);

  const ynBtn=(val,setVal,yesLbl,noLbl)=>(
    <div style={{display:'flex',gap:'6px'}}>
      <button onClick={()=>setVal(true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===true?'#22c55e50':c.BD}`,background:val===true?'#22c55e18':'transparent',color:val===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===true?'700':'500'}}>{val===true?'✓ ':''}{yesLbl}</button>
      <button onClick={()=>setVal(false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===false?'#ef444450':c.BD}`,background:val===false?'#ef444418':'transparent',color:val===false?'#ef4444':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===false?'700':'500'}}>{val===false?'✗ ':''}{noLbl}</button>
    </div>
  );

  // Render a single stop card
  const renderStop=(s,idx)=>{
    const opt=s.options?.[0]||{};
    const isFirst=idx===0;
    const viewKey='_stopView_'+s.id;
    const viewOpen=openSection[viewKey]!==undefined?openSection[viewKey]:(idx===0);
    const sTime=s.startTime||planTime;
    const minCap=s.minAttendees||'';const maxCap=s.maxCapacity||'';
    const sTolerance=parseInt(s.tolerance)||0;

    return<div key={s.id} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:viewOpen?'12px':0}}>
        <div style={{width:'30px',height:'30px',borderRadius:'50%',background:`${mc}20`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:mc,flexShrink:0}}>{idx+1}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'15px',color:c.T,fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.name||'—'}</div>
          <div style={{display:'flex',gap:'6px',fontSize:'11px',color:c.M2,marginTop:'2px',flexWrap:'wrap'}}>
            {planDate&&<span style={{textTransform:'capitalize'}}>📅 {fmtShort(planDate,lang)}</span>}
            {sTime?<span>🕐 {fmtTime(sTime)}{s.duration?` — ${calcEnd(sTime,s.duration)} (${durLabel(s.duration)})`:''}</span>
            :(!isFirst&&<span style={{color:'#f59e0b',fontSize:'10px'}}>⚠️ {t.noStartTimeHint||'Set duration on previous stop'}</span>)}
          </div>
        </div>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          <button onClick={()=>setOpenSection(p=>({...p,[viewKey]:!p[viewKey]}))} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>{viewOpen?'▾':t.seeDetails||'Ver'}</button>
          {isOrg&&<button aria-label="Edit stop" onClick={()=>setEditState('mode','stop_'+s.id)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px'}}>✏️</button>}
        </div>
      </div>

      {/* Expanded */}
      {viewOpen&&<div className="fade-in">
        {/* Place info */}
        {opt.name&&<div style={{background:isFirst?(myVote.placeOk===true?'#22c55e10':myVote.placeOk===false?'#ef444410':c.CARD2):c.CARD2,border:`1px solid ${isFirst?(myVote.placeOk===true?'#22c55e40':myVote.placeOk===false?'#ef444440':c.BD):c.BD}`,borderRadius:'10px',padding:'12px',marginBottom:'8px'}}>
          {opt.photo&&<img src={opt.photo} alt={opt.name||'Venue'} style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}}/>}
          <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{opt.name||'—'}</div>
          {opt.address&&<div style={{fontSize:'12px',color:c.M2,marginTop:'2px'}}>📍 {opt.address}</div>}
          {opt.rating&&<div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>⭐ {opt.rating}{opt.priceLevel?' · '+'€'.repeat(opt.priceLevel):''}</div>}
          <div style={{fontSize:'11px',color:c.M,marginTop:'6px'}}>{minCap?`👥 min: ${minCap}`:(t.noMinCap||'No min capacity')}{' · '}{maxCap?`max: ${maxCap}`:(t.noMaxCap||'No max capacity')}</div>
          {opt.googleMapsURI&&<a href={opt.googleMapsURI} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:'6px',fontSize:'11px',color:mc,textDecoration:'none'}}>Google Maps ↗</a>}
          {s.notes&&<div style={{fontSize:'11px',color:c.M2,marginTop:'6px',fontStyle:'italic'}}>{s.notes}</div>}

          {/* Place voting — only on first stop */}
          {isFirst&&canVote&&<div style={{marginTop:'8px'}}>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.placeOkQ}</div>
            {ynBtn(myVote.placeOk,v=>{setMyVote('placeOk',v);if(!v){setMyVote('dateOk',null);setMyVote('timeOk',null);setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_placeNoPopup:true,_onTime:undefined}));}else{setOpenSection(p=>({...p,_placeNoPopup:undefined}));}},t.yesLbl||'Sí','No')}
          </div>}
          {isFirst&&myVote.placeOk===false&&openSection._placeNoPopup&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#ef444408',border:'1px solid #ef444420',borderRadius:'8px'}}>
            <div style={{fontSize:'12px',color:'#ef4444',fontWeight:'600',marginBottom:'6px'}}>{t.placeNoMsg}</div>
            <input value={myVote.placeComment} onChange={e=>setMyVote('placeComment',e.target.value.slice(0,200))} maxLength={200} placeholder={t.commentPh} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:'6px'}}/>
            <button onClick={()=>{window.location.href='/create';}} style={{width:'100%',padding:'8px',background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>{t.createOwnPlan}</button>
          </div>}
        </div>}

        {/* Date + Time voting — only on first stop, if place=Yes */}
        {isFirst&&canVote&&myVote.placeOk===true&&<>
          <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
            {planDate&&<div style={{flex:1,background:myVote.dateOk===true?'#22c55e10':myVote.dateOk===false?'#ef444410':c.CARD2,border:`1px solid ${myVote.dateOk===true?'#22c55e40':myVote.dateOk===false?'#ef444440':c.BD}`,borderRadius:'10px',padding:'10px'}}>
              <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>📅 {t.dateOkQ}</div>
              <div style={{fontSize:'14px',color:c.T,fontWeight:'600',textTransform:'capitalize',marginBottom:'6px'}}>{fmtShort(planDate,lang)}</div>
              {ynBtn(myVote.dateOk,v=>{setMyVote('dateOk',v);if(!v){setMyVote('timeOk',null);setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
            </div>}
            {planTime&&<div style={{flex:1,background:myVote.dateOk!==true?c.CARD2:myVote.timeOk===true?'#22c55e10':myVote.timeOk===false?'#ef444410':c.CARD2,border:`1px solid ${myVote.dateOk!==true?c.BD:myVote.timeOk===true?'#22c55e40':myVote.timeOk===false?'#ef444440':c.BD}`,borderRadius:'10px',padding:'10px',opacity:myVote.dateOk===true?1:0.4}}>
              <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>🕐 {t.timeOkQ}</div>
              <div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{fmtTime(planTime)}</div>
              {myVote.dateOk===true&&ynBtn(myVote.timeOk,v=>{setMyVote('timeOk',v);if(!v){setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
            </div>}
          </div>

          {/* Alt dates */}
          {myVote.dateOk===false&&<div style={{background:'#ef444408',border:'1px solid #ef444420',borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
            <div style={{fontSize:'12px',color:'#ef4444',fontWeight:'600',marginBottom:'6px'}}>{t.yourAvailDates} ({myVote.altDates.length}/3)</div>
            <CalendarPicker selected={myVote.altDates} onChange={d=>setMyVote('altDates',d.filter(x=>x!==planDate).slice(-3))} max={3} c={c} lang={lang}/>
            {myVote.altDates.length>0&&<div style={{marginTop:'8px'}}>
              <div style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>{t.availStartTime}</div>
              <div style={{fontSize:'11px',color:c.M2,marginBottom:'6px'}}>{t.availStartHint}</div>
              <div style={{marginBottom:'6px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.fromLbl}{myVote.timeFrom&&` → ${myVote.timeFrom}`}</div><ClockPicker value={myVote.timeFrom} onChange={v=>setMyVote('timeFrom',v)} c={c}/></div>
              <div><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.toLbl}{myVote.timeTo&&` → ${myVote.timeTo}`}</div><ClockPicker value={myVote.timeTo} onChange={v=>setMyVote('timeTo',v)} c={c}/></div>
            </div>}
          </div>}

          {/* Alt time range */}
          {myVote.dateOk===true&&myVote.timeOk===false&&<div style={{background:'#f59e0b08',border:'1px solid #f59e0b20',borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
            <div style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>{t.availStartTime}</div>
            <div style={{fontSize:'11px',color:c.M2,marginBottom:'8px'}}>{t.availStartHint}</div>
            <div style={{marginBottom:'8px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.fromLbl}{myVote.timeFrom&&` → ${myVote.timeFrom}`}</div><ClockPicker value={myVote.timeFrom} onChange={v=>setMyVote('timeFrom',v)} c={c}/></div>
            <div><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.toLbl}{myVote.timeTo&&` → ${myVote.timeTo}`}</div><ClockPicker value={myVote.timeTo} onChange={v=>setMyVote('timeTo',v)} c={c}/></div>
            {myVote.timeFrom&&myVote.timeTo&&planTime>=myVote.timeFrom&&planTime<=myVote.timeTo&&<div style={{marginTop:'6px',padding:'6px 10px',background:'#ef444410',border:'1px solid #ef444430',borderRadius:'8px',fontSize:'11px',color:'#ef4444',fontWeight:'600'}}>{t.rangeIncludesOriginal}</div>}
          </div>}

          {/* On time + Meeting point (only date=Yes AND time=Yes) */}
          {myVote.dateOk===true&&myVote.timeOk===true&&<>
            {sTolerance>0&&(()=>{
              const isLate=myVote.lateMin>0;const isOnTime=openSection._onTime===true;
              return<div style={{background:isOnTime?'#22c55e10':isLate?'#f59e0b10':c.CARD2,border:`1px solid ${isOnTime?'#22c55e40':isLate?'#f59e0b40':c.BD}`,borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>⏰ {t.onTimeQ} <span style={{fontSize:'10px',color:c.M2}}>({t.maxLateLbl}: {sTolerance} min = {addMins(planTime,sTolerance)})</span></div>
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={()=>{setMyVote('lateMin',0);setOpenSection(p=>({...p,_onTime:true}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isOnTime?'#22c55e50':c.BD}`,background:isOnTime?'#22c55e18':'transparent',color:isOnTime?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isOnTime?'700':'500'}}>{isOnTime?'✓ ':''}{t.yesLbl}</button>
                  <button onClick={()=>{setMyVote('lateMin',5);setOpenSection(p=>({...p,_onTime:false}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isLate?'#f59e0b50':c.BD}`,background:isLate?'#f59e0b18':'transparent',color:isLate?'#f59e0b':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isLate?'700':'500'}}>{isLate?'⏰ ':''}{t.noLbl||'No'}</button>
                </div>
                {isLate&&<div style={{marginTop:'8px'}}>
                  <div style={{fontSize:'11px',color:'#f59e0b',marginBottom:'4px'}}>{t.howLateQ}</div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'12px',color:c.M}}>+</span>
                    <input type="number" inputMode="numeric" min="1" max={sTolerance} value={myVote.lateMin} onChange={e=>setMyVote('lateMin',Math.min(Math.max(parseInt(e.target.value)||1,1),sTolerance))} style={{width:'70px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
                    <span style={{fontSize:'12px',color:c.M}}>min</span>
                    <span style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600'}}>{fmtMinsToH(myVote.lateMin)} = {addMins(planTime,myVote.lateMin)}</span>
                  </div>
                </div>}
              </div>;
            })()}
            {s.meetingPoint&&myVote.lateMin===0&&(()=>{
              const mpMins=parseInt(s.meetingMinsBefore)||0;
              const mpTime=mpMins>0&&planTime?addMins(planTime,-mpMins):planTime;
              return<div style={{background:myVote.meetOk===true?'#22c55e10':myVote.meetOk===false?'#f59e0b10':c.CARD2,border:`1px solid ${myVote.meetOk===true?'#22c55e40':myVote.meetOk===false?'#f59e0b40':c.BD}`,borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.meetingPointLbl2}</div>
                <div style={{fontSize:'13px',color:c.T,fontWeight:'600'}}>{s.meetingPoint}</div>
                {mpMins>0&&<div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{mpMins} min {t.beforeLbl} ({fmtMinsToH(-mpMins)})</div>}
                <div style={{marginTop:'8px'}}>{ynBtn(myVote.meetOk,v=>setMyVote('meetOk',v),t.meetYes,t.meetNo)}</div>
                {myVote.meetOk===true&&mpTime&&<div style={{marginTop:'8px',textAlign:'center',fontSize:'20px',fontWeight:'800',color:'#22c55e'}}>🕐 {mpTime}</div>}
                {myVote.meetOk===false&&planTime&&<div style={{marginTop:'8px',textAlign:'center',fontSize:'20px',fontWeight:'800',color:'#f59e0b'}}>🕐 {planTime}</div>}
              </div>;
            })()}
          </>}
        </>}

        {/* Organizer details — visible without editing */}
        {isOrg&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
          {/* Date + Time */}
          <div style={{display:'flex',gap:'8px',marginBottom:s.duration||s.tolerance||(isFirst&&s.meetingPoint)?'8px':0}}>
            {planDate&&<div style={{flex:1,textAlign:'center'}}><span style={{fontSize:'11px',color:c.M}}>📅</span> <span style={{fontSize:'13px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(planDate,lang)}</span></div>}
            {sTime&&<div style={{flex:1,textAlign:'center'}}><span style={{fontSize:'11px',color:c.M}}>🕐</span> <span style={{fontSize:'13px',color:c.T,fontWeight:'600'}}>{fmtTime(sTime)}{s.duration?` — ${calcEnd(sTime,s.duration)}`:''}</span></div>}
            {isFirst&&<button aria-label="Edit dates" onClick={()=>setEditState('mode','dates')} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',alignSelf:'center',flexShrink:0}}>✏️</button>}
          </div>
          {/* Duration + Tolerance */}
          {(s.duration||s.tolerance)&&<div style={{display:'flex',gap:'12px',fontSize:'11px',color:c.M2,marginBottom:(isFirst&&s.meetingPoint)?'8px':0}}>
            {s.duration&&<span>⏱️ {durLabel(s.duration)}</span>}
            {s.tolerance&&<span>⏰ {t.toleranceLbl||'Tolerance'}: {s.tolerance} min</span>}
          </div>}
          {/* Meeting point — only first stop */}
          {isFirst&&s.meetingPoint&&<div style={{fontSize:'11px',color:'#f59e0b',marginTop:'4px'}}>
            📍 {s.meetingPoint}
            {parseInt(s.meetingMinsBefore)>0&&<span> · {s.meetingMinsBefore} min {t.beforeLbl||'before'}{planTime?` (${addMins(planTime,-(parseInt(s.meetingMinsBefore)))})`:''}</span>}
          </div>}
        </div>}
      </div>}
    </div>;
  };

  return<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>
    {/* All stop cards */}
    {allStops.map((s,i)=>renderStop(s,i))}

    {/* Fallback if no stops with names */}
    {allStops.length===0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{width:'30px',height:'30px',borderRadius:'50%',background:`${mc}20`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:mc,flexShrink:0}}>1</div>
        <div style={{fontSize:'14px',color:c.M2,fontStyle:'italic'}}>{t.noDataYet||'—'}</div>
      </div>
    </div>}

    {/* Organizer logistics */}
    {isOrg&&<div style={{background:c.CARD,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
      <div style={{fontSize:'13px',color:mc,fontWeight:'700',marginBottom:'10px'}}>👤 {plan.organizer} ({t.organizer})</div>
      {/* Attending? */}
      <div style={{marginBottom:'8px'}}>
        <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.orgAttendingQ||'Are you going?'}</div>
        {ynBtn(myVote.attending!==false?true:false,v=>{setMyVote('attending',v);if(!v){setMyVote('meetOk',null);setMyVote('lateMin',0);}},t.yesLbl||'Yes',t.noLbl||'No')}
      </div>
      {/* Meeting point — only if attending and first stop has one */}
      {myVote.attending!==false&&firstStop.meetingPoint&&(()=>{
        const mpMins=parseInt(firstStop.meetingMinsBefore)||0;
        const mpTime=mpMins>0&&planTime?addMins(planTime,-mpMins):planTime;
        return<div style={{marginBottom:'8px'}}>
          <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>📍 {firstStop.meetingPoint}</div>
          {ynBtn(myVote.meetOk,v=>setMyVote('meetOk',v),t.meetYes,t.meetNo)}
          {myVote.meetOk===true&&mpTime&&<div style={{marginTop:'6px',textAlign:'center',fontSize:'16px',fontWeight:'800',color:'#22c55e'}}>🕐 {mpTime}</div>}
        </div>;
      })()}
      {/* Late arrival — only if attending and first stop has tolerance */}
      {myVote.attending!==false&&tolerance>0&&(()=>{
        const isLate=myVote.lateMin>0;
        return<div style={{marginBottom:'8px'}}>
          <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>⏰ {t.onTimeQ}</div>
          {ynBtn(!isLate,v=>{if(v)setMyVote('lateMin',0);else setMyVote('lateMin',5);},t.yesLbl,t.noLbl||'No')}
          {isLate&&<div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{fontSize:'11px',color:c.M}}>+</span>
            <input type="number" inputMode="numeric" min="1" max={tolerance} value={myVote.lateMin} onChange={e=>setMyVote('lateMin',Math.min(Math.max(parseInt(e.target.value)||1,1),tolerance))} style={{width:'60px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
            <span style={{fontSize:'11px',color:c.M}}>min</span>
            <span style={{fontSize:'11px',color:'#f59e0b',fontWeight:'600'}}>{addMins(planTime,myVote.lateMin)}</span>
          </div>}
        </div>;
      })()}
      {/* Save */}
      <button onClick={()=>saveMyResp(true)} disabled={myVote.saving} style={{width:'100%',padding:'10px',background:myVote.saved?'#22c55e':mc,border:'none',borderRadius:'10px',color:myVote.saved?'#fff':'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px',marginTop:'4px'}}>{myVote.saving?'...':(myVote.saved?(t.respSaved):(t.saveAvail))}</button>
      {myVote.saveConfirm&&<div className="fade-in" style={{marginTop:'6px',padding:'8px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'8px',textAlign:'center',fontSize:'12px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle}</div>}
    </div>}

    {/* Require login gate */}
    {!isOrg&&plan.requireLogin&&!authUser&&<div style={{marginTop:'10px',padding:'16px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',textAlign:'center'}}>
      <div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.loginRequiredTitle||'Login required'}</div>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'12px'}}>{t.loginRequiredMsg||'The organizer requires you to sign in before responding.'}</div>
      <button onClick={()=>{window.location.href='/auth';}} style={{padding:'10px 24px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.authSignInTab||'Sign in'}</button>
    </div>}

    {/* Save (invitee) */}
    {canVote&&<div style={{marginTop:'10px'}}>
      {!myVote.saved&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.yourName}</div><input value={myVote.name} onChange={e=>setMyVote('name',e.target.value.slice(0,50))} maxLength={50} placeholder={t.yourNamePh} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>}
      {(()=>{
        const dl=plan.deadline&&new Date(plan.deadline)<new Date();
        const pa=myVote.placeOk!==undefined&&myVote.placeOk!==null;
        const da=myVote.placeOk===false||myVote.dateOk!==null;
        const ta=myVote.placeOk===false||myVote.dateOk===false||(myVote.dateOk===true&&myVote.timeOk!==null);
        const ok=pa&&da&&ta&&myVote.name.trim();const can=ok&&!myVote.saving&&!dl;
        return<button onClick={saveMyResp} disabled={!can} style={{width:'100%',padding:'12px',background:myVote.saved?'#22c55e':can?mc:c.CARD2,border:can||myVote.saved?'none':`1px solid ${c.BD}`,borderRadius:'10px',color:myVote.saved?'#fff':can?'#0A0A0A':c.M,cursor:can?'pointer':'default',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',opacity:can||myVote.saved?1:0.5}}>{myVote.saving?'...':(myVote.saved?t.respSaved:(ok?t.saveAvail:(t.answerAllToSave)))}</button>;
      })()}
      {myVote.saveConfirm&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'10px',textAlign:'center',fontSize:'13px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle}</div>}
      {plan.deadline&&<Countdown deadline={plan.deadline} lang={lang} c={c} t={t} mc={mc} onExpired={()=>setTab('vote')}/>}
    </div>}

    {/* Add point */}
    {isOrg&&<button onClick={async()=>{
      const existing=(plan.stops||[]).filter(s2=>(s2.options||[]).some(o=>o.name));
      const last=existing[existing.length-1];
      let sugStart='';
      if(last){
        const prevTime=last.startTime||planTime;
        if(prevTime&&last.duration){
          sugStart=calcEnd(prevTime,last.duration);
        }
      }
      const ns={id:Date.now(),options:[{id:Date.now(),name:'',address:'',lat:null,lng:null,rating:null,photo:null,googleMapsURI:null,types:[]}],startTime:sugStart,duration:'',notes:'',maxCapacity:'',meetingPoint:'',minAttendees:'',tolerance:''};
      const up={...plan,stops:[...(plan.stops||[]),ns]};await updatePlan(up);setPlan(up);setEditState('mode','stop_'+ns.id);
    }} style={{width:'100%',padding:'12px',background:'none',border:`2px dashed ${c.BD}`,borderRadius:'12px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'600',marginBottom:'8px',marginTop:'8px'}}>+ {t.addNextPoint}</button>}

    {/* Map — show all stops as route */}
    {(()=>{
      const mapStops=[];
      allStops.forEach(s=>{
        const opt=s.options?.[0];
        if(!opt?.lat||!opt?.lng)return;
        if(s.meetingPoint){mapStops.push({lat:s.meetingPointLat||opt.lat,lng:s.meetingPointLng||opt.lng,name:'📍 '+s.meetingPoint,isMeetingPoint:true});}
        mapStops.push({...opt,lat:opt.lat,lng:opt.lng,name:opt.name,address:opt.address});
      });
      return mapStops.length>0?<RouteMap stops={mapStops} c={c}/>:null;
    })()}
  </></React.Suspense>;
}
