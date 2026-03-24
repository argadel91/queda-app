import React, { useState, useEffect, useRef, useCallback } from 'react'
import T from '../constants/translations.js'
import { db, updatePlan, loadResps, saveResp, savePlan } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { daysUntil, fmtDate, fmtShort, genId } from '../lib/utils.js'
import { Btn, Card, Lbl, Badge, Back, HR } from '../components/ui.jsx'
const ExpenseSplitter = React.lazy(() => import('../components/ExpenseSplitter.jsx'))
import PostPlanSurvey from '../components/PostPlanSurvey.jsx'
import { generateICS } from '../lib/ics.js'
const RouteMap = React.lazy(() => import('../components/RouteMap.jsx'))
import VenueInfo from '../components/VenueInfo.jsx'

export default function Results({plan:ip,onBack,isOrg,c,lang}){
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
  const[planRating,setPlanRating]=useState(0);
  const[ratingDone,setRatingDone]=useState(false);
  const isOrgRef=useRef(isOrg);
  const prevCountRef=useRef(null);
  const refresh=useCallback(async(silent=false)=>{
    if(!silent)setL(true);
    const newRs=await loadResps(plan.id);
    if(silent&&prevCountRef.current!==null&&newRs.length>prevCountRef.current){
      const added=newRs.filter(r=>!rs.find(x=>x.name===r.name));
      if(added.length>0){
        const who=added[added.length-1].name;
        setAlert(who);
        setTimeout(()=>setAlert(null),4000);
        // Browser notification if permission granted
        if(Notification.permission==='granted'){
          new Notification(plan.name,{body:((T[plan.lang]?.newRespNotif||'New response from')+' '+who),icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>'});
        }
      }
    }
    prevCountRef.current=newRs.length;
    setRs(newRs);
    // Auto-confirm check
    if(isOrgRef.current&&plan.autoConfirm&&!plan.confirmedDate){
      const cntYFn=key=>newRs.filter(r=>r.avail?.[key]==='yes').length;
      const autoSlot=slots.find(s=>cntYFn(s.key)>=plan.autoConfirmN);
      if(autoSlot&&!autoConfirmPending)setAutoConfirmPending(autoSlot);
    }
    if(!silent)setL(false);
  },[plan.id,rs]);
  useEffect(()=>{refresh();},[plan.id]);
  // NOTE: Requires "Realtime" enabled on the "responses" table in Supabase dashboard
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
  const best=total>0?slots.reduce((b,s)=>score(s.key)>score(b.key)?s:b,slots[0]):null;
  const budget=(plan.stops||[]).reduce((s,p2)=>s+(parseFloat(p2.cost)||0),0);
  const giftPer=plan.gift?.price?parseFloat(plan.gift.price):0;
  const fs=plan.stops?.find(s=>(s.options?.[0]?.lat&&s.options?.[0]?.lng)||(s.lat&&s.lng));
  const city=(()=>{
    if(plan.city&&!/^\d/.test(plan.city))return plan.city;
    const addr=plan.stops?.flatMap(s=>s.options||[]).find(o=>o?.address)?.address||plan.cityFull||'';
    const parts=addr.split(',').map(p=>p.trim()).filter(Boolean);
    const c=parts.slice(-3,-1).map(p=>p.replace(/^\d{4,6}\s*/,'').trim()).filter(Boolean);
    return c[0]||plan.city||'';
  })();
  const du=plan.confirmedDate?daysUntil(plan.confirmedDate):null;
  const confirmDate=async(d,st)=>{setConf(true);const up={...plan,confirmedDate:d,confirmedStartTime:st||''};await updatePlan(up);setPlan(up);setConf(false);};
  const waConfirm=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`📌 *${plan.name}* — ${t.dateConfirmedMsg}\n\n🗓️ ${fmtDate(plan.confirmedDate,lang)}${plan.confirmedStartTime?' · 🕐 '+plan.confirmedStartTime:''}\n\n${url}`),'_blank');};
  const waRem=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`⏰ ${t.reminderMsg.replace('{name}',plan.name)}\n${url}`),'_blank');setRem(true);};
  const howL=v=>({car:t.car,moto:t.moto,transit:t.transit,taxi:t.taxi,walk:t.walk,bike:t.bike}[v]||v);
  const TABS=['plan','alts','summary','more'];
  const tlbl=k=>t.tabs[k]||k;
  return(<>

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
      <div onClick={e=>e.stopPropagation()} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'380px'}}>
        <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'16px'}}>{t.editPlan}</div>
        <div style={{marginBottom:'12px'}}><div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.planName}</div><input value={editName} onChange={e=>setEditName(e.target.value)} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
        <div style={{marginBottom:'16px'}}><div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.desc}</div><textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical'}}/></div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel}</button>
          <button onClick={async()=>{const up={...plan,name:editName.trim()||plan.name,desc:editDesc.trim()};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.saveLbl}</button>
        </div>
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
        <div style={{fontSize:'12px',color:c.M2,textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+plan.confirmedStartTime:''}</div></div>
      </div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
        <div><div style={{display:'flex',alignItems:'center'}}><h2 style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:c.T,margin:'0 0 4px'}}>{plan.name}</h2>{isOrgRef.current&&<button onClick={()=>setEditMode(true)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',marginLeft:'8px'}}>✏️</button>}</div></div>
        <div style={{display:'flex',gap:'5px'}}>
          <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;const txt=`${t.respondToPlan.replace('{name}',plan.name)}\n${url}`;window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');}} title={t.shareWATitle} style={{background:'#25D36618',border:'1px solid #25D36640',borderRadius:'8px',padding:'6px 10px',color:'#25D366',cursor:'pointer',fontSize:'13px'}}>💬</button>
          <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;navigator.clipboard?.writeText(url);}} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.copyLinkTitle}>🔗</button>
          {typeof Notification!=='undefined'&&Notification.permission==='default'&&<button onClick={()=>Notification.requestPermission()} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.enableNotif}>🔔</button>}
          <button onClick={refresh} title={t.refreshResp} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}}>↻</button>
        </div>
      </div>
      <div style={{fontSize:'13px',color:c.M2,margin:'8px 0 12px'}}>{total} {total===1?t.responses:t.responsesP} · <span style={{color:mc,fontWeight:'700',letterSpacing:'.1em'}}>{plan.id}</span>{city&&<span> · 📍 {city}</span>}</div>
      {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'14px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.confirmedDate}</div><div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+plan.confirmedStartTime:''}</div></div>
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
          {rs.filter(r=>r.avail?.[plan.confirmedDate]==='yes').map((r,i)=>{
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
            <div style={{fontSize:'14px',color:mc,fontWeight:'600',marginBottom:'12px',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · '+plan.confirmedStartTime:''}</div>
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

      {/* PLAN tab = Route + budget + inline map + respondents */}
      {!ldg&&tab==='plan'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>
        {/* Inline edit for organizer */}
        {isOrgRef.current&&<div style={{marginBottom:'14px'}}>
          {!editMode?<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              {plan.name&&<div style={{fontSize:'18px',fontWeight:'700',color:c.T,marginBottom:'4px'}}>{plan.name}</div>}
              {plan.desc&&<div style={{fontSize:'13px',color:c.M2,lineHeight:1.5}}>{plan.desc}</div>}
              {plan.orgRole&&<div style={{fontSize:'12px',color:c.M2,marginTop:'4px'}}>👤 {plan.organizer} · {plan.orgRole}</div>}
            </div>
            <button onClick={()=>setEditMode(true)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',color:c.M2,cursor:'pointer',fontSize:'12px',flexShrink:0}}>✏️</button>
          </div>
          :<div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'8px'}}>
            <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder={t.planName||'Plan name'} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder={t.desc||'Description'} rows={2} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}}/>
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={()=>setEditMode(false)} style={{flex:1,padding:'8px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>{t.cancel||'Cancel'}</button>
              <button onClick={async()=>{const up={...plan,name:editName.trim()||null,desc:editDesc.trim()||null};await updatePlan(up);setPlan(up);setEditMode(false);}} style={{flex:1,padding:'8px',background:mc,border:'none',borderRadius:'8px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'700'}}>{t.saveLbl||'Save'}</button>
            </div>
          </div>}
        </div>}
        {/* Respondents summary (merged from WHO tab) */}
        {total===0
        ?<Card c={c} style={{textAlign:'center',padding:'32px',marginBottom:'14px'}}><div style={{fontSize:'36px',marginBottom:'12px'}}>⏳</div><div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{t.noResp}</div><div style={{color:c.M2,fontSize:'13px'}}>{t.noRespSub} <span style={{color:mc,fontWeight:'700'}}>{plan.id}</span></div></Card>
        :<>
          {best&&cntY(best.key)>0&&<div style={{background:`${mc}12`,border:`1px solid ${mc}35`,borderRadius:'14px',padding:'16px',marginBottom:'18px'}}>
            <div style={{display:'flex',gap:'14px',alignItems:'center',marginBottom:isOrgRef.current&&!plan.confirmedDate?'14px':'0'}}>
              <div style={{fontSize:'28px'}}>⭐</div>
              <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.bestOpt}</div>
                <div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(best.date,lang)}{best.startTime?' · '+best.startTime:''}</div>
                {plan.times?.[best.date]?.length>0&&<div style={{fontSize:'12px',color:c.M2}}>{plan.times[best.date].join(', ')}</div>}
                <div style={{fontSize:'13px',color:c.M2}}>✅ {cntY(best.key)}/{total}{cntN(best.key)>0?` · ❌ ${cntN(best.key)}`:''}</div>
              </div>
            </div>
            {isOrgRef.current&&!plan.confirmedDate&&<Btn onClick={()=>confirmDate(best.date,best.startTime)} disabled={conf} full sm c={c} accent={mc}>{conf?t.confirming:t.confirmThis}</Btn>}
            {best&&<button onClick={()=>generateICS({...plan,confirmedDate:best.date},lang)} style={{width:'100%',padding:'8px',background:'none',border:`1px dashed ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',marginTop:'6px'}}>{t.addToCalendar} 📅</button>}
          </div>}
        </>}
        <HR c={c}/>
        {/* Route + budget + inline map */}
        {city&&(plan.confirmedDate||plan.dates?.[0])&&<a href={`https://www.google.com/search?q=weather+${encodeURIComponent(city)}+${plan.confirmedDate||plan.dates[0]}`} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 8px',background:c.CARD2,borderRadius:'8px',textDecoration:'none',fontSize:'11px',color:c.M2,marginBottom:'8px'}}>🌤️ {city}</a>}
        {plan.dressCode&&(Array.isArray(plan.dressCode)?plan.dressCode.length>0:plan.dressCode)&&<span style={{display:'inline-flex',padding:'4px 10px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',fontSize:'12px',color:c.M2,marginBottom:'10px',marginLeft:'6px'}}>👗 {Array.isArray(plan.dressCode)?plan.dressCode.join(', '):plan.dressCode}</span>}
        {(plan.stops||[]).length===0&&<Card c={c} style={{textAlign:'center',padding:'28px'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>📍</div><div style={{color:c.M2,fontSize:'14px'}}>{t.noStopsMsg}</div></Card>}
        {(plan.stops||[]).map((s,i)=>{const opt=s.options?.[0]||s;return<div key={s.id||i} style={{display:'flex',gap:'12px',marginBottom:'10px'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:`${mc}20`,border:`1.5px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',color:mc,flexShrink:0}}>{i+1}</div>
            {i<plan.stops.length-1&&<div style={{width:'2px',flex:1,background:c.BD,margin:'4px 0'}}/>}
          </div>
          <Card c={c} style={{flex:1,marginBottom:0}}>
            <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>{s.cat}</div>
            <div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{opt.name||'—'}</div>
            {opt.address&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'6px'}}>📍 {opt.address}</div>}
            <VenueInfo stop={opt} c={c} lang={lang}/>
            {parseFloat(s.cost)>0&&<div style={{marginTop:'6px'}}><Badge color={mc}>{s.cost}€/pers.</Badge></div>}
            {isOrgRef.current&&<button onClick={()=>alert(lang==='es'?'Próximamente: añadir alternativas para esta parada':'Coming soon: add alternatives for this stop')} style={{marginTop:'8px',padding:'5px 10px',background:'none',border:`1px dashed ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',width:'100%'}}>+ {t.alternative||'Alternative'}</button>}
          </Card>
        </div>})}
        {budget>0&&<><HR c={c}/>
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 16px',background:`${mc}0D`,border:`1px solid ${mc}30`,borderRadius:'12px',marginBottom:'8px'}}><span style={{color:c.M2}}>{t.perPerson}</span><span style={{color:mc,fontSize:'22px',fontWeight:'800'}}>{budget.toFixed(0)}€</span></div>
          {giftPer>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',marginBottom:'8px'}}><span style={{color:c.M2,fontSize:'14px'}}>+ {t.giftLbl}</span><span style={{color:c.T,fontWeight:'600'}}>{giftPer.toFixed(0)}€</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 16px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px'}}><span style={{color:c.T,fontWeight:'700'}}>{t.totalLbl}</span><span style={{color:mc,fontSize:'18px',fontWeight:'800'}}>{(budget+giftPer).toFixed(0)}€</span></div>
        </>}
        {plan.stops?.some(s=>(s.options?.[0]?.lat&&s.options?.[0]?.lng)||(s.lat&&s.lng))&&<><HR c={c}/><RouteMap stops={(plan.stops||[]).map(s=>{const o=s.options?.[0]||s;return{...s,lat:o.lat||s.lat,lng:o.lng||s.lng,name:o.name||s.name,address:o.address||s.address,placeId:o.placeId||s.placeId||null};})} c={c}/></>}
      </></React.Suspense>}

      {/* ALTS tab = Alternative dates */}
      {!ldg&&tab==='alts'&&<div>
        {/* Current date+time */}
        <Card c={c} style={{marginBottom:'12px'}}>
          <Lbl c={c}>📅 {t.confirmedDate||'Date'}</Lbl>
          {plan.dates?.map((d,i)=><div key={d} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<plan.dates.length-1?`1px solid ${c.BD}`:'none'}}>
            <span style={{fontSize:'14px',color:d===plan.confirmedDate?mc:c.T,fontWeight:d===plan.confirmedDate?'700':'400',textTransform:'capitalize'}}>{fmtShort(d,lang)}</span>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'12px',color:'#22c55e'}}>✅ {cntY(slots.find(s=>s.date===d)?.key||d)}</span>
              {d===plan.confirmedDate&&<span style={{fontSize:'10px',background:mc,color:'#0A0A0A',padding:'1px 7px',borderRadius:'10px',fontWeight:'700'}}>✓</span>}
            </div>
          </div>)}
          {plan.startTimes?.filter(t=>t).length>0&&<div style={{marginTop:'8px',fontSize:'13px',color:c.M2}}>🕐 {plan.startTimes.filter(t=>t).join(' / ')}</div>}
        </Card>

        {/* Add alternative dates — organizer only */}
        {isOrgRef.current&&<Card c={c}>
          <Lbl c={c}>+ {t.alternativeDates||'Add alternative dates'}</Lbl>
          <p style={{fontSize:'12px',color:c.M2,marginBottom:'10px'}}>{lang==='es'?'Añade más fechas para que los invitados voten':'Add more dates for invitees to vote on'}</p>
          <input type="date" min={new Date().toISOString().split('T')[0]} onChange={async e=>{
            if(!e.target.value)return;
            const newDates=[...(plan.dates||[]),e.target.value].filter((v,i,a)=>a.indexOf(v)===i).sort();
            const up={...plan,dates:newDates};
            await updatePlan(up);setPlan(up);
            e.target.value='';
          }} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'8px'}}/>
          <input type="time" placeholder={lang==='es'?'Hora alternativa':'Alternative time'} onChange={async e=>{
            if(!e.target.value)return;
            const newTimes=[...(plan.startTimes||[]),e.target.value].filter((v,i,a)=>a.indexOf(v)===i);
            const up={...plan,startTimes:newTimes};
            await updatePlan(up);setPlan(up);
            e.target.value='';
          }} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
        </Card>}

      </div>}

      {/* SUMMARY tab = Ranking + collapsible vote bars, per-person, comments */}
      {!ldg&&tab==='summary'&&<>
        {total===0?<Card c={c} style={{textAlign:'center',padding:'32px'}}>
          <div style={{fontSize:'36px',marginBottom:'10px'}}>📊</div>
          <div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{lang==='es'?'Aún no hay datos':'No data yet'}</div>
          <div style={{color:c.M2,fontSize:'13px'}}>{lang==='es'?'Cuando los invitados respondan, verás los datos aquí':'When invitees respond, you\'ll see the data here'}</div>
        </Card>
        :<>
          {/* Tie detection */}
          {best&&(()=>{
            const tiedSlots=slots.filter(s=>score(s.key)===score(best.key)&&cntY(s.key)>0);
            const hasTie=tiedSlots.length>1&&!plan.confirmedDate;
            if(!hasTie||!isOrgRef.current)return null;
            return(<div style={{background:'#f59e0b10',border:'1px solid #f59e0b40',borderRadius:'14px',padding:'16px',marginBottom:'18px'}}>
              <div style={{fontSize:'14px',color:'#f59e0b',fontWeight:'700',marginBottom:'8px'}}>⚖️ {t.tiedDates}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
                {tiedSlots.map(s=><span key={s.key} style={{fontSize:'13px',padding:'4px 12px',borderRadius:'20px',background:'#f59e0b20',color:'#f59e0b',border:'1px solid #f59e0b30',textTransform:'capitalize'}}>{fmtShort(s.date,lang)}{s.startTime?' · '+s.startTime:''}</span>)}
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={()=>confirmDate(tiedSlots[0].date,tiedSlots[0].startTime)} style={{flex:1,padding:'10px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{t.decideTie}</button>
                <button onClick={async()=>{const up={...plan,tiebreaker:tiedSlots.map(s=>s.key)};await updatePlan(up);setPlan(up);}} style={{flex:1,padding:'10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'13px'}}>{t.secondRound}</button>
              </div>
            </div>);
          })()}

          {/* Ranking with human explanations */}
          {(()=>{
            const genExplanation=(ds,allRs,stops,lng)=>{
              const isEs=lng==='es';
              const yesRs=allRs.filter(r=>r.avail?.[ds.key]==='yes');
              const names=yesRs.map(r=>r.name);
              const noNames=allRs.filter(r=>r.avail?.[ds.key]==='no').map(r=>r.name);
              let text=isEs
                ?`${names.join(', ')} ${names.length===1?'puede':'pueden'} este día.`
                :`${names.join(', ')} ${names.length===1?'can':'can'} make it.`;
              if(noNames.length>0){
                text+=isEs
                  ?` ${noNames.join(', ')} no ${noNames.length===1?'puede':'pueden'}.`
                  :` ${noNames.join(', ')} can't make it.`;
              }
              if(stops?.length>0){
                const partial=yesRs.filter(r=>stops.some(s=>r.stopAttend?.[s.id]==='no'));
                if(partial.length>0){
                  const details=partial.map(r=>{
                    const skipped=stops.filter(s=>r.stopAttend?.[s.id]==='no').map(s=>s.options?.[0]?.name||'stop').join(', ');
                    return`${r.name} → ${skipped}`;
                  }).join('; ');
                  text+=isEs?` No a todo: ${details}.`:` Partial: ${details}.`;
                }
              }
              return text;
            };
            const ranked=[...slots].sort((a,b)=>score(b.key)-score(a.key)).filter(s=>cntY(s.key)>0);
            if(ranked.length===0)return null;
            return<div style={{marginBottom:'18px'}}>
              {ranked.map((s,i)=>{
                const ny=cntY(s.key);const nn=cntN(s.key);const pct=total>0?Math.round(ny/total*100):0;
                const isBest=i===0;
                const explanation=genExplanation(s,rs,plan.stops,lang);
                return<div key={s.key} style={{padding:'14px',marginBottom:'8px',background:isBest?`${mc}12`:c.CARD,border:`1px solid ${isBest?mc+'35':c.BD}`,borderRadius:'12px'}}>
                  <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:isBest?mc:`${c.M2}30`,color:isBest?'#0A0A0A':c.M2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'800',flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                        <span style={{fontSize:'14px',color:isBest?mc:c.T,fontWeight:isBest?'700':'500',textTransform:'capitalize'}}>{fmtShort(s.date,lang)}{s.startTime?' · '+s.startTime:''}</span>
                        {isBest&&<span>⭐</span>}
                      </div>
                      <div style={{fontSize:'13px',color:c.M2,marginBottom:'6px'}}>👥 {ny}/{total} ({pct}%){nm>0?` · 🤔 ${nm}`:''}</div>
                      <div style={{fontSize:'12px',color:c.M2,lineHeight:1.5,fontStyle:'italic'}}>{explanation}</div>
                      {isOrgRef.current&&!plan.confirmedDate&&<button onClick={()=>confirmDate(s.date,s.startTime)} style={{marginTop:'8px',padding:'6px 14px',background:isBest?mc:c.CARD2,border:isBest?'none':`1px solid ${c.BD}`,borderRadius:'8px',color:isBest?'#0A0A0A':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'700'}}>{t.confirmBtn||'Confirm'}</button>}
                    </div>
                  </div>
                </div>;
              })}
            </div>;
          })()}

          {/* Collapsible: Votaciones */}
          <div style={{marginBottom:'10px'}}>
            <button onClick={()=>setOpenSection(p=>({...p,votes:!p.votes}))} style={{width:'100%',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:openSection.votes?'10px 10px 0 0':'10px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}>
              <span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{lang==='es'?'Votaciones':'Votes'}</span>
              <span style={{color:c.M2}}>{openSection.votes?'▾':'▸'}</span>
            </button>
            {openSection.votes&&<div style={{padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px'}}>
              {slots.map(s=>{const d=s.date;const key=s.key;const ny=cntY(key);const nm=cntM(key);const pct=(ny/mx)*100;const isBest=best&&key===best.key&&ny>0;const isConf=d===plan.confirmedDate;return(
                <div key={key} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{fontSize:'13px',color:isConf||isBest?mc:c.T,fontWeight:isConf||isBest?'700':'400',textTransform:'capitalize'}}>{fmtShort(d,lang)}{s.startTime?' · '+s.startTime:''}</span>
                      {isConf&&<span style={{fontSize:'10px',background:mc,color:'#0A0A0A',padding:'1px 7px',borderRadius:'20px',fontWeight:'800'}}>{t.CONFIRMED}</span>}
                      {!isConf&&isBest&&<span>⭐</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'12px',color:'#22c55e',fontWeight:'600'}}>✅ {ny}</span>
                      {nm>0&&<span style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600'}}>🤔 {nm}</span>}
                    </div>
                  </div>
                  <div style={{height:'7px',background:c.BD,borderRadius:'4px',overflow:'hidden',position:'relative'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:isConf||isBest?mc:'#22c55e',borderRadius:'4px',transition:'width .5s'}}/>
                    {nm>0&&<div style={{position:'absolute',left:`${pct}%`,top:0,height:'100%',width:`${(nm/total)*100}%`,background:'#f59e0b'}}/>}
                  </div>
                </div>);})}
            </div>}
          </div>

          {/* Collapsible: Detalles por persona */}
          <div style={{marginBottom:'10px'}}>
            <button onClick={()=>setOpenSection(p=>({...p,people:!p.people}))} style={{width:'100%',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:openSection.people?'10px 10px 0 0':'10px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}>
              <span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{t.detailPerPerson||(lang==='es'?'Detalles por persona':'Per-person details')}</span>
              <span style={{color:c.M2}}>{openSection.people?'▾':'▸'}</span>
            </button>
            {openSection.people&&<div style={{padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px'}}>
              {rs.map((r,i)=><div key={i} style={{paddingBottom:'12px',marginBottom:'12px',borderBottom:i<rs.length-1?`1px solid ${c.BD}`:'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'5px'}}>
                  <div><span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{r.name}</span>{r.role&&<span style={{fontSize:'11px',color:c.M2,marginLeft:'6px'}}>· {r.role}</span>}{r.how&&<span style={{fontSize:'12px',color:c.M2,marginLeft:'6px'}}>· {howL(r.how)}</span>}</div>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    {r.changeLog?.length>0&&(()=>{const last=r.changeLog[0];const recent=last&&(Date.now()-new Date(last.at).getTime())<3600000;return<span title={t.editedTimes.replace('{n}',r.changeLog.length)} style={{fontSize:'11px',color:recent?'#f59e0b':c.M2,fontWeight:recent?'700':'400'}}>✏️{recent?' nuevo':''}</span>;})()}
                  </div>
                </div>
                {r.comment&&<div style={{fontSize:'13px',color:c.M2,fontStyle:'italic',marginBottom:'6px',padding:'6px 10px',background:c.CARD,borderRadius:'8px'}}>"{r.comment}"</div>}
                <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                  {slots.map(s=>{const v=r.avail?.[s.key];const vc={yes:'#22c55e',no:'#ef4444'};const vi={yes:'✅',no:'❌'};return(v==='yes'||v==='no')?<span key={s.key} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:`${vc[v]}20`,color:vc[v],border:`1px solid ${vc[v]}30`}}>{vi[v]} {fmtShort(s.date,lang)}{s.startTime?' · '+s.startTime:''}</span>:null;})}
                </div>
                {r.stopAttend&&plan.stops?.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'4px'}}>
                  {(plan.stops||[]).map((st,si)=>{const v=r.stopAttend?.[st.id];if(!v)return null;const sName=st.options?.[0]?.name||`${si+1}`;const vc={yes:'#22c55e',no:'#ef4444'};const vi={yes:'✅',no:'❌'};return<span key={st.id} style={{fontSize:'10px',padding:'2px 7px',borderRadius:'12px',background:`${vc[v]||c.CARD2}15`,color:vc[v]||c.M2,border:`1px solid ${(vc[v]||c.BD)}30`}}>{vi[v]||'?'} {sName}</span>;})}
                </div>}
                {r.stopPrefs&&plan.stops?.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'4px'}}>
                  {(plan.stops||[]).flatMap((st,si)=>(st.options||[]).filter((opt)=>r.stopPrefs?.[st.id]===opt.id||r.stopPrefs?.[st.id+'_'+opt.id]).map((opt)=><span key={st.id+'_'+opt.id} style={{fontSize:'10px',padding:'2px 7px',borderRadius:'12px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`}}>⭐ {opt.name||`${si+1}`}</span>))}
                </div>}
              </div>)}
            </div>}
          </div>

          {/* Collapsible: Comentarios */}
          {rs.some(r=>r.comment)&&<div style={{marginBottom:'10px'}}>
            <button onClick={()=>setOpenSection(p=>({...p,comments:!p.comments}))} style={{width:'100%',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:openSection.comments?'10px 10px 0 0':'10px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}>
              <span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>💬 {t.comments||(lang==='es'?'Comentarios':'Comments')}</span>
              <span style={{color:c.M2}}>{openSection.comments?'▾':'▸'}</span>
            </button>
            {openSection.comments&&<div style={{padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px'}}>
              {rs.filter(r=>r.comment).map((r,i)=><div key={i} style={{marginBottom:'10px',paddingBottom:'10px',borderBottom:i<rs.filter(x=>x.comment).length-1?`1px solid ${c.BD}`:'none'}}>
                <div style={{fontSize:'12px',color:mc,fontWeight:'600',marginBottom:'3px'}}>{r.name}</div>
                <div style={{fontSize:'13px',color:c.T}}>"{r.comment}"</div>
              </div>)}
            </div>}
          </div>}

          {/* Poll results */}
          {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c}>
            <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
            {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
              <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
            </div>);})}
          </Card>}

          {/* Alternative dates suggested by guests */}
          {rs.some(r=>r.altDate)&&<Card c={c} style={{border:`1px solid #f59e0b30`,background:'#f59e0b08'}}>
            <Lbl c={c}>📅 {t.datesSuggestedLbl}</Lbl>
            {rs.filter(r=>r.altDate).map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<rs.filter(x=>x.altDate).length-1?`1px solid ${c.BD}`:'none'}}>
              <div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{fmtDate(r.altDate,lang)}</div>{r.altNote&&<div style={{fontSize:'12px',color:c.M2}}>{r.altNote}</div>}</div>
              <span style={{fontSize:'12px',color:c.M2}}>— {r.name}</span>
            </div>)}
          </Card>}
        </>}
      </>}

      {/* MORE tab = Extras + Suggestions */}
      {!ldg&&tab==='more'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {/* Gift */}
        {plan.gift&&<Card c={c} accent>
          <Lbl c={c}>{t.giftSec}</Lbl>
          <div style={{fontSize:'18px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{plan.gift.name||'—'}</div>
          {plan.gift.price&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}><span style={{color:c.M2,fontSize:'14px'}}>{t.totalPrice}</span><span style={{color:mc,fontWeight:'700',fontSize:'18px'}}>{plan.gift.price}€</span></div>
          {total>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}><span style={{color:c.M2,fontSize:'14px'}}>{t.perOf} ({total})</span><span style={{color:mc,fontWeight:'700'}}>{(parseFloat(plan.gift.price)/total).toFixed(2)}€</span></div>}</>}
          {plan.gift.link&&<a href={plan.gift.link.startsWith('http')?plan.gift.link:'https://'+plan.gift.link} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'10px',background:`${mc}20`,border:`1px solid ${mc}50`,borderRadius:'10px',color:mc,textDecoration:'none',fontSize:'14px',fontWeight:'600',marginBottom:'10px'}}>{t.seeGift}</a>}
        </Card>}
        {/* Bring list */}
        {plan.bring?.filter(b=>b.text||typeof b==='string').length>0&&<Card c={c}>
          <Lbl c={c}>{t.bring}</Lbl>
          {plan.bring.filter(b=>b.text||typeof b==='string').map((b,i)=>{const txt=typeof b==='string'?b:b.text;return<div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:i<plan.bring.filter(x=>x.text||typeof x==='string').length-1?`1px solid ${c.BD}`:'none',fontSize:'14px',color:c.T}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:mc,flexShrink:0}}/>{txt}</div>;})}
        </Card>}
        {/* Poll results */}
        {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c}>
          <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
          {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
            <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
          </div>);})}
        </Card>}
        {/* Expense splitter */}
        <ExpenseSplitter plan={plan} rs={rs||[]} mc={mc} c={c} lang={lang}/>
        {/* Plan share card */}
        {plan.confirmedDate&&<Card c={c}>
          <Lbl c={c}>{t.planCard}</Lbl>
          <div style={{background:`linear-gradient(135deg,${mc}20,${mc}05)`,border:`2px solid ${mc}40`,borderRadius:'12px',padding:'16px',textAlign:'center',fontFamily:"'Syne',serif"}}>
            <div style={{fontSize:'28px',marginBottom:'6px'}}>{'🎉'}</div>
            <div style={{fontSize:'18px',fontWeight:'800',color:c.T,marginBottom:'4px'}}>{plan.name}</div>
            <div style={{fontSize:'13px',color:mc,fontWeight:'600',marginBottom:'6px',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · 🕐 '+plan.confirmedStartTime:''}</div>
            {plan.times?.[plan.confirmedDate]?.length>0&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'4px'}}>🕐 {plan.times[plan.confirmedDate].join(' · ')}</div>}
            {(plan.stops||[]).filter(s=>(s.options?.[0]?.name||s.name)).slice(0,3).map((s,i)=><div key={i} style={{fontSize:'12px',color:c.M2}}>{i===0?'📍':'↓'} {s.options?.[0]?.name||s.name}</div>)}
            <div style={{marginTop:'8px',fontSize:'11px',color:c.M}}>queda. · {plan.id}</div>
          </div>
          <div style={{fontSize:'12px',color:c.M2,textAlign:'center',marginTop:'8px'}}>{t.hintScreenshot}</div>
        </Card>}
      </div></React.Suspense>}

    </div>
  </>);
}


// ─── AUTH SCREEN ─────────────────────────────────────
