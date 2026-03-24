import React, { useState, useEffect, useMemo, useRef } from 'react'
import T from '../constants/translations.js'
import { savePlan, savePlanWithUser, showErr } from '../lib/supabase.js'
import { ls, addMyPlan } from '../lib/storage.js'
import { genId, fmtShort } from '../lib/utils.js'
import { Btn, Lbl, Back, Stepper } from '../components/ui.jsx'
import CalendarPicker from '../components/CalendarPicker.jsx'
import MapModal from '../components/MapModal.jsx'
import CityInput from '../components/CityInput.jsx'
import { getCityTz } from '../constants/weather.js'
import ClockPicker from '../components/ClockPicker.jsx'


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
  const[org,setOrg]=useState(profile?.name||ls.get('q_myname',''));
  const[selDates,setSelDates]=useState([]);
  const[startTimes,setStartTimes]=useState(['']);
  const[inlineResults,setInlineResults]=useState([]);
  const inlineSearchRef=useRef(null);
  const inlineMapRef=useRef(null);
  const inlineMapObj=useRef(null);
  const inlineMarkers=useRef([]);
  const[stops,setStops]=useState([emptyStop(1,'')]);
  const[mapTarget,setMapTarget]=useState(null);
  const[saving,setSaving]=useState(false);
  const[draftRestored,setDraftRestored]=useState(false);
  const[openSections,setOpenSections]=useState({});
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
    if(d.org)setOrg(d.org);
    if(d.selDates)setSelDates(d.selDates);
    if(d.startTimes)setStartTimes(d.startTimes);
    if(d.stops)setStops(d.stops);if(d.step)setStep(d.step);
    setDraftRestored(true);
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Save draft helper
  const saveDraft=(s)=>ls.set(draftKey,{org,selDates,startTimes,stops,step:s!==undefined?s:step});
  // Auto-save every 30s
  useEffect(()=>{const id=setInterval(()=>saveDraft(),30000);return()=>clearInterval(id);});
  const clearDraft=()=>{try{localStorage.removeItem(draftKey)}catch{}};
  const discardDraft=()=>{clearDraft();setDraftRestored(false);window.location.reload();};
  // Save on step change
  const changeStep=(s)=>{saveDraft(s);if(s!==2){inlineMapObj.current=null;}setStep(s);};

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
  const remStop=id=>{
    // Clear all markers and re-add remaining
    inlineMarkers.current.forEach(m=>m.setMap(null));
    inlineMarkers.current=[];
    setStops(p=>{
      const remaining=p.filter(s=>s.id!==id);
      // Re-add markers for remaining stops
      setTimeout(()=>{
        let idx=0;
        remaining.forEach(s=>{
          const o=(s.options||[])[0];
          if(o?.lat&&o?.lng&&inlineMapObj.current){
            idx++;
            // Meeting point marker (orange)
            if(s.meetingPointLat&&s.meetingPointLng){
              const mpM=new google.maps.Marker({position:{lat:s.meetingPointLat,lng:s.meetingPointLng},map:inlineMapObj.current,label:{text:'📍',fontSize:'14px'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:'#f59e0b',fillOpacity:1,strokeColor:'#d97706',strokeWeight:2},title:'Meeting: '+(s.meetingPoint||'')});
              inlineMarkers.current.push(mpM);
            }
            // Venue marker (green)
            const marker=new google.maps.Marker({position:{lat:o.lat,lng:o.lng},map:inlineMapObj.current,label:{text:String(idx),color:'#0A0A0A',fontWeight:'800'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:14,fillColor:'#CDFF6C',fillOpacity:1,strokeColor:'#CDFF6C',strokeWeight:2}});
            inlineMarkers.current.push(marker);
          }
        });
      },50);
      return remaining;
    });
  };
  const updStop=(id,k,v)=>setStops(p=>p.map(s=>s.id===id?{...s,[k]:v}:s));
  const addOption=(stopId)=>setStops(p=>p.map(s=>s.id===stopId&&s.options.length<3?{...s,options:[...s.options,emptyOption()]}:s));
  const remOption=(stopId,optId)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.filter(o=>o.id!==optId)}:s));
  const updOption=(stopId,optionId,key,value)=>setStops(p=>p.map(s=>s.id===stopId?{...s,options:s.options.map(o=>o.id===optionId?{...o,[key]:value}:o)}:s));

  const stepLabels=['📅','🕐','📍','✓'];
  const[created,setCreated]=useState(null);

  const create=async()=>{
    setSaving(true);
    try{
      const cleanStops=stops.filter(s=>(s.options||[]).some(o=>o.name));
      const plan={id:genId(),name:null,desc:null,organizer:profile?.name||org.trim()||'',dates:[...selDates].sort(),startTimes:startTimes.filter(t=>t),timezone:planTz,city:autoCityShort,cityFull:autoCity,cityLat:firstCoords?.lat||null,cityLon:firstCoords?.lng||null,stops:cleanStops,confirmedDate:null,isPublic:false,lang,createdAt:new Date().toISOString()};
      if(authUser)await savePlanWithUser(plan,authUser.id);else await savePlan(plan);
      addMyPlan(plan.id,plan.name,'organizer');
      clearDraft();setCreated(plan);
    }catch(e){showErr(t.createError);}
    setSaving(false);
  };

  // Inline map for step 2 (place)
  useEffect(()=>{
    if(step!==2||!inlineMapRef.current||inlineMapObj.current)return;
    // Wait a tick for DOM to be ready
    const timer=setTimeout(()=>{
    if(!inlineMapRef.current)return;
    const loadGM=()=>{if(window.__loadGoogleMaps)window.__loadGoogleMaps();return new Promise(r=>{if(window.google?.maps)return r();const ch=setInterval(()=>{if(window.google?.maps){clearInterval(ch);r();}},100);setTimeout(()=>clearInterval(ch),10000);});};
    const mapDiv=document.createElement('div');
    mapDiv.style.cssText='width:100%;height:100%;min-height:250px;';
    inlineMapRef.current.innerHTML='';
    inlineMapRef.current.appendChild(mapDiv);
    loadGM().then(async()=>{
      if(google.maps.importLibrary)await google.maps.importLibrary('maps');
      const map=new google.maps.Map(mapDiv,{center:{lat:40.4168,lng:-3.7038},zoom:6,disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy',backgroundColor:'#1A1A1A'});
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
    },100);
    return()=>{clearTimeout(timer);};
  },[step]);

  const inlineSearch=async(q)=>{
    if(!q?.trim()||!window.google?.maps)return;
    try{
      if(google.maps.importLibrary)await google.maps.importLibrary('places');const{Place}=google.maps.places;
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
        if(google.maps.importLibrary)await google.maps.importLibrary('places');const{Place}=google.maps.places;
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

  // Done screen
  if(created){
    const shareUrl=location.href.split('?')[0]+'?code='+created.id;
    const shareText=`${t.shareJoinText} ${shareUrl}`;
    return<div style={{padding:'48px 24px',maxWidth:'420px',margin:'0 auto',textAlign:'center'}}>
      <div style={{fontSize:'64px',marginBottom:'16px'}}>🎉</div>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:mc,marginBottom:'8px'}}>{t.planCreatedTitle}</h2>
      <div style={{fontFamily:'monospace',fontSize:'40px',fontWeight:'900',color:mc,letterSpacing:'.15em',margin:'16px 0'}}>{created.id}</div>
      <p style={{color:c.M2,fontSize:'14px',marginBottom:'24px'}}>{t.shareCodeMsg}</p>
      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        <button onClick={()=>window.open('https://wa.me/?text='+encodeURIComponent(shareText),'_blank')} style={{flex:1,padding:'14px',background:'#25D366',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>WhatsApp</button>
        <button onClick={()=>window.open('https://t.me/share/url?url='+encodeURIComponent(shareUrl)+'&text='+encodeURIComponent(shareText),'_blank')} style={{flex:1,padding:'14px',background:'#0088cc',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Telegram</button>
        <button onClick={()=>{navigator.clipboard?.writeText(shareUrl);}} style={{flex:1,padding:'14px',background:c.CARD2,color:c.T,border:`1px solid ${c.BD}`,borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>🔗</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <Btn onClick={()=>onCreated(created)} full style={{padding:'14px'}} c={c} accent={mc}>{t.reviewPlan}</Btn>
        <Btn onClick={()=>{setCreated(null);setStep(0);setSelDates([]);setStartTimes(['']);setStops([emptyStop(1,'')]);}} v="secondary" full style={{padding:'14px'}} c={c}>{t.createAnother}</Btn>
        <button onClick={onBack} style={{padding:'12px',background:'none',border:'none',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'14px'}}>🏠 {t.homeBtn}</button>
      </div>
    </div>;
  }

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

      {/* ── STEP 0: DATE ── */}
      {step===0&&<div className="fade-in">
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>📅 {t.pickOneDate}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.dontWorryDates}</p>
        <CalendarPicker selected={selDates} onChange={d=>setSelDates(d.slice(-1))} c={c} lang={lang} max={1}/>
        <div style={{marginTop:'20px'}}><Btn onClick={()=>changeStep(1)} disabled={selDates.length<1} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.nextBtn}</Btn></div>
      </div>}

      {/* ── STEP 1: TIME ── */}
      {step===1&&<div className="fade-in">
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>🕐 {t.pickOneTime}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'16px'}}>{t.dontWorryTimes}</p>
        <ClockPicker value={startTimes[0]||''} onChange={v=>setStartTimes([v])} c={c}/>
        <div style={{marginTop:'20px'}}><Btn onClick={()=>changeStep(2)} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.nextBtn}</Btn></div>
      </div>}

      {/* ── STEP 2: PLACE ── */}
      {step===2&&<div className="fade-in">
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>📍 {t.pickOnePlace}</h2>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'10px'}}>{t.dontWorryPoints}</p>

        {/* Online / Physical toggle */}
        {!stops.some(s=>(s.options||[]).some(o=>o.name))&&<div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          <button onClick={()=>{const ns=emptyStop(Date.now());ns.options[0].name='Online';ns.options[0].address='💻';setStops(p=>[...p,ns]);}} style={{flex:1,padding:'14px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',color:c.T,fontWeight:'500',textAlign:'center'}}>💻 Online</button>
          <div style={{flex:1,padding:'14px',background:`${mc}10`,border:`1px solid ${mc}30`,borderRadius:'12px',fontSize:'14px',color:mc,fontWeight:'600',textAlign:'center'}}>📍 {t.physicalPlace}</div>
        </div>}

        {/* Selected place */}
        {stops.filter(s=>(s.options||[]).some(o=>o.name)).map((s)=>{
          const opt=(s.options||[])[0]||{};
          return<div key={s.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px',background:c.CARD,border:`1px solid ${mc}30`,borderRadius:'12px',marginBottom:'8px'}}>
            {opt.photo&&<img src={opt.photo} alt="" style={{width:'44px',height:'44px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'15px',color:c.T,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.name}</div>
              {opt.address&&<div style={{fontSize:'12px',color:c.M2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📍 {opt.address}</div>}
              {opt.rating&&<div style={{fontSize:'11px',color:c.M2}}>⭐{opt.rating}{opt.priceLevel?' · '+'€'.repeat(opt.priceLevel):''}</div>}
            </div>
            <button onClick={()=>remStop(s.id)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'18px',flexShrink:0,padding:'4px'}}>×</button>
          </div>;
        })}

        {/* Map search — only if no place yet */}
        {!stops.some(s=>(s.options||[]).some(o=>o.name))&&<div style={{marginBottom:'12px'}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
            <input ref={inlineSearchRef} defaultValue='' onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();inlineSearch(inlineSearchRef.current?.value);}}} placeholder={t.searchPlacePh||'Search a place... (Enter)'} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            <button onClick={()=>inlineSearch(inlineSearchRef.current?.value)} style={{background:mc,border:'none',borderRadius:'10px',padding:'10px 14px',color:'#0A0A0A',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>🔍</button>
          </div>
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
          <div ref={inlineMapRef} style={{width:'100%',height:'250px',borderRadius:'12px',overflow:'hidden',border:`1px solid ${c.BD}`,background:c.CARD2}}/>
        </div>}

        {/* Place selected — go to confirm */}
        {stops.some(s=>(s.options||[]).some(o=>o.name))&&<Btn onClick={()=>changeStep(3)} full style={{padding:'15px',background:mc,color:'#0A0A0A'}} c={c}>{t.nextBtn}</Btn>}
      </div>}

      {/* ── STEP 3: CONFIRM ── */}
      {step===3&&<div className="fade-in" style={{textAlign:'center'}}>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'12px'}}>{t.readyQ}</h2>
        <div style={{background:`linear-gradient(135deg,${mc}12,${mc}04)`,border:`2px solid ${mc}30`,borderRadius:'20px',padding:'20px 16px',marginBottom:'16px'}}>
          <div style={{fontSize:'14px',color:mc,fontWeight:'600',textTransform:'capitalize',marginBottom:'4px'}}>{fmtShort(selDates[0],lang)}{startTimes[0]?' · '+startTimes[0]:''}</div>
          {(()=>{const opt=stops.find(s=>(s.options||[]).some(o=>o.name))?.options?.[0];return opt?<div style={{fontSize:'16px',color:c.T,fontWeight:'700'}}>{opt.name}</div>:null;})()}
          <div style={{fontSize:'12px',color:c.M2,marginTop:'4px'}}>@ {profile?.name||org}</div>
        </div>
        <p style={{color:c.M2,fontSize:'13px',marginBottom:'20px'}}>{t.aboutToCreate}</p>
        <Btn onClick={create} disabled={saving} full style={{padding:'16px',fontSize:'16px',background:mc,color:'#0A0A0A'}} c={c}>{saving?(t.creatingPlan):(t.createPlanBtn)}</Btn>
      </div>}

      {/* ── STEP 3: EXTRAS ── */}
      {false&&(()=>{
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
