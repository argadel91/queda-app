import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { saveResp, db } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { fmtDate, fmtTime } from '../lib/utils.js'
import { Btn, Lbl, Inp, Txa, Back, Stepper } from '../components/ui.jsx'

export default function Respond({plan,onBack,onDone,onCreateOwn,c,lang:appLang,authUser,profile}){
  const pLang=appLang;const t=T[pLang];
  const mc=c.A;
  const prevKey='q_myresp_'+plan.id;
  const prev=ls.get(prevKey,null);
  const urlName=new URLSearchParams(location.search).get('name')||'';
  const[name,setName]=useState(prev?.name||urlName||profile?.name||ls.get('q_myname',''));
  const[placeOk,setPlaceOk]=useState(prev?.placeOk??null);
  const[dateOk,setDateOk]=useState(prev?.dateOk??null);
  const[timeOk,setTimeOk]=useState(prev?.timeOk??null);
  const[availDates,setAvailDates]=useState(prev?.availDates||[]);
  const[availTimeFrom,setAvailTimeFrom]=useState(prev?.availTimeFrom||'');
  const[availTimeTo,setAvailTimeTo]=useState(prev?.availTimeTo||'');
  const[suggestedPlace,setSuggestedPlace]=useState(prev?.suggestedPlace||null);
  const[suggestName,setSuggestName]=useState('');
  const[how,setHow]=useState(prev?.how||'');const[howOther,setHowOther]=useState(prev?.howOther||'');
  const[comment,setComment]=useState(prev?.comment||'');
  const[saving,setSaving]=useState(false);const[done,setDone]=useState(false);const[err,setErr]=useState('');
  const[rStep,setRStep]=useState(0);
  const[pollVote,setPollVote]=useState(prev?.pollVote||null);

  useEffect(()=>{if(name.trim())ls.set('q_myname',name.trim());},[name]);

  // Extract plan info (v4 singular fields with v3 fallback)
  const planDate=plan.date||plan.dates?.[0]||null;
  const planTime=plan.time||plan.startTimes?.[0]||null;
  const planPlace=plan.place||plan.stops?.[0]?.options?.[0]||plan.stops?.[0]||null;
  const needsAvailStep=placeOk===false||dateOk===false||timeOk===false;

  // Step labels
  const stepLabels=needsAvailStep
    ?['1','2','3']
    :['1','2'];
  const lastStep=stepLabels.length-1;

  // Backward compat: build old avail object from new response
  const buildLegacyAvail=()=>{
    const a={};
    if(dateOk){
      const key=planTime?`${planDate}_${planTime}`:planDate;
      if(key)a[key]='yes';
    }
    return a;
  };

  const submit=async()=>{
    if(!name.trim())return;
    if(placeOk===null||dateOk===null||timeOk===null){setErr(t.answerAll||'Answer all questions');return;}
    setSaving(true);
    const changeLog=[...(prev?.changeLog||[])];
    if(prev)changeLog.unshift({at:new Date().toISOString(),desc:t.respUpdated});
    const resp={
      name:name.trim(),username:profile?.username||null,
      placeOk,dateOk,timeOk,
      availDates:dateOk===false?availDates:[],
      availTimeFrom:timeOk===false?availTimeFrom:'',
      availTimeTo:timeOk===false?availTimeTo:'',
      suggestedPlace:placeOk===false?suggestedPlace:null,
      // Legacy compat
      avail:buildLegacyAvail(),
      how:how==='other'?howOther:how,howOther,comment,
      pollVote:pollVote||null,changeLog,at:new Date().toISOString()
    };
    await saveResp(plan.id,name.trim(),resp);
    if(authUser)try{await db.from('responses').update({user_id:authUser.id}).eq('plan_id',plan.id).eq('name',name.trim());}catch{}
    addMyPlan(plan.id,plan.name,'invited');
    ls.set(prevKey,resp);setSaving(false);setDone(true);
  };

  // Done screen
  if(done){
    const planUrl=location.href.split('?')[0]+'?code='+plan.id;
    const respName=name.trim()||t.someone;
    const waOrgText=pLang==='es'?`Hola ${plan.organizer}, soy *${respName}* y acabo de responder al plan *${plan.name}*. Mira las respuestas! ${planUrl}`:`Hi ${plan.organizer}, I'm *${respName}* and just responded to *${plan.name}*. Check the responses! ${planUrl}`;
    return(<div style={{padding:'60px 24px',maxWidth:'420px',margin:'0 auto',textAlign:'center'}}>
      <div style={{fontSize:'64px',marginBottom:'20px'}}>{'🎉'}</div>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:mc,marginBottom:'10px'}}>{t.savedTitle}</h2>
      <p style={{color:c.M2,marginBottom:'20px'}}>{t.savedSub}</p>
      <Btn onClick={onDone} full style={{padding:'14px',marginBottom:'10px'}} c={c} accent={mc}>{t.viewRes||'View results'} →</Btn>
      {plan.organizer&&<a href={`https://wa.me/?text=${encodeURIComponent(waOrgText)}`} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px 20px',background:'#25D366',borderRadius:'12px',color:'#fff',textDecoration:'none',fontWeight:'700',fontSize:'14px',marginBottom:'16px'}}>💬 {`${t.notifyTo} ${plan.organizer}`}</a>}
      <Btn onClick={onCreateOwn} v="secondary" full style={{padding:'12px'}} c={c}>{t.viralBtn}</Btn>
      <div style={{textAlign:'center',padding:'20px 0',fontSize:'12px',color:c.M}}>
        <span style={{fontFamily:"'Syne',serif",fontWeight:'800'}}>queda<span style={{color:c.A}}>.</span></span> — {t.landingFooter||'Group plans, zero chaos.'}
      </div>
    </div>);
  }

  const ynBtn=(val,setter,current)=>(
    <div style={{display:'flex',gap:'8px'}}>
      <button onClick={()=>setter(true)} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1px solid ${current===true?'#22c55e50':c.BD}`,background:current===true?'#22c55e18':'transparent',color:current===true?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:current===true?'700':'500'}}>✓ {t.yesLbl||'Yes'}</button>
      <button onClick={()=>setter(false)} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1px solid ${current===false?'#ef444450':c.BD}`,background:current===false?'#ef444418':'transparent',color:current===false?'#ef4444':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:current===false?'700':'500'}}>✗ No</button>
    </div>
  );

  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={()=>{if(placeOk!==null&&!window.confirm(t.unsavedWarning))return;onBack();}} label={t.back} c={c}/>
    {/* Plan header */}
    <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'16px',marginBottom:'16px',textAlign:'center'}}>
      <div style={{fontSize:'32px',marginBottom:'8px'}}>🎉</div>
      <div style={{fontSize:'18px',color:c.T,fontWeight:'700',fontFamily:"'Syne',serif"}}>{plan.name||'queda.'}</div>
      <div style={{fontSize:'13px',color:c.M2,marginTop:'4px'}}>@ {plan.organizer}</div>
    </div>
    {prev&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:c.M2}}>✏️ {t.editingPrev}</div>}
    {plan.desc&&<p style={{fontSize:'14px',color:c.T,lineHeight:1.7,marginBottom:'16px',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px'}}>{plan.desc}</p>}

    <Stepper cur={rStep} labels={stepLabels} c={c} accent={mc}/>

    {/* ── STEP 0: Name + Yes/No to plan ── */}
    {rStep===0&&<div className="fade-in">
      <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.yourName}</Lbl><Inp value={name} onChange={v=>{setName(v);ls.set('q_myname',v);}} placeholder={t.yourNamePh} c={c}/></div>

      {/* Show the plan */}
      <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
        {planPlace&&<div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
          {planPlace.photo&&<img src={planPlace.photo} alt="" style={{width:'48px',height:'48px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
          <div style={{flex:1}}>
            <div style={{fontSize:'15px',color:c.T,fontWeight:'700'}}>{planPlace.name||'—'}</div>
            {planPlace.address&&<div style={{fontSize:'12px',color:c.M2}}>📍 {planPlace.address}</div>}
            {planPlace.rating&&<div style={{fontSize:'11px',color:c.M2}}>⭐{planPlace.rating}</div>}
          </div>
        </div>}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {planDate&&<span style={{fontSize:'13px',padding:'4px 12px',borderRadius:'20px',background:`${mc}15`,color:mc,border:`1px solid ${mc}30`,textTransform:'capitalize'}}>📅 {fmtDate(planDate,pLang)}</span>}
          {planTime&&<span style={{fontSize:'13px',padding:'4px 12px',borderRadius:'20px',background:c.CARD2,color:c.T,border:`1px solid ${c.BD}`}}>🕐 {fmtTime(planTime)}</span>}
        </div>
      </div>

      {/* 3 Yes/No questions */}
      {planPlace&&<div style={{marginBottom:'14px'}}>
        <div style={{fontSize:'13px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.placeOkQ||'Does the place work?'}</div>
        {ynBtn(placeOk,setPlaceOk,placeOk)}
      </div>}

      {planDate&&<div style={{marginBottom:'14px'}}>
        <div style={{fontSize:'13px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.dateOkQ||'Does the date work?'}</div>
        {ynBtn(dateOk,setDateOk,dateOk)}
      </div>}

      {planTime&&<div style={{marginBottom:'14px'}}>
        <div style={{fontSize:'13px',color:c.T,fontWeight:'600',marginBottom:'6px'}}>{t.timeOkQ||'Does the time work?'}</div>
        {ynBtn(timeOk,setTimeOk,timeOk)}
      </div>}

      {/* If no time set, auto-yes */}
      {!planTime&&timeOk===null&&setTimeOk(true)&&null}
      {!planDate&&dateOk===null&&setDateOk(true)&&null}
      {!planPlace&&placeOk===null&&setPlaceOk(true)&&null}

      {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px',border:'1px solid #ef444430',marginBottom:'10px'}}>{err}</div>}
      <Btn onClick={()=>{
        if(!name.trim()){setErr(t.enterYourName);return;}
        if(placeOk===null||dateOk===null||timeOk===null){setErr(t.answerAll||'Answer all questions');return;}
        setErr('');setRStep(needsAvailStep?1:lastStep);
      }} full style={{padding:'14px'}} c={c} accent={mc}>{t.nextBtn?.replace(' →','')} →</Btn>
    </div>}

    {/* ── STEP 1: Availability (only if said No to something) ── */}
    {rStep===1&&needsAvailStep&&<div className="fade-in">
      {/* Alternative place suggestion */}
      {placeOk===false&&<div style={{marginBottom:'16px'}}>
        <Lbl c={c}>{t.suggestAlt||'Suggest an alternative'}</Lbl>
        <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{t.suggestAltHint||'Optional — suggest a place you prefer'}</div>
        {suggestedPlace?<div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px',marginBottom:'8px'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{suggestedPlace.name}</div>
            {suggestedPlace.address&&<div style={{fontSize:'12px',color:c.M2}}>{suggestedPlace.address}</div>}
          </div>
          <button onClick={()=>setSuggestedPlace(null)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px'}}>×</button>
        </div>
        :<div style={{display:'flex',gap:'6px'}}>
          <input value={suggestName} onChange={e=>setSuggestName(e.target.value)} placeholder={t.placeNamePh||'Place name...'} style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
          <button onClick={()=>{if(suggestName.trim())setSuggestedPlace({name:suggestName.trim(),address:'',suggestedBy:name.trim()});setSuggestName('');}} disabled={!suggestName.trim()} style={{padding:'10px 14px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px',opacity:suggestName.trim()?1:0.4}}>+</button>
        </div>}
      </div>}

      {/* Available dates */}
      {dateOk===false&&<div style={{marginBottom:'16px'}}>
        <Lbl c={c}>{t.yourAvailDates||'Which days can you?'}</Lbl>
        <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{t.yourAvailDatesHint||'Select the dates that work for you'}</div>
        {[...Array(7)].map((_,i)=>{
          const d=new Date();d.setDate(d.getDate()+i);
          const ds=d.toISOString().split('T')[0];
          const sel=availDates.includes(ds);
          return<button key={ds} onClick={()=>setAvailDates(p=>sel?p.filter(x=>x!==ds):[...p,ds])} style={{display:'block',width:'100%',padding:'10px 14px',marginBottom:'4px',borderRadius:'8px',border:`1px solid ${sel?'#22c55e50':c.BD}`,background:sel?'#22c55e18':c.CARD,color:sel?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:sel?'700':'400',textAlign:'left',textTransform:'capitalize'}}>
            {sel?'✓ ':'○ '}{fmtDate(ds,pLang)}
          </button>;
        })}
      </div>}

      {/* Available time range */}
      {timeOk===false&&<div style={{marginBottom:'16px'}}>
        <Lbl c={c}>{t.yourAvailTime||'What time range works?'}</Lbl>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.fromLbl||'From'}</div>
            <input type="time" value={availTimeFrom} onChange={e=>setAvailTimeFrom(e.target.value)} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{fontSize:'16px',color:c.M2,paddingTop:'18px'}}>→</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'11px',color:c.M,marginBottom:'4px'}}>{t.toLbl||'To'}</div>
            <input type="time" value={availTimeTo} onChange={e=>setAvailTimeTo(e.target.value)} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>}

      <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
        <button onClick={()=>setRStep(0)} style={{flex:1,padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600'}}>←</button>
        <Btn onClick={()=>setRStep(lastStep)} full style={{flex:3,padding:'14px'}} c={c} accent={mc}>{t.nextBtn?.replace(' →','')} →</Btn>
      </div>
    </div>}

    {/* ── LAST STEP: Extras + Send ── */}
    {rStep===lastStep&&<div className="fade-in">
      <div style={{marginBottom:'14px'}}>
        <Lbl c={c}>{t.howGet} <span style={{fontWeight:'400',textTransform:'none',fontSize:'11px'}}>{t.howOpt}</span></Lbl>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
          {[{k:'car',l:'🚗'},{k:'transit',l:'🚇'},{k:'walk',l:'🚶'},{k:'bike',l:'🚲'},{k:'taxi',l:'🚕'},{k:'moto',l:'🏍️'}].map(tr=><button key={tr.k} onClick={()=>setHow(h=>h===tr.k?'':tr.k)} style={{padding:'10px 14px',borderRadius:'10px',border:`1px solid ${how===tr.k?mc+'60':c.BD}`,background:how===tr.k?`${mc}15`:c.CARD,cursor:'pointer',fontSize:'16px'}}>{tr.l}</button>)}
        </div>
      </div>

      {plan.poll?.q&&<div style={{marginBottom:'16px'}}>
        <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {plan.poll.opts.filter(o=>o.trim()).map((o,i)=><button key={i} onClick={()=>setPollVote(v=>v===o?null:o)} style={{padding:'10px 14px',background:pollVote===o?`${mc}20`:c.CARD,border:`1px solid ${pollVote===o?mc+'50':c.BD}`,borderRadius:'10px',color:pollVote===o?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:pollVote===o?'600':'400',textAlign:'left'}}>{pollVote===o?'◉ ':' ◯ '}{o}</button>)}
        </div>
      </div>}

      <div style={{marginBottom:'20px'}}>
        <Lbl c={c}>{t.commentLbl}</Lbl>
        <Txa value={comment} onChange={setComment} placeholder={t.commentPh} rows={2} c={c}/>
      </div>

      {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px',border:'1px solid #ef444430',marginBottom:'10px'}}>{err}</div>}
      <Btn onClick={submit} disabled={!name.trim()||saving} full style={{padding:'15px',fontSize:'15px',background:mc,color:'#0A0A0A'}} c={c}>{saving?t.saving:t.saveAvail}</Btn>
      <button onClick={()=>setRStep(rStep-1)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',marginTop:'8px'}}>← {t.backBtn}</button>
    </div>}
  </div>);
}
