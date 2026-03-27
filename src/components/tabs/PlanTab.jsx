import React, { useState } from 'react'
import { useResults, addMins, fmtMinsToH } from '../ResultsContext.jsx'
import { fmtShort, fmtTime, fmtDate, calcEnd } from '../../lib/utils.js'
import { updatePlan } from '../../lib/supabase.js'
import CalendarPicker from '../CalendarPicker.jsx'
import ClockPicker from '../ClockPicker.jsx'
import Countdown from '../Countdown.jsx'
import TransportCard from '../TransportCard.jsx'
import TimeRangeBar from '../TimeRangeBar.jsx'
const RouteMap = React.lazy(() => import('../RouteMap.jsx'))

const durLabel=(d)=>({['30min']:'30 min',['1h']:'1h',['1h30']:'1h30',['2h']:'2h',['3h']:'3h',['4h+']:'4h+'}[d]||'');

export default function PlanTab(){
  const{planState,myVote,setMyVote,editState,setEditState,ui,helpers}=useResults();
  const{plan,setPlan,isOrg,authUser}=planState;
  const{openSection,setOpenSection,setTab}=ui;
  const{mc,c,t,lang,planDate,planTime,planPlace,stop:firstStop,tolerance,saveMyResp}=helpers;
  const allStops=(plan.stops||[]).filter(s=>(s.options||[]).some(o=>o.name));
  const canVote=!isOrg&&(!plan.requireLogin||authUser);
  const sTolerance=parseInt(firstStop?.tolerance)||0;
  const firstOpt=firstStop?.options?.[0]||{};

  // Inline edit states for organizer
  const[editingTolerance,setEditingTolerance]=useState(false);
  const[editingMP,setEditingMP]=useState(false);
  const[mpSearch,setMpSearch]=useState('');
  const[mpResults,setMpResults]=useState([]);
  const[editingCap,setEditingCap]=useState(null); // stopId or null
  const[editingDur,setEditingDur]=useState(null); // stopId or null
  const[editingTime,setEditingTime]=useState(false);
  const[editingDeadline,setEditingDeadline]=useState(false);

  // Show alt dates / avail range toggles
  const[showAltDates,setShowAltDates]=useState(false);
  const[showAvailRange,setShowAvailRange]=useState(false);

  const updateFirstStop=async(fields)=>{
    const stops=[...(plan.stops||[])];if(!stops[0])return;
    stops[0]={...stops[0],...fields};
    const up={...plan,stops};await updatePlan(up);setPlan(up);
  };

  const updateStop=async(stopId,fields)=>{
    const stops=[...(plan.stops||[])];
    const idx=stops.findIndex(x=>x.id==stopId||String(x.id)===String(stopId));
    if(idx<0)return;
    stops[idx]={...stops[idx],...fields};
    // Cascade duration to next stop
    if(fields.duration){
      const cur=stops[idx];const curStart=cur.startTime||(idx===0?(plan.time||plan.startTimes?.[0]):null);
      if(curStart){const endT=calcEnd(curStart,fields.duration);if(endT&&idx+1<stops.length){stops[idx+1]={...stops[idx+1],startTime:endT};}}
    }
    const up={...plan,stops};await updatePlan(up);setPlan(up);
  };

  const searchMP=async(q)=>{
    if(!q||q.length<2){setMpResults([]);return;}
    try{
      const Place=window.google?.maps?.places?.Place;
      if(Place){
        if(google.maps.importLibrary)await google.maps.importLibrary('places');
        const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location'],maxResultCount:5});
        setMpResults((places||[]).map(p=>({name:p.displayName||'',address:p.formattedAddress||'',lat:p.location?.lat(),lng:p.location?.lng()})));
      }
    }catch{setMpResults([]);}
  };
  const pickMP=async(r)=>{
    await updateFirstStop({meetingPoint:r.name+(r.address?' — '+r.address:''),meetingPointLat:r.lat,meetingPointLng:r.lng});
    setMpResults([]);setMpSearch('');
  };

  const ynBtn=(val,setVal,yesLbl,noLbl)=>(
    <div style={{display:'flex',gap:'6px'}}>
      <button onClick={()=>setVal(true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===true?'#22c55e50':c.BD}`,background:val===true?'#22c55e18':'transparent',color:val===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===true?'700':'500'}}>{val===true?'✓ ':''}{yesLbl}</button>
      <button onClick={()=>setVal(false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===false?'#ef444450':c.BD}`,background:val===false?'#ef444418':'transparent',color:val===false?'#ef4444':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===false?'700':'500'}}>{val===false?'✗ ':''}{noLbl}</button>
    </div>
  );

  const cardSt={background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'14px',marginBottom:'8px'};
  const inpSt={width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'};

  // Render a single stop card
  const renderStop=(s,idx)=>{
    const opt=s.options?.[0]||{};
    const isFirst=idx===0;
    const viewKey='_stopView_'+s.id;
    const viewOpen=openSection[viewKey]!==undefined?openSection[viewKey]:(idx===0);
    const sTime=s.startTime||planTime;
    const minCap=s.minAttendees||'';const maxCap=s.maxCapacity||'';

    return<div key={s.id} style={{...cardSt,marginBottom:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:viewOpen?'12px':0}}>
        <div style={{width:'30px',height:'30px',borderRadius:'50%',background:`${mc}20`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:mc,flexShrink:0}}>{idx+1}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'15px',color:c.T,fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.name||'—'}</div>
          <div style={{display:'flex',gap:'6px',fontSize:'11px',color:c.M2,marginTop:'2px',flexWrap:'wrap'}}>
            {sTime?<span>🕐 {fmtTime(sTime)}{s.duration?` — ${calcEnd(sTime,s.duration)} (${durLabel(s.duration)})`:''}</span>
            :(!isFirst&&<span style={{color:'#f59e0b',fontSize:'10px'}}>⚠️ {t.noStartTimeHint||'Set duration on previous stop'}</span>)}
          </div>
        </div>
        <div style={{display:'flex',gap:'4px',flexShrink:0}}>
          <button onClick={()=>setOpenSection(p=>({...p,[viewKey]:!p[viewKey]}))} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>{viewOpen?'▾':t.seeDetails||'Ver'}</button>
          {isOrg&&<button aria-label="Edit stop" onClick={()=>setEditState('mode','stop_'+s.id)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px'}}>✏️</button>}
        </div>
      </div>

      {viewOpen&&<div className="fade-in">
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
            {ynBtn(myVote.placeOk,v=>{setMyVote('placeOk',v);if(!v){setOpenSection(p=>({...p,_placeNoPopup:true}));}else{setOpenSection(p=>({...p,_placeNoPopup:undefined}));}},t.yesLbl||'Sí','No')}
          </div>}
          {isFirst&&myVote.placeOk===false&&openSection._placeNoPopup&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#ef444408',border:'1px solid #ef444420',borderRadius:'8px'}}>
            <div style={{fontSize:'12px',color:'#ef4444',fontWeight:'600',marginBottom:'6px'}}>{t.placeNoMsg}</div>
            <input value={myVote.placeComment} onChange={e=>setMyVote('placeComment',e.target.value.slice(0,200))} maxLength={200} placeholder={t.commentPh} style={{...inpSt,marginBottom:'6px'}}/>
            <button onClick={()=>{window.location.href='/create';}} style={{width:'100%',padding:'8px',background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>{t.createOwnPlan}</button>
          </div>}
        </div>}

        {/* Capacity + Duration cards side by side */}
        <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
          {/* Capacity card */}
          <div style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:editingCap===s.id?'8px':0}}>
              <div>
                <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>👥 {t.minCapLbl||'Capacity'}</div>
                <div style={{fontSize:'12px',color:c.T,fontWeight:'600'}}>{minCap?`${minCap}`:(t.noMinCap||'—')}{' · '}{maxCap?`${maxCap}`:(t.noMaxCap||'—')}</div>
              </div>
              {isOrg&&<button onClick={()=>setEditingCap(p=>p===s.id?null:s.id)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'6px',padding:'2px 6px',color:c.M2,cursor:'pointer',fontSize:'11px',flexShrink:0}}>✏️</button>}
            </div>
            {editingCap===s.id&&<div className="fade-in">
              <div style={{display:'flex',gap:'6px'}}>
                <div style={{flex:1}}><div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>Min</div><input type="number" min="0" defaultValue={s.minAttendees||''} onBlur={e=>updateStop(s.id,{minAttendees:e.target.value})} placeholder="—" style={{...inpSt,padding:'6px 8px',fontSize:'12px'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>Max</div><input type="number" min="0" defaultValue={s.maxCapacity||''} onBlur={e=>updateStop(s.id,{maxCapacity:e.target.value})} placeholder="—" style={{...inpSt,padding:'6px 8px',fontSize:'12px'}}/></div>
              </div>
            </div>}
          </div>

          {/* Duration card */}
          <div style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:editingDur===s.id?'8px':0}}>
              <div>
                <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>⏱️ {t.durationLbl||'Duration'}</div>
                <div style={{fontSize:'12px',color:c.T,fontWeight:'600'}}>{s.duration?durLabel(s.duration):'—'}</div>
                {s.duration&&sTime&&<div style={{fontSize:'10px',color:c.M2,marginTop:'1px'}}>{fmtTime(sTime)} — {calcEnd(sTime,s.duration)}</div>}
              </div>
              {isOrg&&<button onClick={()=>setEditingDur(p=>p===s.id?null:s.id)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'6px',padding:'2px 6px',color:c.M2,cursor:'pointer',fontSize:'11px',flexShrink:0}}>✏️</button>}
            </div>
            {editingDur===s.id&&<div className="fade-in">
              <select value={s.duration||''} onChange={e=>updateStop(s.id,{duration:e.target.value})} style={{...inpSt,padding:'6px 8px',fontSize:'12px',cursor:'pointer'}}>
                <option value="">—</option>
                <option value="30min">30 min</option>
                <option value="1h">1h</option>
                <option value="1h30">1h30</option>
                <option value="2h">2h</option>
                <option value="3h">3h</option>
                <option value="4h+">4h+</option>
              </select>
            </div>}
          </div>
        </div>
      </div>}
    </div>;
  };

  const mpMins=parseInt(firstStop?.meetingMinsBefore)||0;
  const mpTime=mpMins>0&&planTime?addMins(planTime,-mpMins):planTime;

  return<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>

    {/* ── 1. DATE CARD ── */}
    <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
      <div style={{...cardSt,flex:1,marginBottom:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:canVote?'10px':0}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>📅 {t.dateOkQ||'Date'}</div>
            <div style={{fontSize:'14px',color:c.T,fontWeight:'700',textTransform:'capitalize'}}>{planDate?fmtShort(planDate,lang):'—'}</div>
          </div>
          {isOrg&&<button onClick={()=>setEditState('mode','dates')} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>
        {canVote&&<>
          {ynBtn(myVote.dateOk,v=>{setMyVote('dateOk',v);if(!v){setMyVote('timeOk',null);setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));setShowAltDates(true);}},t.yesLbl,'No')}
          {/* Alt dates toggle — available even if Yes */}
          {myVote.dateOk!==null&&<button onClick={()=>setShowAltDates(p=>!p)} style={{width:'100%',marginTop:'6px',background:'none',border:'none',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',padding:'4px 0',textAlign:'left'}}>{showAltDates?'▾':'▸'} {t.altDatesEvenYes}</button>}
        </>}
      </div>

      {/* ── 2. TIME CARD ── */}
      <div style={{...cardSt,flex:1,marginBottom:0,opacity:myVote.dateOk===true||isOrg?1:0.4}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:canVote&&myVote.dateOk===true?'10px':editingTime?'10px':0}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>🕐 {t.timeOkQ||'Time'}</div>
            <div style={{fontSize:'14px',color:c.T,fontWeight:'700'}}>{planTime?fmtTime(planTime):'—'}</div>
          </div>
          {isOrg&&<button onClick={()=>setEditingTime(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>
        {/* Organizer inline time edit */}
        {isOrg&&editingTime&&<div className="fade-in" style={{marginBottom:'8px'}}>
          <ClockPicker value={planTime||''} onChange={async v=>{const up={...plan,startTimes:[v,...(plan.startTimes||[]).slice(1)],time:v};await updatePlan(up);setPlan(up);}} c={c}/>
        </div>}
        {canVote&&myVote.dateOk===true&&<>
          {ynBtn(myVote.timeOk,v=>{setMyVote('timeOk',v);if(!v){setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));setShowAvailRange(true);}},t.yesLbl,'No')}
          {/* Avail range toggle — available even if Yes */}
          {myVote.timeOk!==null&&<button onClick={()=>setShowAvailRange(p=>!p)} style={{width:'100%',marginTop:'6px',background:'none',border:'none',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',padding:'4px 0',textAlign:'left'}}>{showAvailRange?'▾':'▸'} {t.availRangeEvenYes}</button>}
        </>}
      </div>
    </div>

    {/* Alt dates panel */}
    {canVote&&showAltDates&&myVote.dateOk!==null&&<div style={{background:myVote.dateOk===false?'#ef444408':c.CARD2,border:`1px solid ${myVote.dateOk===false?'#ef444420':c.BD}`,borderRadius:'14px',padding:'12px',marginBottom:'8px'}}>
      <div style={{fontSize:'12px',color:myVote.dateOk===false?'#ef4444':c.M,fontWeight:'600',marginBottom:'6px'}}>{t.yourAvailDates} ({myVote.altDates.length}/3)</div>
      <CalendarPicker selected={myVote.altDates} onChange={d=>setMyVote('altDates',d.filter(x=>x!==planDate).slice(-3))} max={3} c={c} lang={lang}/>
    </div>}

    {/* Avail range panel */}
    {canVote&&showAvailRange&&myVote.dateOk===true&&myVote.timeOk!==null&&<div style={{background:myVote.timeOk===false?'#f59e0b08':c.CARD2,border:`1px solid ${myVote.timeOk===false?'#f59e0b20':c.BD}`,borderRadius:'14px',padding:'12px',marginBottom:'8px'}}>
      <div style={{fontSize:'12px',color:myVote.timeOk===false?'#f59e0b':c.M,fontWeight:'600',marginBottom:'8px'}}>{t.availStartTime}</div>
      <div style={{fontSize:'11px',color:c.M2,marginBottom:'10px'}}>{t.availStartHint}</div>
      <TimeRangeBar from={myVote.timeFrom||'08:00'} to={myVote.timeTo||'22:00'} onChange={(f,to)=>{setMyVote('timeFrom',f);setMyVote('timeTo',to);}} c={c}/>
      {myVote.timeFrom&&myVote.timeTo&&planTime>=myVote.timeFrom&&planTime<=myVote.timeTo&&myVote.timeOk===false&&<div style={{marginTop:'6px',padding:'6px 10px',background:'#ef444410',border:'1px solid #ef444430',borderRadius:'8px',fontSize:'11px',color:'#ef4444',fontWeight:'600'}}>{t.rangeIncludesOriginal}</div>}
    </div>}

    {/* ── 3. LATE ARRIVAL CARD ── */}
    {(()=>{
      const show=(canVote&&myVote.dateOk===true&&myVote.timeOk===true)||isOrg;
      if(!show)return null;
      const hasTolerance=sTolerance>0;
      const isLate=myVote.lateMin>0;const isOnTime=openSection._onTime===true||(isOrg&&!isLate);

      return<div style={cardSt}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:hasTolerance?'8px':0}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>⏰ {t.onTimeQ}</div>
            {hasTolerance&&<div style={{fontSize:'10px',color:c.M2}}>{t.maxLateLbl}: {sTolerance} min = {addMins(planTime,sTolerance)}</div>}
          </div>
          {isOrg&&<button onClick={()=>setEditingTolerance(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>

        {/* Organizer inline edit */}
        {isOrg&&editingTolerance&&<div className="fade-in" style={{marginBottom:'8px',padding:'10px',background:c.CARD2,borderRadius:'8px',border:`1px solid ${c.BD}`}}>
          <div style={{fontSize:'11px',color:c.M,marginBottom:'6px'}}>{t.toleranceLbl||'Tolerance'} (min)</div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input type="number" min="0" max="120" defaultValue={firstStop?.tolerance||''} onBlur={e=>updateFirstStop({tolerance:e.target.value})} placeholder="0" style={{...inpSt,width:'80px'}}/>
            <span style={{fontSize:'11px',color:c.M2}}>0 = {t.noLbl||'No'}</span>
          </div>
        </div>}

        {hasTolerance&&<>
          <div style={{display:'flex',gap:'6px'}}>
            <button onClick={()=>{setMyVote('lateMin',0);setOpenSection(p=>({...p,_onTime:true}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isOnTime?'#22c55e50':c.BD}`,background:isOnTime?'#22c55e18':'transparent',color:isOnTime?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isOnTime?'700':'500'}}>{isOnTime?'✓ ':''}{t.yesLbl}</button>
            <button onClick={()=>{setMyVote('lateMin',5);setOpenSection(p=>({...p,_onTime:false}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isLate?'#f59e0b50':c.BD}`,background:isLate?'#f59e0b18':'transparent',color:isLate?'#f59e0b':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isLate?'700':'500'}}>{isLate?'⏰ ':''}{t.noLbl||'No'}</button>
          </div>
          {isLate&&<div style={{marginTop:'8px'}}>
            <div style={{fontSize:'11px',color:'#f59e0b',marginBottom:'4px'}}>{t.howLateQ}</div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'12px',color:c.M}}>+</span>
              <input type="number" inputMode="numeric" min="1" max={sTolerance} value={myVote.lateMin} onChange={e=>setMyVote('lateMin',Math.min(Math.max(parseInt(e.target.value)||1,1),sTolerance))} style={{width:'70px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
              <span style={{fontSize:'12px',color:c.M}}>min</span>
              <span style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600'}}>{fmtMinsToH(myVote.lateMin)} = {addMins(planTime,myVote.lateMin)}</span>
            </div>
          </div>}
        </>}
        {!hasTolerance&&!editingTolerance&&<div style={{fontSize:'11px',color:c.M2,fontStyle:'italic'}}>{isOrg?t.noLbl:'—'}</div>}
      </div>;
    })()}

    {/* ── 4. MEETING POINT CARD ── */}
    {(()=>{
      const show=(canVote&&myVote.dateOk===true&&myVote.timeOk===true&&myVote.lateMin===0)||isOrg;
      if(!show)return null;
      const hasMp=!!firstStop?.meetingPoint;

      return<div style={cardSt}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:hasMp?'8px':0}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>📍 {t.meetingPointLbl2||'Meeting point'}</div>
            {hasMp&&<div style={{fontSize:'13px',color:c.T,fontWeight:'600'}}>{firstStop.meetingPoint}</div>}
            {hasMp&&mpMins>0&&<div style={{fontSize:'11px',color:c.M2,marginTop:'1px'}}>{mpMins} min {t.beforeLbl} → {mpTime}</div>}
          </div>
          {isOrg&&<button onClick={()=>setEditingMP(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>

        {/* Organizer inline edit */}
        {isOrg&&editingMP&&<div className="fade-in" style={{marginBottom:'8px',padding:'10px',background:c.CARD2,borderRadius:'8px',border:`1px solid ${c.BD}`}}>
          {hasMp&&<div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
            <span style={{flex:1,fontSize:'12px',color:c.T}}>{firstStop.meetingPoint}</span>
            <button onClick={()=>updateFirstStop({meetingPoint:'',meetingPointLat:null,meetingPointLng:null})} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px'}}>×</button>
          </div>}
          <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
            <input value={mpSearch} onChange={e=>setMpSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(mpSearch);}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1}}/>
            <button onClick={()=>searchMP(mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 12px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button>
          </div>
          {mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginBottom:'6px',maxHeight:'120px',overflowY:'auto'}}>{mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
          {hasMp&&<div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.minBeforeLbl||'Minutes before'}</div>
            <input type="number" min="0" max="120" defaultValue={firstStop?.meetingMinsBefore||''} onBlur={e=>updateFirstStop({meetingMinsBefore:e.target.value})} placeholder="10" style={{...inpSt,width:'80px'}}/>
          </div>}
        </div>}

        {/* Invitee response — two green options */}
        {canVote&&hasMp&&<div style={{display:'flex',gap:'6px'}}>
          <button onClick={()=>setMyVote('meetOk',true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${myVote.meetOk===true?'#22c55e50':c.BD}`,background:myVote.meetOk===true?'#22c55e18':'transparent',color:myVote.meetOk===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:myVote.meetOk===true?'700':'500',textAlign:'center'}}>
            {myVote.meetOk===true?'✓ ':''}{t.goingToMeetPoint||t.meetYes}
            {myVote.meetOk===true&&mpTime&&<div style={{fontSize:'16px',fontWeight:'800',marginTop:'4px'}}>🕐 {mpTime}</div>}
          </button>
          <button onClick={()=>setMyVote('meetOk',false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${myVote.meetOk===false?'#22c55e50':c.BD}`,background:myVote.meetOk===false?'#22c55e18':'transparent',color:myVote.meetOk===false?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:myVote.meetOk===false?'700':'500',textAlign:'center'}}>
            {myVote.meetOk===false?'✓ ':''}{t.goingDirect||t.meetNo}
            {myVote.meetOk===false&&planTime&&<div style={{fontSize:'16px',fontWeight:'800',marginTop:'4px'}}>🕐 {planTime}</div>}
          </button>
        </div>}
        {!hasMp&&!editingMP&&<div style={{fontSize:'11px',color:c.M2,fontStyle:'italic'}}>—</div>}
      </div>;
    })()}

    {/* ── Transport: Meeting point → Stop 1 ── */}
    {firstStop?.meetingPoint&&firstStop?.meetingPointLat&&firstOpt?.lat&&(()=>{
      return<TransportCard
        origin={{lat:firstStop.meetingPointLat,lng:firstStop.meetingPointLng}}
        destination={{lat:firstOpt.lat,lng:firstOpt.lng}}
        fromLabel={`📍 ${(firstStop.meetingPoint||'').split(' — ')[0]}`}
        toLabel={`1) ${firstOpt.name||''}`}
        departureTime={mpTime}
        c={c} t={t}/>;
    })()}

    {/* ── 5. STOP CARDS with transport between them ── */}
    {allStops.map((s,i)=><React.Fragment key={s.id}>
      {renderStop(s,i)}
      {i<allStops.length-1&&(()=>{
        const curOpt=s.options?.[0];
        const nextOpt=allStops[i+1]?.options?.[0];
        if(!curOpt?.lat||!nextOpt?.lat)return null;
        const sTime=s.startTime||planTime;
        const depTime=sTime&&s.duration?calcEnd(sTime,s.duration):null;
        return<TransportCard
          origin={{lat:curOpt.lat,lng:curOpt.lng}}
          destination={{lat:nextOpt.lat,lng:nextOpt.lng}}
          fromLabel={`${i+1}) ${curOpt.name||''}`}
          toLabel={`${i+2}) ${nextOpt.name||''}`}
          departureTime={depTime}
          c={c} t={t}/>;
      })()}
    </React.Fragment>)}

    {/* Fallback if no stops */}
    {allStops.length===0&&<div style={{...cardSt}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{width:'30px',height:'30px',borderRadius:'50%',background:`${mc}20`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:mc,flexShrink:0}}>1</div>
        <div style={{fontSize:'14px',color:c.M2,fontStyle:'italic'}}>{t.noDataYet||'—'}</div>
      </div>
    </div>}

    {/* Organizer logistics */}
    {isOrg&&<div style={{background:c.CARD,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
      <div style={{fontSize:'13px',color:mc,fontWeight:'700',marginBottom:'10px'}}>👤 {plan.organizer} ({t.organizer})</div>
      <div style={{marginBottom:'8px'}}>
        <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.orgAttendingQ||'Are you going?'}</div>
        {ynBtn(myVote.attending!==false?true:false,v=>{setMyVote('attending',v);if(!v){setMyVote('meetOk',null);setMyVote('lateMin',0);}},t.yesLbl||'Yes',t.noLbl||'No')}
      </div>
      <button onClick={()=>saveMyResp(true)} disabled={myVote.saving} style={{width:'100%',padding:'10px',background:myVote.saved?'#22c55e':mc,border:'none',borderRadius:'10px',color:myVote.saved?'#fff':'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px',marginTop:'4px'}}>{myVote.saving?'...':(myVote.saved?(t.respSaved):(t.saveAvail))}</button>
      {myVote.saveConfirm&&<div className="fade-in" style={{marginTop:'6px',padding:'8px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'8px',textAlign:'center',fontSize:'12px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle}</div>}
      {/* Deadline card — organizer */}
      <div style={{marginTop:'8px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:editingDeadline?'8px':0}}>
          <div>
            <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>⏰ {t.deadlineLbl||'Deadline'}</div>
            <div style={{fontSize:'12px',color:plan.deadline?c.T:c.M2,fontWeight:'600'}}>{plan.deadline?new Date(plan.deadline).toLocaleString():'—'}</div>
          </div>
          <button onClick={()=>setEditingDeadline(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'6px',padding:'2px 6px',color:c.M2,cursor:'pointer',fontSize:'11px',flexShrink:0}}>✏️</button>
        </div>
        {editingDeadline&&<div className="fade-in">
          <input type="datetime-local" min={new Date().toISOString().slice(0,16)} value={plan.deadline||''} onChange={async e=>{const up={...plan,deadline:e.target.value||null};await updatePlan(up);setPlan(up);}} style={{...inpSt,padding:'6px 8px',fontSize:'12px'}}/>
          {plan.deadline&&<button onClick={async()=>{const up={...plan,deadline:null};await updatePlan(up);setPlan(up);}} style={{marginTop:'4px',background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>× {t.removeDeadline||'Remove'}</button>}
        </div>}
      </div>
    </div>}

    {/* Require login gate */}
    {!isOrg&&plan.requireLogin&&!authUser&&<div style={{marginTop:'10px',padding:'16px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',textAlign:'center'}}>
      <div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.loginRequiredTitle||'Login required'}</div>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'12px'}}>{t.loginRequiredMsg||'The organizer requires you to sign in before responding.'}</div>
      <button onClick={()=>{window.location.href='/auth';}} style={{padding:'10px 24px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.authSignInTab||'Sign in'}</button>
    </div>}

    {/* Save (invitee) */}
    {canVote&&<div style={{marginTop:'10px'}}>
      {!myVote.saved&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.yourName}</div><input value={myVote.name} onChange={e=>setMyVote('name',e.target.value.slice(0,50))} maxLength={50} placeholder={t.yourNamePh} style={{...inpSt}}/></div>}
      {(()=>{
        const dl=plan.deadline&&new Date(plan.deadline)<new Date();
        const pa=myVote.placeOk!==undefined&&myVote.placeOk!==null;
        const da=myVote.dateOk!==null;
        const ta=myVote.dateOk===false||(myVote.dateOk===true&&myVote.timeOk!==null);
        const ok=pa&&da&&ta&&myVote.name.trim();const can=ok&&!myVote.saving&&!dl;
        return<button onClick={saveMyResp} disabled={!can} style={{width:'100%',padding:'12px',background:myVote.saved?'#22c55e':can?mc:c.CARD2,border:can||myVote.saved?'none':`1px solid ${c.BD}`,borderRadius:'10px',color:myVote.saved?'#fff':can?'#0A0A0A':c.M,cursor:can?'pointer':'default',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',opacity:can||myVote.saved?1:0.5}}>{myVote.saving?'...':(myVote.saved?t.respSaved:(ok?t.saveAvail:(t.answerAllToSave)))}</button>;
      })()}
      {myVote.saveConfirm&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'10px',textAlign:'center',fontSize:'13px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle}</div>}
      {/* Deadline card — invitee (visible, read-only) */}
      {plan.deadline&&<div style={{marginTop:'8px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
        <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>⏰ {t.deadlineLbl||'Deadline'}</div>
        <div style={{fontSize:'12px',color:c.T,fontWeight:'600'}}>{new Date(plan.deadline).toLocaleString()}</div>
        <Countdown deadline={plan.deadline} lang={lang} c={c} t={t} mc={mc} onExpired={()=>setTab('vote')}/>
      </div>}
    </div>}

    {/* Add point */}
    {isOrg&&<button onClick={async()=>{
      const existing=(plan.stops||[]).filter(s2=>(s2.options||[]).some(o=>o.name));
      const last=existing[existing.length-1];
      let sugStart='';
      if(last){
        const prevTime=last.startTime||planTime;
        if(prevTime&&last.duration){sugStart=calcEnd(prevTime,last.duration);}
      }
      const ns={id:Date.now(),options:[{id:Date.now(),name:'',address:'',lat:null,lng:null,rating:null,photo:null,googleMapsURI:null,types:[]}],startTime:sugStart,duration:'',notes:'',maxCapacity:'',meetingPoint:'',minAttendees:'',tolerance:''};
      const up={...plan,stops:[...(plan.stops||[]),ns]};await updatePlan(up);setPlan(up);setEditState('mode','stop_'+ns.id);
    }} style={{width:'100%',padding:'12px',background:'none',border:`2px dashed ${c.BD}`,borderRadius:'12px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'600',marginBottom:'8px',marginTop:'8px'}}>+ {t.addNextPoint}</button>}

    {/* Map */}
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
