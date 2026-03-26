import React, { useState } from 'react'
import T from '../constants/translations.js'
import { updatePlan } from '../lib/supabase.js'
import { fmtShort, fmtTime, fmtDate, daysUntil } from '../lib/utils.js'
import { Btn, Back } from '../components/ui.jsx'
import PostPlanSurvey from '../components/PostPlanSurvey.jsx'
import { generateICS } from '../lib/ics.js'
import VenueInfo from '../components/VenueInfo.jsx'
import ClockPicker from '../components/ClockPicker.jsx'
import ResultsProvider, { useResults, addMins, fmtMinsToH } from '../components/ResultsContext.jsx'
import PlanTab from '../components/tabs/PlanTab.jsx'
import VoteTab from '../components/tabs/VoteTab.jsx'
import ResultTab from '../components/tabs/ResultTab.jsx'
import MoreTab from '../components/tabs/MoreTab.jsx'

function ResultsInner({onBack}){
  const{planState,editState,setEditState,ui,helpers,myVote}=useResults();
  const{plan,setPlan,rs,total,isOrg,ldg}=planState;
  const{tab,setTab,openSection,setOpenSection,newRespAlert,autoConfirmPending,setAutoConfirmPending,remSent}=ui;
  const{mc,c,t,lang,planDate,planTime,confirmDate,shareUrl,waShare,waConfirm,waRem,copyShare}=helpers;
  const[planRating,setPlanRating]=useState(0);
  const[ratingDone,setRatingDone]=useState(false);
  const du=plan.confirmedDate?daysUntil(plan.confirmedDate):null;
  const TABS=['plan','vote','result','more'];
  const tlbl=k=>t.tabs?.[k]||k;

  // Edit modal helpers
  const{mode:editMode}=editState;
  const setEditMode=v=>setEditState('mode',v);

  return(<>
    {/* Auto-confirm modal */}
    {autoConfirmPending&&<div role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape')setAutoConfirmPending(null);}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setAutoConfirmPending(null)}>
      <div onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}}>
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
      <div onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'400px',maxHeight:'80vh',overflowY:'auto'}}>
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
        {/* Edit dates */}
        {editMode==='dates'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editDatesLbl}</div>
          <div style={{marginBottom:'12px'}}>
            <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>📅 ({(plan.dates||[]).length}/3)</div>
            {(plan.dates||[]).length<3&&<input type="date" min={new Date().toISOString().split('T')[0]} onChange={async e=>{if(!e.target.value||(plan.dates||[]).includes(e.target.value))return;const up={...plan,dates:[...(plan.dates||[]),e.target.value].sort()};await updatePlan(up);setPlan(up);e.target.value='';}} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'10px'}}/>}
          </div>
          {(plan.dates||[]).map(d=>{const dt=plan.dateTimes||{};const times2=(dt[d]||(plan.startTimes||[])).filter(Boolean);return<div key={d} style={{marginBottom:'14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span style={{fontSize:'13px',color:mc,fontWeight:'600',textTransform:'capitalize'}}>📅 {fmtShort(d,lang)}</span>
              <button onClick={async()=>{if((plan.dates||[]).length<=1)return;const newDt={...(plan.dateTimes||{})};delete newDt[d];const up={...plan,dates:plan.dates.filter(x=>x!==d),dateTimes:newDt};await updatePlan(up);setPlan(up);}} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px',padding:'8px',minWidth:'36px',minHeight:'36px'}}>{(plan.dates||[]).length>1?'×':''}</button>
            </div>
            <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>🕐 {t.editTimesLbl} ({times2.length}/2)</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>{times2.map(t2=><span key={t2} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`,display:'flex',alignItems:'center',gap:'4px'}}>{fmtTime(t2)}<button onClick={async()=>{const newDt={...(plan.dateTimes||{}),[d]:times2.filter(x=>x!==t2)};const up={...plan,dateTimes:newDt};await updatePlan(up);setPlan(up);}} style={{background:'none',border:'none',color:mc,cursor:'pointer',fontSize:'12px',padding:'0 0 0 2px'}}>×</button></span>)}</div>
            {times2.length<2&&<ClockPicker value='' onChange={async v=>{if(!v||times2.includes(v))return;const newDt={...(plan.dateTimes||{}),[d]:[...times2,v]};const up={...plan,dateTimes:newDt};await updatePlan(up);setPlan(up);}} c={c}/>}
          </div>;})}
          <div style={{marginBottom:'14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px'}}>
            <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>⏰ {t.deadlineLbl||'Deadline'}</div>
            <input type="datetime-local" min={new Date().toISOString().slice(0,16)} max={(plan.date||plan.dates?.[0]||'')+'T23:59'} value={plan.deadline||''} onChange={async e=>{const up={...plan,deadline:e.target.value||null};await updatePlan(up);setPlan(up);}} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            {plan.deadline&&<button onClick={async()=>{const up={...plan,deadline:null};await updatePlan(up);setPlan(up);}} style={{marginTop:'4px',background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>× {t.removeDeadline||'Remove'}</button>}
          </div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.doneLbl||'Done'}</button>
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
            const up={...plan,stops};await updatePlan(up);setPlan(up);
          };
          const searchMP=async(q)=>{if(!q||q.length<2){setEditState('mpResults',[]);return;}try{const Place=window.google?.maps?.places?.Place;if(Place){const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location'],maxResultCount:5});setEditState('mpResults',(places||[]).map(p=>({name:p.displayName,address:p.formattedAddress,lat:p.location?.lat(),lng:p.location?.lng()})));}else{const svc=new window.google.maps.places.PlacesService(document.createElement('div'));svc.textSearch({query:q},(r2,st)=>{if(st==='OK')setEditState('mpResults',(r2||[]).slice(0,5).map(p=>({name:p.name,address:p.formatted_address,lat:p.geometry?.location?.lat(),lng:p.geometry?.location?.lng()})));});}}catch{setEditState('mpResults',[]);}};
          const pickMP=async(r)=>{const stops2=[...(plan.stops||[])];const idx=stops2.findIndex(x=>x.id==stopId||String(x.id)===stopId);if(idx<0)return;stops2[idx]={...stops2[idx],meetingPoint:r.name+(r.address?' — '+r.address:''),meetingPointLat:r.lat,meetingPointLng:r.lng};const up={...plan,stops:stops2};await updatePlan(up);setPlan(up);setEditState('mpResults',[]);setEditState('mpSearch','');};
          return<>
            <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editLbl} — {t.stopLbl||'Stop'} {si+1}</div>
            {opt.photo&&<img src={opt.photo} alt={opt.name||'Venue'} style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'10px',marginBottom:'10px'}}/>}
            {isOrg?<>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.editNameLbl}</div><input defaultValue={opt.name||''} onBlur={e=>updateStop('name',e.target.value.trim(),true)} style={inpSt}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.addressLbl||'Address'}</div><input defaultValue={opt.address||''} onBlur={e=>updateStop('address',e.target.value.trim(),true)} style={inpSt}/></div>
              <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.minCapLbl||'Min'}</div><input type="number" min="0" defaultValue={s.minAttendees||''} onBlur={e=>updateStop('minAttendees',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.maxCapLbl||'Max'}</div><input type="number" min="0" defaultValue={s.maxCapacity||''} onBlur={e=>updateStop('maxCapacity',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
              </div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>⏰ {t.toleranceLbl||'Tolerance'}</div><div style={{display:'flex',alignItems:'center',gap:'6px'}}><input type="number" min="0" max="120" defaultValue={s.tolerance||''} onBlur={e=>updateStop('tolerance',e.target.value)} placeholder="15" style={{...inpSt,width:'80px'}}/><span style={{fontSize:'11px',color:c.M}}>min</span>{s.tolerance&&<span style={{fontSize:'11px',color:c.M2}}>{fmtMinsToH(parseInt(s.tolerance))}</span>}</div></div>
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.meetingPointLbl2||'Meeting point'}</div>
                {s.meetingPoint&&<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'8px',marginBottom:'6px'}}><span style={{flex:1,fontSize:'13px',color:c.T}}>{s.meetingPoint}</span><button onClick={()=>updateStop('meetingPoint','')} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px'}}>×</button></div>}
                <div style={{display:'flex',gap:'6px'}}><input value={editState.mpSearch} onChange={e=>setEditState('mpSearch',e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(editState.mpSearch);}}} placeholder={t.searchPlacePh||'Search...'} style={{...inpSt,flex:1}}/><button onClick={()=>searchMP(editState.mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 12px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button></div>
                {editState.mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginTop:'4px',maxHeight:'150px',overflowY:'auto'}}>{editState.mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<editState.mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}}><div style={{color:c.T,fontWeight:'500'}}>{r.name}</div><div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div></div>)}</div>}
                {s.meetingPoint&&<div style={{marginTop:'6px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.minBeforeLbl||'Min before'}</div><input type="number" min="0" max="120" defaultValue={s.meetingMinsBefore||''} onBlur={e=>updateStop('meetingMinsBefore',e.target.value)} placeholder="10" style={{...inpSt,width:'80px'}}/></div>}
              </div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.notesLbl||'Notes'}</div><input defaultValue={s.notes||''} onBlur={e=>updateStop('notes',e.target.value.trim())} style={inpSt}/></div>
            </>:<>
              {opt.name&&<div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{opt.name}</div>}
              {opt.address&&<div style={{fontSize:'13px',color:c.M2,marginBottom:'6px'}}>📍 {opt.address}</div>}
              <VenueInfo stop={opt} c={c} lang={lang}/>
            </>}
            {opt.googleMapsURI&&<a href={opt.googleMapsURI} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:'6px',marginBottom:'10px',fontSize:'12px',color:mc,textDecoration:'none'}}>Google Maps ↗</a>}
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              {isOrg&&<button onClick={async()=>{if(!confirm(t.delConfirm2||'Delete?'))return;const up={...plan,stops:(plan.stops||[]).filter(x=>x.id!=stopId&&String(x.id)!==stopId)};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{padding:'10px 16px',background:'#ff444420',border:'1px solid #ff444440',borderRadius:'10px',color:'#ff4444',cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'13px'}}>🗑️</button>}
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
          <button onClick={()=>generateICS(plan,lang)} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 10px',color:c.M2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}} title={t.addToCalendar}>📅</button>
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

export default function Results({plan,onBack,isOrg,c,lang,showShare,onCloseShare}){
  return<ResultsProvider plan={plan} isOrg={isOrg} c={c} lang={lang}>
    <ResultsInner onBack={onBack}/>
  </ResultsProvider>;
}
