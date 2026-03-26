import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'
import { db, updatePlan, loadResps, saveResp, savePlan } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { daysUntil, fmtDate, fmtShort, fmtTime, genId } from '../lib/utils.js'

export const addMins=(time,mins)=>{if(!time)return'';const[h,m]=time.split(':').map(Number);const total=h*60+m+mins;const nh=Math.floor(((total%1440)+1440)%1440/60);const nm=((total%1440)+1440)%1440%60;return`${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;};
export const fmtMinsToH=(mins)=>{const h=Math.floor(Math.abs(mins)/60);const m=Math.abs(mins)%60;return`${mins>=0?'+':'-'}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}h`;};

const Ctx=createContext();
export const useResults=()=>useContext(Ctx);

export default function ResultsProvider({plan:ip,isOrg,c,lang,children}){
  const t=T[lang];const mc=c.A;

  // Plan + responses
  const[plan,setPlan]=useState(ip);
  const[rs,setRs]=useState([]);
  const[ldg,setL]=useState(true);
  const isOrgRef=useRef(isOrg);
  const prevCountRef=useRef(null);
  const refreshRef=useRef(null);

  // Slots
  const slots=[];
  (plan.dates||[]).forEach(d=>{
    const times=(plan.startTimes?.length&&plan.startTimes.some(t2=>t2))?plan.startTimes.filter(t2=>t2):[''];
    times.forEach(st=>{const key=st?`${d}_${st}`:d;slots.push({key,date:d,startTime:st});});
  });
  const cntY=key=>rs.filter(r=>r.avail?.[key]==='yes').length;
  const cntN=key=>rs.filter(r=>r.avail?.[key]==='no').length;
  const score=key=>cntY(key)-cntN(key);
  const total=rs.length;
  const best=total>0&&slots.length>0?slots.reduce((b,s)=>score(s.key)>score(b.key)?s:b,slots[0]):null;

  // Plan data model:
  // - dates[] and startTimes[] are the source of truth for scheduling
  // - date and time are shortcuts for dates[0] and startTimes[0] (quick read access)
  // - dateTimes{} maps each date to its own array of times (independent hours per date)
  // - stops[] contains all point details (venue, meeting point, tolerance, capacity, etc.)
  // - place is a shortcut for stops[0].options[0] (quick read access to first venue)
  const planDate=plan.date||plan.dates?.[0]||null;
  const planTime=plan.time||plan.startTimes?.[0]||null;
  const planPlace=plan.place||plan.stops?.[0]?.options?.[0]||null;
  const stop=plan.stops?.[0]||{};
  const tolerance=parseInt(stop.tolerance)||0;
  const cancelledStops=new Set((plan.stops||[]).filter(s=>{const min=parseInt(s.minAttendees);return min>0&&total>0&&rs.filter(r=>r.stopAttend?.[s.id]==='yes').length<min;}).map(s=>s.id));

  // UI state
  const[tab,setTab]=useState('plan');
  const[openSection,setOpenSection]=useState({});
  const[autoConfirmPending,setAutoConfirmPending]=useState(null);
  const[newRespAlert,setAlert]=useState(null);
  const[remSent,setRem]=useState(false);

  // Edit state
  const[editState,setEditStateRaw]=useState({mode:false,name:ip.name,desc:ip.desc||'',conf:false,mpSearch:'',mpResults:[]});
  const setEditState=(k,v)=>setEditStateRaw(p=>({...p,[k]:v}));

  // My vote state
  const myRespKey='q_myresp_'+ip.id;
  const[myPrev,setMyPrev]=useState(ls.get(myRespKey,null));
  const[myVote,setMyVoteRaw]=useState({
    placeOk:myPrev?.placeOk??null,dateOk:myPrev?.dateOk??null,timeOk:myPrev?.timeOk??null,
    meetOk:myPrev?.meetOk??null,lateMin:myPrev?.lateMin||0,
    altDates:myPrev?.availDates||[],timeFrom:myPrev?.availTimeFrom||'',timeTo:myPrev?.availTimeTo||'',
    name:myPrev?.name||ls.get('q_myname',''),placeComment:myPrev?.placeComment||'',
    saving:false,saved:!!myPrev,saveConfirm:false
  });
  const setMyVote=(k,v)=>setMyVoteRaw(p=>({...p,[k]:v}));

  // Refresh
  refreshRef.current=async(silent=false)=>{
    if(!silent)setL(true);
    const newRs=await loadResps(plan.id);
    if(silent&&prevCountRef.current!==null&&newRs.length>prevCountRef.current){
      const added=newRs.filter(r=>!rs.find(x=>x.name===r.name));
      if(added.length>0){setAlert(added[added.length-1].name);setTimeout(()=>setAlert(null),4000);}
    }
    prevCountRef.current=newRs.length;setRs(newRs);
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
    const channel=db.channel('responses-'+plan.id).on('postgres_changes',{event:'*',schema:'public',table:'responses',filter:'plan_id=eq.'+plan.id},()=>refresh(true)).subscribe();
    return()=>{db.removeChannel(channel);};
  },[plan.id]);

  // Auto-confirm on deadline
  useEffect(()=>{
    if(plan.deadline&&!plan.confirmedDate&&new Date(plan.deadline)<new Date()){
      const bestSlot=rs.length>0&&slots.length>0?slots.reduce((b,s)=>score(s.key)>score(b.key)?s:b,slots[0]):null;
      if(bestSlot&&cntY(bestSlot.key)>0&&isOrgRef.current)confirmDate(bestSlot.date,bestSlot.startTime);
    }
  },[rs]);

  // Confirm date
  const confirmDate=async(d,st)=>{
    setEditState('conf',true);
    const log=[...(plan.changeLog||[]),{at:new Date().toISOString(),type:'confirm',desc:`Confirmed: ${d}${st?' '+st:''}`}];
    const up={...plan,confirmedDate:d,confirmedStartTime:st||'',changeLog:log};
    await updatePlan(up);setPlan(up);setEditState('conf',false);
  };

  // Save inline response
  const saveMyResp=async()=>{
    if(!myVote.name.trim())return;
    setMyVote('saving',true);
    const placeOk=myVote.placeOk===true;
    const changeLog=[...(myPrev?.changeLog||[])];
    if(myPrev)changeLog.unshift({at:new Date().toISOString(),desc:'Updated'});
    const resp={name:myVote.name.trim(),dateOk:myVote.dateOk,timeOk:myVote.timeOk,meetOk:myVote.meetOk,lateMin:myVote.lateMin,
      availDates:myVote.dateOk===false?myVote.altDates:[],availTimeFrom:myVote.timeOk===false?myVote.timeFrom:'',availTimeTo:myVote.timeOk===false?myVote.timeTo:'',
      placeOk,placeComment:myVote.placeComment,
      avail:myVote.dateOk&&myVote.timeOk?{[planTime?`${planDate}_${planTime}`:planDate]:'yes'}:{},
      how:'',comment:myPrev?.comment||'',changeLog,at:new Date().toISOString()};
    try{
      await saveResp(plan.id,myVote.name.trim(),resp);
      const{data:{user}}=await db.auth.getSession().then(s=>({data:{user:s.data?.session?.user}}));
      if(user)db.from('responses').update({user_id:user.id}).eq('plan_id',plan.id).eq('name',myVote.name.trim()).then(()=>{},()=>{});
      addMyPlan(plan.id,plan.name,'invited');ls.set(myRespKey,resp);setMyPrev(resp);ls.set('q_myname',myVote.name.trim());
      setMyVote('saved',true);setMyVote('saveConfirm',true);setTimeout(()=>setMyVote('saveConfirm',false),3000);refresh(true);
    }catch(e){console.error('Save failed:',e);setMyVote('saveConfirm',false);alert(t.saveError||'Could not save.');}
    setMyVote('saving',false);
  };

  // Share helpers
  const shareUrl=location.href.split('?')[0].replace(/\/plan\/.*$/,'')+'/plan/'+plan.id;
  const copyShare=()=>{navigator.clipboard?.writeText(shareUrl).catch(()=>{});};
  const waShare=()=>window.open('https://wa.me/?text='+encodeURIComponent(`${plan.name||'queda.'}\n${shareUrl}`),'_blank');
  const waConfirm=()=>{window.open('https://wa.me/?text='+encodeURIComponent(`📌 *${plan.name}* — ${t.dateConfirmedMsg}\n\n🗓️ ${fmtDate(plan.confirmedDate,lang)}${plan.confirmedStartTime?' · 🕐 '+fmtTime(plan.confirmedStartTime):''}\n\n${shareUrl}`),'_blank');};
  const waRem=()=>{window.open('https://wa.me/?text='+encodeURIComponent(`⏰ ${t.reminderMsg?.replace('{name}',plan.name)}\n${shareUrl}`),'_blank');setRem(true);};

  const value={
    planState:{plan,setPlan,rs,total,isOrg:isOrgRef.current,slots,best,cntY,score,cancelledStops,ldg},
    myVote,setMyVote,myPrev,
    editState,setEditState,
    ui:{tab,setTab,openSection,setOpenSection,newRespAlert,autoConfirmPending,setAutoConfirmPending,remSent},
    helpers:{mc,c,t,lang,planDate,planTime,planPlace,stop,tolerance,saveMyResp,confirmDate,refresh,shareUrl,waShare,waConfirm,waRem,copyShare,addMins,fmtMinsToH,fmtDate,fmtShort,fmtTime,daysUntil,genId,savePlan,updatePlan,addMyPlan,generateICS:null},
  };

  return<Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
