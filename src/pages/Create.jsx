import React, { useState, useEffect, useMemo } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { savePlan, savePlanWithUser, showErr } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { genId, fmtShort } from '../lib/utils.js'
import { Btn, Card, Lbl, Inp, Txa, HR, Back, ModeBadge, Stepper, Badge } from '../components/ui.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import TimePicker from '../components/TimePicker.jsx'
import CityInput from '../components/CityInput.jsx'
import MapModal from '../components/MapModal.jsx'
import { getCityTz, getTzLabel, getGMTOffset, getUserTz } from '../constants/weather.js'
import WeatherWidget from '../components/WeatherWidget.jsx'

export default function Create({onBack,onCreated,c,lang,mode,authUser,profile,template}){
  const t=T[lang];const mc=getMC(mode,c);const isEs=lang==='es';
  const[step,setStep]=useState(0);
  const[name,setName]=useState('');const[desc,setDesc]=useState('');
  const[org,setOrg]=useState(profile?.name||ls.get('q_myname',''));const[orgEmail,setOrgEmail]=useState('');
  const[customRoles,setCustomRoles]=useState([]);const[roleInput,setRoleInput]=useState('');
  const[city,setCity]=useState('');const[cityData,setCityData]=useState(null);
  const[selDates,setSelDates]=useState([]);const[selTimes,setSelTimes]=useState({});
  const[stops,setStops]=useState([{id:1,name:'',cat:t.cat[0],address:'',cost:'',link:'',lat:null,lng:null}]);
  const[mapStop,setMapStop]=useState(null);
  const[dressCode,setDressCode]=useState(null);const[dressNote,setDressNote]=useState('');
  const[autoConfirm,setAutoConfirm]=useState(false);const[autoConfirmN,setAutoConfirmN]=useState(3);
  const[surpriseMode,setSurprise]=useState(false);
  const[maxGuests,setMaxGuests]=useState('');
  const[orgAttends,setOrgAttends]=useState(true);
  const[poll,setPoll]=useState({q:'',opts:['','']});
  const[giftOn,setGiftOn]=useState(false);const[gift,setGift]=useState({name:'',link:'',price:'',stripeLink:''});
  const[bring,setBring]=useState([{id:1,text:''}]);
  const[payment,setPayment]=useState({bizumPhone:'',paypalUser:'',revolutUser:''});
  const[saving,setSaving]=useState(false);
  const[openSections,setOpenSections]=useState({dress:true});
  const[draftRestored,setDraftRestored]=useState(false);
  const draftKey=`q_draft_${mode}`;
  const planTz=cityData?.tz||getCityTz(city);
  useEffect(()=>{if(org.trim())ls.set('q_myname',org.trim());},[org]);
  // Restore draft on mount
  useEffect(()=>{
    const d=ls.get(draftKey,null);if(!d)return;
    if(d.name)setName(d.name);if(d.desc)setDesc(d.desc);if(d.org)setOrg(d.org);if(d.orgEmail)setOrgEmail(d.orgEmail);
    if(d.city)setCity(d.city);if(d.cityData)setCityData(d.cityData);
    if(d.selDates)setSelDates(d.selDates);if(d.selTimes)setSelTimes(d.selTimes);
    if(d.stops)setStops(d.stops);if(d.dressCode!==undefined)setDressCode(d.dressCode);if(d.dressNote)setDressNote(d.dressNote);
    if(d.autoConfirm!==undefined)setAutoConfirm(d.autoConfirm);if(d.autoConfirmN!==undefined)setAutoConfirmN(d.autoConfirmN);
    if(d.surpriseMode!==undefined)setSurprise(d.surpriseMode);if(d.maxGuests)setMaxGuests(d.maxGuests);
    if(d.orgAttends!==undefined)setOrgAttends(d.orgAttends);if(d.poll)setPoll(d.poll);
    if(d.giftOn!==undefined)setGiftOn(d.giftOn);if(d.gift)setGift(d.gift);if(d.bring)setBring(d.bring);
    if(d.payment)setPayment(d.payment);if(d.customRoles)setCustomRoles(d.customRoles);if(d.roleInput)setRoleInput(d.roleInput);if(d.step)setStep(d.step);
    setDraftRestored(true);
  },[]);// eslint-disable-line react-hooks/exhaustive-deps
  // Apply template on mount (only if no draft was restored)
  useEffect(()=>{
    if(!template||draftRestored)return;const tp=template;
    if(tp.stops){const cats=T[lang].cat;setStops(tp.stops.map((s,i)=>({...s,id:i+1,cat:typeof s.cat==='number'?cats[s.cat]||cats[0]:s.cat||cats[0]})));}
    if(tp.dressCode!==undefined)setDressCode(tp.dressCode);
    if(tp.bring)setBring(tp.bring);
    if(tp.customRoles)setCustomRoles(tp.customRoles);
  },[]);// eslint-disable-line react-hooks/exhaustive-deps
  // Save draft helper
  const saveDraft=(s)=>ls.set(draftKey,{name,desc,org,orgEmail,city,cityData,selDates,selTimes,stops,dressCode,dressNote,autoConfirm,autoConfirmN,surpriseMode,maxGuests,orgAttends,poll,giftOn,gift,bring,payment,customRoles,roleInput,step:s!==undefined?s:step});
  // Auto-save every 30s
  useEffect(()=>{const id=setInterval(()=>saveDraft(),30000);return()=>clearInterval(id);});
  const clearDraft=()=>{try{localStorage.removeItem(draftKey)}catch{}};
  const discardDraft=()=>{clearDraft();setDraftRestored(false);window.location.reload();};
  // Save on step change
  const changeStep=(s)=>{saveDraft(s);setStep(s);};
  const addStop=()=>setStops(p=>[...p,{id:Date.now(),name:'',cat:t.cat[0],address:'',cost:'',link:'',lat:null,lng:null}]);
  const upd=(id,k,v)=>setStops(p=>p.map(s=>s.id===id?{...s,[k]:v}:s));
  const remStop=id=>setStops(p=>p.filter(s=>s.id!==id));
  const budget=stops.reduce((s,x)=>s+(parseFloat(x.cost)||0),0);
  const stepLabels=mode==='intimate'?[t.basics,t.datesStep,t.routeStep]:[t.basics,t.datesStep,t.routeStep,t.extrasStep];
  const create=async()=>{
    setSaving(true);
    try{
      const plan={id:genId(),name:name.trim(),desc:desc.trim(),organizer:org.trim(),organizerEmail:orgEmail.trim(),customRoles,mode,dates:[...selDates].sort(),times:selTimes,timezone:planTz,city:city.split(',')[0].trim(),cityFull:city,cityLat:cityData?.lat,cityLon:cityData?.lon,stops,dressCode,dressNote,autoConfirm,autoConfirmN,surpriseMode,maxGuests:maxGuests?parseInt(maxGuests):null,orgAttends,poll:poll.q.trim()?poll:null,gift:giftOn?gift:null,bring:bring.filter(b=>b.text.trim()),payment,confirmedDate:null,isPublic:false,lang,createdAt:new Date().toISOString()};
      if(authUser)await savePlanWithUser(plan,authUser.id);else await savePlan(plan);
      addMyPlan(plan.id,plan.name,'organizer',mode);
      ls.set('q_state',{screen:'share',planId:plan.id,isOrg:true});clearDraft();onCreated(plan);
    }catch(e){showErr(t.createError);}
    setSaving(false);
  };
  const is=(v,ph,k,sid)=><input value={v} onChange={e=>upd(sid,k,e.target.value)} placeholder={ph} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>;
  return(<>
    <MapModal visible={mapStop!==null} onSelect={sel=>{upd(mapStop,'name',sel.name);upd(mapStop,'address',sel.address);upd(mapStop,'lat',sel.lat);upd(mapStop,'lng',sel.lng);if(sel.rating)upd(mapStop,'rating',sel.rating);if(sel.ratingCount)upd(mapStop,'ratingCount',sel.ratingCount);if(sel.priceLevel)upd(mapStop,'priceLevel',sel.priceLevel);if(sel.website)upd(mapStop,'website',sel.website);if(sel.phone)upd(mapStop,'phone',sel.phone);if(sel.hours)upd(mapStop,'hours',sel.hours);if(sel.isOpen!==null)upd(mapStop,'isOpen',sel.isOpen);if(sel.googleMapsURI)upd(mapStop,'googleMapsURI',sel.googleMapsURI);if(sel.photo)upd(mapStop,'photo',sel.photo);if(sel.summary)upd(mapStop,'summary',sel.summary);if(sel.types?.length)upd(mapStop,'types',sel.types);if(sel.dineIn!==null)upd(mapStop,'dineIn',sel.dineIn);if(sel.takeout!==null)upd(mapStop,'takeout',sel.takeout);if(sel.delivery!==null)upd(mapStop,'delivery',sel.delivery);if(sel.reservable!==null)upd(mapStop,'reservable',sel.reservable);if(sel.servesBeer!==null)upd(mapStop,'servesBeer',sel.servesBeer);if(sel.servesWine!==null)upd(mapStop,'servesWine',sel.servesWine);if(sel.outdoorSeating!==null)upd(mapStop,'outdoorSeating',sel.outdoorSeating);if(sel.goodForChildren!==null)upd(mapStop,'goodForChildren',sel.goodForChildren);if(sel.wheelchair!==null)upd(mapStop,'wheelchair',sel.wheelchair);if(!city&&sel.address)setCity(sel.address.split(',').slice(-3,-1).join(',').trim()||'');setMapStop(null);}} onClose={()=>setMapStop(null)} c={c} lang={lang} init={mapStop!==null?(stops.find(s=>s.id===mapStop)?.name||city||''):''}/>
    <div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
      {draftRestored&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',padding:'10px 14px',marginBottom:'12px',background:mc+'18',border:`1px solid ${mc}40`,borderRadius:'10px',fontSize:'13px'}}>
        <span style={{color:mc,fontWeight:'600'}}>{t.draftRestored||'Draft restored'}</span>
        <div style={{display:'flex',gap:'6px'}}>
          <button onClick={discardDraft} style={{background:'none',border:`1px solid ${mc}40`,borderRadius:'6px',padding:'4px 10px',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600'}}>{t.draftDiscard||'Discard'}</button>
          <button onClick={()=>setDraftRestored(false)} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'16px',lineHeight:1}}>x</button>
        </div>
      </div>}
      <Back onClick={step===0?onBack:()=>changeStep(step-1)} label={t.back} c={c}/>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}}><ModeBadge mode={mode} lang={lang} c={c}/><div style={{flex:1,height:'1px',background:c.BD}}/></div>
      <Stepper cur={step} labels={stepLabels} c={c} accent={mc}/>

      {step===0&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'20px'}}>{t.basics}</h2>
        {mode==='intimate'&&<div style={{background:'#F472B620',border:'1px solid #F472B650',borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',fontSize:'13px',color:'#F472B6',lineHeight:1.6}}>{t.privateNote}</div>}
        <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.planName}</Lbl><Inp value={name} onChange={setName} placeholder={t.modes[mode].ex[0]} c={c}/></div>
        <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.desc}</Lbl><Txa value={desc} onChange={setDesc} placeholder={t.descPh} c={c}/></div>
        <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.yourName}</Lbl><Inp value={org} onChange={setOrg} placeholder={t.yourNamePh} c={c}/></div>
        <div style={{marginBottom:'14px'}}><Lbl c={c}>{t.emailLbl}</Lbl><Inp value={orgEmail} onChange={setOrgEmail} placeholder={t.emailPh} type="email" c={c}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
          <div><Lbl c={c}>{t.maxGuests}</Lbl><input type="number" min="1" max="999" value={maxGuests} onChange={e=>setMaxGuests(e.target.value)} placeholder={t.noLimit} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/></div>
          <div><Lbl c={c}>{t.willAttend}</Lbl>
            <div style={{display:'flex',gap:'6px'}}>
              {[{v:true,l:t.yesLbl},{v:false,l:'No'}].map(o=><button key={String(o.v)} onClick={()=>setOrgAttends(o.v)} style={{flex:1,padding:'12px 6px',borderRadius:'10px',border:`1px solid ${orgAttends===o.v?mc+'50':c.BD}`,background:orgAttends===o.v?`${mc}15`:c.CARD,color:orgAttends===o.v?mc:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:orgAttends===o.v?'700':'400'}}>{o.l}</button>)}
            </div>
          </div>
        </div>
        {mode==='professional'&&<div style={{marginBottom:'14px'}}>
          <Lbl c={c}>{t.suggestedRoles||'Suggested roles'}</Lbl>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
            {customRoles.map((r,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'6px 12px',background:`${mc}15`,border:`1px solid ${mc}40`,borderRadius:'20px',fontSize:'13px',color:mc,fontWeight:'600'}}>{r}<button onClick={()=>setCustomRoles(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:mc,cursor:'pointer',fontSize:'14px',padding:'0 0 0 4px',lineHeight:1}}>×</button></span>)}
          </div>
          <div style={{display:'flex',gap:'6px'}}>
            <input value={roleInput} onChange={e=>setRoleInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&roleInput.trim()){e.preventDefault();setCustomRoles(p=>[...p,roleInput.trim()]);setRoleInput('');}}} placeholder={t.addRolePh||'Add a role...'} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            {roleInput.trim()&&<button onClick={()=>{setCustomRoles(p=>[...p,roleInput.trim()]);setRoleInput('');}} style={{padding:'10px 14px',background:mc,border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>+</button>}
          </div>
          <div style={{fontSize:'12px',color:c.M2,marginTop:'6px'}}>{t.rolesHint||'Optional. Guests will choose from these or type their own.'}</div>
        </div>}
        <div style={{height:mode==='intimate'?'24px':'14px'}}/>
        <Btn onClick={()=>changeStep(1)} disabled={!name.trim()||!org.trim()} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn>
      </>}

      {step===1&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.datesTitle}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.datesSub}</p>
        <div style={{marginBottom:'16px'}}>
          <Lbl c={c}>{t.cityLbl}</Lbl>
          <CityInput value={city} onChange={setCity} onSelect={d=>{setCityData(d);setCity(d.label);}} placeholder={t.cityPh} c={c}/>
          {city&&<div style={{fontSize:'12px',color:c.M2,marginTop:'6px',display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'center'}}>
  <span>🌍 <span style={{color:c.T,fontWeight:'500'}}>{getTzLabel(planTz)}</span> <span style={{color:c.M}}>({getGMTOffset(planTz)})</span></span>
  {(()=>{const uTz=getUserTz();if(!uTz||uTz===planTz)return null;return<span style={{color:c.M}}>· {t.yourZone} <span style={{fontWeight:'500'}}>{getGMTOffset(uTz)}</span></span>;})()}
</div>}
        </div>
        {city&&selDates.length>0&&<div style={{marginBottom:'16px'}}>
          <Lbl c={c}>{t.weatherForecast}</Lbl>
          {selDates.slice(0,2).map(d=><div key={d} style={{marginBottom:'8px'}}><div style={{fontSize:'12px',color:c.M2,marginBottom:'4px',textTransform:'capitalize'}}>{fmtShort(d,lang)}</div><WeatherWidget city={city.split(',')[0]} date={d} c={c} lang={lang}/></div>)}
          {selDates.length>2&&<div style={{fontSize:'12px',color:c.M2,textAlign:'center',padding:'4px'}}>+{selDates.length-2} {t.moreDates}</div>}
        </div>}
        <Lbl c={c}>{t.selectDates}</Lbl>
        <CalendarPicker selected={selDates} onChange={setSelDates} c={c} lang={lang}/>
        {selDates.length>0&&<><HR c={c}/><Lbl c={c}>{t.times}</Lbl>
          {selDates.sort().map(d=><div key={d} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px',marginBottom:'10px'}}>
            <div style={{fontSize:'13px',color:mc,fontWeight:'600',marginBottom:'10px',textTransform:'capitalize'}}>{fmtShort(d,lang)}</div>
            <TimePicker times={selTimes[d]||[]} onChange={times=>setSelTimes(p=>({...p,[d]:times}))} c={c} lang={lang} tz={planTz}/>
          </div>)}
        </>}
        <div style={{marginTop:'20px'}}><Btn onClick={()=>changeStep(2)} disabled={selDates.length<1} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
      </>}

      {step===2&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.routeTitle}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'14px'}}>{t.routeSub}</p>
        {city&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
          <span>📍</span><span style={{color:c.T,fontWeight:'500'}}>{city}</span>
          <span style={{color:c.M2,fontSize:'11px',marginLeft:'auto',cursor:'pointer'}} onClick={()=>changeStep(1)}>✏️</span>
        </div>}
        <HR c={c}/>
        {stops.map((s,i)=><div key={s.id} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'24px',height:'24px',borderRadius:'50%',background:`${mc}25`,border:`1px solid ${mc}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',color:mc}}>{i+1}</div>
              <span style={{fontSize:'12px',color:c.M2,fontWeight:'600',textTransform:'uppercase',letterSpacing:'.05em'}}>{t.stop} {i+1}</span>
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={()=>setMapStop(s.id)} title={t.searchOnMap} style={{background:'none',border:`1px solid ${c.BD}`,color:mc,cursor:'pointer',fontSize:'12px',padding:'4px 10px',borderRadius:'8px',fontFamily:'inherit',fontWeight:'600'}}>{t.searchMap}</button>
              {stops.length>1&&<button onClick={()=>remStop(s.id)} title={t.removeStop} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'18px'}}>×</button>}
            </div>
          </div>
          {s.lat&&<div style={{fontSize:'11px',color:mc,marginBottom:'8px'}}>📍 {t.locationSet}</div>}
          <select value={s.cat} onChange={e=>upd(s.id,'cat',e.target.value)} style={{background:c.CARD,border:`1px solid ${c.BD}`,color:c.T,fontSize:'13px',padding:'9px 12px',borderRadius:'8px',width:'100%',fontFamily:'inherit',marginBottom:'8px'}}>{t.cat.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>{is(s.name,t.place,'name',s.id)}{is(s.address,t.addr,'address',s.id)}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>{is(s.cost,t.cost,'cost',s.id)}{is(s.link,t.booking,'link',s.id)}</div>
        </div>)}
        <Btn onClick={addStop} v="secondary" full sm style={{marginBottom:'14px'}} c={c}>{t.addStop}</Btn>
        {budget>0&&<div style={{background:`${mc}0D`,border:`1px solid ${mc}30`,borderRadius:'12px',padding:'14px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between'}}><span style={{color:c.M2}}>{t.estPer}</span><span style={{color:mc,fontSize:'22px',fontWeight:'800'}}>{budget.toFixed(0)}€</span></div>}
        <Btn onClick={()=>stepLabels.length>3?changeStep(3):create()} disabled={saving} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{stepLabels.length>3?t.cont:(saving?t.saving:t.createBtn)}</Btn>
      </>}

      {step===3&&stepLabels.length>3&&(()=>{
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
        <Sec id="dress" icon="👔" label={t.dcLbl} hasData={dressCode!==null}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
            {t.dressCodes.map(opt=><div key={opt.k} onClick={()=>setDressCode(dressCode===opt.k?null:opt.k)} style={{padding:'10px 12px',borderRadius:'10px',border:`1px solid ${dressCode===opt.k?mc+'50':c.BD}`,background:dressCode===opt.k?`${mc}12`:c.CARD,cursor:'pointer',fontSize:'13px',color:dressCode===opt.k?mc:c.T,fontWeight:dressCode===opt.k?'600':'400'}}>{opt.l}</div>)}
          </div>
          {dressCode&&<input value={dressNote} onChange={e=>setDressNote(e.target.value)} placeholder={dressCode==='custom'?t.dcCustomPh:t.dcNote} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'11px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
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
