import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { saveResp, loadResps, db } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { fmtDate, daysUntil } from '../lib/utils.js'
import { Btn, Card, Lbl, Inp, Txa, HR, Back, ModeBadge } from '../components/ui.jsx'

export default function Respond({plan,onBack,onDone,onCreateOwn,c,lang:appLang,authUser,profile}){
  const pLang=appLang;const t=T[pLang];
  const mc=getMC(plan.mode,c);
  const prevKey='q_myresp_'+plan.id;
  const prev=ls.get(prevKey,null);
  const urlName=new URLSearchParams(location.search).get('name')||'';
  const[name,setName]=useState(prev?.name||urlName||profile?.name||ls.get('q_myname',''));
  const[avail,setAvail]=useState(prev?.avail||{});
  const[timePref,setTimePref]=useState(prev?.timePref||{});
  const[how,setHow]=useState(prev?.how||'');const[howOther,setHowOther]=useState(prev?.howOther||'');
  const[comment,setComment]=useState(prev?.comment||'');
  const[guestRole,setGuestRole]=useState(prev?.role||'');
  const[saving,setSaving]=useState(false);const[done,setDone]=useState(false);const[err,setErr]=useState('');
  const[altDate,setAltDate]=useState('');const[altNote,setAltNote]=useState('');
  const[pollVote,setPollVote]=useState(prev?.pollVote||null);
  const[stopAttend,setStopAttend]=useState(prev?.stopAttend||{});
  const[stopPrefs,setStopPrefs]=useState(prev?.stopPrefs||{});
  const[stopCounts,setStopCounts]=useState({});
  useEffect(()=>{
    if(!plan.stops?.some(s=>s.maxCapacity))return;
    loadResps(plan.id).then(allRs=>{
      const counts={};
      plan.stops.forEach(s=>{
        counts[s.id]=(allRs||[]).filter(r=>r.stopAttend?.[s.id]==='yes').length;
      });
      setStopCounts(counts);
    });
  },[plan.id]);
  const stopYesCount=(sid)=>(stopCounts[sid]||0);
  const multiStops=(plan.stops||[]).filter(s=>s.options&&s.options.length>1);
  useEffect(()=>{if(name.trim())ls.set('q_myname',name.trim());},[name]);
  const AVCOL={yes:'#22c55e',maybe:'#f59e0b',no:'#ef4444'};
  const AVICON={yes:'✅',maybe:'🤔',no:'❌'};
  const AVLBL={yes:t.avYes,maybe:t.avMaybe,no:t.avNo};
  const calcEnd=(start,dur)=>{
    if(!start||!dur)return start||'';
    const[h,m]=start.split(':').map(Number);
    const mins=dur==='30min'?30:dur==='1h'?60:dur==='1h30'?90:dur==='2h'?120:dur==='3h'?180:dur==='4h+'?240:parseInt(dur)||0;
    const d2=new Date(2000,0,1,h,m+mins);
    return`${String(d2.getHours()).padStart(2,'0')}:${String(d2.getMinutes()).padStart(2,'0')}`;
  };
  const addMins=(time,mins)=>{
    if(!time)return'';
    const[h,m]=time.split(':').map(Number);
    const d2=new Date(2000,0,1,h,m+mins);
    return`${String(d2.getHours()).padStart(2,'0')}:${String(d2.getMinutes()).padStart(2,'0')}`;
  };
  const submit=async()=>{
    if(!name.trim())return;
    if(Object.keys(avail).length===0){setErr(t.markAtLeastOne);return;}
    setSaving(true);
    const changeLog=[...(prev?.changeLog||[])];
    if(prev)changeLog.unshift({at:new Date().toISOString(),desc:t.respUpdated});
    const resp={name:name.trim(),avail,timePref,how:how==='other'?howOther:how,howOther,comment,role:guestRole,altDate:altDate||null,altNote:altNote||null,pollVote:pollVote||null,stopAttend:Object.keys(stopAttend).length>0?stopAttend:null,stopPrefs:Object.keys(stopPrefs).length>0?stopPrefs:null,changeLog,at:new Date().toISOString()};
    await saveResp(plan.id,name.trim(),resp);
    if(authUser)try{await db.from('responses').update({user_id:authUser.id}).eq('plan_id',plan.id).eq('name',name.trim());}catch{}
    addMyPlan(plan.id,plan.name,'invited');
    ls.set(prevKey,resp);setSaving(false);setDone(true);
  };
  const budget=(plan.stops||[]).reduce((s,p2)=>s+(parseFloat(p2.cost)||0),0);
  if(done){
    const planUrl=location.href.split('?')[0]+'?code='+plan.id;
    const respName=name.trim()||t.someone;
    const waOrgText=pLang==='es'?`Hola ${plan.organizer}, soy *${respName}* y acabo de responder al plan *${plan.name}*. Mira las respuestas! ${planUrl}`:`Hi ${plan.organizer}, I'm *${respName}* and just responded to *${plan.name}*. Check the responses! ${planUrl}`;
  return(<div style={{padding:'60px 24px',maxWidth:'420px',margin:'0 auto',textAlign:'center'}}>
    <div style={{fontSize:'64px',marginBottom:'20px'}}>{plan.mode==='intimate'?'💘':'🎉'}</div>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:mc,marginBottom:'10px'}}>{t.savedTitle}</h2>
    <p style={{color:c.M2,marginBottom:'20px'}}>{t.savedSub}</p>
    {plan.organizer&&<a href={`https://wa.me/?text=${encodeURIComponent(waOrgText)}`} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px 20px',background:'#25D366',borderRadius:'12px',color:'#fff',textDecoration:'none',fontWeight:'700',fontSize:'14px',marginBottom:'16px'}}>💬 {`${t.notifyTo} ${plan.organizer}`}</a>}
    <div style={{background:`${mc}0D`,border:`1px solid ${mc}30`,borderRadius:'14px',padding:'20px'}}>
      <div style={{fontSize:'15px',fontWeight:'600',color:c.T,marginBottom:'6px'}}>{t.viralQ}</div>
      <div style={{fontSize:'13px',color:c.M2,marginBottom:'14px'}}>{t.viralSub}</div>
      <Btn onClick={onCreateOwn} style={{padding:'11px 24px',background:mc,color:'#0A0A0A'}} c={c}>{t.viralBtn}</Btn>
    </div>
    <div style={{textAlign:'center',padding:'20px 0',fontSize:'12px',color:c.M}}>
      <span style={{fontFamily:"'Syne',serif",fontWeight:'800'}}>queda<span style={{color:c.A}}>.</span></span> — {t.landingFooter||'Group plans, zero chaos.'}
    </div>
  </div>);
  }
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={()=>{if(Object.keys(avail).length>0&&!window.confirm(t.unsavedWarning))return;onBack();}} label={t.back} c={c}/>
    <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'10px'}}>
      <ModeBadge mode={plan.mode||'social'} lang={pLang} c={c}/>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:'15px',color:c.T,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{plan.name}</div><div style={{fontSize:'12px',color:c.M2}}>@ {plan.organizer}</div></div>
    </div>
    {prev&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:c.M2}}>✏️ {t.editingPrev}</div>}
    {plan.confirmedDate&&<div style={{background:`${mc}15`,border:`1px solid ${mc}50`,borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}><span style={{fontSize:'18px'}}>📌</span><div><div style={{fontSize:'11px',color:mc,fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em'}}>{t.confirmedDate}</div><div style={{fontSize:'14px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(plan.confirmedDate,pLang)}</div></div></div>}
    {plan.desc&&<p style={{fontSize:'14px',color:c.T,lineHeight:1.7,marginBottom:'16px',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px'}}>{plan.desc}</p>}
    {budget>0&&<div style={{background:`${mc}0D`,border:`1px solid ${mc}30`,borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',display:'flex',justifyContent:'space-between'}}><span style={{color:c.M2,fontSize:'13px'}}>{t.estPer||'Estimado'}</span><span style={{color:mc,fontWeight:'700'}}>{budget.toFixed(0)}€</span></div>}
    <HR c={c}/>
    <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.yourName}</Lbl><Inp value={name} onChange={v=>{setName(v);ls.set('q_myname',v);}} placeholder={t.yourNamePh} c={c}/></div>
    {plan.mode==='professional'&&<div style={{marginBottom:'14px'}}>
      <Lbl c={c}>{t.yourRoleLbl||'Your role'} <span style={{fontWeight:'400',textTransform:'none',fontSize:'11px'}}>({t.optionalLbl||'optional'})</span></Lbl>
      {plan.customRoles?.length>0?<>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
          {plan.customRoles.map((r,i)=><button key={i} onClick={()=>setGuestRole(guestRole===r?'':r)} style={{padding:'8px 14px',borderRadius:'20px',border:`1px solid ${guestRole===r?mc+'60':c.BD}`,background:guestRole===r?`${mc}15`:c.CARD,color:guestRole===r?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:guestRole===r?'700':'400'}}>{r}</button>)}
        </div>
        <input value={plan.customRoles.includes(guestRole)?'':guestRole} onChange={e=>{setGuestRole(e.target.value);}} placeholder={t.otherRolePh||'Or type your own...'} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
      </>:<input value={guestRole} onChange={e=>setGuestRole(e.target.value)} placeholder={t.yourRolePh||'e.g. Manager, Student, Client...'} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
    </div>}

        {/* DATE + START TIME VOTING */}
    <div style={{marginBottom:'20px'}}>
      <Lbl c={c}>{t.whenCanYou||'When can you?'}</Lbl>
      {/* Explanation card */}
      <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',marginBottom:'12px',fontSize:'12px',lineHeight:1.8}}>
        <div><span style={{fontWeight:'700'}}>✅ {t.avYes?.replace(/[✅]\s?/,'')}</span> — {t.votingExplainYes}</div>
        <div><span style={{fontWeight:'700'}}>❌ {t.avNo?.replace(/[❌]\s?/,'')}</span> — {t.votingExplainNo}</div>
        <div><span style={{fontWeight:'700'}}>🤔 {t.avMaybe?.replace(/[🤔]\s?/,'')}</span> — {t.votingExplainMaybe}</div>
      </div>
      {/* Mini tutorial - first time */}
      <div style={{background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'12px',color:mc}}>
        1️⃣ {t.tutStep1||'Pick which days + times work for you'}
        <br/>2️⃣ {t.tutStep2||'Choose which stops you\'ll attend'}
        <br/>3️⃣ {t.tutStep3||'Done — the app finds the best option'}
      </div>
      {(plan.dates||[]).map(d=>{
        const hasStartTimes=plan.startTimes?.length>0&&plan.startTimes.some(st2=>st2);
        const times=hasStartTimes?plan.startTimes.filter(st2=>st2):[''];
        return<div key={d} style={{marginBottom:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'14px',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',background:c.CARD,borderBottom:`1px solid ${c.BD}`,fontSize:'13px',color:c.T,fontWeight:'600',textTransform:'capitalize'}}>{fmtDate(d,pLang)}</div>
          {times.map(st=>{
            const key=st?`${d}_${st}`:d;
            const val=avail[key];
            let timelineItems=[];
            if(st&&plan.stops?.length){
              let cur=st;
              plan.stops.forEach((s,i)=>{
                const sName=s.options?.[0]?.name||`Stop ${i+1}`;
                const end=calcEnd(cur,s.duration);
                timelineItems.push({name:sName,start:cur,end,dur:s.duration});
                cur=addMins(end,30);
              });
            }
            return<div key={key} style={{borderBottom:`1px solid ${c.BD}`}}>
              {st&&<div style={{padding:'8px 14px',fontSize:'12px',color:mc,fontWeight:'700',background:`${mc}08`}}>
                🕐 {t.startsAt||'Starts at'} {st}
                {timelineItems.length>0&&<div style={{marginTop:'4px',fontSize:'11px',color:c.M2,fontWeight:'400'}}>
                  {timelineItems.map((ti,i)=><span key={i}>{i>0?' → ':''}{ti.name} {ti.start}-{ti.end}</span>)}
                </div>}
              </div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1px',background:c.BD}}>
                {['yes','maybe','no'].map(v=><button key={v} onClick={()=>{setErr('');setAvail(p=>({...p,[key]:p[key]===v?undefined:v}));}} style={{padding:'10px 6px',background:val===v?AVCOL[v]+'25':c.CARD,color:val===v?AVCOL[v]:c.M2,cursor:'pointer',border:'none',fontFamily:'inherit',fontSize:'12px',fontWeight:val===v?'700':'400'}}>{AVICON[v]}<br/><span style={{fontSize:'10px'}}>{AVLBL[v].replace(/[✅🤔❌]\s?/,'')}</span></button>)}
              </div>
            </div>;
          })}
        </div>;
      })}
    </div>
    {/* Suggest alternative date */}
    {Object.keys(avail).length>0&&Object.values(avail).every(v=>v==='no')&&<div style={{background:'#f59e0b10',border:'1px solid #f59e0b30',borderRadius:'12px',padding:'14px',marginBottom:'14px'}}>
      <div style={{fontSize:'13px',color:'#f59e0b',fontWeight:'600',marginBottom:'8px'}}>😕 {t.noDateWorks}</div>
      <input type="date" value={altDate||''} onChange={e=>setAltDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{background:c.CARD,border:'1px solid #f59e0b50',borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'6px'}}/>
      {altDate&&<input value={altNote||''} onChange={e=>setAltNote(e.target.value)} placeholder={t.optionalNote} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'12px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
    </div>}
    {/* STOP OPTION VOTING */}
    {multiStops.length>0&&<div style={{marginBottom:'16px'}}>
      <Lbl c={c}>🗺️ {t.chooseOption}</Lbl>
      {multiStops.map((stop,si)=>{
        const stopId=stop.id||`stop_${si}`;
        return(<div key={stopId} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',overflow:'hidden',marginBottom:'10px'}}>
          <div style={{padding:'10px 14px',background:c.CARD,borderBottom:`1px solid ${c.BD}`,fontSize:'13px',color:c.T,fontWeight:'600'}}>{stop.name||stop.place||`${t.stop||'Stop'} ${si+1}`}</div>
          <div style={{display:'flex',flexDirection:'column',gap:'1px',background:c.BD}}>
            {stop.options.map((opt,oi)=>{
              const optId=opt.id||`opt_${oi}`;
              const selected=stopPrefs[stopId]===optId;
              const letter=String.fromCharCode(65+oi);
              return(<button key={optId} onClick={()=>setStopPrefs(p=>({...p,[stopId]:selected?undefined:optId}))} style={{padding:'12px 14px',background:selected?`${mc}20`:c.CARD,color:selected?mc:c.T,cursor:'pointer',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:selected?'700':'400',textAlign:'left',display:'flex',alignItems:'center',gap:'10px',transition:'all .1s'}}>
                <span style={{width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',background:selected?mc:'transparent',color:selected?'#0A0A0A':c.M2,border:`2px solid ${selected?mc:c.BD}`}}>{letter}</span>
                <span>{opt.name||opt.label||`${letter}`}</span>
                {opt.cost&&<span style={{marginLeft:'auto',fontSize:'12px',color:c.M2}}>{opt.cost}€</span>}
              </button>);
            })}
          </div>
        </div>);
      })}
    </div>}

    {/* STOP ATTENDANCE */}
    {plan.stops?.length>0&&<div style={{marginBottom:'20px'}}>
      <Lbl c={c}>{t.whichStops||'Which stops will you attend?'}</Lbl>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'12px',lineHeight:1.5}}>{t.stopAttendHint||'You can join for part of the plan'}</div>
      {plan.stops.map((s,i)=>{
        const firstOpt=s.options?.[0]||s;
        const stopName=firstOpt.name||`${t.stop} ${i+1}`;
        const isFull=s.maxCapacity&&stopYesCount(s.id)>=parseInt(s.maxCapacity);
        return(<div key={s.id} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px 14px',marginBottom:'8px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'24px',height:'24px',borderRadius:'50%',background:`${mc}25`,border:`1px solid ${mc}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',color:mc}}>{i+1}</div>
              <span style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{stopName}</span>
            </div>
            {s.startTime&&<span style={{fontSize:'12px',color:c.M2}}>🕐 {s.startTime}{s.duration?` · ${s.duration}`:''}</span>}
          </div>
          {isFull&&!stopAttend[s.id]&&<div style={{fontSize:'12px',color:'#ef4444',marginBottom:'6px'}}>⚠️ {t.stopFull||'This stop is full'}</div>}
          <div style={{display:'flex',gap:'6px'}}>
            {[{v:'yes',l:'✅ '+t.avYes.replace(/[✅]\s?/,''),cl:'#22c55e'},{v:'no',l:'❌ '+t.avNo.replace(/[❌]\s?/,''),cl:'#ef4444'}].map(o=><button key={o.v} onClick={()=>{if(o.v==='yes'&&isFull&&stopAttend[s.id]!=='yes')return;setStopAttend(p=>({...p,[s.id]:p[s.id]===o.v?undefined:o.v}));}} disabled={o.v==='yes'&&isFull&&stopAttend[s.id]!=='yes'} style={{flex:1,padding:'10px',borderRadius:'10px',border:`1px solid ${stopAttend[s.id]===o.v?o.cl+'50':c.BD}`,background:stopAttend[s.id]===o.v?o.cl+'20':c.CARD,color:stopAttend[s.id]===o.v?o.cl:c.M2,cursor:o.v==='yes'&&isFull&&stopAttend[s.id]!=='yes'?'not-allowed':'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:stopAttend[s.id]===o.v?'700':'400',opacity:o.v==='yes'&&isFull&&stopAttend[s.id]!=='yes'?.4:1}}>{o.l}</button>)}
          </div>
          {/* Option preference if multiple options */}
          {s.options?.length>1&&stopAttend[s.id]==='yes'&&<div style={{marginTop:'8px'}}>
            <div style={{fontSize:'12px',color:c.M2,marginBottom:'4px'}}>{t.chooseOption}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
              {s.options.map((opt,oi)=><button key={opt.id} onClick={()=>setStopPrefs(p=>({...p,[s.id]:opt.id}))} style={{padding:'6px 12px',borderRadius:'20px',border:`1px solid ${stopPrefs[s.id]===opt.id?mc+'60':c.BD}`,background:stopPrefs[s.id]===opt.id?`${mc}15`:c.CARD,color:stopPrefs[s.id]===opt.id?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:stopPrefs[s.id]===opt.id?'700':'400'}}>{String.fromCharCode(65+oi)} {opt.name||''}</button>)}
            </div>
          </div>}
        </div>);
      })}
    </div>}

    {plan.mode!=='professional'&&<div style={{marginBottom:'14px'}}>
      <Lbl c={c}>{t.howGet} <span style={{fontWeight:'400',textTransform:'none',fontSize:'11px'}}>{t.howOpt}</span></Lbl>
      <select value={how} onChange={e=>setHow(e.target.value)} style={{background:c.CARD,border:`1px solid ${c.BD}`,color:how?c.T:c.M,fontSize:'14px',padding:'12px 14px',borderRadius:'10px',width:'100%',fontFamily:'inherit',marginBottom:how==='other'?'8px':'0'}}>
        <option value="">—</option>
        <option value="car">{t.car}</option><option value="moto">{t.moto}</option>
        <option value="transit">{t.transit}</option><option value="taxi">{t.taxi}</option>
        <option value="walk">{t.walk}</option><option value="bike">{t.bike}</option>
        <option value="other">{t.other}</option>
      </select>
      {how==='other'&&<Inp value={howOther} onChange={setHowOther} placeholder={t.otherPh} c={c}/>}
    </div>}

    {/* POLL VOTE */}
    {plan.poll?.q&&<div style={{marginBottom:'16px'}}>
      <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
        {plan.poll.opts.filter(o=>o.trim()).map((o,i)=><button key={i} onClick={()=>setPollVote(v=>v===o?null:o)} style={{padding:'10px 14px',background:pollVote===o?`${mc}20`:c.CARD,border:`1px solid ${pollVote===o?mc+'50':c.BD}`,borderRadius:'10px',color:pollVote===o?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:pollVote===o?'600':'400',textAlign:'left',transition:'all .1s'}}>{pollVote===o?'◉ ':' ◯ '}{o}</button>)}
      </div>
    </div>}
    {/* COMMENT */}
    <div style={{marginBottom:'20px'}}>
      <Lbl c={c}>{t.commentLbl}</Lbl>
      <Txa value={comment} onChange={setComment} placeholder={t.commentPh} rows={2} c={c}/>
    </div>

    {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px',border:'1px solid #ef444430',marginBottom:'10px'}}>{err}</div>}
    <Btn onClick={submit} disabled={!name.trim()||saving} full style={{padding:'15px',fontSize:'15px',background:mc,color:'#0A0A0A'}} c={c}>{saving?t.saving:plan.mode==='professional'?(t.confirmAttendance):plan.mode==='intimate'?(t.confirmBtn):t.saveAvail}</Btn>
  </div>);
}


// ─── ACCOMMODATION + AFTER PLAN SUGGESTIONS ──────────
