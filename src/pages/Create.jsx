import React, { useState, useEffect, useMemo } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { savePlan, savePlanWithUser, showErr } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { genId, fmtShort } from '../lib/utils.js'
import { Btn, Card, Lbl, Inp, Txa, HR, Back, ModeBadge, Stepper, Badge } from '../components/ui.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import MapModal from '../components/MapModal.jsx'
import CityInput from '../components/CityInput.jsx'
import { getCityTz, getTzLabel, getGMTOffset, getUserTz } from '../constants/weather.js'
import WeatherWidget from '../components/WeatherWidget.jsx'

const DURATIONS = [
  {v:'30min',l:'30min'},{v:'1h',l:'1h'},{v:'1h30',l:'1h30'},{v:'2h',l:'2h'},{v:'3h',l:'3h'},{v:'4h+',l:'4h+'}
];
const TOLERANCES = [
  {v:'',l:'Exact'},{v:'±15min',l:'±15min'},{v:'±30min',l:'±30min'},{v:'±1h',l:'±1h'}
];

const calcEndTime = (start, duration) => {
  if (!start || !duration) return '';
  const [h, m] = start.split(':').map(Number);
  const mins = duration === '30min' ? 30 : duration === '1h' ? 60 : duration === '1h30' ? 90 : duration === '2h' ? 120 : duration === '3h' ? 180 : duration === '4h+' ? 240 : 0;
  const end = new Date(2000, 0, 1, h, m + mins);
  return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
};


const emptyOption = () => ({
  id: Date.now(), name: '', address: '', lat: null, lng: null, rating: null, ratingCount: null,
  priceLevel: null, photo: null, website: null, phone: null, hours: null, isOpen: null,
  summary: null, googleMapsURI: null, types: [], servesBeer: null, servesWine: null,
  outdoorSeating: null, wheelchair: null, goodForChildren: null, dineIn: null, takeout: null,
  delivery: null, reservable: null
});

const emptyStop = (id, suggestedStart) => ({
  id, options: [emptyOption()], startTime: suggestedStart || '', duration: '', tolerance: '', notes: '',
  maxCapacity: '', orgAttends: true,
});

export default function Create({onBack,onCreated,c,lang,authUser,profile}){
  const t=T[lang];const mc=c.A;const isEs=lang==='es';
  const[step,setStep]=useState(0);
  const[name,setName]=useState('');const[desc,setDesc]=useState('');
  const[org,setOrg]=useState(profile?.name||ls.get('q_myname',''));
  const[orgRole,setOrgRole]=useState('');
  const[isPublic,setIsPublic]=useState(false);
  const[pubFilter,setPubFilter]=useState({gender:'any',ageMin:'',ageMax:'',radius:''});
  const[deadline,setDeadline]=useState('');
  const[hasDeadline,setHasDeadline]=useState(false);
  const[editingOrg,setEditingOrg]=useState(false);
  const[subStep,setSubStep]=useState(0);
  const[selDates,setSelDates]=useState([]);
  const[startTimes,setStartTimes]=useState(['']);
  const[stops,setStops]=useState([emptyStop(1,'')]);
  const[mapTarget,setMapTarget]=useState(null); // {stopId, optionId}
  const[dressCode,setDressCode]=useState([]);const[dressNote,setDressNote]=useState('');
  const[autoConfirm,setAutoConfirm]=useState(false);const[autoConfirmN,setAutoConfirmN]=useState(3);
  const[surpriseMode,setSurprise]=useState(false);
  const[poll,setPoll]=useState({q:'',opts:['','']});
  const[giftOn,setGiftOn]=useState(false);const[gift,setGift]=useState({name:'',link:'',price:'',stripeLink:''});
  const[bring,setBring]=useState([{id:1,text:''}]);
  const[payment,setPayment]=useState({bizumPhone:'',paypalUser:'',revolutUser:''});
  const[saving,setSaving]=useState(false);
  const[openSections,setOpenSections]=useState({dress:true});
  const[draftRestored,setDraftRestored]=useState(false);
  const draftKey='q_draft';

  // Auto-deduce city from first stop with coordinates
  const autoCity = useMemo(() => {
    const addr = stops.flatMap(s=>s.options||[]).find(o=>o?.address)?.address || '';
    const parts = addr.split(',').map(p=>p.trim()).filter(Boolean);
    // Remove country (last), get city (second to last or third to last, skip postal codes)
    const relevant = parts.slice(-3,-1).map(p=>p.replace(/^\d{4,6}\s*/,'').trim()).filter(Boolean);
    return relevant.join(', ');
  }, [stops]);
  const autoCityShort = autoCity.split(',')[0]?.trim() || '';
  const firstCoords = useMemo(() => {
    const o = stops.flatMap(s=>s.options||[]).find(o=>o?.lat && o?.lng);
    return o ? {lat:o.lat, lng:o.lng} : null;
  }, [stops]);
  const planTz = getCityTz(autoCity);

  useEffect(()=>{if(org.trim())ls.set('q_myname',org.trim());},[org]);

  // Restore draft on mount
  useEffect(()=>{
    const d=ls.get(draftKey,null);if(!d)return;
    if(d.name)setName(d.name);if(d.desc)setDesc(d.desc);if(d.org)setOrg(d.org);
    if(d.orgRole)setOrgRole(d.orgRole);
    if(d.isPublic!==undefined)setIsPublic(d.isPublic);if(d.pubFilter)setPubFilter(d.pubFilter);
    if(d.deadline)setDeadline(d.deadline);if(d.hasDeadline!==undefined)setHasDeadline(d.hasDeadline);
    if(d.selDates)setSelDates(d.selDates);
    if(d.startTimes)setStartTimes(d.startTimes);
    if(d.stops)setStops(d.stops);if(d.dressCode!==undefined)setDressCode(Array.isArray(d.dressCode)?d.dressCode:d.dressCode?[d.dressCode]:[]);if(d.dressNote)setDressNote(d.dressNote);
    if(d.autoConfirm!==undefined)setAutoConfirm(d.autoConfirm);if(d.autoConfirmN!==undefined)setAutoConfirmN(d.autoConfirmN);
    if(d.surpriseMode!==undefined)setSurprise(d.surpriseMode);
    if(d.poll)setPoll(d.poll);
    if(d.giftOn!==undefined)setGiftOn(d.giftOn);if(d.gift)setGift(d.gift);if(d.bring)setBring(d.bring);
    if(d.payment)setPayment(d.payment);if(d.step)setStep(d.step);
    setDraftRestored(true);
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Save draft helper
  const saveDraft=(s)=>ls.set(draftKey,{name,desc,org,orgRole,isPublic,pubFilter,deadline,hasDeadline,selDates,startTimes,stops,dressCode,dressNote,autoConfirm,autoConfirmN,surpriseMode,poll,giftOn,gift,bring,payment,step:s!==undefined?s:step});
  // Auto-save every 30s
  useEffect(()=>{const id=setInterval(()=>saveDraft(),30000);return()=>clearInterval(id);});
  const clearDraft=()=>{try{localStorage.removeItem(draftKey)}catch{}};
  const discardDraft=()=>{clearDraft();setDraftRestored(false);window.location.reload();};
  // Save on step change
  const changeStep=(s)=>{saveDraft(s);setStep(s);};

  // Stop helpers
  const addStop=()=>{
    const last=stops[stops.length-1];
    let suggested='';
    if(last?.startTime && last?.duration){
      const end=calcEndTime(last.startTime,last.duration);
      if(end){
        const [h,m]=end.split(':').map(Number);
        const d=new Date(2000,0,1,h,m+30);
        suggested=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
    }
    setStops(p=>[...p,emptyStop(Date.now(),suggested)]);
  };
  const remStop=id=>setStops(p=>p.filter(s=>s.id!==id));
  const updStop=(id,k,v)=>setStops(p=>p.map(s=>s.id===id?{...s,[k]:v}:s));
  const addOption=(stopId)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:[...s.options,emptyOption()]}:s));
  const remOption=(stopId,optId)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.filter(o=>o.id!==optId)}:s));
  const updOption=(stopId,optionId,key,value)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.map(o=>o.id===optionId?{...o,[key]:value}:o)}:s));

  const stepLabels=[t.basics,t.routeStep,t.datesStep,t.extrasStep];

  const create=async()=>{
    setSaving(true);
    try{
      const plan={id:genId(),name:name.trim(),desc:desc.trim(),organizer:org.trim(),orgRole:orgRole.trim()||null,dates:[...selDates].sort(),startTimes:startTimes.filter(t=>t),timezone:planTz,city:autoCityShort,cityFull:autoCity,cityLat:firstCoords?.lat||null,cityLon:firstCoords?.lng||null,stops,dressCode,dressNote,autoConfirm,autoConfirmN,surpriseMode,poll:poll.q.trim()?poll:null,gift:giftOn?gift:null,bring:bring.filter(b=>b.text.trim()),payment,confirmedDate:null,isPublic,pubFilter:isPublic?pubFilter:null,deadline:hasDeadline&&deadline?deadline:null,lang,createdAt:new Date().toISOString()};
      if(authUser)await savePlanWithUser(plan,authUser.id);else await savePlan(plan);
      addMyPlan(plan.id,plan.name,'organizer');
      ls.set('q_state',{screen:'share',planId:plan.id,isOrg:true});clearDraft();onCreated(plan);
    }catch(e){showErr(t.createError);}
    setSaving(false);
  };

  // Map modal init string
  const mapInit = useMemo(() => {
    if(!mapTarget) return '';
    const st = stops.find(s=>s.id===mapTarget.stopId);
    const opt = st?.options.find(o=>o.id===mapTarget.optionId);
    return opt?.name || autoCity || '';
  }, [mapTarget, stops, autoCity]);

  // Apply map selection to the targeted option
  const handleMapSelect = (sel) => {
    if(!mapTarget) return;
    const {stopId, optionId} = mapTarget;
    const fields = ['name','address','lat','lng','placeId','rating','ratingCount','priceLevel','website','phone','hours','isOpen','googleMapsURI','photo','summary','types','dineIn','takeout','delivery','reservable','servesBeer','servesWine','outdoorSeating','goodForChildren','wheelchair'];
    fields.forEach(k => { if(sel[k] !== undefined && sel[k] !== null) updOption(stopId, optionId, k, sel[k]); });
    setMapTarget(null);
  };

  const chipStyle = (active) => ({
    padding:'7px 14px',borderRadius:'20px',border:`1px solid ${active?mc+'50':c.BD}`,
    background:active?`${mc}15`:c.CARD,color:active?mc:c.T,cursor:'pointer',
    fontFamily:'inherit',fontSize:'12px',fontWeight:active?'700':'400',whiteSpace:'nowrap'
  });

  // Venue card for an option
  const VenueCard = ({opt}) => {
    if(!opt.rating && !opt.photo) return null;
    return <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 12px',marginTop:'6px'}}>
      {opt.photo&&<img src={opt.photo} alt={opt.name} style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'6px',marginBottom:'6px'}}/>}
      <div style={{display:'flex',flexWrap:'wrap',gap:'4px',fontSize:'11px'}}>
        {opt.rating&&<span style={{padding:'2px 8px',borderRadius:'12px',background:`${mc}15`,color:mc,fontWeight:'700'}}>⭐ {opt.rating}{opt.ratingCount?` (${opt.ratingCount})`:''}</span>}
        {opt.priceLevel&&<span style={{padding:'2px 8px',borderRadius:'12px',background:c.CARD2,color:c.M2}}>{'€'.repeat(opt.priceLevel)}</span>}
        {opt.isOpen===true&&<span style={{padding:'2px 8px',borderRadius:'12px',background:'#22c55e20',color:'#22c55e'}}>Open</span>}
        {opt.isOpen===false&&<span style={{padding:'2px 8px',borderRadius:'12px',background:'#ef444420',color:'#ef4444'}}>Closed</span>}
        {opt.outdoorSeating&&<span style={{padding:'2px 8px',borderRadius:'12px',background:c.CARD2,color:c.M2}}>🌤️</span>}
        {opt.servesBeer&&<span style={{padding:'2px 8px',borderRadius:'12px',background:c.CARD2,color:c.M2}}>🍺</span>}
        {opt.servesWine&&<span style={{padding:'2px 8px',borderRadius:'12px',background:c.CARD2,color:c.M2}}>🍷</span>}
        {opt.wheelchair&&<span style={{padding:'2px 8px',borderRadius:'12px',background:c.CARD2,color:c.M2}}>♿</span>}
        {opt.types?.length>0&&(()=>{const TYPE_ICONS={restaurant:'🍽️',bar:'🍸',cafe:'☕',bakery:'🥐',night_club:'🪩',gym:'💪',park:'🌳',museum:'🏛️',hotel:'🏨',store:'🏪',school:'🏫',university:'🎓'};const main=opt.types.find(t=>TYPE_ICONS[t]);return main?<span style={{padding:'2px 8px',borderRadius:'12px',background:`${mc}10`,color:mc,fontWeight:'600'}}>{TYPE_ICONS[main]} {main.replace(/_/g,' ')}</span>:null;})()}
      </div>
      {opt.summary&&<div style={{fontSize:'11px',color:c.M2,fontStyle:'italic',marginTop:'4px'}}>"{opt.summary}"</div>}
    </div>;
  };

  return(<>
    <MapModal visible={mapTarget!==null} onSelect={handleMapSelect} onClose={()=>setMapTarget(null)} c={c} lang={lang} init={mapInit}/>
    <div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
      {draftRestored&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',padding:'10px 14px',marginBottom:'12px',background:mc+'18',border:`1px solid ${mc}40`,borderRadius:'10px',fontSize:'13px'}}>
        <span style={{color:mc,fontWeight:'600'}}>{t.draftRestored||'Draft restored'}</span>
        <div style={{display:'flex',gap:'6px'}}>
          <button onClick={discardDraft} style={{background:'none',border:`1px solid ${mc}40`,borderRadius:'6px',padding:'4px 10px',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600'}}>{t.draftDiscard||'Discard'}</button>
          <button onClick={()=>setDraftRestored(false)} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'16px',lineHeight:1}}>x</button>
        </div>
      </div>}
      <Back onClick={step===0?onBack:()=>changeStep(step-1)} label={t.back} c={c}/>
      <Stepper cur={step} labels={stepLabels} c={c} accent={mc}/>

      {/* ── STEP 0: BASICS — conversational wizard ── */}
      {step===0&&(()=>{
        const nextSub=()=>setSubStep(s=>s+1);
        const Q=({children,n})=>subStep>=n?<div style={{marginBottom:'16px',animation:'fadeIn .3s ease'}}>{children}</div>:null;
        const Nxt=({disabled,n})=>subStep===n?<button onClick={nextSub} disabled={disabled} style={{padding:'8px 20px',background:disabled?c.BD:mc,color:'#0A0A0A',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',opacity:disabled?.4:1,marginTop:'6px'}}>→</button>:null;

        return<>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <Q n={0}>
          <div style={{fontSize:'16px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{isEs?'¿Cómo se llama tu plan?':'What\'s your plan called?'}</div>
          <Inp value={name} onChange={setName} placeholder={t.planNamePh||'e.g. Dinner at Luigi\'s...'} c={c}/>
          <Nxt disabled={!name.trim()} n={0}/>
        </Q>

        <Q n={1}>
          <div style={{fontSize:'16px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{isEs?'Descríbelo':'Describe it'} <span style={{fontSize:'13px',color:c.M2,fontWeight:'400'}}>({isEs?'opcional':'optional'})</span></div>
          <Txa value={desc} onChange={setDesc} placeholder={t.descPh} rows={2} c={c}/>
          <Nxt n={1}/>
        </Q>

        <Q n={2}>
          <div style={{fontSize:'16px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{isEs?'¿Cuál es tu rol?':'What\'s your role?'} <span style={{fontSize:'13px',color:c.M2,fontWeight:'400'}}>({isEs?'opcional':'optional'})</span></div>
          <Inp value={orgRole} onChange={setOrgRole} placeholder={isEs?'Ej: Profesor, Manager, Cumpleañero...':'e.g. Professor, Manager, Birthday person...'} c={c}/>
          <Nxt n={2}/>
        </Q>

        <Q n={3}>
          <div style={{fontSize:'16px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{isEs?'¿Público o privado?':'Public or private?'}</div>
          <div style={{display:'flex',gap:'6px'}}>
            {[{v:false,l:isEs?'🔒 Privado':'🔒 Private',sub:isEs?'Compártelo con quien elijas':'Share with whoever you choose'},{v:true,l:isEs?'🌍 Público':'🌍 Public',sub:isEs?'Compártelo con el mundo':'Share it with the world'}].map(o=>
              <button key={String(o.v)} onClick={()=>{setIsPublic(o.v);if(subStep===3)nextSub();}} style={{flex:1,padding:'10px 8px',borderRadius:'10px',border:`1px solid ${isPublic===o.v?mc+'50':c.BD}`,background:isPublic===o.v?`${mc}15`:c.CARD,cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:'13px',color:isPublic===o.v?mc:c.T,fontWeight:isPublic===o.v?'700':'400'}}>{o.l}</div>
                <div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{o.sub}</div>
              </button>)}
          </div>
        </Q>

        {isPublic&&<Q n={4}>
          <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px'}}>
            <div>
              <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.filterGender||'Who can join?'}</div>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                {[{v:'any',l:t.filterAny||'Anyone'},{v:'female',l:t.genderFemale||'Women'},{v:'male',l:t.genderMale||'Men'},{v:'other',l:t.genderOther||'Other'}].map(o=>{
                  const genders=pubFilter.gender||'any';const isAny=genders==='any';
                  const selected=o.v==='any'?isAny:!isAny&&(Array.isArray(genders)?genders.includes(o.v):genders===o.v);
                  return<button key={o.v} onClick={()=>{
                    if(o.v==='any'){setPubFilter(f=>({...f,gender:'any'}));}
                    else{let cur=pubFilter.gender;if(cur==='any'||!cur)cur=[];if(!Array.isArray(cur))cur=[cur];if(cur.includes(o.v))cur=cur.filter(x=>x!==o.v);else cur=[...cur,o.v];setPubFilter(f=>({...f,gender:cur.length===0||cur.length===3?'any':cur}));}
                  }} style={{padding:'6px 12px',borderRadius:'20px',border:`1px solid ${selected?mc+'60':c.BD}`,background:selected?`${mc}15`:c.CARD,color:selected?mc:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:selected?'600':'400'}}>{o.l}</button>;
                })}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <div><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.filterAgeMin||'Min age'}</div><input type="number" min="15" max="100" value={pubFilter.ageMin} onChange={e=>{let v=parseInt(e.target.value)||'';if(v&&v<15)v=15;if(v&&v>100)v=100;setPubFilter(f=>({...f,ageMin:v}));}} placeholder="15" style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.filterAgeMax||'Max age'}</div><input type="number" min="15" max="100" value={pubFilter.ageMax} onChange={e=>{let v=parseInt(e.target.value)||'';if(v&&v<15)v=15;if(v&&v>100)v=100;setPubFilter(f=>({...f,ageMax:v}));}} placeholder="100" style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/></div>
            </div>
            <div>
              <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{t.filterRadius||'Max distance'}</div>
              <div style={{display:'flex',gap:'4px',marginBottom:'8px'}}>
                {[{v:'km',l:isEs?'📍 Radio':'📍 Radius'},{v:'world',l:isEs?'🌍 Todo el mundo':'🌍 Worldwide'},{v:'online',l:'💻 Online'}].map(o=>
                  <button key={o.v} onClick={()=>setPubFilter(f=>({...f,radius:o.v}))} style={{flex:1,padding:'6px 10px',borderRadius:'20px',border:`1px solid ${pubFilter.radius===o.v?mc+'60':c.BD}`,background:pubFilter.radius===o.v?`${mc}15`:c.CARD,color:pubFilter.radius===o.v?mc:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:pubFilter.radius===o.v?'600':'400'}}>{o.l}</button>
                )}
              </div>
              {pubFilter.radius==='km'&&<>
                <input type="range" min="1" max="100" value={pubFilter.radiusKm||50} onChange={e=>setPubFilter(f=>({...f,radiusKm:e.target.value}))} style={{width:'100%',accentColor:mc}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:c.M2,marginBottom:'8px'}}><span>1 km</span><span style={{color:mc,fontWeight:'700'}}>{pubFilter.radiusKm||50} km</span><span>100 km</span></div>
                <div style={{fontSize:'12px',color:c.M,marginBottom:'4px'}}>{isEs?'📍 ¿Desde dónde?':'📍 From where?'}</div>
                <CityInput value={pubFilter.radiusCity||''} onChange={v=>setPubFilter(f=>({...f,radiusCity:v}))} onSelect={d=>setPubFilter(f=>({...f,radiusCity:d.label,radiusLat:d.lat,radiusLon:d.lon}))} placeholder={isEs?'Ciudad de referencia...':'Reference city...'} c={c}/>
                <div style={{fontSize:'11px',color:c.M2,marginTop:'4px'}}>{isEs?'Si no eliges, se usa tu ubicación de perfil':'If empty, your profile location is used'}</div>
              </>}
            </div>
          </div>
          <Nxt n={4}/>
        </Q>}

        <Q n={isPublic?5:4}>
          <div onClick={()=>{setHasDeadline(h=>!h);if(hasDeadline)setDeadline('');}} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',background:c.CARD,border:`1px solid ${hasDeadline?mc+'50':c.BD}`,borderRadius:hasDeadline?'10px 10px 0 0':'10px',cursor:'pointer'}}>
            <div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${hasDeadline?mc:c.BD}`,background:hasDeadline?mc:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'#0A0A0A',fontWeight:'800',flexShrink:0}}>{hasDeadline?'✓':''}</div>
            <span style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{isEs?'¿Poner deadline?':'Set a deadline?'} <span style={{fontSize:'12px',color:c.M2,fontWeight:'400'}}>({isEs?'opcional':'optional'})</span></span>
          </div>
          {hasDeadline&&<div style={{padding:'12px 14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderTop:'none',borderRadius:'0 0 10px 10px'}}>
            <input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            <div style={{fontSize:'12px',color:c.M2,marginTop:'6px'}}>{isEs?'Después de esta fecha se confirmará la opción más votada':'After this date the most voted option will be confirmed'}</div>
          </div>}
          <div style={{marginTop:'10px'}}><Btn onClick={()=>changeStep(1)} disabled={!name.trim()} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
        </Q>
      </>;})()}

      {/* ── STEP 1: STOPS / ROUTE ── */}
      {step===1&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.routeTitle}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'14px'}}>{t.routeSub}</p>
        {autoCity&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
          <span>📍</span><span style={{color:c.T,fontWeight:'500'}}>{autoCity}</span>
        </div>}
        <HR c={c}/>
        {stops.map((s,i)=>{
          const endTime = calcEndTime(s.startTime, s.duration);
          return <div key={s.id} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'24px',height:'24px',borderRadius:'50%',background:`${mc}25`,border:`1px solid ${mc}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',color:mc}}>{i+1}</div>
              <span style={{fontSize:'12px',color:c.M2,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.05em'}}>{t.stop} {i+1}</span>
            </div>
            {stops.length>1&&<button onClick={()=>remStop(s.id)} title={t.removeStop} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'18px'}}>×</button>}
          </div>

          {/* Options (A, B, C...) */}
          {s.options.map((opt,oi)=><div key={opt.id} style={{marginBottom:'10px',paddingLeft:s.options.length>1?'8px':'0',borderLeft:s.options.length>1?`2px solid ${mc}30`:'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                {s.options.length>1&&<span style={{fontSize:'11px',fontWeight:'700',color:mc,background:`${mc}15`,padding:'2px 8px',borderRadius:'10px'}}>{String.fromCharCode(65+oi)}</span>}
                {opt.name&&<span style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{opt.name}</span>}
                {opt.lat&&<span style={{fontSize:'10px',color:mc}}>📍</span>}
              </div>
              <div style={{display:'flex',gap:'6px'}}>
                <button onClick={()=>setMapTarget({stopId:s.id,optionId:opt.id})} style={{background:'none',border:`1px solid ${c.BD}`,color:mc,cursor:'pointer',fontSize:'12px',padding:'4px 10px',borderRadius:'8px',fontFamily:'inherit',fontWeight:'600'}}>{t.searchMap}</button>
                {s.options.length>1&&<button onClick={()=>remOption(s.id,opt.id)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px'}}>×</button>}
              </div>
            </div>
            <VenueCard opt={opt}/>
            {!opt.name&&!opt.lat&&<div style={{fontSize:'12px',color:c.M2,fontStyle:'italic',padding:'8px 0'}}>{t.searchOnMap||'Search and select on map'}</div>}
          </div>)}
          <button onClick={()=>addOption(s.id)} style={{background:'none',border:`1px dashed ${c.BD}`,borderRadius:'8px',padding:'6px 12px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',marginBottom:'12px',width:'100%'}}>+ {t.optionLbl||'Option'}</button>

          {/* Start time */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div>
              <div style={{fontSize:'11px',color:c.M2,fontWeight:'600',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{isEs?'Hora inicio':'Start time'}</div>
              <input type="time" value={s.startTime} onChange={e=>{updStop(s.id,'startTime',e.target.value);if(i===0)setStartTimes(p=>{const n=[...p];n[0]=e.target.value;return n;});}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div>
              <div style={{fontSize:'11px',color:c.M2,fontWeight:'600',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{isEs?'Fin estimado':'Est. end'}</div>
              <div style={{padding:'9px 12px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',fontSize:'13px',color:endTime?c.T:c.M2,minHeight:'18px'}}>{endTime||'--:--'}</div>
            </div>
          </div>

          {/* Alternative start times (first stop only) */}
          {i===0&&<>
            {startTimes.length>1&&<div style={{marginTop:'6px'}}>
              {startTimes.slice(1).map((st,j)=><div key={j} style={{display:'flex',gap:'6px',marginBottom:'4px',alignItems:'center'}}>
                <span style={{fontSize:'12px',color:c.M2}}>or</span>
                <input type="time" value={st} onChange={e=>{const n=[...startTimes];n[j+1]=e.target.value;setStartTimes(n);}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
                <button onClick={()=>setStartTimes(p=>p.filter((_,k)=>k!==j+1))} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'14px'}}>×</button>
              </div>)}
            </div>}
            <button onClick={()=>setStartTimes(p=>[...p,''])} style={{background:'none',border:`1px dashed ${c.BD}`,borderRadius:'6px',padding:'4px 10px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'11px',marginTop:'4px'}}>{t.addStartTime||'+ Alternative time'}</button>
          </>}

          {/* Duration chips */}
          <div style={{marginBottom:'8px'}}>
            <div style={{fontSize:'11px',color:c.M2,fontWeight:'600',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{isEs?'Duración':'Duration'}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {DURATIONS.map(d=><button key={d.v} onClick={()=>updStop(s.id,'duration',s.duration===d.v?'':d.v)} style={chipStyle(s.duration===d.v)}>{d.l}</button>)}
            </div>
          </div>

          {/* Tolerance chips */}
          <div style={{marginBottom:'10px'}}>
            <div style={{fontSize:'11px',color:c.M2,fontWeight:'600',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{isEs?'Tolerancia':'Tolerance'}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {TOLERANCES.map(tol=><button key={tol.v} onClick={()=>updStop(s.id,'tolerance',tol.v)} style={chipStyle(s.tolerance===tol.v)}>{tol.l}</button>)}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{fontSize:'11px',color:c.M2,fontWeight:'600',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{isEs?'Notas':'Notes'}</div>
            <textarea value={s.notes} onChange={e=>updStop(s.id,'notes',e.target.value)} placeholder={isEs?'Notas opcionales...':'Optional notes...'} rows={2} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}}/>
          </div>

          {/* Organizer attends this stop? */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'8px'}}>
            <span style={{fontSize:'13px',color:c.M2}}>{t.orgAttendsStop||'You attend?'}</span>
            {[{v:true,l:'Sí'},{v:false,l:'No'}].map(o=><button key={String(o.v)} onClick={()=>updStop(s.id,'orgAttends',o.v)} style={{padding:'6px 14px',borderRadius:'8px',border:`1px solid ${s.orgAttends===o.v?mc+'50':c.BD}`,background:s.orgAttends===o.v?`${mc}15`:c.CARD,color:s.orgAttends===o.v?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:s.orgAttends===o.v?'700':'400'}}>{o.l}</button>)}
          </div>

          {/* Max capacity for this stop */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'8px'}}>
            <span style={{fontSize:'13px',color:c.M2}}>{t.stopCapacity||'Max people'}</span>
            <input type="number" min="1" max="999" value={s.maxCapacity||''} onChange={e=>updStop(s.id,'maxCapacity',e.target.value)} placeholder={t.noLimit||'∞'} style={{width:'70px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
            {s.orgAttends&&s.maxCapacity&&<span style={{fontSize:'12px',color:c.M2}}>({1}/{s.maxCapacity})</span>}
          </div>
        </div>})}

        <Btn onClick={addStop} v="secondary" full sm style={{marginBottom:'14px'}} c={c}>{t.addStop}</Btn>
        <div style={{marginTop:'10px'}}><Btn onClick={()=>changeStep(2)} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
      </>}

      {/* ── STEP 2: DATES ── */}
      {step===2&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.datesTitle}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.datesSub}</p>
        {autoCity&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'12px',display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center'}}>
          <span>📍 <span style={{color:c.T,fontWeight:'500'}}>{autoCity}</span></span>
          {planTz&&<span>🌍 <span style={{color:c.T,fontWeight:'500'}}>{getTzLabel(planTz)}</span> <span style={{color:c.M}}>({getGMTOffset(planTz)})</span></span>}
          {(()=>{const uTz=getUserTz();if(!uTz||uTz===planTz)return null;return<span style={{color:c.M}}>· {t.yourZone} <span style={{fontWeight:'500'}}>{getGMTOffset(uTz)}</span></span>;})()}
        </div>}
        {autoCityShort&&selDates.length>0&&<div style={{marginBottom:'16px'}}>
          <Lbl c={c}>{t.weatherForecast}</Lbl>
          {selDates.slice(0,2).map(d=><div key={d} style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M2,marginBottom:'4px',textTransform:'capitalize'}}>{fmtShort(d,lang)}</div><WeatherWidget city={autoCityShort} date={d} c={c} lang={lang}/></div>)}
          {selDates.length>2&&<div style={{fontSize:'12px',color:c.M2,textAlign:'center',padding:'4px'}}>+{selDates.length-2} {t.moreDates}</div>}
        </div>}
        <Lbl c={c}>{t.selectDates}</Lbl>
        <CalendarPicker selected={selDates} onChange={setSelDates} c={c} lang={lang}/>
        <div style={{marginTop:'20px'}}><Btn onClick={()=>changeStep(3)} disabled={selDates.length<1} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
      </>}

      {/* ── STEP 3: EXTRAS ── */}
      {step===3&&(()=>{
        const togSec=id=>setOpenSections(p=>({...p,[id]:!p[id]}));
        const Sec=({id,icon,label,hasData,children})=>{const open=!!openSections[id];return<div style={{marginBottom:'12px'}}>
          <div onClick={()=>togSec(id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:open?'12px 12px 0 0':'12px',cursor:'pointer',userSelect:'none'}}>
            <span style={{fontSize:'15px'}}>{icon}</span>
            <span style={{flex:1,fontSize:'14px',fontWeight:'600',color:c.T}}>{label}</span>
            {hasData&&!open&&<span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22c55e',flexShrink:0}}/>}
            <span style={{fontSize:'13px',color:c.M2,flexShrink:0}}>{open?'▾':'▸'}</span>
          </div>
          {open&&<div style={{padding:'14px 16px',border:`1px solid ${c.BD}`,borderTop:'none',borderRadius:'0 0 12px 12px',background:c.CARD2}}>{children}</div>}
        </div>};
        return<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'20px'}}>{t.extrasTitle}</h2>
        {/* DRESS CODE */}
        <Sec id="dress" icon="👔" label={t.dcLbl} hasData={dressCode.length>0}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
            {t.dressCodes.map(opt=><div key={opt.k} onClick={()=>setDressCode(prev=>prev.includes(opt.k)?prev.filter(x=>x!==opt.k):[...prev,opt.k])} style={{padding:'10px 12px',borderRadius:'10px',border:`1px solid ${dressCode.includes(opt.k)?mc+'50':c.BD}`,background:dressCode.includes(opt.k)?`${mc}12`:c.CARD,cursor:'pointer',fontSize:'13px',color:dressCode.includes(opt.k)?mc:c.T,fontWeight:dressCode.includes(opt.k)?'600':'400'}}>{opt.l}</div>)}
          </div>
          {dressCode.length>0&&<input value={dressNote} onChange={e=>setDressNote(e.target.value)} placeholder={dressCode.includes('custom')?t.dcCustomPh:t.dcNote} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'11px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
        </Sec>
        {/* AUTO-CONFIRM MODE */}
        <Sec id="auto" icon="⚡" label={t.firstAvailable} hasData={autoConfirm}>
          <div onClick={()=>setAutoConfirm(a=>!a)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:c.CARD,border:`1px solid ${autoConfirm?mc+'50':c.BD}`,borderRadius:'12px',cursor:'pointer'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'50%',border:`2px solid ${autoConfirm?mc:c.BD}`,background:autoConfirm?mc:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#0A0A0A',fontWeight:'800',flexShrink:0}}>{autoConfirm?'✓':''}</div>
            <div>
              <div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{t.firstAvailable}</div>
              <div style={{fontSize:'12px',color:c.M2}}>{t.autoConfirmDesc}</div>
            </div>
          </div>
          {autoConfirm&&<div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'0 0 12px 12px',borderTop:'none',marginTop:'-1px'}}>
            <span style={{fontSize:'13px',color:c.M2}}>{t.confirmWith}</span>
            <input type="number" min="1" max="50" value={autoConfirmN} onChange={e=>setAutoConfirmN(parseInt(e.target.value)||2)} style={{width:'60px',background:c.CARD,border:`1px solid ${mc}40`,borderRadius:'8px',padding:'6px 10px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
            <span style={{fontSize:'13px',color:c.M2}}>{t.peopleLbl}</span>
          </div>}
        </Sec>
        {/* SURPRISE MODE */}
        <Sec id="surprise" icon="🎭" label={t.surpriseMode_lbl||'Surprise Mode'} hasData={surpriseMode}>
          <div onClick={()=>setSurprise(s=>!s)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:c.CARD,border:`1px solid ${surpriseMode?mc+'50':c.BD}`,borderRadius:'12px',cursor:'pointer'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'50%',border:`2px solid ${surpriseMode?mc:c.BD}`,background:surpriseMode?mc:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#0A0A0A',fontWeight:'800',flexShrink:0}}>{surpriseMode?'✓':''}</div>
            <div><div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{t.surpriseMode_lbl||'🎭'}</div><div style={{fontSize:'12px',color:c.M2}}>{t.surpriseModeSub}</div></div>
          </div>
        </Sec>
        {/* GIFT */}
        <Sec id="gift" icon="🎁" label={t.gift} hasData={giftOn}>
          <div onClick={()=>setGiftOn(g=>!g)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',background:c.CARD,border:`1px solid ${giftOn?c.A+'50':c.BD}`,borderRadius:'12px',cursor:'pointer',marginBottom:'10px'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'50%',border:`2px solid ${giftOn?c.A:c.BD}`,background:giftOn?c.A:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#0A0A0A',fontWeight:'800',flexShrink:0}}>{giftOn?'✓':''}</div>
            <div><div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{t.gift}</div><div style={{fontSize:'12px',color:c.M2}}>{t.giftSub}</div></div>
          </div>
          {giftOn&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {[[gift.name,t.giftName,'name'],[gift.link,t.giftLink,'link'],[gift.price,t.giftPrice,'price'],[gift.stripeLink||'',t.payLink,'stripeLink']].map(([v,ph,k])=><input key={k} value={v} onChange={e=>setGift(g=>({...g,[k]:e.target.value}))} type={k==='price'?'number':'text'} placeholder={ph} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>)}
          </div>}
        </Sec>
        {/* BRING */}
        <Sec id="bring" icon="🧺" label={t.bring} hasData={bring.some(b=>b.text.trim())}>
          {bring.map(b=><div key={b.id} style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
            <input value={b.text} onChange={e=>setBring(p=>p.map(x=>x.id===b.id?{...x,text:e.target.value}:x))} placeholder={t.newItem} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            {bring.length>1&&<button onClick={()=>setBring(p=>p.filter(x=>x.id!==b.id))} title={t.removeItem} style={{background:'none',border:`1px solid ${c.BD}`,color:c.M,cursor:'pointer',fontSize:'16px',borderRadius:'8px',width:'36px'}}>×</button>}
          </div>)}
          <Btn onClick={()=>setBring(p=>[...p,{id:Date.now(),text:''}])} v="secondary" sm c={c}>{t.addItem}</Btn>
        </Sec>
        {/* POLL */}
        <Sec id="poll" icon="🗳️" label={t.pollQuestion} hasData={poll.q.trim()!==''}>
          <input value={poll.q} onChange={e=>setPoll(p=>({...p,q:e.target.value}))} placeholder={t.pollPlaceholder} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',marginBottom:'8px'}}/>
          {poll.q.trim()&&<div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {poll.opts.map((o,i)=><div key={i} style={{display:'flex',gap:'6px'}}>
              <input value={o} onChange={e=>setPoll(p=>({...p,opts:p.opts.map((x,j)=>j===i?e.target.value:x)}))} placeholder={`${t.optionLbl} ${i+1}`} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
              {poll.opts.length>2&&<button onClick={()=>setPoll(p=>({...p,opts:p.opts.filter((_,j)=>j!==i)}))} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',color:c.M,cursor:'pointer',fontSize:'14px'}}>×</button>}
            </div>)}
            {poll.opts.length<5&&<button onClick={()=>setPoll(p=>({...p,opts:[...p.opts,'']}))} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'7px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>+ {t.addPollOption}</button>}
          </div>}
        </Sec>
        {/* PAYMENT */}
        <Sec id="payment" icon="💳" label={t.payData} hasData={Object.values(payment).some(v=>v.trim())}>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {[['bizumPhone',t.bizumPh],['paypalUser','PayPal.me user'],['revolutUser','Revolut.me user']].map(([k,ph])=><input key={k} value={payment[k]} onChange={e=>setPayment(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>)}
          </div>
          <div style={{fontSize:'11px',color:c.M2,marginTop:'8px'}}>{t.payNote}</div>
        </Sec>
        <Btn onClick={create} disabled={saving} full style={{padding:'16px',fontSize:'16px',background:mc,color:'#0A0A0A'}} c={c}>{saving?t.saving:t.createBtn}</Btn>
      </>})()}
    </div>
  </>);
}


// ─── SHARE ────────────────────────────────────────────
