import React, { useState, useEffect, useMemo, useRef } from 'react'
import T from '../constants/translations.js'
import { savePlan, savePlanWithUser, showErr } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { genId, fmtShort } from '../lib/utils.js'
import { Btn, Lbl, Inp, Back, Stepper } from '../components/ui.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import MapModal from '../components/MapModal.jsx'
import CityInput from '../components/CityInput.jsx'
import { getCityTz } from '../constants/weather.js'


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
  maxCapacity: '', orgAttends: true, meetingPoint: '', meetingMinsBefore: '', minAttendees: '',
});

export default function Create({onBack,onCreated,c,lang,authUser,profile}){
  const t=T[lang];const mc=c.A;
  const[step,setStep]=useState(0);
  const[name,setName]=useState('');const[desc,setDesc]=useState('');
  const[org,setOrg]=useState(profile?.name||ls.get('q_myname',''));
  const[orgRole,setOrgRole]=useState('');
  const[isPublic,setIsPublic]=useState(false);
  const[pubFilter,setPubFilter]=useState({gender:'any',ageMin:'',ageMax:'',radius:''});
  const[deadline,setDeadline]=useState('');
  const[hasDeadline,setHasDeadline]=useState(false);
  const[selDates,setSelDates]=useState([]);
  const[startTimes,setStartTimes]=useState(['']);
  const[inlineResults,setInlineResults]=useState([]);
  const inlineSearchRef=useRef(null);
  const inlineMapRef=useRef(null);
  const inlineMapObj=useRef(null);
  const inlineMarkers=useRef([]);
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
  const addOption=(stopId)=>setStops(p=>p.map(s=>s.id===stopId&&s.options.length<3?{...s,options:[...s.options,emptyOption()]}:s));
  const remOption=(stopId,optId)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.filter(o=>o.id!==optId)}:s));
  const updOption=(stopId,optionId,key,value)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.map(o=>o.id===optionId?{...o,[key]:value}:o)}:s));

  const stepLabels=[t.whenTitle||'When?',t.whereTitle||'Where?',t.nameTitle||'Name'];

  const create=async()=>{
    setSaving(true);
    try{
      const cleanStops=stops.filter(s=>(s.options||[]).some(o=>o.name));
      const plan={id:genId(),name:name.trim()||null,desc:desc.trim()||null,organizer:profile?.name||org.trim()||'',orgRole:orgRole.trim()||null,dates:[...selDates].sort(),startTimes:startTimes.filter(t=>t),timezone:planTz,city:autoCityShort,cityFull:autoCity,cityLat:firstCoords?.lat||null,cityLon:firstCoords?.lng||null,stops:cleanStops,dressCode,dressNote,autoConfirm,autoConfirmN,surpriseMode,poll:poll.q.trim()?poll:null,gift:giftOn?gift:null,bring:bring.filter(b=>b.text.trim()),payment,confirmedDate:null,isPublic,pubFilter:isPublic?pubFilter:null,deadline:hasDeadline&&deadline?deadline:null,lang,createdAt:new Date().toISOString()};
      if(authUser)await savePlanWithUser(plan,authUser.id);else await savePlan(plan);
      addMyPlan(plan.id,plan.name,'organizer');
      ls.set('q_state',{screen:'share',planId:plan.id,isOrg:true});clearDraft();onCreated(plan);
    }catch(e){showErr(t.createError);}
    setSaving(false);
  };

  // Inline map for step 1
  useEffect(()=>{
    if(step!==1||!inlineMapRef.current||inlineMapObj.current)return;
    const loadGM=()=>{if(window.__loadGoogleMaps)window.__loadGoogleMaps();return new Promise(r=>{if(window.google?.maps)return r();const ch=setInterval(()=>{if(window.google?.maps){clearInterval(ch);r();}},100);setTimeout(()=>clearInterval(ch),10000);});};
    const mapDiv=document.createElement('div');
    mapDiv.style.cssText='width:100%;height:100%;';
    inlineMapRef.current.innerHTML='';
    inlineMapRef.current.appendChild(mapDiv);
    loadGM().then(async()=>{
      await google.maps.importLibrary('maps');
      const map=new google.maps.Map(mapDiv,{center:{lat:40.4168,lng:-3.7038},zoom:6,disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'});
      inlineMapObj.current=map;
      // Click to select
      map.addListener('click',e=>{
        const lat=e.latLng.lat(),lng=e.latLng.lng();
        const geocoder=new google.maps.Geocoder();
        geocoder.geocode({location:{lat,lng}},(res,status)=>{
          if(status==='OK'&&res[0]){
            const r=res[0];
            pickInlineResult({name:r.address_components?.[0]?.long_name||'',address:r.formatted_address||'',lat,lng,placeId:r.place_id});
          }
        });
      });
    });
    return()=>{};
  },[step]);

  const inlineSearch=async(q)=>{
    if(!q?.trim()||!window.google?.maps)return;
    try{
      const{Place}=await google.maps.importLibrary('places');
      const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location','rating','userRatingCount','priceLevel','photos','placeId'],maxResultCount:5});
      if(places?.length){setInlineResults(places.map(p=>({name:p.displayName||'',address:p.formattedAddress||'',lat:p.location?.lat(),lng:p.location?.lng(),rating:p.rating||null,ratingCount:p.userRatingCount||null,priceLevel:p.priceLevel??null,photo:p.photos?.[0]?.getURI?.({maxWidth:400})||null,placeId:p.id||null})));}
      else{setInlineResults([]);}
    }catch{
      try{
        const service=new google.maps.places.PlacesService(inlineMapObj.current||document.createElement('div'));
        service.textSearch({query:q},(res,status)=>{
          if(status==='OK'&&res)setInlineResults(res.slice(0,5).map(r=>({name:r.name||'',address:r.formatted_address||'',lat:r.geometry.location.lat(),lng:r.geometry.location.lng(),rating:r.rating||null,ratingCount:r.user_ratings_total||null,priceLevel:r.price_level??null,photo:r.photos?.[0]?.getUrl?.({maxWidth:400})||null,placeId:r.place_id||null})));
          else setInlineResults([]);
        });
      }catch{setInlineResults([]);}
    }
  };

  const pickInlineResult=async(r)=>{
    setInlineResults([]);
    if(inlineSearchRef.current)inlineSearchRef.current.value=r.name;
    // Enrich with details
    if(r.placeId){
      try{
        const{Place}=await google.maps.importLibrary('places');
        const place=new Place({id:r.placeId});
        await place.fetchFields({fields:['websiteURI','nationalPhoneNumber','regularOpeningHours','editorialSummary','googleMapsURI','types','dineIn','takeout','delivery','reservable','servesBeer','servesWine','outdoorSeating','goodForChildren','accessibilityOptions']});
        r.website=place.websiteURI||null;r.phone=place.nationalPhoneNumber||null;
        r.hours=place.regularOpeningHours?.weekdayDescriptions||null;
        r.summary=place.editorialSummary||null;r.googleMapsURI=place.googleMapsURI||null;
        r.types=place.types||[];r.dineIn=place.dineIn??null;r.takeout=place.takeout??null;
        r.servesBeer=place.servesBeer??null;r.servesWine=place.servesWine??null;
        r.outdoorSeating=place.outdoorSeating??null;r.wheelchair=place.accessibilityOptions?.wheelchairAccessibleEntrance??null;
      }catch{}
    }
    // Add to stops
    let targetStop=stops.find(s=>!(s.options||[]).some(o=>o.name));
    if(!targetStop){targetStop=emptyStop(Date.now());setStops(p=>[...p,targetStop]);}
    const optId=targetStop.options[0].id;
    const fields=['name','address','lat','lng','placeId','rating','ratingCount','priceLevel','website','phone','hours','photo','summary','googleMapsURI','types','dineIn','takeout','delivery','reservable','servesBeer','servesWine','outdoorSeating','goodForChildren','wheelchair'];
    setTimeout(()=>{fields.forEach(k=>{if(r[k]!==undefined&&r[k]!==null)updOption(targetStop.id,optId,k,r[k]);});},10);
    // Zoom map and add marker
    if(inlineMapObj.current&&r.lat&&r.lng){
      inlineMapObj.current.setCenter({lat:r.lat,lng:r.lng});
      inlineMapObj.current.setZoom(15);
      const marker=new google.maps.Marker({position:{lat:r.lat,lng:r.lng},map:inlineMapObj.current,label:{text:String(stops.filter(s=>(s.options||[]).some(o=>o.name)).length+1),color:'#0A0A0A',fontWeight:'800'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:14,fillColor:'#CDFF6C',fillOpacity:1,strokeColor:'#CDFF6C',strokeWeight:2}});
      inlineMarkers.current.push(marker);
    }
    if(inlineSearchRef.current)inlineSearchRef.current.value='';
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
      <Back onClick={step===0?onBack:()=>changeStep(0)} label={t.back} c={c}/>
      <Stepper cur={step} labels={stepLabels} c={c} accent={mc}/>

      {/* ── INVITATION CARD — live preview ── */}
      <div style={{background:`linear-gradient(135deg,${mc}12,${mc}04)`,border:`2px solid ${mc}30`,borderRadius:'20px',padding:'16px 14px',textAlign:'center',marginBottom:'20px',transition:'all .3s ease'}}>
        <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'11px',color:mc,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'8px'}}>queda.</div>
        <div style={{fontSize:'12px',color:c.M2,marginBottom:'2px'}}>{t.organizedBy||'By'}: <strong style={{color:c.T}}>{profile?.name||'—'}</strong></div>
        {/* Date + time */}
        {selDates[0]&&<div style={{marginTop:'8px',fontSize:'14px',color:mc,fontWeight:'600',textTransform:'capitalize'}}>{fmtShort(selDates[0],lang)}{startTimes[0]?' · '+startTimes[0]:''}</div>}
        {/* Stops */}
        {stops.some(s=>(s.options||[]).some(o=>o.name))&&<div style={{marginTop:'8px',borderTop:`1px solid ${mc}20`,paddingTop:'8px'}}>
          {stops.filter(s=>(s.options||[]).some(o=>o.name)).map((s,i)=>{
            const endTime=calcEndTime(s.startTime,s.duration);
            return<div key={s.id} style={{marginBottom:'6px'}}>
              {(s.options||[]).filter(o=>o.name).map((opt,oi)=><div key={opt.id} style={{display:'flex',alignItems:'center',gap:'5px',justifyContent:'center',fontSize:'11px',color:c.M2,marginBottom:'1px'}}>
                {oi===0?<span style={{color:mc,fontWeight:'700'}}>{i+1}.</span>:<span style={{color:c.M,fontSize:'10px',marginLeft:'14px'}}>↳ o:</span>}
                {opt.photo&&<img src={opt.photo} alt="" style={{width:'16px',height:'16px',borderRadius:'3px',objectFit:'cover'}}/>}
                <span style={{color:oi===0?c.T:c.M2}}>{opt.name}</span>
                {opt.rating&&<span style={{color:mc,fontSize:'10px'}}>⭐{opt.rating}</span>}
              </div>)}
              {s.startTime&&<div style={{fontSize:'10px',color:c.M,textAlign:'center'}}>🕐 {s.startTime}{endTime?`–${endTime}`:''}{s.duration?` (${s.duration})`:''}</div>}
            </div>;})}
        </div>}
        {/* Empty state */}
        {selDates.length===0&&!stops.some(s=>(s.options||[]).some(o=>o.name))&&<div style={{fontSize:'14px',color:c.BD,fontStyle:'italic',padding:'8px 0'}}>{t.planPreviewEmpty||'Your plan will appear here...'}</div>}
      </div>


      {/* ── STEP 1: WHERE? — inline map ── */}
      {step===1&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.whereTitle||'Where?'}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'10px'}}>{t.whereSub||'Pick a place. You can edit or add alternatives later.'}</p>

        {/* Online toggle */}
        <button onClick={()=>{
          const isOnline=stops.some(s=>(s.options||[]).some(o=>o.name==='Online'));
          if(!isOnline){
            const ns=emptyStop(Date.now());
            ns.options[0].name='Online';
            ns.options[0].address='💻';
            setStops(p=>[...p,ns]);
          }
        }} style={{width:'100%',padding:'10px',background:stops.some(s=>(s.options||[]).some(o=>o.name==='Online'))?`${mc}15`:c.CARD,border:`1px solid ${stops.some(s=>(s.options||[]).some(o=>o.name==='Online'))?mc+'50':c.BD}`,borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:stops.some(s=>(s.options||[]).some(o=>o.name==='Online'))?mc:c.M2,fontWeight:stops.some(s=>(s.options||[]).some(o=>o.name==='Online'))?'700':'400',marginBottom:'10px'}}>💻 {lang==='es'?'Es online (sin lugar físico)':'It\'s online (no physical location)'}</button>

        {/* Selected places */}
        {stops.filter(s=>(s.options||[]).some(o=>o.name)).map((s,i)=>{
          const opt=(s.options||[])[0]||{};
          if(opt.name==='Online')return<div key={s.id} style={{padding:'10px 12px',background:c.CARD,border:`1px solid ${mc}30`,borderRadius:'12px',marginBottom:'8px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>💻 Online</span>
              <button onClick={()=>remStop(s.id)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px'}}>×</button>
            </div>
            <input value={opt.website||''} onChange={e=>updOption(s.id,opt.id,'website',e.target.value)} placeholder={lang==='es'?'Link o detalles (Zoom, Meet, Discord...)':'Link or details (Zoom, Meet, Discord...)'} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>;
          return<div key={s.id} style={{background:c.CARD,border:`1px solid ${mc}30`,borderRadius:'12px',marginBottom:'8px',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px'}}>
              <div style={{width:'24px',height:'24px',borderRadius:'50%',background:`${mc}25`,border:`1px solid ${mc}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',color:mc,flexShrink:0}}>{i+1}</div>
              {opt.photo&&<img src={opt.photo} alt="" style={{width:'36px',height:'36px',borderRadius:'8px',objectFit:'cover',flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',color:c.T,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.name}</div>
                {opt.rating&&<div style={{fontSize:'11px',color:c.M2}}>⭐{opt.rating}{opt.priceLevel?' · '+'€'.repeat(opt.priceLevel):''}</div>}
              </div>
              <button onClick={()=>updStop(s.id,'_expanded',!s._expanded)} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'12px',padding:'4px'}}>{s._expanded?'▾':'⚙️'}</button>
              <button onClick={()=>remStop(s.id)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px',flexShrink:0}}>×</button>
            </div>
            {s._expanded&&<div style={{padding:'8px 12px 12px',borderTop:`1px solid ${c.BD}`,display:'flex',flexDirection:'column',gap:'10px'}}>
              {/* Meeting point */}
              <div>
                <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>📍 {t.meetingPointLbl||'Meeting point'}</div>
                <div style={{display:'flex',gap:'6px'}}>
                  <input value={s.meetingPoint||''} onChange={e=>updStop(s.id,'meetingPoint',e.target.value)} placeholder={t.meetingPointPh||'Where to meet before (search or type)'} style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                  <button onClick={()=>{if(!inlineMapObj.current)return;const mp=s.meetingPoint;if(!mp)return;const svc=new google.maps.places.PlacesService(inlineMapObj.current);svc.textSearch({query:mp,location:opt.lat&&opt.lng?{lat:opt.lat,lng:opt.lng}:undefined,radius:2000},(res,st)=>{if(st==='OK'&&res[0]){updStop(s.id,'meetingPoint',res[0].name);updStop(s.id,'meetingPointLat',res[0].geometry.location.lat());updStop(s.id,'meetingPointLng',res[0].geometry.location.lng());}});}} style={{background:mc,border:'none',borderRadius:'8px',padding:'8px 10px',color:'#0A0A0A',cursor:'pointer',fontSize:'13px',flexShrink:0}}>🔍</button>
                </div>
                {s.meetingPoint&&<div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
                  <input type="number" value={s.meetingMinsBefore||''} onChange={e=>updStop(s.id,'meetingMinsBefore',e.target.value)} placeholder="15" style={{width:'80px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
                  <span style={{fontSize:'12px',color:c.M2,alignSelf:'center'}}>{t.minsBefore||'min before'}</span>
                </div>}
              </div>
              {/* Capacity */}
              <div>
                <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>👥 {lang==='es'?'Aforo':'Capacity'}</div>
                <div style={{display:'flex',gap:'8px'}}>
                  <div style={{flex:1}}>
                    <input type="number" value={s.minAttendees||''} onChange={e=>updStop(s.id,'minAttendees',e.target.value)} placeholder={lang==='es'?'Mín':'Min'} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                  <div style={{flex:1}}>
                    <input type="number" value={s.maxCapacity||''} onChange={e=>updStop(s.id,'maxCapacity',e.target.value)} placeholder={lang==='es'?'Máx':'Max'} style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
                  </div>
                </div>
                <div style={{fontSize:'11px',color:c.M,marginTop:'4px',lineHeight:1.5}}>
                  {s.minAttendees?`⚠️ ${lang==='es'?`Si no llegan ${s.minAttendees}, este punto se cancela automáticamente`:`If fewer than ${s.minAttendees} attend, this point is auto-cancelled`}`:''}
                  {s.minAttendees&&s.maxCapacity?' · ':''}
                  {s.maxCapacity?`🔒 ${lang==='es'?`Máximo ${s.maxCapacity} personas`:`Maximum ${s.maxCapacity} people`}`:''}
                </div>
              </div>
              {/* Transport from previous */}
              {i>0&&<div>
                <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>🚗 {lang==='es'?'Cómo llegar desde el punto anterior':'How to get here from previous point'}</div>
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {[{k:'walk',l:'🚶'},{k:'car',l:'🚗'},{k:'transit',l:'🚇'},{k:'bike',l:'🚲'},{k:'taxi',l:'🚕'}].map(tr=><button key={tr.k} onClick={()=>updStop(s.id,'transport',s.transport===tr.k?'':tr.k)} style={{padding:'6px 10px',borderRadius:'8px',border:`1px solid ${s.transport===tr.k?mc+'60':c.BD}`,background:s.transport===tr.k?`${mc}15`:c.CARD,cursor:'pointer',fontSize:'16px'}}>{tr.l}</button>)}
                </div>
              </div>}
            </div>}
          </div>;
        })}

        {/* Inline map with search */}
        <div style={{marginBottom:'12px'}}>
          <div style={{fontSize:'13px',color:mc,fontWeight:'600',marginBottom:'6px'}}>
            {stops.filter(s=>(s.options||[]).some(o=>o.name)).length===0
              ?(t.pickFirstPlace||'📍 Pick the first place')
              :`📍 ${t.placeN||'Place'} ${stops.filter(s=>(s.options||[]).some(o=>o.name)).length+1}`}
          </div>
          {/* Search bar */}
          <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
            <input ref={inlineSearchRef} defaultValue='' onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();inlineSearch(inlineSearchRef.current?.value);}}} placeholder={t.searchPlacePh||'Search a place... (Enter)'} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            <button onClick={()=>inlineSearch(inlineSearchRef.current?.value)} style={{background:mc,border:'none',borderRadius:'10px',padding:'10px 14px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button>
          </div>
          {/* Search results */}
          {inlineResults.length>0&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',marginBottom:'8px',maxHeight:'200px',overflowY:'auto'}}>
            {inlineResults.map((r,i)=><div key={i} onClick={()=>pickInlineResult(r)} style={{padding:'10px 14px',cursor:'pointer',borderBottom:i<inlineResults.length-1?`1px solid ${c.BD}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{r.name}</div>
                {r.rating&&<span style={{fontSize:'11px',color:mc}}>⭐{r.rating}</span>}
                {r.priceLevel&&<span style={{fontSize:'11px',color:c.M2}}>{'€'.repeat(r.priceLevel)}</span>}
              </div>
              <div style={{fontSize:'12px',color:c.M2}}>{r.address}</div>
            </div>)}
          </div>}
          {/* Map container */}
          <div ref={inlineMapRef} style={{width:'100%',height:'250px',borderRadius:'12px',overflow:'hidden',border:`1px solid ${c.BD}`,background:c.CARD2}}/>
        </div>

        {/* Continue or done */}
        {stops.some(s=>(s.options||[]).some(o=>o.name))&&<>
          <div style={{marginTop:'10px'}}><Btn onClick={()=>changeStep(2)} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
        </>}
      </>}

      {/* ── STEP 2: NAME (optional) ── */}
      {step===2&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.nameQ||'Name?'}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.nameSub||"Give your plan a name. If not, it'll be saved by code."}</p>
        <Inp value={name} onChange={setName} placeholder={t.namePh||'e.g. Birthday dinner, Valencia trip...'} c={c}/>
        <div style={{marginTop:'20px'}}><Btn onClick={create} disabled={saving} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{saving?(t.creatingBtn||'Creating...'):(t.createBtn)}</Btn></div>
      </>}

      {/* ── STEP 0: WHEN? ── */}
      {step===0&&<>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.whenTitle||'When?'}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.whenSub||'Pick one date and time. You can add alternatives later.'}</p>
        <CalendarPicker selected={selDates} onChange={d=>setSelDates(d.slice(-3))} c={c} lang={lang} max={3}/>
        {selDates.length>0&&<div style={{marginTop:'16px'}}>
          <div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'8px'}}>{t.whatTime||'What time?'}</div>
          {startTimes.map((st,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
            <input type="time" value={st||''} onChange={e=>{const n=[...startTimes];n[i]=e.target.value;setStartTimes(n);}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',flex:1}}/>
            {st&&<span style={{fontSize:'14px',color:c.M2,fontWeight:'500',flexShrink:0}}>{(()=>{const[h,m]=(st||'').split(':').map(Number);if(isNaN(h))return'';const ampm=h>=12?'PM':'AM';const h12=h%12||12;return`${h12}:${String(m).padStart(2,'0')} ${ampm}`;})()}</span>}
            {startTimes.length>1&&<button onClick={()=>setStartTimes(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'16px',padding:'4px'}}>×</button>}
          </div>)}
          {startTimes.length<3&&startTimes[startTimes.length-1]&&<button onClick={()=>setStartTimes(p=>[...p,''])} style={{background:'none',border:`1px dashed ${c.BD}`,borderRadius:'10px',padding:'10px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',width:'100%'}}>+ {t.addTime||'Add time option'}</button>}
        </div>}
        <div style={{marginTop:'20px'}}><Btn onClick={()=>changeStep(1)} disabled={selDates.length<1} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.cont}</Btn></div>
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
