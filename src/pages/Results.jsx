import React, { useState, useRef } from 'react'
import useFocusTrap from '../hooks/useFocusTrap.js'
import T from '../constants/translations.js'
import { updatePlan } from '../lib/supabase.js'
import { fmtShort, fmtTime, fmtDate, daysUntil, calcEnd } from '../lib/utils.js'
import { Btn, Back } from '../components/ui.jsx'
import PostPlanSurvey from '../components/PostPlanSurvey.jsx'
import { generateICS, generateGCalURL } from '../lib/ics.js'
import VenueInfo from '../components/VenueInfo.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import ClockPicker from '../components/ClockPicker.jsx'
import ResultsProvider, { useResults, addMins, fmtMinsToH } from '../components/ResultsContext.jsx'
import PlanTab from '../components/tabs/PlanTab.jsx'
import VoteTab from '../components/tabs/VoteTab.jsx'
import ResultTab from '../components/tabs/ResultTab.jsx'
import MoreTab from '../components/tabs/MoreTab.jsx'

function ResultsInner({onBack}){
  const autoConfirmRef=useRef(null);const editModalRef=useRef(null);
  const{planState,editState,setEditState,ui,helpers,myVote}=useResults();
  const{plan,setPlan,rs,total,isOrg,ldg}=planState;
  const{tab,setTab,openSection,setOpenSection,newRespAlert,autoConfirmPending,setAutoConfirmPending,remSent}=ui;
  const{mc,c,t,lang,planDate,planTime,confirmDate,shareUrl,waShare,waConfirm,waRem,copyShare}=helpers;
  const[planRating,setPlanRating]=useState(0);
  const[ratingDone,setRatingDone]=useState(false);
  const du=plan.confirmedDate?daysUntil(plan.confirmedDate):null;
  const TABS=['plan','vote','result','more'];
  const tlbl=k=>t.tabs?.[k]||k;

  useFocusTrap(autoConfirmPending?autoConfirmRef:null);
  useFocusTrap(editState.mode?editModalRef:null);

  // Edit modal helpers
  const{mode:editMode}=editState;
  const setEditMode=v=>setEditState('mode',v);

  return(<>
    {/* Auto-confirm modal */}
    {autoConfirmPending&&<div role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape')setAutoConfirmPending(null);}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setAutoConfirmPending(null)}>
      <div ref={autoConfirmRef} onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'10px'}}>📌</div>
        <div style={{fontSize:'15px',color:c.T,fontWeight:'700',marginBottom:'6px'}}>{t.autoConfirmTitle}</div>
        <div style={{fontSize:'13px',color:c.M2,marginBottom:'16px'}}>{autoConfirmPending.date} {autoConfirmPending.startTime}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setAutoConfirmPending(null)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.notYet}</button>
          <button onClick={async()=>{await confirmDate(autoConfirmPending.date,autoConfirmPending.startTime);setAutoConfirmPending(null);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.confirmBtn}</button>
        </div>
      </div>
    </div>}

    {/* Edit modals */}
    {editMode&&<div role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape')setEditMode(false);}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setEditMode(false)}>
      <div ref={editModalRef} onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'400px',maxHeight:'80vh',overflowY:'auto'}}>
        {/* View title */}
        {editMode==='view_title'&&<>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'8px'}}>{t.editNameLbl}</div>
          <div style={{fontSize:'18px',fontWeight:'700',color:plan.name?c.T:c.M,fontFamily:"'Syne',serif",lineHeight:1.4,wordBreak:'break-word'}}>{plan.name||t.untitled}</div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',marginTop:'16px',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.closeLbl||'Close'}</button>
        </>}
        {/* View desc */}
        {editMode==='view_desc'&&<>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'8px'}}>{t.editDescLbl}</div>
          <div style={{fontSize:'14px',color:plan.desc?c.T:c.M,lineHeight:1.6,wordBreak:'break-word',fontStyle:plan.desc?'normal':'italic'}}>{plan.desc||(t.noDesc)}</div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',marginTop:'16px',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.closeLbl||'Close'}</button>
        </>}
        {/* Edit title */}
        {editMode==='title'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editNameLbl}</div>
          <div style={{marginBottom:'16px'}}><input value={editState.name||''} onChange={e=>setEditState('name',e.target.value.slice(0,100))} maxLength={100} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
            <button onClick={async()=>{const up={...plan,name:(editState.name||'').trim()||null};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.saveLbl||'Save'}</button>
          </div>
        </>}
        {/* Edit desc */}
        {editMode==='desc'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editDescLbl}</div>
          <div style={{marginBottom:'16px'}}><textarea value={editState.desc||''} onChange={e=>setEditState('desc',e.target.value.slice(0,500))} maxLength={500} rows={3} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical'}}/></div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
            <button onClick={async()=>{const up={...plan,desc:(editState.desc||'').trim()||null};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.saveLbl||'Save'}</button>
          </div>
        </>}
        {/* Edit date — replace the single date */}
        {editMode==='dates'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>📅 {t.editDatesLbl}</div>
          <CalendarPicker selected={plan.dates||[]} onChange={async d=>{const sel=d.find(x=>!(plan.dates||[]).includes(x));if(!sel)return;const up={...plan,dates:[sel],date:sel};await updatePlan(up);setPlan(up);}} max={2} c={c} lang={lang}/>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',marginTop:'12px',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.doneLbl||'Done'}</button>
        </>}
        {/* Edit stop */}
        {typeof editMode==='string'&&editMode.startsWith('stop_')&&(()=>{
          const stopId=editMode.replace('stop_','');
          const s=(plan.stops||[]).find(x=>x.id==stopId||String(x.id)===stopId);if(!s)return null;
          const opt=s.options?.[0]||s;const si=(plan.stops||[]).indexOf(s);
          const inpSt={width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'};
          const updateStop=async(field,val,optField)=>{
            const stops=[...(plan.stops||[])];const idx=stops.findIndex(x=>x.id==stopId||String(x.id)===stopId);if(idx<0)return;
            if(optField){stops[idx]={...stops[idx],options:stops[idx].options.map((o,oi)=>oi===0?{...o,[field]:val}:o)};}
            else{stops[idx]={...stops[idx],[field]:val};}
            // Cascade: when duration changes, auto-update next stop's startTime
            if(field==='duration'&&val){const cur=stops[idx];const curStart=cur.startTime||(idx===0?(plan.time||plan.startTimes?.[0]):null);if(curStart){const endT=calcEnd(curStart,val);if(endT&&idx+1<stops.length){stops[idx+1]={...stops[idx+1],startTime:endT};}}}
            const up={...plan,stops};await updatePlan(up);setPlan(up);
          };
          const searchPlace=async(q,field)=>{if(!q||q.length<2){setEditState(field,[]);return;}try{const Place=window.google?.maps?.places?.Place;if(Place){if(google.maps.importLibrary)await google.maps.importLibrary('places');const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location','rating','userRatingCount','priceLevel','photos','websiteURI','googleMapsURI','types'],maxResultCount:5});setEditState(field,(places||[]).map(p=>({name:p.displayName||'',address:p.formattedAddress||'',lat:p.location?.lat(),lng:p.location?.lng(),rating:p.rating||null,ratingCount:p.userRatingCount||null,priceLevel:p.priceLevel??null,photo:p.photos?.[0]?.getURI?.({maxWidth:400})||null,website:p.websiteURI||null,googleMapsURI:p.googleMapsURI||null,types:p.types||[]})));}else{const svc=new window.google.maps.places.PlacesService(document.createElement('div'));svc.textSearch({query:q},(r2,st)=>{if(st==='OK')setEditState(field,(r2||[]).slice(0,5).map(p=>({name:p.name||'',address:p.formatted_address||'',lat:p.geometry?.location?.lat(),lng:p.geometry?.location?.lng(),rating:p.rating||null,ratingCount:p.user_ratings_total||null,photo:p.photos?.[0]?.getUrl?.({maxWidth:400})||null})));});}}catch{setEditState(field,[]);}};
          const pickVenue=async(r)=>{const stops2=[...(plan.stops||[])];const idx2=stops2.findIndex(x=>x.id==stopId||String(x.id)===stopId);if(idx2<0)return;const fields2=['name','address','lat','lng','rating','ratingCount','priceLevel','photo','website','googleMapsURI','types'];const newOpt={...stops2[idx2].options[0]};fields2.forEach(k=>{if(r[k]!==undefined&&r[k]!==null)newOpt[k]=r[k];});stops2[idx2]={...stops2[idx2],options:[newOpt,...stops2[idx2].options.slice(1)]};const up={...plan,stops:stops2};await updatePlan(up);setPlan(up);setEditState('venueResults',[]);setEditState('venueSearch','');};
          const searchMP=async(q)=>searchPlace(q,'mpResults');
          const pickMP=async(r)=>{const stops2=[...(plan.stops||[])];const idx=stops2.findIndex(x=>x.id==stopId||String(x.id)===stopId);if(idx<0)return;stops2[idx]={...stops2[idx],meetingPoint:r.name+(r.address?' — '+r.address:''),meetingPointLat:r.lat,meetingPointLng:r.lng};const up={...plan,stops:stops2};await updatePlan(up);setPlan(up);setEditState('mpResults',[]);setEditState('mpSearch','');};
          const isFirstStop=si===0;
          const cancelStop=async()=>{
            const stopsNamed=(plan.stops||[]).filter(x=>(x.options||[]).some(o=>o.name));
            const isFirst=stopsNamed[0]&&(stopsNamed[0].id==stopId||String(stopsNamed[0].id)===stopId);
            const msg=isFirst&&stopsNamed.length>1
              ?(t.cancelFirstStopWarn||'The next stop will become #1. It keeps its own start time. The meeting point will be removed.')
              :(t.delConfirm2||'Delete this stop?');
            if(!confirm(msg))return;
            const newStops=(plan.stops||[]).filter(x=>x.id!=stopId&&String(x.id)!==stopId);
            // If first stop was canceled, remove meeting point from old stop (it's gone) — new first stop has no meeting point by default
            if(isFirst&&newStops.length>0){
              newStops[0]={...newStops[0],meetingPoint:'',meetingPointLat:null,meetingPointLng:null,meetingMinsBefore:''};
            }
            const log=[...(plan.changeLog||[]),{at:new Date().toISOString(),type:'cancel_stop',desc:`Canceled stop: ${opt.name||si+1}`}];
            const up={...plan,stops:newStops,changeLog:log};
            await updatePlan(up);setPlan(up);setEditMode(false);
          };
          return<>
            <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editLbl} — {t.stopLbl||'Stop'} {si+1}</div>
            {opt.photo&&<img src={opt.photo} alt={opt.name||'Venue'} style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'10px',marginBottom:'10px'}}/>}
            {isOrg?<>
              {/* 1. Google Maps search */}
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>🔍 {t.searchPlacePh||'Search a place...'}</div>
                <div style={{display:'flex',gap:'6px'}}><input value={editState.venueSearch||''} onChange={e=>setEditState('venueSearch',e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchPlace(editState.venueSearch,'venueResults');}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1}}/><button onClick={()=>searchPlace(editState.venueSearch,'venueResults')} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 12px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button></div>
                {(editState.venueResults||[]).length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginTop:'4px',maxHeight:'180px',overflowY:'auto'}}>{editState.venueResults.map((r,ri)=><div key={ri} onClick={()=>pickVenue(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:ri<editState.venueResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div>{r.rating&&<span style={{fontSize:'10px',color:mc}}>⭐{r.rating}</span>}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
              </div>
              {/* 2. Name + Address (editable, auto-filled by search) */}
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.editNameLbl}</div><input defaultValue={opt.name||''} onBlur={e=>updateStop('name',e.target.value.trim(),true)} style={inpSt}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.addressLbl||'Address'}</div><input defaultValue={opt.address||''} onBlur={e=>updateStop('address',e.target.value.trim(),true)} style={inpSt}/></div>
              {/* 3. Date (CalendarPicker) */}
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>📅 {t.editDatesLbl||'Date'}</div>
                <CalendarPicker selected={planDate?[planDate]:[]} onChange={async d=>{const sel=d[d.length-1];if(!sel)return;const newDates=(plan.dates||[]).map(x=>x===planDate?sel:x);if(!newDates.includes(sel))newDates[0]=sel;const up={...plan,dates:newDates.sort(),date:newDates[0]};await updatePlan(up);setPlan(up);}} max={1} c={c} lang={lang}/>
              </div>
              {/* 4. Time (ClockPicker) */}
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>🕐 {si>0?(t.startTimeLbl||'Start'):(t.editTimesLbl||'Time')}{(si>0?s.startTime:planTime)?` → ${si>0?s.startTime:planTime}`:''}</div>
                <ClockPicker value={si>0?(s.startTime||''):(planTime||'')} onChange={async v=>{if(si>0){updateStop('startTime',v);}else{const up={...plan,startTimes:[v,...(plan.startTimes||[]).slice(1)],time:v};await updatePlan(up);setPlan(up);}}} c={c}/>
              </div>
              {/* 4. Duration + Tolerance in one row */}
              <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
                <div style={{flex:'1 1 90px',minWidth:'90px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>⏱️ {t.durationLbl||'Duration'}</div><select value={s.duration||''} onChange={e=>updateStop('duration',e.target.value)} style={{...inpSt,width:'100%',padding:'6px 8px',fontSize:'12px',cursor:'pointer'}}><option value="">—</option><option value="30min">30m</option><option value="1h">1h</option><option value="1h30">1h30</option><option value="2h">2h</option><option value="3h">3h</option><option value="4h+">4h+</option></select></div>
                {isFirstStop&&<div style={{flex:'1 1 80px',minWidth:'80px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>⏰ {t.toleranceLbl||'Tolerance'}</div><div style={{display:'flex',alignItems:'center',gap:'4px'}}><input type="number" min="0" max="120" defaultValue={s.tolerance||''} onBlur={e=>updateStop('tolerance',e.target.value)} placeholder="15" style={{...inpSt,width:'100%',padding:'6px 8px',fontSize:'12px'}}/></div></div>}
              </div>
              {s.duration&&(s.startTime||planTime)&&(()=>{const st2=s.startTime||planTime;const[h2,m2]=st2.split(':').map(Number);const mins2={['30min']:30,['1h']:60,['1h30']:90,['2h']:120,['3h']:180,['4h+']:240}[s.duration]||0;const ed=new Date(2000,0,1,h2,m2+mins2);return<div style={{fontSize:'11px',color:c.M2,marginBottom:'10px'}}>{t.endsAtLbl||'Ends'}: {String(ed.getHours()).padStart(2,'0')}:{String(ed.getMinutes()).padStart(2,'0')}</div>;})()}
              {si>0&&!s.startTime&&<div style={{fontSize:'10px',color:'#f59e0b',marginBottom:'10px'}}>⚠️ {t.noStartTimeHint||'Set duration on previous stop'}</div>}
              {/* 4. Meeting point — only first stop */}
              {isFirstStop&&<div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.meetingPointLbl2||'Meeting point'}</div>
                {s.meetingPoint&&<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'8px',marginBottom:'6px'}}><span style={{flex:1,fontSize:'13px',color:c.T}}>{s.meetingPoint}</span><button onClick={()=>updateStop('meetingPoint','')} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px'}}>×</button></div>}
                <div style={{display:'flex',gap:'6px'}}><input value={editState.mpSearch} onChange={e=>setEditState('mpSearch',e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(editState.mpSearch);}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1}}/><button onClick={()=>searchMP(editState.mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 12px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button></div>
                {editState.mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginTop:'4px',maxHeight:'150px',overflowY:'auto'}}>{editState.mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<editState.mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
                {s.meetingPoint&&<div style={{marginTop:'6px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.minBeforeLbl||'Min before'}</div><input type="number" min="0" max="120" defaultValue={s.meetingMinsBefore||''} onBlur={e=>updateStop('meetingMinsBefore',e.target.value)} placeholder="10" style={{...inpSt,width:'80px'}}/></div>}
              </div>}
              {/* 5. Capacity — last */}
              <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.minCapLbl||'Min'}</div><input type="number" min="0" defaultValue={s.minAttendees||''} onBlur={e=>updateStop('minAttendees',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.maxCapLbl||'Max'}</div><input type="number" min="0" defaultValue={s.maxCapacity||''} onBlur={e=>updateStop('maxCapacity',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
              </div>
              {/* Notes */}
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.notesLbl||'Notes'}</div><input defaultValue={s.notes||''} onBlur={e=>updateStop('notes',e.target.value.trim())} style={inpSt}/></div>
            </>:<>
              {opt.name&&<div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{opt.name}</div>}
              {opt.address&&<div style={{fontSize:'13px',color:c.M2,marginBottom:'6px'}}>📍 {opt.address}</div>}
              <VenueInfo stop={opt} c={c} lang={lang}/>
            </>}
            {opt.googleMapsURI&&<a href={opt.googleMapsURI} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:'6px',marginBottom:'10px',fontSize:'12px',color:mc,textDecoration:'none'}}>Google Maps ↗</a>}
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              {isOrg&&<button onClick={cancelStop} style={{padding:'10px 16px',background:'#ff444420',border:'1px solid #ff444440',borderRadius:'10px',color:'#ff4444',cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'13px'}}>🗑️</button>}
              <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'10px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.doneLbl||'Done'}</button>
            </div>
          </>;
        })()}
      </div>
    </div>}

    {newRespAlert&&<div style={{position:'fixed',top:'70px',left:'50%',transform:'translateX(-50%)',background:mc,color:'#0A0A0A',padding:'10px 18px',borderRadius:'30px',fontWeight:'700',fontSize:'13px',zIndex:200,boxShadow:'0 4px 20px rgba(0,0,0,.4)',whiteSpace:'nowrap',animation:'slideDown .3s ease'}}>💬 {`${t.newRespFrom?.replace('{name}',newRespAlert)}`}</div>}
    <div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
      <Back onClick={onBack} label={t.back} c={c}/>
      <PostPlanSurvey plan={plan} c={c} lang={lang} mc={mc}/>
      {/* Countdown */}
      {plan.confirmedDate&&du!=null&&du>=0&&du<=3&&<div style={{background:`${mc}15`,border:`1px solid ${mc}40`,borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
        <div style={{fontSize:'20px'}}>{du===0?'🎉':du===1?'⏰':'📅'}</div>
        <div><div style={{fontSize:'13px',fontWeight:'700',color:mc}}>{du===0?t.itsToday:du===1?t.tomorrowLbl:`${du} ${t.daysLbl} ⏳`}</div>
        <div style={{fontSize:'12px',color:c.M2,textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}</div></div>
      </div>}
      {/* Action buttons */}
      <div style={{display:'flex',gap:'5px',marginBottom:'10px'}}>
        <button aria-label="Share on WhatsApp" onClick={()=>{const url=shareUrl;const txt=`${t.respondToPlan?.replace('{name}',plan.name||'queda.')}\n${url}`;window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');}} title={t.shareWATitle} style={{background:'#25D36618',border:'1px solid #25D36640',borderRadius:'8px',padding:'6px 10px',color:'#25D366',cursor:'pointer',fontSize:'13px'}}>💬</button>
        <button aria-label="Copy link" onClick={copyShare} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.copyLinkTitle}>🔗</button>
        <button aria-label="Refresh" onClick={()=>helpers.refresh()} title={t.refreshResp} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}}>↻</button>
      </div>
      {/* Title + Description */}
      <div style={{marginBottom:'4px'}}>
        <div style={{display:'flex',alignItems:'flex-start'}}>
          <h2 onClick={()=>setEditMode('view_title')} style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:plan.name?c.T:c.M,margin:0,lineHeight:1.2,cursor:'pointer'}}>{plan.name&&plan.name.length>60?plan.name.slice(0,60)+'…':plan.name||t.untitled}{plan.name&&plan.name.length>60?<span style={{fontSize:'12px',fontWeight:'500',color:mc,marginLeft:'4px'}}>{t.seeMore}</span>:null}</h2>
          {isOrg&&<button aria-label="Edit title" onClick={()=>{setEditState('name',plan.name||'');setEditMode('title');}} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0,marginLeft:'8px',marginTop:'2px'}}>✏️</button>}
        </div>
        <div style={{display:'flex',alignItems:'flex-start',marginTop:'4px'}}>
          <span onClick={()=>setEditMode('view_desc')} style={{fontSize:'13px',color:plan.desc?c.M2:c.M,fontStyle:plan.desc?'normal':'italic',cursor:'pointer'}}>{plan.desc&&plan.desc.length>120?plan.desc.slice(0,120)+'…':plan.desc||(t.noDesc)}</span>
          {plan.desc&&plan.desc.length>120&&<span onClick={()=>setEditMode('view_desc')} style={{fontSize:'12px',color:mc,cursor:'pointer',marginLeft:'4px'}}>{t.seeMore}</span>}
          {isOrg&&<button aria-label="Edit description" onClick={()=>{setEditState('desc',plan.desc||'');setEditMode('desc');}} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0,marginLeft:'8px'}}>✏️</button>}
        </div>
      </div>
      <div style={{fontSize:'13px',color:c.M2,margin:'6px 0 12px'}}>{total} {total===1?t.responses:t.responsesP} · <span style={{color:mc,fontWeight:'700',letterSpacing:'.1em'}}>{plan.id}</span></div>
      {/* Confirmed date */}
      {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'14px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.confirmedDate}</div><div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}</div></div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {isOrg&&<button onClick={waConfirm} style={{background:'#25D366',border:'none',borderRadius:'10px',padding:'8px 12px',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>{t.notifyGrp}</button>}
          <button onClick={waRem} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 12px',color:remSent?mc:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{remSent?t.remSent:t.sendRem}</button>
          <button onClick={()=>generateICS(plan,lang)} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 10px',color:c.M2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}} title={t.addToCalendar}>📅 .ics</button>
          {generateGCalURL(plan)&&<button onClick={()=>window.open(generateGCalURL(plan),'_blank')} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 10px',color:c.M2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}} title={t.addToGCal||'Google Calendar'}>📅 Google</button>}
        </div>
      </div>}
      {/* Tabs */}
      {ldg&&<div style={{padding:'16px'}}>{[1,2,3].map(i=><div key={i} style={{marginBottom:'12px'}}><div style={{height:'14px',background:c.CARD2,borderRadius:'6px',width:i===1?'60%':'80%',marginBottom:'8px',animation:'pulse 1.5s ease infinite'}}/></div>)}</div>}
      <div style={{display:'flex',gap:'5px',overflowX:'auto',paddingBottom:'4px',marginBottom:'20px'}}>
        {TABS.map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{padding:'7px 11px',borderRadius:'20px',border:`1px solid ${tab===tb?mc+'60':c.BD}`,background:tab===tb?`${mc}15`:c.CARD,color:tab===tb?mc:c.M2,fontSize:'12px',fontWeight:tab===tb?'700':'400',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{tlbl(tb)}</button>)}
      </div>
      {!ldg&&tab==='plan'&&<PlanTab/>}
      {!ldg&&tab==='vote'&&<VoteTab plan={plan} rs={rs} total={total} c={c} mc={mc} lang={lang} t={t} openSection={openSection} setOpenSection={setOpenSection}/>}
      {!ldg&&tab==='result'&&<ResultTab plan={plan} rs={rs} total={total} c={c} mc={mc} lang={lang} t={t} isOrg={isOrg} confirmDate={confirmDate} conf={editState.conf}/>}
      {!ldg&&tab==='more'&&<MoreTab plan={plan} rs={rs} c={c} mc={mc} lang={lang} t={t} shareUrl={shareUrl} waShare={waShare} copyShare={copyShare}/>}
    </div>
  </>);
}

export default function Results({plan,onBack,isOrg,c,lang,showShare,onCloseShare,authUser,profile}){
  return<ResultsProvider plan={plan} isOrg={isOrg} c={c} lang={lang} authUser={authUser} profile={profile}>
    <ResultsInner onBack={onBack}/>
  </ResultsProvider>;
}
