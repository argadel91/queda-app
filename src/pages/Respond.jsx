import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { saveResp, loadResps, db } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { fmtDate, fmtTime } from '../lib/utils.js'
import { Btn, Lbl, Inp, Txa, HR, Back, Stepper } from '../components/ui.jsx'

export default function Respond({plan,onBack,onDone,onCreateOwn,c,lang:appLang,authUser,profile}){
  const pLang=appLang;const t=T[pLang];
  const mc=c.A;
  const prevKey='q_myresp_'+plan.id;
  const prev=ls.get(prevKey,null);
  const urlName=new URLSearchParams(location.search).get('name')||'';
  const[name,setName]=useState(prev?.name||urlName||profile?.name||ls.get('q_myname',''));
  const[avail,setAvail]=useState(prev?.avail||{});
  const[how,setHow]=useState(prev?.how||'');const[howOther,setHowOther]=useState(prev?.howOther||'');
  const[comment,setComment]=useState(prev?.comment||'');
  const[saving,setSaving]=useState(false);const[done,setDone]=useState(false);const[err,setErr]=useState('');
  const[rStep,setRStep]=useState(0);
  const[pollVote,setPollVote]=useState(prev?.pollVote||null);
  const[stopAttend,setStopAttend]=useState(prev?.stopAttend||{});

  useEffect(()=>{if(name.trim())ls.set('q_myname',name.trim());},[name]);

  const AVCOL={yes:'#22c55e',no:'#ef4444'};
  const AVICON={yes:'✅',no:'❌'};
  const AVLBL={yes:t.avYes,no:t.avNo};

  const stops=(plan.stops||[]).filter(s=>(s.options?.[0]?.name||s.name));
  const hasStops=stops.length>0;
  const dates=plan.dates||[];
  const times=(plan.startTimes||[]).filter(Boolean);
  const hasStartTimes=times.length>0;
  const dateSlots=dates.flatMap(d=>hasStartTimes?times.map(st=>({date:d,time:st,key:`${d}_${st}`})):[{date:d,time:'',key:d}]);

  // Derive stopAttend from avail: if any date is yes for a stop, that stop is yes
  const deriveStopAttend=()=>{
    const sa={};
    stops.forEach(s=>{
      const hasYes=dateSlots.some(ds=>avail[`${s.id}_${ds.key}`]==='yes');
      if(hasYes)sa[s.id]='yes';
      else{
        const hasNo=dateSlots.some(ds=>avail[`${s.id}_${ds.key}`]==='no');
        if(hasNo)sa[s.id]='no';
      }
    });
    return sa;
  };

  // Also derive date-level avail (for backward compat with Results): if any stop is yes for a date, date is yes
  const deriveDateAvail=()=>{
    const da={};
    dateSlots.forEach(ds=>{
      const hasYes=stops.some(s=>avail[`${s.id}_${ds.key}`]==='yes');
      if(hasYes){da[ds.key]='yes';return;}
      const hasNo=stops.some(s=>avail[`${s.id}_${ds.key}`]==='no');
      if(hasNo)da[ds.key]='no';
    });
    return da;
  };

  const submit=async()=>{
    if(!name.trim())return;
    const allVals=Object.values(avail);
    if(!allVals.some(v=>v==='yes')){setErr(t.markAtLeastOne);return;}
    setSaving(true);
    const changeLog=[...(prev?.changeLog||[])];
    if(prev)changeLog.unshift({at:new Date().toISOString(),desc:t.respUpdated});
    const dateAvail=hasStops?deriveDateAvail():avail;
    const sa=hasStops?deriveStopAttend():null;
    const resp={name:name.trim(),avail:dateAvail,pointAvail:hasStops?avail:null,stopAttend:sa,how:how==='other'?howOther:how,howOther,comment,pollVote:pollVote||null,changeLog,at:new Date().toISOString()};
    await saveResp(plan.id,name.trim(),resp);
    if(authUser)try{await db.from('responses').update({user_id:authUser.id}).eq('plan_id',plan.id).eq('name',name.trim());}catch{}
    addMyPlan(plan.id,plan.name,'invited');
    ls.set(prevKey,resp);setSaving(false);setDone(true);
  };

  const budget=(plan.stops||[]).reduce((s,p2)=>s+(parseFloat(p2.cost)||0),0);

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

  // Step labels
  const stepLabels=hasStops
    ?[pLang==='es'?'Nombre':'Name',...stops.map((_,i)=>`${i+1}`),pLang==='es'?'Enviar':'Send']
    :[pLang==='es'?'Fechas':'Dates',pLang==='es'?'Enviar':'Send'];
  const lastStep=stepLabels.length-1;

  // Vote key helper for per-point voting
  const voteKey=(stopId,dateSlot)=>`${stopId}_${dateSlot.key}`;

  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={()=>{if(Object.keys(avail).length>0&&!window.confirm(t.unsavedWarning))return;onBack();}} label={t.back} c={c}/>
    {/* Plan header */}
    <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'16px',marginBottom:'16px',textAlign:'center'}}>
      <div style={{fontSize:'32px',marginBottom:'8px'}}>🎉</div>
      <div style={{fontSize:'18px',color:c.T,fontWeight:'700',fontFamily:"'Syne',serif"}}>{plan.name||'queda.'}</div>
      <div style={{fontSize:'13px',color:c.M2,marginTop:'4px'}}>@ {plan.organizer}</div>
    </div>
    {prev&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:c.M2}}>✏️ {t.editingPrev}</div>}
    {plan.desc&&<p style={{fontSize:'14px',color:c.T,lineHeight:1.7,marginBottom:'16px',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px'}}>{plan.desc}</p>}

    <Stepper cur={rStep} labels={stepLabels} c={c} accent={mc}/>

    {/* ── STEP 0: NAME (+ date voting if no stops) ── */}
    {rStep===0&&<>
      <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.yourName}</Lbl><Inp value={name} onChange={v=>{setName(v);ls.set('q_myname',v);}} placeholder={t.yourNamePh} c={c}/></div>

      {!hasStops&&<>
        <Lbl c={c}>{t.whenCanYou||'When can you?'}</Lbl>
        <div style={{fontSize:'11px',color:c.M,marginBottom:'10px'}}>{pLang==='es'?'Toca las fechas a las que puedes ir':'Tap the dates you can attend'}</div>
        {dates.map(d=>{
          const timesForDate=hasStartTimes?times:[''];
          const dateKeys=timesForDate.map(t2=>t2?`${d}_${t2}`:d);
          const anyYes=dateKeys.some(k=>avail[k]==='yes');
          const expanded=anyYes||avail[`_exp_${d}`];
          return<div key={d} style={{marginBottom:'8px'}}>
            <button onClick={()=>{
              if(!hasStartTimes){
                setAvail(p=>({...p,[d]:p[d]==='yes'?undefined:'yes'}));
              } else {
                if(anyYes){setAvail(p=>{const n={...p};dateKeys.forEach(k=>{delete n[k];});delete n[`_exp_${d}`];return n;});}
                else{setAvail(p=>({...p,[`_exp_${d}`]:true}));}
              }
            }} style={{width:'100%',padding:'12px 14px',borderRadius:expanded&&hasStartTimes?'10px 10px 0 0':'10px',border:`1px solid ${anyYes?'#22c55e50':c.BD}`,background:anyYes?'#22c55e18':c.CARD2,color:anyYes?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:anyYes?'700':'500',textAlign:'left',textTransform:'capitalize',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{fmtDate(d,pLang)}</span>
              {!hasStartTimes&&<span style={{fontSize:'16px'}}>{anyYes?'✓':'○'}</span>}
              {hasStartTimes&&<span style={{fontSize:'12px',color:c.M2}}>{anyYes?`${dateKeys.filter(k=>avail[k]==='yes').length}`:expanded?'▾':'▸'}</span>}
            </button>
            {hasStartTimes&&expanded&&<div style={{border:`1px solid ${anyYes?'#22c55e30':c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px',overflow:'hidden'}}>
              {times.map(t2=>{
                const key=`${d}_${t2}`;const sel=avail[key]==='yes';
                return<button key={key} onClick={()=>setAvail(p=>({...p,[key]:p[key]==='yes'?undefined:'yes'}))} style={{width:'100%',padding:'10px 14px',background:sel?'#22c55e18':c.CARD,borderBottom:`1px solid ${c.BD}20`,cursor:'pointer',border:'none',fontFamily:'inherit',fontSize:'13px',color:sel?'#22c55e':c.M2,fontWeight:sel?'700':'400',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🕐 {fmtTime(t2)}</span>
                  <span style={{fontSize:'16px'}}>{sel?'✓':'○'}</span>
                </button>;
              })}
            </div>}
          </div>;
        })}
      </>}

      {err&&<div style={{color:'#ef4444',fontSize:'13px',marginBottom:'10px'}}>{err}</div>}
      <Btn onClick={()=>{
        if(!name.trim()){setErr(pLang==='es'?'Escribe tu nombre':'Enter your name');return;}
        if(!hasStops&&!Object.values(avail).some(v=>v==='yes')){setErr(t.markAtLeastOne);return;}
        setErr('');setRStep(1);
      }} full style={{padding:'14px'}} c={c} accent={mc}>{pLang==='es'?'Siguiente':'Next'} →</Btn>
    </>}

    {/* ── STEPS 1..N: One per point ── */}
    {hasStops&&stops.map((stop,si)=>{
      const stepIdx=si+1;
      if(rStep!==stepIdx)return null;
      const opt=stop.options?.[0]||stop;
      const stopName=opt.name||`${si+1}`;
      return<div key={stop.id} className="fade-in">
        {/* Point header */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`${mc}25`,border:`2px solid ${mc}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'800',color:mc,flexShrink:0}}>{si+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'16px',color:c.T,fontWeight:'700'}}>{stopName}</div>
            {opt.address&&<div style={{fontSize:'12px',color:c.M2}}>📍 {opt.address}</div>}
            {stop.startTime&&<div style={{fontSize:'12px',color:mc}}>🕐 {fmtTime(stop.startTime)}{stop.duration?' · '+stop.duration:''}</div>}
          </div>
          {opt.photo&&<img src={opt.photo} alt="" style={{width:'48px',height:'48px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
        </div>
        {stop.meetingPoint&&<div style={{fontSize:'12px',color:mc,background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'8px',padding:'8px 12px',marginBottom:'12px'}}>📍 {pLang==='es'?'Punto de encuentro':'Meeting point'}: {stop.meetingPoint}{stop.meetingMinsBefore?` (${stop.meetingMinsBefore} min ${pLang==='es'?'antes':'before'})`:''}</div>}

        {/* Mini static map */}
        {opt.lat&&opt.lng&&(()=>{
          const markers=`markers=color:0xCDFF6C%7Clabel:${si+1}%7C${opt.lat},${opt.lng}`;
          const mpMarkers=stop.meetingPointLat&&stop.meetingPointLng?`&markers=color:0xf59e0b%7Clabel:M%7C${stop.meetingPointLat},${stop.meetingPointLng}`:'';
          const key=window.__gmKey||'';
          return key?<img src={`https://maps.googleapis.com/maps/api/staticmap?size=400x150&scale=2&maptype=roadmap&${markers}${mpMarkers}&key=${key}`} alt="map" style={{width:'100%',height:'120px',objectFit:'cover',borderRadius:'10px',border:`1px solid ${c.BD}`,marginBottom:'12px'}}/>:null;
        })()}

        <Lbl c={c}>{pLang==='es'?'¿Cuándo puedes ir aquí?':'When can you go here?'}</Lbl>
        <div style={{fontSize:'11px',color:c.M,marginBottom:'10px'}}>{pLang==='es'?'Toca una fecha para marcar que puedes. Toca los horarios disponibles.':'Tap a date to mark you can go. Tap available times.'}</div>
        {dates.map(d=>{
          const timesForDate=hasStartTimes?times:[''];
          const dateKeys=timesForDate.map(t2=>voteKey(stop.id,{date:d,time:t2,key:t2?`${d}_${t2}`:d}));
          const anyYes=dateKeys.some(k=>avail[k]==='yes');
          const expanded=anyYes||avail[`_exp_${stop.id}_${d}`];
          return<div key={d} style={{marginBottom:'8px'}}>
            <button onClick={()=>{
              if(!hasStartTimes){
                const k=voteKey(stop.id,{date:d,time:'',key:d});
                setAvail(p=>({...p,[k]:p[k]==='yes'?undefined:'yes'}));
              } else {
                if(anyYes){
                  // Deselect all times for this date
                  setAvail(p=>{const n={...p};dateKeys.forEach(k=>{delete n[k];});delete n[`_exp_${stop.id}_${d}`];return n;});
                } else {
                  // Expand to show times
                  setAvail(p=>({...p,[`_exp_${stop.id}_${d}`]:true}));
                }
              }
            }} style={{width:'100%',padding:'12px 14px',borderRadius:expanded&&hasStartTimes?'10px 10px 0 0':'10px',border:`1px solid ${anyYes?'#22c55e50':c.BD}`,background:anyYes?'#22c55e18':c.CARD2,color:anyYes?'#22c55e':c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:anyYes?'700':'500',textAlign:'left',textTransform:'capitalize',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{fmtDate(d,pLang)}</span>
              {!hasStartTimes&&<span style={{fontSize:'16px'}}>{anyYes?'✓':'○'}</span>}
              {hasStartTimes&&<span style={{fontSize:'12px',color:c.M2}}>{anyYes?`${dateKeys.filter(k=>avail[k]==='yes').length} ${pLang==='es'?'horarios':'times'}`:expanded?'▾':'▸'}</span>}
            </button>
            {hasStartTimes&&expanded&&<div style={{border:`1px solid ${anyYes?'#22c55e30':c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px',overflow:'hidden'}}>
              {times.map(t2=>{
                const key=voteKey(stop.id,{date:d,time:t2,key:`${d}_${t2}`});
                const sel=avail[key]==='yes';
                return<button key={key} onClick={()=>{setErr('');setAvail(p=>({...p,[key]:p[key]==='yes'?undefined:'yes'}));}} style={{width:'100%',padding:'10px 14px',background:sel?'#22c55e18':c.CARD,borderBottom:`1px solid ${c.BD}20`,cursor:'pointer',border:'none',fontFamily:'inherit',fontSize:'13px',color:sel?'#22c55e':c.M2,fontWeight:sel?'700':'400',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🕐 {fmtTime(t2)}</span>
                  <span style={{fontSize:'16px'}}>{sel?'✓':'○'}</span>
                </button>;
              })}
            </div>}
          </div>;
        })}

        {/* Option preference if multiple options */}
        {stop.options?.length>1&&<div style={{marginTop:'12px'}}>
          <Lbl c={c}>{pLang==='es'?'¿Qué opción prefieres?':'Which option do you prefer?'}</Lbl>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {stop.options.map((o,oi)=>{
              const sel=avail[`pref_${stop.id}`]===o.id;
              return<button key={o.id} onClick={()=>setAvail(p=>({...p,[`pref_${stop.id}`]:sel?undefined:o.id}))} style={{padding:'8px 14px',borderRadius:'20px',border:`1px solid ${sel?mc+'60':c.BD}`,background:sel?`${mc}15`:c.CARD,color:sel?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:sel?'700':'400'}}>{String.fromCharCode(65+oi)} {o.name||''}</button>;
            })}
          </div>
        </div>}

        <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
          <button onClick={()=>setRStep(rStep-1)} style={{flex:1,padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600'}}>←</button>
          <Btn onClick={()=>setRStep(rStep+1)} full style={{flex:3,padding:'14px'}} c={c} accent={mc}>{si<stops.length-1?(pLang==='es'?`Punto ${si+2}`:`Point ${si+2}`):(pLang==='es'?'Finalizar':'Finish')} →</Btn>
        </div>
      </div>;
    })}

    {/* ── LAST STEP: Comment + Send ── */}
    {rStep===lastStep&&<>
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
      <button onClick={()=>setRStep(rStep-1)} style={{width:'100%',padding:'10px',background:'none',border:'none',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',marginTop:'8px'}}>← {pLang==='es'?'Atrás':'Back'}</button>
    </>}
  </div>);
}
