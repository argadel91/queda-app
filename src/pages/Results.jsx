import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'
import { db, updatePlan, loadResps, saveResp, savePlan } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { daysUntil, fmtDate, fmtShort, fmtTime, genId } from '../lib/utils.js'
import { Btn, Card, Lbl, Back } from '../components/ui.jsx'
import PostPlanSurvey from '../components/PostPlanSurvey.jsx'
import { generateICS } from '../lib/ics.js'
const RouteMap = React.lazy(() => import('../components/RouteMap.jsx'))
import VenueInfo from '../components/VenueInfo.jsx'
import ClockPicker from '../components/ClockPicker.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
const addMins=(time,mins)=>{if(!time)return'';const[h,m]=time.split(':').map(Number);const total=h*60+m+mins;const nh=Math.floor(((total%1440)+1440)%1440/60);const nm=((total%1440)+1440)%1440%60;return`${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;};
const fmtMinsToH=(mins)=>{const h=Math.floor(Math.abs(mins)/60);const m=Math.abs(mins)%60;return`${mins>=0?'+':'-'}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}h`;};

export default function Results({plan:ip,onBack,isOrg,c,lang,showShare,onCloseShare}){
  const[plan,setPlan]=useState(ip);const t=T[lang];
  const mc=c.A;
  const[tab,setTab]=useState('plan');const[rs,setRs]=useState([]);const[ldg,setL]=useState(true);
  const[conf,setConf]=useState(false);const[remSent,setRem]=useState(false);
  const[newRespAlert,setAlert]=useState(null);
  const[autoConfirmPending,setAutoConfirmPending]=useState(null);
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState(ip.name);
  const[editDesc,setEditDesc]=useState(ip.desc||'');
  const[attendance,setAttendance]=useState(ip.attendance||{});
  const[openSection,setOpenSection]=useState({});
  // Inline response state (invitee votes from Plan tab)
  const myRespKey='q_myresp_'+ip.id;
  const[myPrev,setMyPrev]=useState(ls.get(myRespKey,null));
  const[myPlaceOk,setMyPlaceOk]=useState(myPrev?.placeOk??null);
  const[myPlaceComment,setMyPlaceComment]=useState(myPrev?.placeComment||'');
  const[myDateOk,setMyDateOk]=useState(myPrev?.dateOk??null);
  const[myTimeOk,setMyTimeOk]=useState(myPrev?.timeOk??null);
  const[myMeetOk,setMyMeetOk]=useState(myPrev?.meetOk??null);
  const[myLateMin,setMyLateMin]=useState(myPrev?.lateMin||0);
  const[myAltDates,setMyAltDates]=useState(myPrev?.availDates||[]);
  const[myTimeFrom,setMyTimeFrom]=useState(myPrev?.availTimeFrom||'');
  const[myTimeTo,setMyTimeTo]=useState(myPrev?.availTimeTo||'');
  const[myName,setMyName]=useState(myPrev?.name||ls.get('q_myname',''));
  const[mpSearch,setMpSearch]=useState('');const[mpResults,setMpResults]=useState([]);
  const[mySaving,setMySaving]=useState(false);
  const[mySaved,setMySaved]=useState(!!myPrev);
  const[mySaveConfirm,setMySaveConfirm]=useState(false);
  const[,forceUpdate]=useState(0);
  useEffect(()=>{if(!ip.deadline)return;const iv=setInterval(()=>forceUpdate(n=>n+1),1000);return()=>clearInterval(iv);},[ip.deadline]);
  const[planRating,setPlanRating]=useState(0);
  const[ratingDone,setRatingDone]=useState(false);
  const isOrgRef=useRef(isOrg);
  const prevCountRef=useRef(null);
  const refreshRef=useRef(null);
  refreshRef.current=async(silent=false)=>{
    if(!silent)setL(true);
    const newRs=await loadResps(plan.id);
    if(silent&&prevCountRef.current!==null&&newRs.length>prevCountRef.current){
      const added=newRs.filter(r=>!rs.find(x=>x.name===r.name));
      if(added.length>0){
        const who=added[added.length-1].name;
        setAlert(who);
        setTimeout(()=>setAlert(null),4000);
        if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
          new Notification(plan.name||'queda.',{body:((T[plan.lang]?.newRespNotif||'New response from')+' '+who)});
        }
      }
    }
    prevCountRef.current=newRs.length;
    setRs(newRs);
    if(isOrgRef.current&&plan.autoConfirm&&!plan.confirmedDate){
      const cntYFn=key=>newRs.filter(r=>r.avail?.[key]==='yes').length;
      const autoSlot=slots.find(s=>cntYFn(s.key)>=plan.autoConfirmN);
      if(autoSlot&&!autoConfirmPending)setAutoConfirmPending(autoSlot);
    }
    if(!silent)setL(false);
  };
  const refresh=(silent)=>refreshRef.current(silent);
  useEffect(()=>{refresh();},[plan.id]);
  useEffect(()=>{
    const channel=db.channel('responses-'+plan.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'responses',filter:'plan_id=eq.'+plan.id},()=>refresh(true))
      .subscribe();
    return()=>{db.removeChannel(channel);};
  },[plan.id]);
  // Deadline auto-confirmation
  useEffect(()=>{
    if(plan.deadline&&!plan.confirmedDate&&new Date(plan.deadline)<new Date()){
      const cntYFn=key=>rs.filter(r=>r.avail?.[key]==='yes').length;
      const cntNFn=key=>rs.filter(r=>r.avail?.[key]==='no').length;
      const scoreFn=key=>cntYFn(key)-cntNFn(key);
      const bestSlot=rs.length>0&&slots.length>0?slots.reduce((b,s)=>scoreFn(s.key)>scoreFn(b.key)?s:b,slots[0]):null;
      if(bestSlot&&cntYFn(bestSlot.key)>0&&isOrgRef.current){
        confirmDate(bestSlot.date,bestSlot.startTime);
      }
    }
  },[rs]);
  const total=rs.length;
  // Build all voteable slots
  const slots=[];
  (plan.dates||[]).forEach(d=>{
    const times=(plan.startTimes?.length&&plan.startTimes.some(t=>t))?plan.startTimes.filter(t=>t):[''];
    times.forEach(st=>{
      const key=st?`${d}_${st}`:d;
      slots.push({key,date:d,startTime:st});
    });
  });
  const cntY=key=>rs.filter(r=>r.avail?.[key]==='yes').length;
  const cntN=key=>rs.filter(r=>r.avail?.[key]==='no').length;
  const score=key=>cntY(key)-cntN(key);
  const mx=Math.max(...slots.map(s=>cntY(s.key)),1);
  const best=total>0&&slots.length>0?slots.reduce((b,s)=>score(s.key)>score(b.key)?s:b,slots[0]):null;
  const budget=(plan.stops||[]).reduce((s,p2)=>s+(parseFloat(p2.cost)||0),0);
  // Auto-cancel points below minimum attendance
  const stopYesCount=(sid)=>rs.filter(r=>r.stopAttend?.[sid]==='yes').length;
  const cancelledStops=new Set((plan.stops||[]).filter(s=>{
    const min=parseInt(s.minAttendees);
    return min>0&&total>0&&stopYesCount(s.id)<min;
  }).map(s=>s.id));
  const firstActiveStop=(plan.stops||[]).find(s=>!cancelledStops.has(s.id));
  const giftPer=plan.gift?.price?parseFloat(plan.gift.price):0;
  const city=(()=>{
    if(plan.city&&!/^\d/.test(plan.city))return plan.city;
    const addr=plan.stops?.flatMap(s=>s.options||[]).find(o=>o?.address)?.address||plan.cityFull||'';
    const parts=addr.split(',').map(p=>p.trim()).filter(Boolean);
    const c=parts.slice(-3,-1).map(p=>p.replace(/^\d{4,6}\s*/,'').trim()).filter(Boolean);
    return c[0]||plan.city||'';
  })();
  const du=plan.confirmedDate?daysUntil(plan.confirmedDate):null;
  const confirmDate=async(d,st)=>{
    setConf(true);
    const log=[...(plan.changeLog||[]),{at:new Date().toISOString(),type:'confirm',desc:`Confirmed: ${d}${st?' '+st:''}`}];
    const up={...plan,confirmedDate:d,confirmedStartTime:st||'',changeLog:log};
    await updatePlan(up);setPlan(up);setConf(false);
  };
  const logChange=async(desc)=>{
    const log=[...(plan.changeLog||[]),{at:new Date().toISOString(),type:'edit',desc}];
    const up={...plan,changeLog:log};await updatePlan(up);setPlan(up);
  };
  const waConfirm=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`📌 *${plan.name}* — ${t.dateConfirmedMsg}\n\n🗓️ ${fmtDate(plan.confirmedDate,lang)}${plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}\n\n${url}`),'_blank');};
  const waRem=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`⏰ ${t.reminderMsg.replace('{name}',plan.name)}\n${url}`),'_blank');setRem(true);};
  const TABS=['plan','vote','result','more'];
  const tlbl=k=>t.tabs[k]||k;
  const shareUrl=location.href.split('?')[0]+'?code='+plan.id;
  const copyShare=()=>{navigator.clipboard?.writeText(shareUrl).catch(()=>{});};
  const waShare=()=>window.open('https://wa.me/?text='+encodeURIComponent(`${plan.name||'queda.'}\n${shareUrl}`),'_blank');
  // Save inline response
  const saveMyResp=async()=>{
    if(!myName.trim())return;
    setMySaving(true);
    const planDate=plan.date||plan.dates?.[0];const planTime=plan.time||plan.startTimes?.[0];
    const placeOk=myPlaceOk===true;
    const changeLog=[...(myPrev?.changeLog||[])];
    if(myPrev)changeLog.unshift({at:new Date().toISOString(),desc:'Updated'});
    const resp={name:myName.trim(),dateOk:myDateOk,timeOk:myTimeOk,meetOk:myMeetOk,lateMin:myLateMin,
      availDates:myDateOk===false?myAltDates:[],availTimeFrom:myTimeOk===false?myTimeFrom:'',availTimeTo:myTimeOk===false?myTimeTo:'',
      placeOk,placeComment:myPlaceComment,
      avail:myDateOk&&myTimeOk?{[planTime?`${planDate}_${planTime}`:planDate]:'yes'}:{},
      how:'',comment:myPrev?.comment||'',changeLog,at:new Date().toISOString()};
    try{
      await saveResp(plan.id,myName.trim(),resp);
      const{data:{user}}=await db.auth.getSession().then(s=>({data:{user:s.data?.session?.user}}));
      if(user)db.from('responses').update({user_id:user.id}).eq('plan_id',plan.id).eq('name',myName.trim()).then(()=>{},()=>{});
      addMyPlan(plan.id,plan.name,'invited');ls.set(myRespKey,resp);setMyPrev(resp);ls.set('q_myname',myName.trim());setMySaved(true);setMySaveConfirm(true);setTimeout(()=>setMySaveConfirm(false),3000);refresh(true);
    }catch(e){console.error('Save failed:',e);setMySaveConfirm(false);alert(t.saveError||'Could not save. Check your connection.');}
    setMySaving(false);
  };

  return(<>
    {/* Share modal */}
    {showShare&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onCloseShare}>
      <div onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'20px 20px 0 0',padding:'24px',width:'100%',maxWidth:'420px'}}>
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <div style={{fontSize:'40px',marginBottom:'8px'}}>🎉</div>
          <div style={{fontSize:'20px',fontWeight:'800',color:c.T,fontFamily:"'Syne',serif"}}>{t.planCreated}</div>
          <div style={{fontFamily:'monospace',fontSize:'36px',fontWeight:'900',color:mc,letterSpacing:'.15em',margin:'12px 0'}}>{plan.id}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={waShare} style={{flex:1,padding:'14px',background:'#25D366',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>WhatsApp</button>
            <button onClick={()=>window.open('https://t.me/share/url?url='+encodeURIComponent(shareUrl),'_blank')} style={{flex:1,padding:'14px',background:'#0088cc',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Telegram</button>
            <button onClick={()=>{copyShare();}} style={{flex:1,padding:'14px',background:c.CARD2,color:c.T,border:`1px solid ${c.BD}`,borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>🔗</button>
          </div>
          <button onClick={onCloseShare} style={{padding:'14px',background:mc,color:'#0A0A0A',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginTop:'4px'}}>{t.viewRes||'View results'} →</button>
        </div>
      </div>
    </div>}

    {autoConfirmPending&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setAutoConfirmPending(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:c.CARD,border:`1px solid ${mc}40`,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>⚡</div>
        <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'8px'}}>{t.autoConfirmTitle}</div>
        <div style={{fontSize:'14px',color:c.M2,marginBottom:'6px'}}>{cntY(autoConfirmPending.key)} {t.peopleSaid} {fmtShort(autoConfirmPending.date,lang)}{autoConfirmPending.startTime?' · '+autoConfirmPending.startTime:''}</div>
        <div style={{fontSize:'13px',color:c.M2,marginBottom:'20px'}}>{t.autoConfirmQ}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setAutoConfirmPending(null)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.notYet}</button>
          <button onClick={async()=>{await confirmDate(autoConfirmPending.date,autoConfirmPending.startTime);setAutoConfirmPending(null);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.confirmBtn}</button>
        </div>
      </div>
    </div>}
    {editMode&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setEditMode(false)}>
      <div onClick={e=>e.stopPropagation()} className="fade-in" style={{background:c.CARD,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'400px',maxHeight:'80vh',overflowY:'auto'}}>

        {/* View title (read-only) */}
        {editMode==='view_title'&&<>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'8px'}}>{t.editNameLbl}</div>
          <div style={{fontSize:'18px',fontWeight:'700',color:plan.name?c.T:c.M,fontFamily:"'Syne',serif",lineHeight:1.4,wordBreak:'break-word'}}>{plan.name||t.untitled}</div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',marginTop:'16px',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.closeLbl||'Close'}</button>
        </>}

        {/* View description (read-only) */}
        {editMode==='view_desc'&&<>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'8px'}}>{t.editDescLbl}</div>
          <div style={{fontSize:'14px',color:plan.desc?c.T:c.M,lineHeight:1.6,wordBreak:'break-word',fontStyle:plan.desc?'normal':'italic'}}>{plan.desc||(t.noDesc||'No description')}</div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',marginTop:'16px',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.closeLbl||'Close'}</button>
        </>}

        {/* Edit title */}
        {editMode==='title'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editNameLbl}</div>
          <div style={{marginBottom:'16px'}}><input value={editName} onChange={e=>setEditName(e.target.value)} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
            <button onClick={async()=>{const up={...plan,name:editName.trim()||null};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.saveLbl||'Save'}</button>
          </div>
        </>}

        {/* Edit description */}
        {editMode==='desc'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editDescLbl}</div>
          <div style={{marginBottom:'16px'}}><textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical'}}/></div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
            <button onClick={async()=>{const up={...plan,desc:editDesc.trim()||null};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.saveLbl||'Save'}</button>
          </div>
        </>}

        {/* Edit dates + times (per date) */}
        {editMode==='dates'&&<>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editDatesLbl}</div>
          {/* Add date */}
          <div style={{marginBottom:'12px'}}>
            <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>📅 ({(plan.dates||[]).length}/3)</div>
            {(plan.dates||[]).length<3&&<input type="date" min={new Date().toISOString().split('T')[0]} onChange={async e=>{if(!e.target.value||(plan.dates||[]).includes(e.target.value))return;const up={...plan,dates:[...(plan.dates||[]),e.target.value].sort()};await updatePlan(up);setPlan(up);e.target.value='';}} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'10px'}}/>}
          </div>
          {/* Per-date times */}
          {(plan.dates||[]).map(d=>{
            const dt=plan.dateTimes||{};
            const times2=(dt[d]||(plan.startTimes||[])).filter(Boolean);
            return<div key={d} style={{marginBottom:'14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontSize:'13px',color:mc,fontWeight:'600',textTransform:'capitalize'}}>📅 {fmtShort(d,lang)}</span>
                <button onClick={async()=>{if((plan.dates||[]).length<=1)return;const newDt={...dt};delete newDt[d];const up={...plan,dates:plan.dates.filter(x=>x!==d),dateTimes:newDt};await updatePlan(up);setPlan(up);}} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px',padding:'2px 6px'}}>{(plan.dates||[]).length>1?'×':''}</button>
              </div>
              <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>🕐 {t.editTimesLbl} ({times2.length}/2)</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
                {times2.map(t2=><span key={t2} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`,display:'flex',alignItems:'center',gap:'4px'}}>{fmtTime(t2)}<button onClick={async()=>{const newDt={...dt,[d]:times2.filter(x=>x!==t2)};const up={...plan,dateTimes:newDt};await updatePlan(up);setPlan(up);}} style={{background:'none',border:'none',color:mc,cursor:'pointer',fontSize:'12px',padding:'0 0 0 2px'}}>×</button></span>)}
              </div>
              {times2.length<2&&<ClockPicker value='' onChange={async v=>{if(!v||times2.includes(v))return;const newDt={...dt,[d]:[...times2,v]};const up={...plan,dateTimes:newDt};await updatePlan(up);setPlan(up);}} c={c}/>}
            </div>;
          })}
          {/* Deadline */}
          <div style={{marginBottom:'14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px'}}>
            <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>⏰ {t.deadlineLbl||'Deadline to respond'}</div>
            <input type="datetime-local" min={new Date().toISOString().slice(0,16)} max={(plan.date||plan.dates?.[0]||'')+'T23:59'} value={plan.deadline||''} onChange={async e=>{const up={...plan,deadline:e.target.value||null};await updatePlan(up);setPlan(up);}} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            {plan.deadline&&<button onClick={async()=>{const up={...plan,deadline:null};await updatePlan(up);setPlan(up);}} style={{marginTop:'4px',background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>× {t.removeDeadline||'Remove deadline'}</button>}
          </div>
          <button onClick={()=>setEditMode(false)} style={{width:'100%',padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.doneLbl||'Done'}</button>
        </>}

        {/* Edit specific point */}
        {typeof editMode==='string'&&editMode.startsWith('stop_')&&(()=>{
          const stopId=editMode.replace('stop_','');
          const s=(plan.stops||[]).find(x=>x.id==stopId||String(x.id)===stopId);
          if(!s)return null;
          const opt=s.options?.[0]||s;
          const si=(plan.stops||[]).indexOf(s);
          const inpSt={width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'};
          const searchMP=async(q)=>{
            if(!q||q.length<2){setMpResults([]);return;}
            try{
              const Place=window.google?.maps?.places?.Place;
              if(Place){const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location'],maxResultCount:5});setMpResults((places||[]).map(p=>({name:p.displayName,address:p.formattedAddress,lat:p.location?.lat(),lng:p.location?.lng()})));}
              else{const svc=new window.google.maps.places.PlacesService(document.createElement('div'));svc.textSearch({query:q},(r,s)=>{if(s==='OK')setMpResults((r||[]).slice(0,5).map(p=>({name:p.name,address:p.formatted_address,lat:p.geometry?.location?.lat(),lng:p.geometry?.location?.lng()})));});}
            }catch{setMpResults([]);}
          };
          const pickMP=async(r)=>{
            const stops=[...(plan.stops||[])];const idx=stops.findIndex(x=>x.id==stopId||String(x.id)===stopId);
            if(idx<0)return;
            stops[idx]={...stops[idx],meetingPoint:r.name+(r.address?' — '+r.address:''),meetingPointLat:r.lat,meetingPointLng:r.lng};
            const up={...plan,stops};await updatePlan(up);setPlan(up);setMpResults([]);setMpSearch('');
          };
          const updateStop=async(field,val,optField)=>{
            const stops=[...(plan.stops||[])];const idx=stops.findIndex(x=>x.id==stopId||String(x.id)===stopId);
            if(idx<0)return;
            if(optField){stops[idx]={...stops[idx],options:stops[idx].options.map((o,oi)=>oi===0?{...o,[field]:val}:o)};}
            else{stops[idx]={...stops[idx],[field]:val};}
            const up={...plan,stops};await updatePlan(up);setPlan(up);
          };
          return<>
            <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editLbl} — {t.stopLbl||'Stop'} {si+1}</div>
            {opt.photo&&<img src={opt.photo} alt="" style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'10px',marginBottom:'10px'}}/>}
            {isOrgRef.current?<>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.editNameLbl}</div><input defaultValue={opt.name||''} onBlur={e=>updateStop('name',e.target.value.trim(),true)} style={inpSt}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.addressLbl||'Address'}</div><input defaultValue={opt.address||''} onBlur={e=>updateStop('address',e.target.value.trim(),true)} style={inpSt}/></div>
              {/* Capacity */}
              <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.minCapLbl||'Min capacity'}</div><input type="number" min="0" defaultValue={s.minAttendees||''} onBlur={e=>updateStop('minAttendees',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>👥 {t.maxCapLbl||'Max capacity'}</div><input type="number" min="0" defaultValue={s.maxCapacity||''} onBlur={e=>updateStop('maxCapacity',e.target.value)} placeholder="—" style={{...inpSt,width:'100%'}}/></div>
              </div>
              {/* Tolerance (independent of meeting point) */}
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>⏰ {t.toleranceLbl||'Tolerance (max late)'}</div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <input type="number" min="0" max="120" defaultValue={s.tolerance||''} onBlur={e=>updateStop('tolerance',e.target.value)} placeholder="15" style={{...inpSt,width:'80px'}}/>
                  <span style={{fontSize:'11px',color:c.M}}>min</span>
                  {s.tolerance&&<span style={{fontSize:'11px',color:c.M2}}>{fmtMinsToH(parseInt(s.tolerance))}</span>}
                </div>
              </div>
              <div style={{marginBottom:'10px'}}>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.meetingPointLbl2||'Meeting point'}</div>
                {s.meetingPoint&&<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:`#f59e0b10`,border:'1px solid #f59e0b30',borderRadius:'8px',marginBottom:'6px'}}>
                  <span style={{flex:1,fontSize:'13px',color:c.T}}>{s.meetingPoint}</span>
                  <button onClick={()=>updateStop('meetingPoint','')} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px'}}>×</button>
                </div>}
                <div style={{display:'flex',gap:'6px'}}>
                  <input value={mpSearch} onChange={e=>setMpSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchMP(mpSearch);}}} placeholder={t.searchPlacePh||'Search a place... (Enter)'} style={{...inpSt,flex:1}}/>
                  <button onClick={()=>searchMP(mpSearch)} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 12px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button>
                </div>
                {mpResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',marginTop:'4px',maxHeight:'150px',overflowY:'auto'}}>
                  {mpResults.map((r,i)=><div key={i} onClick={()=>pickMP(r)} style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<mpResults.length-1?`1px solid ${c.BD}`:'none',fontSize:'12px'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{color:c.T,fontWeight:'500'}}>{r.name}</div>
                    <div style={{color:c.M2,fontSize:'11px'}}>{r.address}</div>
                  </div>)}
                </div>}
                {s.meetingPoint&&<div style={{marginTop:'6px'}}>
                  <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.minBeforeLbl||'Minutes before'}</div>
                  <input type="number" min="0" max="120" defaultValue={s.meetingMinsBefore||''} onBlur={e=>updateStop('meetingMinsBefore',e.target.value)} placeholder="10" style={{...inpSt,width:'80px'}}/>
                  {s.meetingMinsBefore&&<span style={{fontSize:'11px',color:c.M2,marginLeft:'6px'}}>{fmtMinsToH(-parseInt(s.meetingMinsBefore))}</span>}
                </div>}
              </div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.notesLbl||'Notes'}</div><input defaultValue={s.notes||''} onBlur={e=>updateStop('notes',e.target.value.trim())} style={inpSt}/></div>
            </>:<>
              {opt.name&&<div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{opt.name}</div>}
              {opt.address&&<div style={{fontSize:'13px',color:c.M2,marginBottom:'6px'}}>📍 {opt.address}</div>}
              <VenueInfo stop={opt} c={c} lang={lang}/>
            </>}
            {opt.googleMapsURI&&<a href={opt.googleMapsURI} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:'6px',marginBottom:'10px',fontSize:'12px',color:mc,textDecoration:'none'}}>Google Maps ↗</a>}
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              {isOrgRef.current&&<button onClick={async()=>{if(!confirm(t.delConfirm2||'Delete this stop?'))return;const up={...plan,stops:(plan.stops||[]).filter(x=>x.id!=stopId&&String(x.id)!==stopId)};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{padding:'10px 16px',background:'#ff444420',border:'1px solid #ff444440',borderRadius:'10px',color:'#ff4444',cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'13px'}}>🗑️</button>}
              <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'10px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.doneLbl||'Done'}</button>
            </div>
          </>;
        })()}
      </div>
    </div>}
    {newRespAlert&&<div style={{position:'fixed',top:'70px',left:'50%',transform:'translateX(-50%)',background:mc,color:'#0A0A0A',padding:'10px 18px',borderRadius:'30px',fontWeight:'700',fontSize:'13px',zIndex:200,boxShadow:'0 4px 20px rgba(0,0,0,.4)',whiteSpace:'nowrap',animation:'slideDown .3s ease'}}>💬 {`${t.newRespFrom.replace('{name}',newRespAlert)}`}</div>}
    <div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
      <Back onClick={onBack} label={t.back} c={c}/>
      <PostPlanSurvey plan={plan} c={c} lang={lang} mc={mc}/>
      {/* Countdown */}
      {plan.confirmedDate&&du!=null&&du>=0&&du<=3&&<div style={{background:`${mc}15`,border:`1px solid ${mc}40`,borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
        <div style={{fontSize:'20px'}}>{du===0?'🎉':du===1?'⏰':'📅'}</div>
        <div><div style={{fontSize:'13px',fontWeight:'700',color:mc}}>{du===0?(t.itsToday):du===1?(t.tomorrowLbl):`${du} ${t.daysLbl} ⏳`}</div>
        <div style={{fontSize:'12px',color:c.M2,textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}</div></div>
      </div>}
      {/* Action buttons row */}
      <div style={{display:'flex',gap:'5px',marginBottom:'10px'}}>
        <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;const txt=`${t.respondToPlan.replace('{name}',plan.name||'queda.')}\n${url}`;window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');}} title={t.shareWATitle} style={{background:'#25D36618',border:'1px solid #25D36640',borderRadius:'8px',padding:'6px 10px',color:'#25D366',cursor:'pointer',fontSize:'13px'}}>💬</button>
        <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;navigator.clipboard?.writeText(url);}} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.copyLinkTitle}>🔗</button>
        <button onClick={refresh} title={t.refreshResp} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}}>↻</button>
      </div>
      {/* Title + Description — pencils aligned right */}
      <div style={{marginBottom:'4px'}}>
        <div style={{display:'flex',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:plan.name?c.T:c.M,margin:0,lineHeight:1.2}}>{plan.name&&plan.name.length>60?plan.name.slice(0,60)+'…':plan.name||t.untitled}{plan.name&&plan.name.length>60?<span onClick={()=>setEditMode('view_title')} style={{fontSize:'12px',fontWeight:'500',color:mc,cursor:'pointer',marginLeft:'4px'}}>{t.seeMore||'see more'}</span>:null}</h2>
          </div>
          {isOrgRef.current&&<button onClick={()=>{setEditName(plan.name||'');setEditMode('title');}} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0,marginLeft:'8px',marginTop:'2px'}}>✏️</button>}
        </div>
        <div style={{display:'flex',alignItems:'flex-start',marginTop:'4px'}}>
          <div style={{flex:1,minWidth:0}}>
            <span style={{fontSize:'13px',color:plan.desc?c.M2:c.M,fontStyle:plan.desc?'normal':'italic',lineHeight:1.4}}>{plan.desc&&plan.desc.length>120?plan.desc.slice(0,120)+'…':plan.desc||(t.noDesc||'No description')}</span>
            {plan.desc&&plan.desc.length>120&&<span onClick={()=>setEditMode('view_desc')} style={{fontSize:'12px',color:mc,cursor:'pointer',marginLeft:'4px'}}>{t.seeMore||'see more'}</span>}
          </div>
          {isOrgRef.current&&<button onClick={()=>{setEditDesc(plan.desc||'');setEditMode('desc');}} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0,marginLeft:'8px'}}>✏️</button>}
        </div>
      </div>
      <div style={{fontSize:'13px',color:c.M2,margin:'6px 0 12px'}}>{total} {total===1?t.responses:t.responsesP} · <span style={{color:mc,fontWeight:'700',letterSpacing:'.1em'}}>{plan.id}</span></div>
      {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'14px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.confirmedDate}</div><div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}</div></div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {isOrgRef.current&&<button onClick={waConfirm} title={t.waGroupMsg} style={{background:'#25D366',border:'none',borderRadius:'10px',padding:'8px 12px',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>{t.notifyGrp}</button>}
          <button onClick={waRem} title={t.waReminderMsg} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 12px',color:remSent?mc:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{remSent?t.remSent:t.sendRem}</button>
          <button onClick={()=>generateICS(plan,lang)} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 10px',color:c.M2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}} title={t.addToCalendar}>📅</button>
        </div>
      </div>}
      {/* Smart summary for organizer */}
      {isOrgRef.current&&!ldg&&total>0&&!plan.confirmedDate&&(()=>{
        const topDate=best;const topY=topDate?cntY(topDate.key):0;const topN=topDate?cntN(topDate.key):0;
        const noResp=slots.length>0?rs.filter(r=>!slots.some(s=>r.avail?.[s.key]==='yes'||r.avail?.[s.key]==='no')).length:0;
        if(!topDate||topY===0)return null;
        const topLbl=fmtShort(topDate.date,lang)+(topDate.startTime?' · '+topDate.startTime:'');
        const msg=t.summaryMsg?t.summaryMsg(topY,total,topLbl,topN,noResp):`${topY} of ${total} can make ${topLbl}${topN>0?` · ${topN} no`:''}${noResp>0?` · ${noResp} yet to respond`:''}.`;
        return(<div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}>
          <div style={{fontSize:'14px',color:c.T,fontWeight:'500',lineHeight:1.4}}>{msg}</div>
          <Btn onClick={()=>confirmDate(topDate.date,topDate.startTime)} disabled={conf} sm c={c} accent={mc} style={{flexShrink:0,fontSize:'12px',padding:'8px 12px'}}>{conf?'...':t.confirmBtn2}</Btn>
        </div>);
      })()}
      {/* Deadline banner */}
      {plan.deadline&&!plan.confirmedDate&&(()=>{
        const dl=new Date(plan.deadline);
        const hoursLeft=(dl-Date.now())/3600000;
        if(hoursLeft<=0)return<div style={{background:'#ef444415',border:'1px solid #ef444440',borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',fontSize:'13px',color:'#ef4444',fontWeight:'600'}}>{t.deadlinePassed}...</div>;
        if(hoursLeft<=24)return<div style={{background:'#f59e0b15',border:'1px solid #f59e0b40',borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',fontSize:'13px',color:'#f59e0b',fontWeight:'600'}}>⏰ {t.deadlineIn} {Math.ceil(hoursLeft)} {t.hours}</div>;
        return null;
      })()}
      {/* Post-event: organizer attendance tracking */}
      {isOrgRef.current&&plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&!plan.attendanceMarked&&(
        <Card c={c} style={{marginBottom:'14px'}}>
          <Lbl c={c}>📋 {t.whoCame}</Lbl>
          {rs.filter(r=>{const cd=plan.confirmedDate;return Object.entries(r.avail||{}).some(([k,v])=>v==='yes'&&k.startsWith(cd));}).map((r,i)=>{
            const st=attendance[r.name]?.came;// true=came, false=didnt, 'unknown'=dunno, undefined=unmarked
            return(<div key={i} style={{padding:'10px 0',borderBottom:`1px solid ${c.BD}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{r.name}</span>
                <div style={{display:'flex',gap:'4px'}}>
                  {[{v:true,l:'✅',cl:'#22c55e'},{v:false,l:'❌',cl:'#ef4444'},{v:'unknown',l:'❓',cl:'#f59e0b'}].map(o=><button key={String(o.v)} onClick={()=>{const a={...attendance};a[r.name]={...a[r.name],came:o.v};setAttendance(a);}} style={{padding:'4px 10px',borderRadius:'8px',border:`1px solid ${st===o.v?o.cl+'60':c.BD}`,background:st===o.v?o.cl+'20':'transparent',color:st===o.v?o.cl:c.M2,cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>{o.l}</button>)}
                </div>
              </div>
              <div style={{display:'flex',gap:'2px'}}>
                {[1,2,3,4,5].map(s=><button key={s} onClick={()=>{const a={...attendance};a[r.name]={...a[r.name],stars:s};setAttendance(a);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:(attendance[r.name]?.stars||0)>=s?'#f59e0b':'#555',padding:'2px'}}>{(attendance[r.name]?.stars||0)>=s?'★':'☆'}</button>)}
              </div>
            </div>);
          })}
          <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
            <button onClick={()=>{const a={...attendance};rs.filter(r=>r.avail?.[plan.confirmedDate]==='yes').forEach(r=>{a[r.name]={...a[r.name],came:true};});setAttendance(a);}} style={{padding:'8px 14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{t.markAllCame}</button>
            <button onClick={()=>{const a={...attendance};rs.filter(r=>r.avail?.[plan.confirmedDate]==='yes').forEach(r=>{a[r.name]={...a[r.name],came:'unknown'};});setAttendance(a);}} style={{padding:'8px 14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{t.markAllUnknown||'❓ All unknown'}</button>
            <Btn onClick={async()=>{const up={...plan,attendance,attendanceMarked:true};await updatePlan(up);setPlan(up);}} sm c={c} accent={mc}>{t.saveAttendance}</Btn>
          </div>
        </Card>
      )}
      {plan.attendanceMarked&&plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&isOrgRef.current&&(
        <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'10px 16px',marginBottom:'14px',fontSize:'13px',color:mc,fontWeight:'600'}}>✅ {t.attendanceSaved}</div>
      )}
      {/* Post-event: plan rating for everyone */}
      {plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&!ratingDone&&(
        <Card c={c} style={{marginBottom:'14px'}}>
          <Lbl c={c}>⭐ {t.howWasPlan}</Lbl>
          <div style={{display:'flex',gap:'4px',marginBottom:'12px',justifyContent:'center'}}>
            {[1,2,3,4,5].map(s=><button key={s} onClick={()=>setPlanRating(s)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'28px',color:planRating>=s?'#f59e0b':'#555',padding:'4px'}}>{planRating>=s?'★':'☆'}</button>)}
          </div>
          {planRating>0&&<Btn onClick={async()=>{const me=rs.find(r=>r.name===ls.get('q_myname',''));if(me){await saveResp(plan.id,me.name,{...me,planRating});} setRatingDone(true);}} full sm c={c} accent={mc}>{t.ratePlan}</Btn>}
        </Card>
      )}
      {ratingDone&&plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&(
        <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'10px 16px',marginBottom:'14px',fontSize:'13px',color:mc,fontWeight:'600',textAlign:'center'}}>✅ {t.thanksFeedback}</div>
      )}
      {plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&(
        <Card c={c} style={{marginBottom:'14px'}}>
          <Lbl c={c}>📸 {t.shareMemory||'Share the memory'}</Lbl>
          <div id="memory-card" style={{background:`linear-gradient(135deg,${mc}30,${mc}08)`,border:`2px solid ${mc}50`,borderRadius:'16px',padding:'24px',textAlign:'center'}}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>{'🎉'}</div>
            <div style={{fontFamily:"'Syne',serif",fontSize:'22px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{plan.name}</div>
            <div style={{fontSize:'14px',color:mc,fontWeight:'600',marginBottom:'12px',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · '+fmtTime(plan.confirmedStartTime):''}</div>
            {(plan.stops||[]).filter(s=>(s.options?.[0]?.name||s.name)).slice(0,4).map((s,i)=>{
              const opt=s.options?.[0]||s;
              return<div key={i} style={{fontSize:'13px',color:c.M2,marginBottom:'2px'}}>{i===0?'📍':'↓'} {opt.name||s.name}</div>;
            })}
            {rs.length>0&&<div style={{marginTop:'12px',display:'flex',justifyContent:'center',gap:'4px',flexWrap:'wrap'}}>
              {rs.filter(r=>{const a=plan.attendance?.[r.name];return a?.came===true;}).slice(0,8).map((r,i)=><div key={i} style={{width:'28px',height:'28px',borderRadius:'50%',background:mc,color:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800'}}>{r.name[0].toUpperCase()}</div>)}
              {rs.filter(r=>plan.attendance?.[r.name]?.came===true).length>8&&<div style={{width:'28px',height:'28px',borderRadius:'50%',background:c.CARD2,color:c.M2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px'}}>+{rs.filter(r=>plan.attendance?.[r.name]?.came===true).length-8}</div>}
            </div>}
            <div style={{marginTop:'16px',fontSize:'11px',color:c.M}}>queda.</div>
          </div>
          <div style={{textAlign:'center',marginTop:'8px',fontSize:'12px',color:c.M2}}>{t.screenshotHint||'Screenshot and share on your stories!'}</div>
        </Card>
      )}
      {plan.confirmedDate&&daysUntil(plan.confirmedDate)<0&&(
        <div style={{textAlign:'center',padding:'20px',background:`${mc}08`,border:`1px dashed ${mc}40`,borderRadius:'16px',marginBottom:'14px'}}>
          <div style={{fontSize:'28px',marginBottom:'8px'}}>🔄</div>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'4px'}}>{t.repeatPlan||'Repeat the plan?'}</div>
          <div style={{fontSize:'13px',color:c.M2,marginBottom:'12px'}}>{t.repeatPlanSub||'Same stops, new dates. One click.'}</div>
          <Btn onClick={async()=>{
            const newId=genId();
            const dup={...plan,id:newId,dates:[],startTimes:[],confirmedDate:null,confirmedStartTime:null,isPublic:false,pubFilter:null,attendance:null,attendanceMarked:false,createdAt:new Date().toISOString()};
            try{await savePlan(dup);addMyPlan(newId,dup.name,'organizer');navigator.clipboard?.writeText(newId);alert((t.planDuplicated||'Plan created!')+' '+newId);}catch{}
          }} c={c} accent={mc}>{t.repeatBtn||'Create again 🔄'}</Btn>
        </div>
      )}
      {/* TABS */}
      <div style={{display:'flex',gap:'5px',overflowX:'auto',paddingBottom:'4px',marginBottom:'20px'}}>
        {TABS.map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{padding:'7px 11px',borderRadius:'20px',border:`1px solid ${tab===tb?mc+'60':c.BD}`,background:tab===tb?`${mc}15`:c.CARD,color:tab===tb?mc:c.M2,fontSize:'12px',fontWeight:tab===tb?'700':'400',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{tlbl(tb)}</button>)}
      </div>
      {ldg&&<div style={{padding:'16px'}}>
  {[1,2,3].map(i=><div key={i} style={{marginBottom:'12px'}}>
    <div style={{height:'14px',background:c.CARD2,borderRadius:'6px',width:i===1?'60%':'80%',marginBottom:'8px',animation:'pulse 1.5s ease infinite'}}/>
    <div style={{height:'10px',background:c.CARD2,borderRadius:'6px',width:i===2?'40%':'70%',animation:'pulse 1.5s ease infinite'}}/>
  </div>)}
</div>}

      {/* PLAN tab — unified view + inline voting */}
      {!ldg&&tab==='plan'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>{(()=>{
        const planDate=plan.date||plan.dates?.[0]||null;
        const planTime=plan.time||plan.startTimes?.[0]||null;
        const planPlace=plan.place||plan.stops?.[0]?.options?.[0]||null;
        const stop=plan.stops?.[0]||{};
        const tolerance=parseInt(stop.tolerance)||0;
        const minCap=stop.minAttendees||'';
        const maxCap=stop.maxCapacity||'';
        const viewOpen=openSection._planView;
        const ynBtnInline=(val,setVal,yesLbl,noLbl)=>(
          <div style={{display:'flex',gap:'6px'}}>
            <button onClick={()=>setVal(true)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===true?'#22c55e50':c.BD}`,background:val===true?'#22c55e18':'transparent',color:val===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===true?'700':'500'}}>{val===true?'✓ ':''}{yesLbl}</button>
            <button onClick={()=>setVal(false)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${val===false?'#ef444450':c.BD}`,background:val===false?'#ef444418':'transparent',color:val===false?'#ef4444':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:val===false?'700':'500'}}>{val===false?'✗ ':''}{noLbl}</button>
          </div>
        );
        return<>
        {/* Point card — compact */}
        <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'14px',marginBottom:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:viewOpen?'12px':0}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:`${mc}20`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',color:mc,flexShrink:0}}>1</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'15px',color:c.T,fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{planPlace?.name||'—'}</div>
              <div style={{display:'flex',gap:'6px',fontSize:'11px',color:c.M2,marginTop:'2px'}}>
                {planDate&&<span style={{textTransform:'capitalize'}}>📅 {fmtShort(planDate,lang)}</span>}
                {planTime&&<span>🕐 {fmtTime(planTime)}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:'4px',flexShrink:0}}>
              <button onClick={()=>setOpenSection(p=>({...p,_planView:!p._planView}))} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>{viewOpen?'▾':t.seeDetails||'Ver'}</button>
              {isOrgRef.current&&<button onClick={()=>setEditMode('stop_'+stop.id)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px'}}>✏️</button>}
            </div>
          </div>

          {/* Expanded view with voting */}
          {viewOpen&&<div className="fade-in">
            {/* Place info + vote */}
            {(()=>{const placeOk=myPlaceOk;return planPlace&&<div style={{background:placeOk===true?'#22c55e10':placeOk===false?'#ef444410':c.CARD2,border:`1px solid ${placeOk===true?'#22c55e40':placeOk===false?'#ef444440':c.BD}`,borderRadius:'10px',padding:'12px',marginBottom:'8px'}}>
              {planPlace?.photo&&<img src={planPlace.photo} alt="" style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}}/>}
              <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{planPlace?.name||'—'}</div>
              {planPlace?.address&&<div style={{fontSize:'12px',color:c.M2,marginTop:'2px'}}>📍 {planPlace.address}</div>}
              {planPlace?.rating&&<div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>⭐ {planPlace.rating}{planPlace?.priceLevel?' · '+'€'.repeat(planPlace.priceLevel):''}</div>}
              <div style={{fontSize:'11px',color:c.M,marginTop:'6px'}}>
                {minCap?`👥 min: ${minCap}`:(t.noMinCap||'No min capacity')}{' · '}{maxCap?`max: ${maxCap}`:(t.noMaxCap||'No max capacity')}
              </div>
              {planPlace?.googleMapsURI&&<a href={planPlace.googleMapsURI} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:'6px',fontSize:'11px',color:mc,textDecoration:'none'}}>Google Maps ↗</a>}
              {!isOrgRef.current&&<div style={{marginTop:'8px'}}>
                <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.placeOkQ||'Does the place work?'}</div>
                {ynBtnInline(placeOk,v=>{setMyPlaceOk(v);if(!v){setMyDateOk(null);setMyTimeOk(null);setMyLateMin(0);setMyMeetOk(null);setOpenSection(p=>({...p,_placeNoPopup:true,_onTime:undefined}));}else{setOpenSection(p=>({...p,_placeNoPopup:undefined}));}},t.yesLbl||'Sí','No')}
              </div>}
              {placeOk===false&&openSection._placeNoPopup&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#ef444408',border:'1px solid #ef444420',borderRadius:'8px'}}>
                <div style={{fontSize:'12px',color:'#ef4444',fontWeight:'600',marginBottom:'6px'}}>{t.placeNoMsg||'Want to tell the organizer?'}</div>
                <input value={myPlaceComment} onChange={e=>setMyPlaceComment(e.target.value)} placeholder={t.commentPh||'Write a comment...'} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:'6px'}}/>
                <button onClick={()=>window.open(location.href.split('?')[0]+'#create','_blank')} style={{width:'100%',padding:'8px',background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>{t.createOwnPlan||'Or create your own plan →'}</button>
              </div>}
            </div>;})()}

            {/* Date + Time — cascading: only if place=Yes */}
            {!isOrgRef.current&&myPlaceOk===true&&<>
              <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                {/* Date */}
                {planDate&&<div style={{flex:1,background:myDateOk===true?'#22c55e10':myDateOk===false?'#ef444410':c.CARD2,border:`1px solid ${myDateOk===true?'#22c55e40':myDateOk===false?'#ef444440':c.BD}`,borderRadius:'10px',padding:'10px'}}>
                  <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>📅 {t.dateOkQ}</div>
                  <div style={{fontSize:'14px',color:c.T,fontWeight:'600',textTransform:'capitalize',marginBottom:'6px'}}>{fmtShort(planDate,lang)}</div>
                  {ynBtnInline(myDateOk,v=>{setMyDateOk(v);if(!v){setMyTimeOk(null);setMyLateMin(0);setMyMeetOk(null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
                </div>}
                {/* Time — only if date is Yes */}
                {planTime&&<div style={{flex:1,background:myDateOk!==true?c.CARD2:myTimeOk===true?'#22c55e10':myTimeOk===false?'#ef444410':c.CARD2,border:`1px solid ${myDateOk!==true?c.BD:myTimeOk===true?'#22c55e40':myTimeOk===false?'#ef444440':c.BD}`,borderRadius:'10px',padding:'10px',opacity:myDateOk===true?1:0.4}}>
                  <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>🕐 {t.timeOkQ}</div>
                  <div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{fmtTime(planTime)}</div>
                  {myDateOk===true&&ynBtnInline(myTimeOk,v=>{setMyTimeOk(v);if(!v){setMyLateMin(0);setMyMeetOk(null);setOpenSection(p=>({...p,_onTime:undefined}));}},t.yesLbl,'No')}
                </div>}
              </div>

              {/* Alt dates (No to date) */}
              {myDateOk===false&&<div style={{background:'#ef444408',border:'1px solid #ef444420',borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',color:'#ef4444',fontWeight:'600',marginBottom:'6px'}}>{t.yourAvailDates} ({myAltDates.length}/3)</div>
                <CalendarPicker selected={myAltDates} onChange={d=>setMyAltDates(d.filter(x=>x!==planDate).slice(-3))} max={3} c={c} lang={lang}/>
                {myAltDates.includes(planDate)&&<div style={{fontSize:'11px',color:'#ef4444',marginTop:'4px'}}>{t.cantSelectOrigDate||"You can't select the original date"}</div>}
                {/* Time for alt dates */}
                {myAltDates.length>0&&<div style={{marginTop:'8px'}}>
                  <div style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>{t.availStartTime}</div>
                  <div style={{fontSize:'11px',color:c.M2,marginBottom:'6px'}}>{t.availStartHint}</div>
                  <div style={{marginBottom:'6px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.fromLbl}{myTimeFrom&&` → ${myTimeFrom}`}</div><ClockPicker value={myTimeFrom} onChange={v=>setMyTimeFrom(v)} c={c}/></div>
                  <div><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.toLbl}{myTimeTo&&` → ${myTimeTo}`}</div><ClockPicker value={myTimeTo} onChange={v=>setMyTimeTo(v)} c={c}/></div>
                  {myTimeFrom&&myTimeTo&&<div style={{fontSize:'12px',color:mc,marginTop:'6px',textAlign:'center',fontWeight:'600'}}>{myTimeFrom} → {myTimeTo}</div>}
                </div>}
              </div>}

              {/* Alt time range (No to time, but Yes to date) */}
              {myDateOk===true&&myTimeOk===false&&(()=>{
                const rangeIncludesOrig=myTimeFrom&&myTimeTo&&planTime&&planTime>=myTimeFrom&&planTime<=myTimeTo;
                return<div style={{background:'#f59e0b08',border:'1px solid #f59e0b20',borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>{t.availStartTime}</div>
                <div style={{fontSize:'11px',color:c.M2,marginBottom:'8px'}}>{t.availStartHint}</div>
                <div style={{marginBottom:'8px'}}><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.fromLbl}{myTimeFrom&&` → ${myTimeFrom}`}</div><ClockPicker value={myTimeFrom} onChange={v=>setMyTimeFrom(v)} c={c}/></div>
                <div><div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.toLbl}{myTimeTo&&` → ${myTimeTo}`}</div><ClockPicker value={myTimeTo} onChange={v=>setMyTimeTo(v)} c={c}/></div>
                {myTimeFrom&&myTimeTo&&<div style={{fontSize:'12px',color:mc,marginTop:'6px',textAlign:'center',fontWeight:'600'}}>{myTimeFrom} → {myTimeTo}</div>}
                {rangeIncludesOrig&&<div style={{marginTop:'6px',padding:'6px 10px',background:'#ef444410',border:'1px solid #ef444430',borderRadius:'8px',fontSize:'11px',color:'#ef4444',fontWeight:'600'}}>{t.rangeIncludesOriginal||'Your range includes the original time — if you can make it, select Yes above'}</div>}
              </div>;})()}

              {/* On time + Meeting point — ONLY if date=Yes AND time=Yes */}
              {myDateOk===true&&myTimeOk===true&&<>
                {/* On time? */}
                {tolerance>0&&(()=>{
                  const isLate=myLateMin>0;const isOnTime=openSection._onTime===true;
                  return<div style={{background:isOnTime?'#22c55e10':isLate?'#f59e0b10':c.CARD2,border:`1px solid ${isOnTime?'#22c55e40':isLate?'#f59e0b40':c.BD}`,borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                    <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>⏰ {t.onTimeQ} <span style={{fontSize:'10px',color:c.M2}}>({t.maxLateLbl}: {tolerance} min = {addMins(planTime,tolerance)})</span></div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={()=>{setMyLateMin(0);setOpenSection(p=>({...p,_onTime:true}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isOnTime?'#22c55e50':c.BD}`,background:isOnTime?'#22c55e18':'transparent',color:isOnTime?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isOnTime?'700':'500'}}>{isOnTime?'✓ ':''}{t.yesLbl}</button>
                      <button onClick={()=>{setMyLateMin(5);setOpenSection(p=>({...p,_onTime:false}));}} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${isLate?'#f59e0b50':c.BD}`,background:isLate?'#f59e0b18':'transparent',color:isLate?'#f59e0b':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:isLate?'700':'500'}}>{isLate?'⏰ ':''}{t.noLbl||'No'}</button>
                    </div>
                    {isLate&&<div style={{marginTop:'8px'}}>
                      <div style={{fontSize:'11px',color:'#f59e0b',marginBottom:'4px'}}>{t.howLateQ}</div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'12px',color:c.M}}>+</span>
                        <input type="number" inputMode="numeric" min="1" max={tolerance} value={myLateMin} onChange={e=>{const v=Math.min(Math.max(parseInt(e.target.value)||1,1),tolerance);setMyLateMin(v);}} style={{width:'70px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
                        <span style={{fontSize:'12px',color:c.M}}>min</span>
                        <span style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600'}}>{fmtMinsToH(myLateMin)} = {addMins(planTime,myLateMin)}</span>
                      </div>
                    </div>}
                  </div>;
                })()}

                {/* Meeting point — hidden if late */}
                {stop.meetingPoint&&myLateMin===0&&(()=>{
                  const mpMins=parseInt(stop.meetingMinsBefore)||0;
                  const mpTime=mpMins>0&&planTime?addMins(planTime,-mpMins):planTime;
                  return<div style={{background:myMeetOk===true?'#22c55e10':myMeetOk===false?'#f59e0b10':c.CARD2,border:`1px solid ${myMeetOk===true?'#22c55e40':myMeetOk===false?'#f59e0b40':c.BD}`,borderRadius:'10px',padding:'10px',marginBottom:'8px'}}>
                    <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>📍 {t.meetingPointLbl2}</div>
                    <div style={{fontSize:'13px',color:c.T,fontWeight:'600'}}>{stop.meetingPoint}</div>
                    {mpMins>0&&<div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{mpMins} min {t.beforeLbl} ({fmtMinsToH(-mpMins)})</div>}
                    <div style={{marginTop:'8px'}}>{ynBtnInline(myMeetOk,setMyMeetOk,t.meetYes,t.meetNo)}</div>
                    {myMeetOk===true&&mpTime&&<div style={{marginTop:'8px',textAlign:'center',fontSize:'20px',fontWeight:'800',color:'#22c55e'}}>🕐 {mpTime}</div>}
                    {myMeetOk===false&&planTime&&<div style={{marginTop:'8px',textAlign:'center',fontSize:'20px',fontWeight:'800',color:'#f59e0b'}}>🕐 {planTime}</div>}
                  </div>;
                })()}
              </>}
            </>}

            {/* Organizer sees date/time as info + edit */}
            {isOrgRef.current&&<div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
              {planDate&&<div style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>📅</div>
                <div style={{fontSize:'14px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(planDate,lang)}</div>
              </div>}
              {planTime&&<div style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>🕐</div>
                <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{fmtTime(planTime)}</div>
              </div>}
              <button onClick={()=>setEditMode('dates')} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',alignSelf:'center'}}>✏️</button>
            </div>}

            {/* Save response (invitee) */}
            {!isOrgRef.current&&<div style={{marginTop:'10px'}}>
              {!mySaved&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.yourName}</div><input value={myName} onChange={e=>{setMyName(e.target.value);ls.set('q_myname',e.target.value);}} placeholder={t.yourNamePh||'Your name'} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>}
              {(()=>{
                const deadlinePassed=plan.deadline&&new Date(plan.deadline)<new Date();
                const placeAnswered=myPlaceOk!==undefined&&myPlaceOk!==null;
                const dateAnswered=myPlaceOk===false||myDateOk!==null;
                const timeAnswered=myPlaceOk===false||myDateOk===false||(myDateOk===true&&myTimeOk!==null);
                const allAnswered=placeAnswered&&dateAnswered&&timeAnswered&&myName.trim();
                const canSave=allAnswered&&!mySaving&&!deadlinePassed;
                return<button onClick={saveMyResp} disabled={!canSave} style={{width:'100%',padding:'12px',background:mySaved?'#22c55e':canSave?mc:c.CARD2,border:canSave||mySaved?'none':`1px solid ${c.BD}`,borderRadius:'10px',color:mySaved?'#fff':canSave?'#0A0A0A':c.M,cursor:canSave?'pointer':'default',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',opacity:canSave||mySaved?1:0.5}}>{mySaving?'...':(mySaved?t.respSaved:(allAnswered?t.saveAvail:(t.answerAllToSave||'Answer all to save')))}</button>;
              })()}
              {mySaveConfirm&&<div className="fade-in" style={{marginTop:'8px',padding:'10px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'10px',textAlign:'center',fontSize:'13px',color:'#22c55e',fontWeight:'600'}}>✓ {t.savedTitle||'Saved!'}</div>}
              {/* Deadline */}
              {(()=>{
                const dl=plan.deadline?new Date(plan.deadline):null;
                if(!dl)return null;
                const now2=new Date();const diff=dl-now2;
                if(diff<=0)return<div style={{marginTop:'8px',padding:'12px',background:'#ef444410',border:'1px solid #ef444430',borderRadius:'10px',textAlign:'center'}}>
                  <div style={{fontSize:'13px',color:'#ef4444',fontWeight:'600',marginBottom:'8px'}}>⏰ {t.deadlinePassed||'Deadline passed — responses are closed'}</div>
                  <button onClick={()=>setTab('vote')} style={{padding:'8px 16px',background:mc,border:'none',borderRadius:'8px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.goToResults||'See results'} →</button>
                </div>;
                const daysLeft=Math.floor(diff/86400000);const hoursLeft=Math.floor((diff%86400000)/3600000);const minsLeft=Math.floor((diff%3600000)/60000);const secsLeft=Math.floor((diff%60000)/1000);
                return<div style={{marginTop:'8px',padding:'10px',background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'10px',textAlign:'center',fontSize:'12px',color:'#f59e0b'}}>
                  <div style={{fontWeight:'600',marginBottom:'2px'}}>⏰ {t.deadlineLbl||'Deadline to respond'}</div>
                  <div>{fmtDate(plan.deadline.split('T')[0],lang)}{plan.deadline.includes('T')?' · '+plan.deadline.split('T')[1]?.slice(0,5):''}</div>
                  <div style={{fontSize:'13px',fontWeight:'700',fontFamily:'monospace',marginTop:'4px'}}>{daysLeft>0?`${daysLeft}d `:''}{ String(hoursLeft).padStart(2,'0')}:{String(minsLeft).padStart(2,'0')}:{String(secsLeft).padStart(2,'0')}</div>
                </div>;
              })()}
            </div>}
          </div>}
        </div>

        {/* Add point (organizer) */}
        {isOrgRef.current&&<button onClick={async()=>{const newStop={id:Date.now(),options:[{id:Date.now(),name:'',address:'',lat:null,lng:null,rating:null,photo:null,googleMapsURI:null,types:[]}],startTime:'',duration:'',notes:'',maxCapacity:'',meetingPoint:'',minAttendees:'',tolerance:''};const up={...plan,stops:[...(plan.stops||[]),newStop]};await updatePlan(up);setPlan(up);setEditMode('stop_'+newStop.id);}} style={{width:'100%',padding:'12px',background:'none',border:`2px dashed ${c.BD}`,borderRadius:'12px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'600',marginBottom:'8px',marginTop:'8px'}}>+ {t.addNextPoint}</button>}

        {/* Map */}
        {planPlace?.lat&&planPlace?.lng&&<RouteMap stops={[
          ...(stop.meetingPoint?[{lat:stop.meetingPointLat||planPlace.lat,lng:stop.meetingPointLng||planPlace.lng,name:'📍 '+stop.meetingPoint,isMeetingPoint:true}]:[]),
          {...planPlace,lat:planPlace.lat,lng:planPlace.lng,name:planPlace.name,address:planPlace.address}
        ]} c={c}/>}
      </>;})()}
      </></React.Suspense>}

      {/* VOTE tab — Place/Date/Time + availability + suggestions */}
      {!ldg&&tab==='vote'&&(()=>{
        const hasV4=rs.some(r=>r.placeOk!==undefined);
        const placeYes=rs.filter(r=>hasV4?r.placeOk===true:true).length;
        const dateYes=rs.filter(r=>hasV4?r.dateOk===true:r.avail&&Object.values(r.avail).some(v=>v==='yes')).length;
        const timeYes=rs.filter(r=>hasV4?r.timeOk===true:r.avail&&Object.values(r.avail).some(v=>v==='yes')).length;
        const Donut=({yes,no,label,yesColor,noColor})=>{
          const pct=yes+no>0?Math.round(yes/(yes+no)*100):0;
          const r2=28;const circ=2*Math.PI*r2;const dash=circ*pct/100;
          return<div style={{textAlign:'center'}}>
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={r2} fill="none" stroke={noColor||'#ef444430'} strokeWidth="8"/>
              <circle cx="35" cy="35" r={r2} fill="none" stroke={yesColor||'#22c55e'} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 35 35)"/>
              <text x="35" y="38" textAnchor="middle" fontSize="14" fontWeight="800" fill={yesColor||'#22c55e'}>{pct}%</text>
            </svg>
            <div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{label}</div>
            <div style={{fontSize:'12px',fontWeight:'600'}}><span style={{color:yesColor||'#22c55e'}}>{yes}✓</span> <span style={{color:noColor||'#ef4444'}}>{no}✗</span></div>
          </div>;
        };
        const timeRanges=rs.filter(r=>r.availTimeFrom&&r.availTimeTo).map(r=>({name:r.name,from:r.availTimeFrom,to:r.availTimeTo}));
        const altDates=rs.filter(r=>r.availDates?.length>0);
        // Time suggestion algorithm
        const planTime=plan.time||plan.startTimes?.[0]||null;
        const suggestedTimes=(()=>{
          if(timeRanges.length===0||!planTime)return[];
          const slots2=[];
          for(let h=0;h<24;h++)for(let m=0;m<60;m+=30){
            const t2=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            const cnt=timeRanges.filter(r=>t2>=r.from&&t2<=r.to).length;
            if(cnt>0)slots2.push({time:t2,count:cnt+timeYes,dist:Math.abs(parseInt(t2)-parseInt(planTime.replace(':','')))});
          }
          slots2.sort((a,b)=>b.count-a.count||a.dist-b.dist);
          return slots2.slice(0,3);
        })();
        return<>
        {total===0?<Card c={c} style={{textAlign:'center',padding:'32px'}}>
          <div style={{fontSize:'36px',marginBottom:'10px'}}>🗳️</div>
          <div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{t.noDataYet}</div>
          <div style={{color:c.M2,fontSize:'13px'}}>{t.noDataHint}</div>
        </Card>
        :<>
          {/* Visual summary — donuts */}
          <div style={{display:'flex',justifyContent:'space-around',marginBottom:'16px',padding:'12px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px'}}>
            <Donut yes={placeYes} no={total-placeYes} label="📍" yesColor="#22c55e" noColor="#ef444430"/>
            <Donut yes={dateYes} no={total-dateYes} label="📅" yesColor="#22c55e" noColor="#ef444430"/>
            <Donut yes={timeYes} no={total-timeYes} label="🕐" yesColor="#22c55e" noColor="#ef444430"/>
          </div>

          {/* Alt dates details */}
          {altDates.length>0&&<div style={{marginBottom:'12px',fontSize:'12px',color:c.M2}}>
            <div style={{fontWeight:'600',color:mc,marginBottom:'4px'}}>📅 {t.altDatesLbl||'Alternative dates'}</div>
            {altDates.map((r,i)=><div key={i} style={{marginBottom:'2px'}}>{r.name}: {r.availDates.map(d=>fmtShort(d,lang)).join(', ')}</div>)}
          </div>}

          {/* Availability ranges + suggested time */}
          {timeRanges.length>0&&(()=>{
            // Find intersection
            const allFroms=timeRanges.map(r=>r.from).sort();
            const allTos=timeRanges.map(r=>r.to).sort();
            const interFrom=allFroms[allFroms.length-1];const interTo=allTos[0];
            const hasInter=interFrom<interTo;
            const orgTime=planTime;
            // Best time = closest to original within intersection
            const bestT=hasInter?(interFrom>=orgTime?interFrom:orgTime<=interTo?orgTime:interFrom):null;
            return<div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:mc,marginBottom:'8px'}}>🕐 {t.availabilityLbl||'Availability'}</div>
              {timeRanges.map((r,i)=><div key={i} style={{fontSize:'12px',color:c.M2,marginBottom:'2px'}}>{r.name}: {fmtTime(r.from)} → {fmtTime(r.to)}</div>)}
              {hasInter&&<div style={{marginTop:'8px',padding:'10px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px'}}>
                <div style={{fontSize:'12px',color:c.M2}}>{t.overlapLbl||'Everyone overlaps'}: {fmtTime(interFrom)} → {fmtTime(interTo)}</div>
                {bestT&&<div style={{fontSize:'16px',fontWeight:'700',color:mc,marginTop:'4px'}}>💡 {t.suggestedTimeLbl||'Suggested'}: {fmtTime(bestT)}</div>}
              </div>}
              {!hasInter&&<div style={{marginTop:'6px',fontSize:'12px',color:'#f59e0b'}}>{t.noOverlapLbl||'No overlapping time found'}</div>}
            </div>;
          })()}

          {/* Meeting point — with names */}
          {rs.some(r=>r.meetOk!==undefined&&r.meetOk!==null)&&(()=>{
            const goingRs=rs.filter(r=>r.placeOk!==false&&r.dateOk===true&&r.timeOk===true);
            const mpYes=goingRs.filter(r=>r.meetOk===true);const mpNo=goingRs.filter(r=>r.meetOk===false);
            return<div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#f59e0b',marginBottom:'4px'}}>📍 {t.meetingPointLbl2}</div>
            <div style={{fontSize:'13px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{mpYes.length} {t.ofLbl||'of'} {goingRs.length} {t.goingLbl||'going'}</div>
            <div style={{display:'flex',gap:'8px',marginBottom:'6px'}}>
              <div style={{flex:1,padding:'10px',background:'#f59e0b15',border:'1px solid #f59e0b30',borderRadius:'10px'}}>
                <div style={{fontSize:'16px',fontWeight:'700',color:'#f59e0b',textAlign:'center'}}>{mpYes.length}</div>
                <div style={{fontSize:'10px',color:'#f59e0b',textAlign:'center',marginBottom:'4px'}}>{t.meetYes}</div>
                {mpYes.map((r,i)=><div key={i} style={{fontSize:'11px',color:c.M2}}>{r.name}</div>)}
              </div>
              <div style={{flex:1,padding:'10px',background:'#22c55e15',border:'1px solid #22c55e30',borderRadius:'10px'}}>
                <div style={{fontSize:'16px',fontWeight:'700',color:'#22c55e',textAlign:'center'}}>{mpNo.length}</div>
                <div style={{fontSize:'10px',color:'#22c55e',textAlign:'center',marginBottom:'4px'}}>{t.meetNo}</div>
                {mpNo.map((r,i)=><div key={i} style={{fontSize:'11px',color:c.M2}}>{r.name}</div>)}
              </div>
            </div>
          </div>})()}

          {/* Late arrivals */}
          {rs.some(r=>r.lateMin>0)&&<div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#f59e0b',marginBottom:'8px'}}>⏰ {t.lateArrivals||'Late arrivals'}</div>
            {rs.filter(r=>r.lateMin>0).map((r,i)=><div key={i} style={{fontSize:'12px',color:c.M2,marginBottom:'2px'}}>⏰ {r.name}: +{r.lateMin} min</div>)}
          </div>}

          {/* Per-person — GOING vs NOT GOING */}
          {(()=>{
            const going=rs.filter(r=>hasV4?(r.placeOk!==false&&r.dateOk===true&&r.timeOk===true):(r.avail&&Object.values(r.avail).some(v=>v==='yes')));
            const notGoing=rs.filter(r=>hasV4?(r.placeOk===false||r.dateOk===false||r.timeOk===false||r.dateOk===null||r.timeOk===null):(!(r.avail&&Object.values(r.avail).some(v=>v==='yes'))));
            return<>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#22c55e',marginBottom:'8px'}}>✓ {t.goingLbl||'Going'} ({going.length} {t.ofLbl||'of'} {total})</div>
            {going.map((r,i)=>{
              const expanded2=openSection['vg_'+i];
              return<div key={i} style={{marginBottom:'4px',background:'#22c55e08',border:'1px solid #22c55e30',borderRadius:'8px',overflow:'hidden'}}>
                <div onClick={()=>setOpenSection(p=>({...p,['vg_'+i]:!p['vg_'+i]}))} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',cursor:'pointer'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>
                  <span style={{flex:1,fontSize:'13px',color:c.T,fontWeight:'600'}}>{r.name}</span>
                  {r.lateMin>0&&<span style={{fontSize:'10px',color:'#f59e0b',fontWeight:'600'}}>+{r.lateMin}min</span>}
                  {r.meetOk===true&&<span style={{fontSize:'10px',color:'#22c55e'}}>📍</span>}
                  <span style={{fontSize:'11px',color:c.M2}}>{expanded2?'▾':'▸'}</span>
                </div>
                {expanded2&&<div style={{padding:'6px 12px 10px',borderTop:'1px solid #22c55e20',fontSize:'12px',color:c.M2}}>
                  {r.meetOk!==undefined&&<div style={{marginBottom:'4px'}}>📍 {r.meetOk?t.meetYes:t.meetNo}</div>}
                  {r.lateMin>0&&<div style={{marginBottom:'4px'}}>⏰ +{r.lateMin} min ({addMins(planTime,r.lateMin)})</div>}
                  {r.comment&&<div style={{fontStyle:'italic',padding:'4px 8px',background:c.CARD2,borderRadius:'6px'}}>"{r.comment}"</div>}
                </div>}
              </div>;
            })}
            {notGoing.length>0&&<>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#ef4444',marginTop:'12px',marginBottom:'8px'}}>✗ {t.notGoingLbl||'Not going'} ({notGoing.length})</div>
              {notGoing.map((r,i)=>{
                const expanded2=openSection['vn_'+i];
                return<div key={i} style={{marginBottom:'4px',background:'#ef444408',border:'1px solid #ef444430',borderRadius:'8px',overflow:'hidden'}}>
                  <div onClick={()=>setOpenSection(p=>({...p,['vn_'+i]:!p['vn_'+i]}))} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',cursor:'pointer'}}>
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
          </>;})()}
        </>}
      </>})()}

      {/* MORE tab */}
      {!ldg&&tab==='more'&&<>
        {/* Share section */}
        <Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>{t.sharePlanBtn||'Share'}</Lbl>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={waShare} style={{flex:1,padding:'12px',background:'#25D366',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>WhatsApp</button>
            <button onClick={()=>{window.open('https://t.me/share/url?url='+encodeURIComponent(shareUrl),'_blank');}} style={{flex:1,padding:'12px',background:'#0088cc',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Telegram</button>
            <button onClick={copyShare} style={{flex:1,padding:'12px',background:c.CARD2,color:c.T,border:`1px solid ${c.BD}`,borderRadius:'12px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>🔗</button>
          </div>
        </Card>

        {/* Plan code */}
        <Card c={c} style={{marginBottom:'12px',textAlign:'center'}}>
          <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>{t.codeLbl||'Plan code'}</div>
          <div style={{fontFamily:'monospace',fontSize:'28px',fontWeight:'900',color:mc,letterSpacing:'.15em'}}>{plan.id}</div>
        </Card>

        {/* Poll results */}
        {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
          {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
            <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
          </div>);})}
        </Card>}

        {/* Comments */}
        {rs.some(r=>r.comment)&&<Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>💬 {t.comments}</Lbl>
          {rs.filter(r=>r.comment).map((r,i)=><div key={i} style={{marginBottom:'8px',padding:'8px 12px',background:c.CARD2,borderRadius:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:mc,marginBottom:'2px'}}>{r.name}</div>
            <div style={{fontSize:'13px',color:c.M2,fontStyle:'italic'}}>"{r.comment}"</div>
          </div>)}
        </Card>}

        {/* Transportation summary */}
        {rs.some(r=>r.how)&&<Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>🚗 {t.transportLbl||'Transport'}</Lbl>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {rs.filter(r=>r.how).map((r,i)=><span key={i} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:c.CARD2,border:`1px solid ${c.BD}`,color:c.T}}>{({car:'🚗',moto:'🏍️',transit:'🚇',taxi:'🚕',walk:'🚶',bike:'🚲'})[r.how]||''} {r.name}</span>)}
          </div>
        </Card>}

        {/* Change history */}
        {(plan.changeLog||[]).length>0&&<Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>📋 {t.changeHistoryLbl||'Change history'}</Lbl>
          {[...(plan.changeLog||[])].reverse().map((log,i)=><div key={i} style={{fontSize:'12px',color:c.M2,marginBottom:'4px',display:'flex',gap:'8px'}}>
            <span style={{color:c.M,flexShrink:0}}>{new Date(log.at).toLocaleDateString(lang)}</span>
            <span style={{color:log.type==='confirm'?'#22c55e':c.T}}>{log.type==='confirm'?'📌':'✏️'} {log.desc}</span>
          </div>)}
        </Card>}
      </>}

      {/* RESULT tab — final plan summary for screenshot */}
      {!ldg&&tab==='result'&&(()=>{
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

          {/* Plan details card */}
          <Card c={c} style={{marginBottom:'12px'}}>
            <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'10px'}}>
              {planPlace?.photo&&<img src={planPlace.photo} alt="" style={{width:'50px',height:'50px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
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

          {/* Meeting point attendance */}
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

          {/* Screenshot button */}
          <button onClick={async()=>{
            try{
              const el=document.getElementById('plan-result');
              if(!el)return;
              const{default:h2c}=await import('html2canvas');
              const canvas=await h2c(el,{backgroundColor:c.BG,scale:2});
              const link=document.createElement('a');
              link.download=`queda-${plan.id}.png`;
              link.href=canvas.toDataURL();
              link.click();
            }catch{alert('Screenshot failed');}
          }} style={{width:'100%',padding:'14px',background:mc,border:'none',borderRadius:'12px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>📸 {t.screenshotBtn||'Download as image'}</button>

          {/* Confirm plan button (organizer) */}
          {isOrgRef.current&&!plan.confirmedDate&&planDate&&<button onClick={()=>confirmDate(planDate,planTime)} disabled={conf} style={{width:'100%',padding:'14px',background:'#22c55e',border:'none',borderRadius:'12px',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px',marginTop:'8px',opacity:conf?0.5:1}}>📌 {conf?'...':(t.confirmPlanBtn||'Confirm this plan')}</button>}
          {plan.confirmedDate&&<div style={{marginTop:'8px',padding:'12px',background:'#22c55e15',border:'1px solid #22c55e40',borderRadius:'12px',textAlign:'center',fontSize:'14px',color:'#22c55e',fontWeight:'700'}}>📌 {t.planConfirmed||'Plan confirmed!'}</div>}
        </div>;
      })()}

    </div>
  </>);
}


// ─── AUTH SCREEN ─────────────────────────────────────
