import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { db, updatePlan, loadResps, saveResp, savePlan } from '../lib/supabase.js'
import { ls } from '../lib/storage.js'
import { daysUntil, fmtDate, fmtShort, genId } from '../lib/utils.js'
import { Btn, Card, Lbl, ModeBadge, Badge, Back, HR, Inp, Txa } from '../components/ui.jsx'
import WeatherWidget from '../components/WeatherWidget.jsx'
const TransportPanel = React.lazy(() => import('../components/TransportPanel.jsx'))
import OutfitCard from '../components/OutfitCard.jsx'
const ExpenseSplitter = React.lazy(() => import('../components/ExpenseSplitter.jsx'))
import PostPlanSurvey from '../components/PostPlanSurvey.jsx'
import SavedGroups from '../components/SavedGroups.jsx'
const AfterPlanSuggestions = React.lazy(() => import('../components/AfterPlanSuggestions.jsx'))
import PayModal from '../components/PayModal.jsx'
import PersonalisedLink from '../components/PersonalisedLink.jsx'
import { generateICS } from '../lib/ics.js'
const RouteMap = React.lazy(() => import('../components/RouteMap.jsx'))
import VenueInfo from '../components/VenueInfo.jsx'

export default function Results({plan:ip,onBack,isOrg,c,lang}){
  const[plan,setPlan]=useState(ip);const t=T[lang];const isEs=lang==='es';
  const mc=getMC(plan.mode,c);
  const[tab,setTab]=useState('who');const[rs,setRs]=useState([]);const[ldg,setL]=useState(true);
  const[conf,setConf]=useState(false);const[remSent,setRem]=useState(false);
  const[payModal,setPay]=useState(false);const[payAmt,setPayAmt]=useState(0);
  const[newRespAlert,setAlert]=useState(null);
  const[autoConfirmPending,setAutoConfirmPending]=useState(null);
  const[editMode,setEditMode]=useState(false);
  const[duplicating,setDuplicating]=useState(false);
  const[editName,setEditName]=useState(ip.name);
  const[editDesc,setEditDesc]=useState(ip.desc||'');
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
          new Notification(plan.name,{body:(plan.lang==='es'?`Nueva respuesta de ${who}`:`New response from ${who}`),icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>'});
        }
      }
    }
    prevCountRef.current=newRs.length;
    setRs(newRs);
    // Auto-confirm check
    if(isOrgRef.current&&plan.autoConfirm&&!plan.confirmedDate){
      const cntYFn=d=>newRs.filter(r=>r.avail?.[d]==='yes').length;
      const autoDate=(plan.dates||[]).find(d=>cntYFn(d)>=plan.autoConfirmN);
      if(autoDate&&!autoConfirmPending)setAutoConfirmPending(autoDate);
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
  const total=rs.length;
  const cntY=d=>rs.filter(r=>r.avail?.[d]==='yes').length;
  const cntM=d=>rs.filter(r=>r.avail?.[d]==='maybe').length;
  const score=d=>cntY(d)*1000+cntM(d); // Sí gana siempre, Quizás solo desempata
  const mx=Math.max(...(plan.dates||[]).map(d=>cntY(d)),1);
  const best=total>0?(plan.dates||[]).reduce((b,d)=>score(d)>score(b)?d:b,plan.dates[0]):null;
  const budget=(plan.stops||[]).reduce((s,p2)=>s+(parseFloat(p2.cost)||0),0);
  const giftPer=plan.gift?.price?parseFloat(plan.gift.price):0;
  const fs=plan.stops?.find(s=>s.lat&&s.lng);
  const city=plan.city||plan.cityFull?.split(',')[0]||'';
  const du=plan.confirmedDate?daysUntil(plan.confirmedDate):null;
  const confirmDate=async d=>{setConf(true);const up={...plan,confirmedDate:d};await updatePlan(up);setPlan(up);setConf(false);};
  const waConfirm=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`📌 *${plan.name}* — ${t.dateConfirmedMsg}\n\n🗓️ ${fmtDate(plan.confirmedDate,lang)}\n\n${url}`),'_blank');};
  const waRem=()=>{const url=location.href.split('?')[0]+'?code='+plan.id;window.open('https://wa.me/?text='+encodeURIComponent(`⏰ ${t.reminderMsg.replace('{name}',plan.name)}\n${url}`),'_blank');setRem(true);};
  const togglePub=async()=>{const up={...plan,isPublic:!plan.isPublic};await updatePlan(up);setPlan(up);};
  const howL=v=>({car:t.car,moto:t.moto,transit:t.transit,taxi:t.taxi,walk:t.walk,bike:t.bike}[v]||v);
  const TABS=['who','plan','dia','ir','extras'];
  const tlbl=k=>t.tabs[k]||k;
  return(<>
    {payModal&&<PayModal plan={plan} amount={payAmt} onClose={()=>setPay(false)} c={c} lang={lang}/>}
    {autoConfirmPending&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setAutoConfirmPending(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:c.CARD,border:`1px solid ${mc}40`,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>⚡</div>
        <div style={{fontSize:'16px',fontWeight:'700',color:c.T,marginBottom:'8px'}}>{t.autoConfirmTitle}</div>
        <div style={{fontSize:'14px',color:c.M2,marginBottom:'6px'}}>{cntY(autoConfirmPending)} {t.peopleSaid} {fmtShort(autoConfirmPending,lang)}</div>
        <div style={{fontSize:'13px',color:c.M2,marginBottom:'20px'}}>{t.autoConfirmQ}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setAutoConfirmPending(null)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.notYet}</button>
          <button onClick={async()=>{await confirmDate(autoConfirmPending);setAutoConfirmPending(null);}} style={{flex:1,padding:'12px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{t.confirmBtn}</button>
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
        <div style={{fontSize:'12px',color:c.M2,textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}</div></div>
      </div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
        <div><div style={{display:'flex',alignItems:'center'}}><h2 style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:c.T,margin:'0 0 4px'}}>{plan.name}</h2>{isOrgRef.current&&<button onClick={()=>setEditMode(true)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',marginLeft:'8px'}}>✏️</button>}{isOrgRef.current&&<button onClick={async()=>{if(duplicating)return;setDuplicating(true);const newId=genId();const dup={...plan,id:newId,dates:[],confirmedDate:null,isPublic:false,pubFilter:null,createdAt:new Date().toISOString()};try{await savePlan(dup);navigator.clipboard?.writeText(newId);alert((t.planDuplicated||'Plan duplicated!')+' '+newId);}catch(e){console.error(e);}setDuplicating(false);}} title={t.duplicatePlan||'Duplicate plan'} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 8px',color:c.M2,cursor:'pointer',fontSize:'12px',marginLeft:'4px',opacity:duplicating?.5:1}}>📋</button>}</div><ModeBadge mode={plan.mode||'social'} lang={lang} c={c}/></div>
        <div style={{display:'flex',gap:'5px'}}>
          <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;const txt=`${t.respondToPlan.replace('{name}',plan.name)}\n${url}`;window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');}} title={t.shareWATitle} style={{background:'#25D36618',border:'1px solid #25D36640',borderRadius:'8px',padding:'6px 10px',color:'#25D366',cursor:'pointer',fontSize:'13px'}}>💬</button>
          <button onClick={()=>{const url=location.href.split('?')[0]+'?code='+plan.id;navigator.clipboard?.writeText(url);}} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.copyLinkTitle}>🔗</button>
          {typeof Notification!=='undefined'&&Notification.permission==='default'&&<button onClick={()=>Notification.requestPermission()} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}} title={t.enableNotif}>🔔</button>}
          <button onClick={refresh} title={t.refreshResp} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M2,cursor:'pointer',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',fontFamily:'inherit'}}>↻</button>
        </div>
      </div>
      <div style={{fontSize:'13px',color:c.M2,margin:'8px 0 12px'}}>{total} {total===1?t.responses:t.responsesP} · <span style={{color:mc,fontWeight:'700',letterSpacing:'.1em'}}>{plan.id}</span>{city&&<span> · 📍 {city}</span>}</div>
      {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'14px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.confirmedDate}</div><div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}</div></div>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          {isOrgRef.current&&<button onClick={waConfirm} title={t.waGroupMsg} style={{background:'#25D366',border:'none',borderRadius:'10px',padding:'8px 12px',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>{t.notifyGrp}</button>}
          <button onClick={waRem} title={t.waReminderMsg} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 12px',color:remSent?mc:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{remSent?t.remSent:t.sendRem}</button>
          <button onClick={()=>generateICS(plan,lang)} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 10px',color:c.M2,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}} title={t.addToCalendar}>📅</button>
        </div>
      </div>}
      {isOrgRef.current&&<div style={{marginBottom:'16px',display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={togglePub} title={plan.isPublic?t.planInDiscover:(t.makePublicTitle)} style={{padding:'8px 16px',background:plan.isPublic?`${mc}15`:c.CARD,border:`1px solid ${plan.isPublic?mc+'50':c.BD}`,borderRadius:'10px',color:plan.isPublic?mc:c.M2,fontSize:'12px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>{plan.isPublic?t.isPublicLbl:t.makePublic}</button>
      </div>}
      {/* Smart summary for organizer */}
      {isOrgRef.current&&!ldg&&total>0&&!plan.confirmedDate&&(()=>{
        const topDate=best;const topY=topDate?cntY(topDate):0;const topM=topDate?cntM(topDate):0;
        const noResp=plan.dates?.length>0?rs.filter(r=>!(plan.dates||[]).some(d=>r.avail?.[d]==='yes'||r.avail?.[d]==='no')).length:0;
        const awaiting=plan.dates?.length>0?0:0; // placeholder
        if(!topDate||topY===0)return null;
        const msg=isEs
          ?`${topY} de ${total} puede${topY!==1?'n':''} el ${fmtShort(topDate,lang)}${topM>0?` · ${topM} quizás`:''}${noResp>0?` · ${noResp} sin responder`:''}.`
          :`${topY} of ${total} can make ${fmtShort(topDate,lang)}${topM>0?` · ${topM} maybe`:''}${noResp>0?` · ${noResp} yet to respond`:''}.`;
        return(<div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'12px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}>
          <div style={{fontSize:'14px',color:c.T,fontWeight:'500',lineHeight:1.4}}>{msg}</div>
          <Btn onClick={()=>confirmDate(topDate)} disabled={conf} sm c={c} accent={mc} style={{flexShrink:0,fontSize:'12px',padding:'8px 12px'}}>{conf?'...':t.confirmBtn2}</Btn>
        </div>);
      })()}
      {/* TABS */}
      <div style={{display:'flex',gap:'5px',overflowX:'auto',paddingBottom:'4px',marginBottom:'20px'}}>
        {TABS.map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{padding:'7px 11px',borderRadius:'20px',border:`1px solid ${tab===tb?mc+'60':c.BD}`,background:tab===tb?`${mc}15`:c.CARD,color:tab===tb?mc:c.M2,fontSize:'12px',fontWeight:tab===tb?'700':'400',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{tlbl(tb)}</button>)}
      </div>
      {ldg&&<div style={{textAlign:'center',color:c.M,padding:'48px'}}>...</div>}

      {/* WHO */}
      {!ldg&&tab==='who'&&(total===0
        ?<Card c={c} style={{textAlign:'center',padding:'32px'}}><div style={{fontSize:'36px',marginBottom:'12px'}}>⏳</div><div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{t.noResp}</div><div style={{color:c.M2,fontSize:'13px'}}>{t.noRespSub} <span style={{color:mc,fontWeight:'700'}}>{plan.id}</span></div></Card>
        :<>
          {best&&cntY(best)>0&&<div style={{background:`${mc}12`,border:`1px solid ${mc}35`,borderRadius:'14px',padding:'16px',marginBottom:'18px'}}>
            <div style={{display:'flex',gap:'14px',alignItems:'center',marginBottom:isOrgRef.current&&!plan.confirmedDate?'14px':'0'}}>
              <div style={{fontSize:'28px'}}>⭐</div>
              <div><div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'2px'}}>{t.bestOpt}</div>
                <div style={{fontSize:'15px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(best,lang)}</div>
                {plan.times?.[best]?.length>0&&<div style={{fontSize:'12px',color:c.M2}}>{plan.times[best].join(', ')}</div>}
                <div style={{fontSize:'13px',color:c.M2}}>✅ {cntY(best)}/{total}{cntM(best)>0?` · 🤔 ${cntM(best)}`:''}</div>
              </div>
            </div>
            {isOrgRef.current&&!plan.confirmedDate&&<Btn onClick={()=>confirmDate(best)} disabled={conf} full sm c={c} accent={mc}>{conf?t.confirming:t.confirmThis}</Btn>}
            {best&&<button onClick={()=>generateICS({...plan,confirmedDate:best},lang)} style={{width:'100%',padding:'8px',background:'none',border:`1px dashed ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',marginTop:'6px'}}>{t.addToCalendar} 📅</button>}
          </div>}
          {(plan.dates||[]).map(d=>{const ny=cntY(d);const nm=cntM(d);const pct=(ny/mx)*100;const isBest=d===best&&ny>0;const isConf=d===plan.confirmedDate;return(
            <div key={d} style={{marginBottom:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <span style={{fontSize:'13px',color:isConf||isBest?mc:c.T,fontWeight:isConf||isBest?'700':'400',textTransform:'capitalize'}}>{fmtShort(d,lang)}</span>
                  {isConf&&<span style={{fontSize:'10px',background:mc,color:'#0A0A0A',padding:'1px 7px',borderRadius:'20px',fontWeight:'800'}}>{t.CONFIRMED}</span>}
                  {!isConf&&isBest&&<span>⭐</span>}
                {plan.autoConfirm&&!plan.confirmedDate&&<span style={{fontSize:'10px',background:'#f59e0b20',color:'#f59e0b',padding:'1px 7px',borderRadius:'20px',border:'1px solid #f59e0b40'}}>⚡ auto</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'12px',color:'#22c55e',fontWeight:'600'}}>✅ {ny}</span>
                  {nm>0&&<span style={{fontSize:'12px',color:'#f59e0b',fontWeight:'600'}}>🤔 {nm}</span>}
                  {isOrgRef.current&&!plan.confirmedDate&&d!==best&&(ny+nm)>0&&<button onClick={()=>confirmDate(d)} title={t.confirmDateTitle} style={{background:'none',border:'none',color:c.M2,fontSize:'11px',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>{t.confirmSmall}</button>}
                </div>
              </div>
              <div style={{height:'7px',background:c.BD,borderRadius:'4px',overflow:'hidden',position:'relative'}}>
                <div style={{height:'100%',width:`${pct}%`,background:isConf||isBest?mc:'#22c55e',borderRadius:'4px',transition:'width .5s'}}/>
                {nm>0&&<div style={{position:'absolute',left:`${pct}%`,top:0,height:'100%',width:`${(nm/total)*100}%`,background:'#f59e0b'}}/>}
              </div>
            </div>);})}
          {/* POLL RESULTS */}
          {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c}>
            <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
            {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
              <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
            </div>);})}
          </Card>}
          <Card c={c}>
            <Lbl c={c}>{t.detailPerPerson}</Lbl>
            {rs.map((r,i)=><div key={i} style={{paddingBottom:'12px',marginBottom:'12px',borderBottom:i<rs.length-1?`1px solid ${c.BD}`:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'5px'}}>
                <div><span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{r.name}</span>{r.role&&<span style={{fontSize:'11px',color:c.M2,marginLeft:'6px'}}>· {r.role}</span>}{r.how&&<span style={{fontSize:'12px',color:c.M2,marginLeft:'6px'}}>· {howL(r.how)}</span>}</div>
                <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                  {r.changeLog?.length>0&&(()=>{const last=r.changeLog[0];const recent=last&&(Date.now()-new Date(last.at).getTime())<3600000;return<span title={t.editedTimes.replace('{n}',r.changeLog.length)} style={{fontSize:'11px',color:recent?'#f59e0b':c.M2,fontWeight:recent?'700':'400'}}>✏️{recent?' nuevo':''}</span>;})()}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:'13px',color:c.M2,fontStyle:'italic',marginBottom:'6px',padding:'6px 10px',background:c.CARD2,borderRadius:'8px'}}>"{r.comment}"</div>}
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {(plan.dates||[]).map(d=>{const v=r.avail?.[d];const vc={yes:'#22c55e',maybe:'#f59e0b'};const vi={yes:'✅',maybe:'🤔'};return(v==='yes'||v==='maybe')?<span key={d} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:`${vc[v]}20`,color:vc[v],border:`1px solid ${vc[v]}30`,textTransform:'capitalize'}}>{vi[v]} {fmtShort(d,lang)}</span>:null;})}
              </div>
            </div>)}
          </Card>
          {/* PLAN CARD for sharing */}
          {plan.confirmedDate&&<Card c={c} style={{marginBottom:'12px'}}>
            <Lbl c={c}>{t.planCard}</Lbl>
            <div id="plan-share-card" style={{background:`linear-gradient(135deg,${mc}20,${mc}05)`,border:`2px solid ${mc}40`,borderRadius:'12px',padding:'16px',textAlign:'center',fontFamily:"'Syne',serif"}}>
              <div style={{fontSize:'28px',marginBottom:'6px'}}>{plan.mode==='intimate'?'💘':plan.mode==='professional'?'💼':'🎉'}</div>
              <div style={{fontSize:'18px',fontWeight:'800',color:c.T,marginBottom:'4px'}}>{plan.name}</div>
              <div style={{fontSize:'13px',color:mc,fontWeight:'600',marginBottom:'8px',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}</div>
              {plan.times?.[plan.confirmedDate]?.length>0&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'6px'}}>🕐 {plan.times[plan.confirmedDate].join(' · ')}</div>}
              {(plan.stops||[]).filter(s=>s.name).slice(0,3).map((s,i)=><div key={i} style={{fontSize:'12px',color:c.M2}}>{i===0?'📍':'↓'} {s.name}</div>)}
              <div style={{marginTop:'10px',fontSize:'11px',color:c.M2}}>queda. · {plan.id}</div>
            </div>
            <div style={{fontSize:'12px',color:c.M2,marginTop:'8px',textAlign:'center'}}>{t.hintScreenshot}</div>
          </Card>}
          {rs.some(r=>r.altDate)&&<Card c={c} style={{border:`1px solid #f59e0b30`,background:'#f59e0b08'}}>
            <Lbl c={c}>📅 {t.datesSuggestedLbl}</Lbl>
            {rs.filter(r=>r.altDate).map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<rs.filter(x=>x.altDate).length-1?`1px solid ${c.BD}`:'none'}}>
              <div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{fmtDate(r.altDate,'es')}</div>{r.altNote&&<div style={{fontSize:'12px',color:c.M2}}>{r.altNote}</div>}</div>
              <span style={{fontSize:'12px',color:c.M2}}>— {r.name}</span>
            </div>)}
          </Card>}
          {rs.some(r=>r.comment)&&<Card c={c}>
            <Lbl c={c}>💬 {t.comments}</Lbl>
            {rs.filter(r=>r.comment).map((r,i)=><div key={i} style={{marginBottom:'10px',paddingBottom:'10px',borderBottom:i<rs.filter(x=>x.comment).length-1?`1px solid ${c.BD}`:'none'}}>
              <div style={{fontSize:'12px',color:mc,fontWeight:'600',marginBottom:'3px'}}>{r.name}</div>
              <div style={{fontSize:'13px',color:c.T}}>"{r.comment}"</div>
            </div>)}
          </Card>}
        </>)}

      {/* PLAN tab = Route + budget + inline map */}
      {!ldg&&tab==='plan'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>
        {(plan.stops||[]).length===0&&<Card c={c} style={{textAlign:'center',padding:'28px'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>📍</div><div style={{color:c.M2,fontSize:'14px'}}>{t.noStopsMsg}</div></Card>}
        {(plan.stops||[]).map((s,i)=><div key={s.id||i} style={{display:'flex',gap:'12px',marginBottom:'10px'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:`${mc}20`,border:`1.5px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',color:mc,flexShrink:0}}>{i+1}</div>
            {i<plan.stops.length-1&&<div style={{width:'2px',flex:1,background:c.BD,margin:'4px 0'}}/>}
          </div>
          <Card c={c} style={{flex:1,marginBottom:0}}>
            <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>{s.cat}</div>
            <div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{s.name||'—'}</div>
            {s.address&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'6px'}}>📍 {s.address}</div>}
            <VenueInfo name={s.name} lat={s.lat} lng={s.lng} c={c} lang={lang}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'8px'}}>
              {parseFloat(s.cost)>0&&<Badge color={mc}>{s.cost}€/pers.</Badge>}
              {(s.address||s.name)&&<a href={`https://maps.google.com/?q=${encodeURIComponent((s.name||'')+(s.address?' '+s.address:''))}`} target="_blank" rel="noreferrer" style={{fontSize:'12px',color:c.M2,textDecoration:'none',padding:'4px 10px',border:`1px solid ${c.BD}`,borderRadius:'8px'}}>Google Maps 🗺️</a>}
              {s.link&&<a href={s.link.startsWith('http')?s.link:'https://'+s.link} target="_blank" rel="noreferrer" style={{fontSize:'12px',color:mc,textDecoration:'none',padding:'4px 10px',border:`1px solid ${mc}40`,borderRadius:'8px'}}>{t.bookLbl} ↗</a>}
            </div>
          </Card>
        </div>)}
        {budget>0&&<><HR c={c}/>
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 16px',background:`${mc}0D`,border:`1px solid ${mc}30`,borderRadius:'12px',marginBottom:'8px'}}><span style={{color:c.M2}}>{t.perPerson}</span><span style={{color:mc,fontSize:'22px',fontWeight:'800'}}>{budget.toFixed(0)}€</span></div>
          {giftPer>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',marginBottom:'8px'}}><span style={{color:c.M2,fontSize:'14px'}}>+ {t.giftLbl}</span><span style={{color:c.T,fontWeight:'600'}}>{giftPer.toFixed(0)}€</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',padding:'14px 16px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px'}}><span style={{color:c.T,fontWeight:'700'}}>{t.totalLbl}</span><span style={{color:mc,fontSize:'18px',fontWeight:'800'}}>{(budget+giftPer).toFixed(0)}€</span></div>
        </>}
        {plan.stops?.some(s=>s.lat&&s.lng)&&<><HR c={c}/><RouteMap stops={plan.stops} c={c}/></>}
      </></React.Suspense>}

      {/* DÍA tab = Weather + Outfit */}
      {!ldg&&tab==='dia'&&<div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
        <div>
          <Lbl c={c}>🌤️ {t.weatherForecast}</Lbl>
          {!city&&<Card c={c} style={{textAlign:'center',padding:'20px'}}><div style={{color:c.M2,fontSize:'14px'}}>{t.noCity}</div></Card>}
          {city&&(plan.confirmedDate
            ?<WeatherWidget city={city} date={plan.confirmedDate} c={c} lang={lang} showAdvice={true}/>
            :(plan.dates||[]).map(d=><div key={d} style={{marginBottom:'12px'}}><div style={{fontSize:'12px',color:c.M2,marginBottom:'5px',textTransform:'capitalize'}}>{fmtShort(d,lang)}</div><WeatherWidget city={city} date={d} c={c} lang={lang} showAdvice={true}/></div>)
          )}
        </div>
        <HR c={c}/>
        <div>
          <Lbl c={c}>👗 Outfit</Lbl>
          <p style={{fontSize:'13px',color:c.M2,marginBottom:'12px',lineHeight:1.6}}>{{social:t.whatToWear,intimate:t.firstImpressions,professional:t.rightLook}[plan.mode||'social']}</p>
          {plan.dressCode
            ?<OutfitCard dressCode={plan.dressCode} dressNote={plan.dressNote} city={city} date={plan.confirmedDate||plan.dates?.[0]} mc={mc} c={c} lang={lang} t={t}/>
            :<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'16px',textAlign:'center'}}><div style={{fontSize:'24px',marginBottom:'6px'}}>👗</div><div style={{fontSize:'13px',color:c.M2}}>{t.dcNoneNote}</div></div>
          }
        </div>
      </div>}

      {/* IR tab = Transport */}
      {!ldg&&tab==='ir'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><>
        {fs?<>
          <Card c={c} style={{marginBottom:'12px'}}><Lbl c={c}>{t.dest}</Lbl><div style={{fontSize:'15px',color:c.T,fontWeight:'600'}}>{fs.name}</div>{fs.address&&<div style={{fontSize:'13px',color:c.M2}}>{fs.address}</div>}</Card>
          <TransportPanel to={fs} planCity={city} c={c} lang={lang}/>
          {rs.filter(r=>r.how).length>0&&<><HR c={c}/><Lbl c={c}>{t.howEach}</Lbl>{rs.filter(r=>r.how).map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${c.BD}`,fontSize:'14px'}}><span style={{color:c.T}}>{r.name}</span><span style={{color:c.M2}}>{howL(r.how)}</span></div>)}</>}
        </>:<Card c={c} style={{textAlign:'center',padding:'28px'}}><div style={{fontSize:'32px',marginBottom:'8px'}}>📍</div><div style={{color:c.M2,fontSize:'14px'}}>{t.noStops}</div></Card>}
      </></React.Suspense>}

      {/* EXTRAS tab = Gift + Expenses + Pay + Plan card */}
      {!ldg&&tab==='extras'&&<React.Suspense fallback={<div style={{textAlign:'center',padding:'20px',color:c.M}}>...</div>}><div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {/* Empty state when no extras */}
        {!plan.gift&&!plan.bring?.filter(b=>b.text||typeof b==='string').length&&!plan.dressCode&&budget===0&&!plan.confirmedDate&&<div style={{textAlign:'center',padding:'40px 24px',color:c.M2}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🎁</div>
          <div style={{fontSize:'14px'}}>{t.noExtrasConfigured}</div>
          {isOrgRef.current&&<div style={{fontSize:'12px',marginTop:'8px',color:c.M}}>{t.addThemEditing}</div>}
        </div>}
        {/* Expense splitter - always show for splitting costs */}
        <ExpenseSplitter plan={plan} rs={rs||[]} mc={mc} c={c} lang={lang}/>
        {/* Gift */}
        {plan.gift&&<Card c={c} accent>
          <Lbl c={c}>{t.giftSec}</Lbl>
          <div style={{fontSize:'18px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{plan.gift.name||'—'}</div>
          {plan.gift.price&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}><span style={{color:c.M2,fontSize:'14px'}}>{t.totalPrice}</span><span style={{color:mc,fontWeight:'700',fontSize:'18px'}}>{plan.gift.price}€</span></div>
          {total>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}><span style={{color:c.M2,fontSize:'14px'}}>{t.perOf} ({total})</span><span style={{color:mc,fontWeight:'700'}}>{(parseFloat(plan.gift.price)/total).toFixed(2)}€</span></div>}</>}
          {plan.gift.link&&<a href={plan.gift.link.startsWith('http')?plan.gift.link:'https://'+plan.gift.link} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'10px',background:`${mc}20`,border:`1px solid ${mc}50`,borderRadius:'10px',color:mc,textDecoration:'none',fontSize:'14px',fontWeight:'600',marginBottom:'10px'}}>{t.seeGift}</a>}
          <Btn onClick={()=>{setPayAmt((budget+giftPer).toFixed(2));setPay(true);}} full style={{padding:'13px'}} c={c}>💳 {t.payTitle}</Btn>
        </Card>}
        {/* Bring list */}
        {plan.bring?.filter(b=>b.text||typeof b==='string').length>0&&<Card c={c}>
          <Lbl c={c}>{t.bring}</Lbl>
          {plan.bring.filter(b=>b.text||typeof b==='string').map((b,i)=>{const txt=typeof b==='string'?b:b.text;return<div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:i<plan.bring.filter(x=>x.text||typeof x==='string').length-1?`1px solid ${c.BD}`:'none',fontSize:'14px',color:c.T}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:mc,flexShrink:0}}/>{txt}</div>;})}
        </Card>}
        {/* Pay */}
        {budget>0&&<Card c={c} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:'13px',color:c.M2}}>{t.totalPerPerson}</div><div style={{fontSize:'22px',fontWeight:'800',color:mc}}>{(budget+giftPer).toFixed(0)}€</div></div>
          <Btn onClick={()=>{setPayAmt((budget+giftPer).toFixed(2));setPay(true);}} c={c} style={{background:mc,color:'#0A0A0A'}}>{t.payArrow}</Btn>
        </Card>}
        {/* Plan share card */}
        {plan.confirmedDate&&<Card c={c}>
          <Lbl c={c}>{t.planCard}</Lbl>
          <div style={{background:`linear-gradient(135deg,${mc}20,${mc}05)`,border:`2px solid ${mc}40`,borderRadius:'12px',padding:'16px',textAlign:'center',fontFamily:"'Syne',serif"}}>
            <div style={{fontSize:'28px',marginBottom:'6px'}}>{plan.mode==='intimate'?'💘':plan.mode==='professional'?'💼':'🎉'}</div>
            <div style={{fontSize:'18px',fontWeight:'800',color:c.T,marginBottom:'4px'}}>{plan.name}</div>
            <div style={{fontSize:'13px',color:mc,fontWeight:'600',marginBottom:'6px',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,lang)}</div>
            {plan.times?.[plan.confirmedDate]?.length>0&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'4px'}}>🕐 {plan.times[plan.confirmedDate].join(' · ')}</div>}
            {(plan.stops||[]).filter(s=>s.name).slice(0,3).map((s,i)=><div key={i} style={{fontSize:'12px',color:c.M2}}>{i===0?'📍':'↓'} {s.name}</div>)}
            <div style={{marginTop:'8px',fontSize:'11px',color:c.M}}>queda. · {plan.id}</div>
          </div>
          <div style={{fontSize:'12px',color:c.M2,textAlign:'center',marginTop:'8px'}}>{t.hintScreenshot}</div>
        </Card>}
        {plan.city&&<AfterPlanSuggestions plan={plan} c={c} lang={lang}/>}
        {/* Suggested dates from guests */}
        {isOrgRef.current&&rs.some(r=>r.altDate)&&<Card c={c} style={{border:'1px solid #f59e0b30',background:'#f59e0b06'}}>
          <Lbl c={c}>📅 {t.datesSuggestedLbl}</Lbl>
          {rs.filter(r=>r.altDate).map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<rs.filter(x=>x.altDate).length-1?`1px solid ${c.BD}`:'none'}}>
            <div><div style={{fontSize:'13px',color:c.T,fontWeight:'500',textTransform:'capitalize'}}>{fmtDate(r.altDate,lang)}</div>{r.altNote&&<div style={{fontSize:'12px',color:c.M2}}>{r.altNote}</div>}</div>
            <span style={{fontSize:'12px',color:c.M2}}>— {r.name}</span>
          </div>)}
        </Card>}
      </div></React.Suspense>}

    </div>
  </>);
}


// ─── AUTH SCREEN ─────────────────────────────────────
