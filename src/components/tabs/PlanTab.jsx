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
  const canVote=isOrg||(!plan.requireLogin||authUser);
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
      <button onClick={()=>setVal(val===true?null:true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===true?'#22c55e50':c.BD}`,background:val===true?'#22c55e18':'transparent',color:val===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===true?'700':'500'}}>{val===true?'✓ ':''}{yesLbl}</button>
      <button onClick={()=>setVal(val===false?null:false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===false?'#ef444450':c.BD}`,background:val===false?'#ef444418':'transparent',color:val===false?'#ef4444':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===false?'700':'500'}}>{val===false?'✗ ':''}{noLbl}</button>
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
                <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>👥 {t.capacityLbl||'Aforo'}</div>
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

  const toggleSt=(on)=>({width:'40px',height:'22px',borderRadius:'11px',border:'none',background:on?'#22c55e':c.BD,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0});
  const dotSt=(on)=>({position:'absolute',top:'3px',left:on?'20px':'3px',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'});
  const allowAlt=!!plan.allowAltDates;
  const allowAvail=!!plan.allowAltTimes;

  return<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>

    {/* ── ROW 1: DATE + TIME ── */}
    <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
      {/* DATE */}
      <div style={{...cardSt,flex:1,marginBottom:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>📅 {t.datesStep||'Fecha'}</div>
            <div style={{fontSize:'14px',color:c.T,fontWeight:'700',textTransform:'capitalize'}}>{planDate?fmtShort(planDate,lang):'—'}</div>
          </div>
          {isOrg&&<button onClick={()=>setEditState('mode','dates')} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>
        {ynBtn(myVote.dateOk,v=>{setMyVote('dateOk',v);if(v===false){setMyVote('timeOk',null);setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
      </div>

      {/* TIME */}
      <div style={{...cardSt,flex:1,marginBottom:0,opacity:myVote.dateOk===true||isOrg?1:0.4}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:myVote.dateOk===true||isOrg?'10px':0}}>
          <div>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'2px'}}>🕐 {t.timeOkQ||'Hora'}</div>
            <div style={{fontSize:'14px',color:c.T,fontWeight:'700'}}>{planTime?fmtTime(planTime):'—'}</div>
          </div>
          {isOrg&&<button onClick={()=>setEditingTime(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>}
        </div>
        {isOrg&&editingTime&&<div className="fade-in" style={{marginBottom:'8px'}}>
          <ClockPicker value={planTime||''} onChange={async v=>{const up={...plan,startTimes:[v,...(plan.startTimes||[]).slice(1)],time:v};await updatePlan(up);setPlan(up);}} c={c}/>
        </div>}
        {(myVote.dateOk===true)&&ynBtn(myVote.timeOk,v=>{setMyVote('timeOk',v);if(v===false){setMyVote('lateMin',0);setMyVote('meetOk',null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
      </div>
    </div>

    {/* ── ROW 2: ALT DATES + AVAILABILITY ── */}
    <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
      {/* ALT DATES */}
      <div style={{...cardSt,flex:1,marginBottom:0,opacity:allowAlt?1:0.5}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:allowAlt?'8px':0}}>
          <div style={{fontSize:'11px',color:c.M}}>📅 {t.altDatesLbl||'Fechas alternativas'}</div>
          {isOrg&&<button onClick={async()=>{const up={...plan,allowAltDates:!allowAlt};await updatePlan(up);setPlan(up);}} style={toggleSt(allowAlt)}><div style={dotSt(allowAlt)}/></button>}
        </div>
        {allowAlt&&<>
          <div style={{fontSize:'10px',color:c.M2,marginBottom:'6px'}}>({myVote.altDates.length}/3)</div>
          <CalendarPicker selected={myVote.altDates} onChange={d=>setMyVote('altDates',d.filter(x=>x!==planDate).slice(-3))} max={3} c={c} lang={lang}/>
        </>}
        {!allowAlt&&<div style={{fontSize:'10px',color:c.M2,fontStyle:'italic'}}>{t.altDatesDisabled||'El organizador no permite fechas alternativas'}</div>}
      </div>

      {/* AVAILABILITY RANGE */}
      <div style={{...cardSt,flex:1,marginBottom:0,opacity:allowAvail?1:0.5}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:allowAvail?'8px':0}}>
          <div style={{fontSize:'11px',color:c.M}}>🕐 {t.availLbl||'Disponibilidad'}</div>
          {isOrg&&<button onClick={async()=>{const up={...plan,allowAltTimes:!allowAvail};await updatePlan(up);setPlan(up);}} style={toggleSt(allowAvail)}><div style={dotSt(allowAvail)}/></button>}
        </div>
        {allowAvail&&<>
          <div style={{fontSize:'10px',color:c.M2,marginBottom:'6px'}}>{t.availStartHint}</div>
          <div style={{marginBottom:'6px'}}><div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>{t.fromLbl}{myVote.timeFrom&&` → ${myVote.timeFrom}`}</div><ClockPicker value={myVote.timeFrom||''} onChange={v=>setMyVote('timeFrom',v)} c={c}/></div>
          <div><div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>{t.toLbl}{myVote.timeTo&&` → ${myVote.timeTo}`}</div><ClockPicker value={myVote.timeTo||''} onChange={v=>setMyVote('timeTo',v)} c={c}/></div>
        </>}
        {!allowAvail&&<div style={{fontSize:'10px',color:c.M2,fontStyle:'italic'}}>{t.availDisabled||'El organizador no permite elegir horas alternativas'}</div>}
      </div>
    </div>

    {/* ── 3. LATE ARRIVAL ── */}
    {(isOrg||(myVote.dateOk===true&&myVote.timeOk===true))&&(()=>{
      const hasTolerance=sTolerance>0;
      const isLate=myVote.lateMin>0;const isOnTime=openSection._onTime===true||(!isLate&&myVote.lateMin===0);

      return<div style={cardSt}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
          <div style={{fontSize:'11px',color:c.M}}>⏰ {t.onTimeQ}</div>
          {isOrg&&<button onClick={async()=>{if(hasTolerance){await updateFirstStop({tolerance:''});}else{await updateFirstStop({tolerance:'15'});}}} style={toggleSt(hasTolerance)}><div style={dotSt(hasTolerance)}/></button>}
        </div>
        {isOrg&&hasTolerance&&<div style={{marginBottom:'8px',display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{fontSize:'11px',color:c.M}}>{t.maxLateLbl}:</div>
          <input type="number" min="1" max="120" value={firstStop?.tolerance||''} onChange={e=>{const v=e.target.value;if(v&&parseInt(v)>0)updateFirstStop({tolerance:v});}} style={{...inpSt,width:'60px',padding:'4px 8px',fontSize:'12px',textAlign:'center'}}/>
          <span style={{fontSize:'11px',color:c.M2}}>min = {addMins(planTime,sTolerance)}</span>
        </div>}
        {hasTolerance&&<>
          <div style={{display:'flex',gap:'6px'}}>
            <button onClick={()=>{setMyVote('lateMin',0);setOpenSection(p=>({...p,_onTime:openSection._onTime===true?undefined:true}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isOnTime?'#22c55e50':c.BD}`,background:isOnTime?'#22c55e18':'transparent',color:isOnTime?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isOnTime?'700':'500'}}>{isOnTime?'✓ ':''}{t.yesLbl}</button>
            <button onClick={()=>{setMyVote('lateMin',isLate?0:5);setOpenSection(p=>({...p,_onTime:isLate?undefined:false}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isLate?'#f59e0b50':c.BD}`,background:isLate?'#f59e0b18':'transparent',color:isLate?'#f59e0b':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isLate?'700':'500'}}>{isLate?'⏰ ':''}{t.noLbl||'No'}</button>
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
        {!hasTolerance&&<div style={{fontSize:'11px',color:c.M2,fontStyle:'italic'}}>{t.lateDisabled}</div>}
      </div>;
    })()}

    {/* ── 4. MEETING POINT ── */}
    {(isOrg||(myVote.dateOk===true&&myVote.timeOk===true&&myVote.lateMin===0))&&(()=>{
      const hasMp=!!firstStop?.meetingPoint;

      return<div style={cardSt}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
          <div style={{fontSize:'11px',color:c.M}}>📍 {t.meetingPointLbl2||'Punto de encuentro'}</div>
          {isOrg&&<button onClick={async()=>{if(hasMp){await updateFirstStop({meetingPoint:'',meetingPointLat:null,meetingPointLng:null,meetingMinsBefore:''});setEditingMP(false);}else{setEditingMP(true);}}} style={toggleSt(hasMp)}><div style={dotSt(hasMp)}/></button>}
        </div>

        {/* Org: configure when enabled */}
        {isOrg&&hasMp&&<div style={{marginBottom:'8px',padding:'10px',background:c.CARD2,borderRadius:'8px',border:`1px solid ${c.BD}`}}>
          <div style={{fontSize:'12px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{firstStop.meetingPoint}</div>
          <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
            <input value={mpSearch} onChange={e=>setMpSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(mpSearch);}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1,padding:'6px 8px',fontSize:'12px'}}/>
            <button onClick={()=>searchMP(mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'6px 10px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>🔍</button>
          </div>
          {mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginBottom:'6px',maxHeight:'120px',overflowY:'auto'}}>{mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontSize:'11px',color:c.M}}>{t.minBeforeLbl||'Min antes'}:</div>
            <input type="number" min="0" max="120" value={firstStop?.meetingMinsBefore||''} onChange={e=>updateFirstStop({meetingMinsBefore:e.target.value})} placeholder="10" style={{...inpSt,width:'60px',padding:'4px 8px',fontSize:'12px',textAlign:'center'}}/>
            <span style={{fontSize:'11px',color:c.M2}}>min</span>
          </div>
        </div>}

        {/* Org: search when just activated */}
        {isOrg&&!hasMp&&editingMP&&<div className="fade-in" style={{marginBottom:'8px',padding:'10px',background:c.CARD2,borderRadius:'8px',border:`1px solid ${c.BD}`}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
            <input value={mpSearch} onChange={e=>setMpSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(mpSearch);}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1,padding:'6px 8px',fontSize:'12px'}}/>
            <button onClick={()=>searchMP(mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'6px 10px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'13px'}}>🔍</button>
          </div>
          {mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',maxHeight:'120px',overflowY:'auto'}}>{mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
        </div>}

        {/* Vote — two green options */}
        {hasMp&&<>
          {mpMins>0&&<div style={{fontSize:'11px',color:c.M2,marginBottom:'6px'}}>{mpMins} min {t.beforeLbl} → {mpTime}</div>}
          <div style={{display:'flex',gap:'6px'}}>
            <button onClick={()=>setMyVote('meetOk',myVote.meetOk===true?null:true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${myVote.meetOk===true?'#22c55e50':c.BD}`,background:myVote.meetOk===true?'#22c55e18':'transparent',color:myVote.meetOk===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:myVote.meetOk===true?'700':'500',textAlign:'center'}}>
              {myVote.meetOk===true?'✓ ':''}{t.goingToMeetPoint||t.meetYes}
              {myVote.meetOk===true&&mpTime&&<div style={{fontSize:'16px',fontWeight:'800',marginTop:'4px'}}>🕐 {mpTime}</div>}
            </button>
            <button onClick={()=>setMyVote('meetOk',myVote.meetOk===false?null:false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${myVote.meetOk===false?'#22c55e50':c.BD}`,background:myVote.meetOk===false?'#22c55e18':'transparent',color:myVote.meetOk===false?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:myVote.meetOk===false?'700':'500',textAlign:'center'}}>
              {myVote.meetOk===false?'✓ ':''}{t.goingDirect||t.meetNo}
              {myVote.meetOk===false&&planTime&&<div style={{fontSize:'16px',fontWeight:'800',marginTop:'4px'}}>🕐 {planTime}</div>}
            </button>
          </div>
        </>}
        {!hasMp&&!editingMP&&<div style={{fontSize:'11px',color:c.M2,fontStyle:'italic'}}>{t.mpDisabled}</div>}
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

    {/* Deadline card — below save, for everyone */}
    <div style={{...cardSt}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:editingDeadline?'8px':0}}>
        <div>
          <div style={{fontSize:'10px',color:c.M,marginBottom:'2px'}}>⏰ {t.deadlineLbl||'Deadline'}</div>
          <div style={{fontSize:'12px',color:plan.deadline?c.T:c.M2,fontWeight:'600'}}>{plan.deadline?new Date(plan.deadline).toLocaleString():'—'}</div>
        </div>
        {isOrg&&<button onClick={()=>setEditingDeadline(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'6px',padding:'2px 6px',color:c.M2,cursor:'pointer',fontSize:'11px',flexShrink:0}}>✏️</button>}
      </div>
      {isOrg&&editingDeadline&&<div className="fade-in">
        <input type="datetime-local" min={new Date().toISOString().slice(0,16)} value={plan.deadline||''} onChange={async e=>{const up={...plan,deadline:e.target.value||null};await updatePlan(up);setPlan(up);}} style={{...inpSt,padding:'6px 8px',fontSize:'12px'}}/>
        {plan.deadline&&<button onClick={async()=>{const up={...plan,deadline:null};await updatePlan(up);setPlan(up);}} style={{marginTop:'4px',background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>× {t.removeDeadline||'Remove'}</button>}
      </div>}
      {plan.deadline&&<Countdown deadline={plan.deadline} lang={lang} c={c} t={t} mc={mc} onExpired={()=>setTab('vote')}/>}
    </div>

    {/* Require login gate */}
    {!isOrg&&plan.requireLogin&&!authUser&&<div style={{marginTop:'10px',padding:'16px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',textAlign:'center'}}>
      <div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.loginRequiredTitle||'Login required'}</div>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'12px'}}>{t.loginRequiredMsg||'The organizer requires you to sign in before responding.'}</div>
      <button onClick={()=>{window.location.href='/auth';}} style={{padding:'10px 24px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.authSignInTab||'Sign in'}</button>
    </div>}

    {/* Save response */}
    {canVote&&<div style={{marginTop:'10px'}}>
      {!myVote.saved&&!isOrg&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.yourName}</div><input value={myVote.name} onChange={e=>setMyVote('name',e.target.value.slice(0,50))} maxLength={50} placeholder={t.yourNamePh} style={{...inpSt}}/></div>}
      {(()=>{
        const dl=plan.deadline&&new Date(plan.deadline)<new Date();
        const hasName=isOrg||myVote.name.trim();
        const pa=myVote.placeOk!==undefined&&myVote.placeOk!==null;
        const da=myVote.dateOk!==null;
        const ta=myVote.dateOk===false||(myVote.dateOk===true&&myVote.timeOk!==null);
        const ok=pa&&da&&ta&&hasName;const can=ok&&!myVote.saving&&!dl;
        return<button onClick={()=>saveMyResp(isOrg)} disabled={!can} style={{width:'100%',padding:'12px',background:myVote.saved?'#22c55e':can?mc:c.CARD2,border:can||myVote.saved?'none':`1px solid ${c.BD}`,borderRadius:'10px',color:myVote.saved?'#fff':can?'#0A0A0A':c.M,cursor:can?'pointer':'default',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',opacity:can||myVote.saved?1:0.5}}>{myVote.saving?'...':(myVote.saved?t.respSaved:(ok?t.saveAvail:(t.answerAllToSave)))}</button>;
      })()}
      {myVote.saveConfirm&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'10px',textAlign:'center',fontSize:'13px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle}</div>}
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
