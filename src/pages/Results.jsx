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
  // Auto-cancel points below minimum attendance
  const stopYesCount=(sid)=>rs.filter(r=>r.stopAttend?.[sid]==='yes').length;
  const cancelledStops=new Set((plan.stops||[]).filter(s=>{
    const min=parseInt(s.minAttendees);
    return min>0&&total>0&&stopYesCount(s.id)<min;
  }).map(s=>s.id));
  const firstActiveStop=(plan.stops||[]).find(s=>!cancelledStops.has(s.id));
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
  const TABS=['plan','summary'];
  const tlbl=k=>t.tabs[k]||k;
  const shareUrl=location.href.split('?')[0]+'?code='+plan.id;
  const copyShare=()=>{navigator.clipboard?.writeText(shareUrl).catch(()=>{});};
  const waShare=()=>window.open('https://wa.me/?text='+encodeURIComponent(`${plan.name||'queda.'}\n${shareUrl}`),'_blank');

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
        {cancelledStops.size>0&&total>0&&<div style={{background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'13px',color:'#f59e0b'}}>
          ⚠️ {lang==='es'?`${cancelledStops.size} punto${cancelledStops.size>1?'s':''} cancelado${cancelledStops.size>1?'s':''} por falta de asistentes`:`${cancelledStops.size} point${cancelledStops.size>1?'s':''} cancelled — not enough attendees`}
          {firstActiveStop&&<span style={{color:c.M2}}> · {lang==='es'?'El plan empieza en':'Plan starts at'} {(plan.stops||[]).indexOf(firstActiveStop)+1}</span>}
        </div>}
        {(plan.stops||[]).map((s,i)=>{const opt=s.options?.[0]||s;const isCancelled=cancelledStops.has(s.id);return<div key={s.id||i} style={{display:'flex',gap:'12px',marginBottom:'10px',opacity:isCancelled?.4:1}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:isCancelled?c.CARD2:`${mc}20`,border:`1.5px solid ${isCancelled?c.BD:mc+'60'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',color:isCancelled?c.M:mc,flexShrink:0,textDecoration:isCancelled?'line-through':'none'}}>{i+1}</div>
            {i<plan.stops.length-1&&<>{plan.stops[i+1]?.transport&&<div style={{fontSize:'12px',margin:'4px 0'}}>{({walk:'🚶',car:'🚗',transit:'🚇',bike:'🚲',taxi:'🚕'})[plan.stops[i+1].transport]||'·'}</div>}<div style={{width:'2px',flex:1,background:c.BD,margin:'2px 0'}}/></>}
          </div>
          <Card c={c} style={{flex:1,marginBottom:0}}>
            {isCancelled&&<div style={{fontSize:'11px',color:'#f59e0b',fontWeight:'600',marginBottom:'4px'}}>⚠️ {lang==='es'?'Cancelado — mínimo no alcanzado':'Cancelled — minimum not reached'}</div>}
            <div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'4px',textDecoration:isCancelled?'line-through':'none'}}>{opt.name||'—'}</div>
            {opt.address&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'6px'}}>📍 {opt.address}</div>}
            {!isCancelled&&<VenueInfo stop={opt} c={c} lang={lang}/>}
            {s.meetingPoint&&!isCancelled&&<div style={{fontSize:'12px',color:mc,marginTop:'6px'}}>📍 {t.meetingPointLbl||'Meeting point'}: {s.meetingPoint}{s.meetingMinsBefore?` (${s.meetingMinsBefore} min ${lang==='es'?'antes':'before'})`:''}</div>}
            {parseFloat(s.cost)>0&&!isCancelled&&<div style={{marginTop:'6px'}}><Badge color={mc}>{s.cost}€/pers.</Badge></div>}
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
      {/* SUMMARY tab */}
      {!ldg&&tab==='summary'&&<>
        {total===0?<Card c={c} style={{textAlign:'center',padding:'32px'}}>
          <div style={{fontSize:'36px',marginBottom:'10px'}}>📊</div>
          <div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{lang==='es'?'Aún no hay datos':'No data yet'}</div>
          <div style={{color:c.M2,fontSize:'13px'}}>{lang==='es'?'Cuando los invitados respondan, verás los datos aquí':'When invitees respond, you\'ll see the data here'}</div>
        </Card>
        :<>
          {/* Confirmed plan OR best/tied options */}
          {plan.confirmedDate&&(()=>{
            const showKey=slots.find(s=>s.date===plan.confirmedDate)?.key||plan.confirmedDate;
            const ny=cntY(showKey);
            return<div style={{background:`${mc}12`,border:`1px solid ${mc}35`,borderRadius:'14px',padding:'16px',marginBottom:'14px'}}>
              <div style={{fontSize:'11px',color:mc,fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>📌 {lang==='es'?'Plan elegido':'Chosen plan'}</div>
              <div style={{fontSize:'16px',color:c.T,fontWeight:'700',textTransform:'capitalize'}}>{fmtShort(plan.confirmedDate,lang)}{plan.confirmedStartTime?' · '+plan.confirmedStartTime:''}</div>
              <div style={{fontSize:'13px',color:c.M2,marginTop:'2px'}}>👥 {ny}/{total} {lang==='es'?'asistencia':'attendance'}</div>
            </div>;
          })()}
          {!plan.confirmedDate&&best&&cntY(best.key)>0&&(()=>{
            const bestScore=score(best.key);
            const tied=slots.filter(s=>score(s.key)===bestScore&&cntY(s.key)>0);
            const isTie=tied.length>1;
            return<div style={{background:isTie?'#f59e0b10':`${mc}12`,border:`1px solid ${isTie?'#f59e0b40':mc+'35'}`,borderRadius:'14px',padding:'16px',marginBottom:'14px'}}>
              <div style={{fontSize:'11px',color:isTie?'#f59e0b':mc,fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'8px'}}>{isTie?(lang==='es'?`⚖️ Empate — ${tied.length} opciones`:`⚖️ Tie — ${tied.length} options`):'⭐ '+(lang==='es'?'Mejor opción':'Best option')}</div>
              {(isTie?tied:[best]).map(s=><div key={s.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:isTie?`1px solid ${c.BD}20`:'none'}}>
                <div>
                  <div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(s.date,lang)}{s.startTime?' · '+s.startTime:''}</div>
                  <div style={{fontSize:'12px',color:c.M2}}>👥 {cntY(s.key)}/{total} {lang==='es'?'asistencia':'attendance'}</div>
                </div>
                {isOrgRef.current&&<button onClick={()=>confirmDate(s.date,s.startTime)} style={{padding:'8px 14px',background:isTie?'#f59e0b':mc,border:'none',borderRadius:'8px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'12px'}}>{t.confirmBtn||'Elegir'}</button>}
              </div>)}
              {isTie&&isOrgRef.current&&<div style={{fontSize:'12px',color:c.M2,marginTop:'8px'}}>{lang==='es'?'Elige una para confirmar el plan':'Pick one to confirm the plan'}</div>}
            </div>;
          })()}

          {/* Cancelled stops info */}
          {cancelledStops.size>0&&<div style={{background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'12px',color:'#f59e0b'}}>
            {(plan.stops||[]).filter(s=>cancelledStops.has(s.id)).map((s,i)=>{
              const si=(plan.stops||[]).indexOf(s);
              const sName=s.options?.[0]?.name||`${si+1}`;
              const min=parseInt(s.minAttendees);
              const yc=rs.filter(r=>r.stopAttend?.[s.id]==='yes').length;
              return<div key={s.id}>⚠️ {sName} {lang==='es'?`cancelado (${yc}/${min} mínimo)`:`cancelled (${yc}/${min} min)`}</div>;
            })}
          </div>}

          {/* People list — sorted by attendance */}
          {(()=>{
            const hasAnyYes=r2=>r2.avail&&Object.values(r2.avail).some(v=>v==='yes');
            const yesSlots=r2=>Object.values(r2.avail||{}).filter(v=>v==='yes').length;
            const sorted=[...rs].sort((a,b)=>{
              if(hasAnyYes(a)&&!hasAnyYes(b))return-1;if(!hasAnyYes(a)&&hasAnyYes(b))return 1;
              return yesSlots(b)-yesSlots(a);
            });
            return<div style={{marginBottom:'14px'}}>
              <div style={{fontSize:'12px',color:c.M2,fontWeight:'600',marginBottom:'10px'}}>👥 {total} {lang==='es'?'respuestas':'responses'}</div>
              {sorted.map((r,i)=>{
                const yes=hasAnyYes(r);
                const expanded=openSection['p_'+i];
                return<div key={i} style={{marginBottom:'6px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',overflow:'hidden'}}>
                  <div onClick={()=>setOpenSection(p=>({...p,['p_'+i]:!p['p_'+i]}))} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',cursor:'pointer'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:yes?'#22c55e':r.avail&&Object.values(r.avail).some(v=>v==='no')?'#ef4444':c.M,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:'14px',color:yes?c.T:c.M2,fontWeight:yes?'600':'400'}}>{r.name}</span>
                    {r.comment&&<span style={{fontSize:'11px',color:c.M}}>💬</span>}
                    {r.how&&<span style={{fontSize:'12px'}}>{({car:'🚗',moto:'🏍️',transit:'🚇',taxi:'🚕',walk:'🚶',bike:'🚲'})[r.how]||''}</span>}
                    <span style={{fontSize:'11px',color:c.M2}}>{expanded?'▾':'▸'}</span>
                  </div>
                  {expanded&&<div style={{padding:'8px 14px 12px',borderTop:`1px solid ${c.BD}`,fontSize:'13px'}}>
                    {r.comment&&<div style={{color:c.M2,fontStyle:'italic',marginBottom:'8px',padding:'6px 10px',background:c.CARD2,borderRadius:'8px'}}>"{r.comment}"</div>}
                    {(plan.stops||[]).filter(s=>(s.options?.[0]?.name||s.name)).length>0
                      ?<div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                        {(plan.stops||[]).filter(s=>(s.options?.[0]?.name||s.name)).map((s,si)=>{
                          const v=r.stopAttend?.[s.id];const sName=s.options?.[0]?.name||`${si+1}`;
                          const cancelled=cancelledStops.has(s.id);
                          return<span key={s.id} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:cancelled?`${c.M}10`:v==='yes'?'#22c55e20':v==='no'?'#ef444420':`${c.M}10`,color:cancelled?c.M:v==='yes'?'#22c55e':v==='no'?'#ef4444':c.M,border:`1px solid ${cancelled?c.BD:v==='yes'?'#22c55e30':v==='no'?'#ef444430':c.BD}`,textDecoration:cancelled?'line-through':'none'}}>{cancelled?'—':v==='yes'?'✓':v==='no'?'✗':'·'} {sName}</span>;
                        })}
                      </div>
                      :<div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                        {slots.map(s=>{const v=r.avail?.[s.key];return<span key={s.key} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:v==='yes'?'#22c55e20':v==='no'?'#ef444420':`${c.M}10`,color:v==='yes'?'#22c55e':v==='no'?'#ef4444':c.M,border:`1px solid ${v==='yes'?'#22c55e30':v==='no'?'#ef444430':c.BD}`,textTransform:'capitalize'}}>{v==='yes'?'✓':'✗'} {fmtShort(s.date,lang)}{s.startTime?' '+s.startTime:''}</span>;})}
                      </div>}
                  </div>}
                </div>;
              })}
            </div>;
          })()}

          {/* Ranking: all date options best to worst */}
          {slots.length>1&&<div style={{marginBottom:'14px'}}>
            <div style={{fontSize:'12px',color:c.M2,fontWeight:'600',marginBottom:'8px'}}>{lang==='es'?'Ranking de fechas':'Date ranking'}</div>
            {[...slots].sort((a,b)=>score(b.key)-score(a.key)).map((s,i)=>{
              const ny=cntY(s.key);const nn=cntN(s.key);const pct=total>0?Math.round(ny/total*100):0;
              const isBest=best&&s.key===best.key;
              return<div key={s.key} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:isBest?`${mc}10`:c.CARD,border:`1px solid ${isBest?mc+'30':c.BD}`,borderRadius:'10px',marginBottom:'6px'}}>
                <span style={{fontSize:'14px',width:'20px',textAlign:'center'}}>{i===0?'⭐':i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',color:isBest?mc:c.T,fontWeight:isBest?'700':'500',textTransform:'capitalize'}}>{fmtShort(s.date,lang)}{s.startTime?' · '+s.startTime:''}</div>
                  <div style={{height:'4px',background:c.BD,borderRadius:'2px',marginTop:'4px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:isBest?mc:'#22c55e',borderRadius:'2px'}}/>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:isBest?mc:c.T}}>👥 {ny}/{total}</div>
                  <div style={{fontSize:'11px',color:c.M2}}>{pct}% {lang==='es'?'asistencia':'attendance'}</div>
                </div>
                {isOrgRef.current&&!plan.confirmedDate&&ny>0&&<button onClick={()=>confirmDate(s.date,s.startTime)} style={{padding:'4px 10px',background:isBest?mc:c.CARD2,border:isBest?'none':`1px solid ${c.BD}`,borderRadius:'6px',color:isBest?'#0A0A0A':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:'600',flexShrink:0}}>{t.confirmBtn||'✓'}</button>}
              </div>;
            })}
          </div>}

          {/* Poll results */}
          {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c}>
            <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
            {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
              <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
            </div>);})}
          </Card>}
        </>}
      </>}

      {/* MORE tab = Extras + Suggestions */}

    </div>
  </>);
}


// ─── AUTH SCREEN ─────────────────────────────────────
