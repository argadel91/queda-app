import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { Card, Btn, Lbl } from './ui.jsx'
import VenueInfo from './VenueInfo.jsx'
import { TMODES, getOsrmTime } from '../constants/weather.js'
import { affLink, uberLink, withUtm } from '../lib/affiliates.js'

export default function TransportPanel({to,planCity,c,lang}){
  const t=T[lang];
  const[times,setTimes]=useState({});const[ldg,setL]=useState(false);
  const[pos,setPos]=useState(null);const[asked,setAsked]=useState(false);
  const[roadDist,setRoadDist]=useState(null);const[suggestion,setSuggestion]=useState(null);
  const req=()=>{setAsked(true);navigator.geolocation?.getCurrentPosition(async p=>{const np={lat:p.coords.latitude,lon:p.coords.longitude};setPos(np);setL(true);
    const res={};
    for(const m of TMODES){const r=await getOsrmTime(np.lat,np.lon,to.lat,to.lng,m.k);if(r)res[m.k]=r;}
    // Get road distance via car route
    const carR=res['car'];
    if(carR){
      const distKm=parseFloat(carR.dist);setRoadDist(distKm);
      if(distKm<1)setSuggestion({icon:'🚶',msg:t.distWalk});
      else if(distKm<5)setSuggestion({icon:'🚲',msg:`${distKm}km — ${t.suggestBike}`});
      else if(distKm<30)setSuggestion({icon:'🚗',msg:`${distKm}km — ${t.suggestCar}`});
      else if(distKm<300)setSuggestion({icon:'🚂',msg:`${distKm}km — ${t.suggestTrain}`});
      else setSuggestion({icon:'✈️',msg:`${distKm}km — ${t.suggestFlight}`});
    }
    setTimes(res);setL(false);
  },()=>setAsked(false),{timeout:8000});};
  if(!to?.lat&&!to?.lng)return null;
  const dest=`${to.lat},${to.lng}`;const destQ=encodeURIComponent(`${to.name||''} ${to.address||''}`.trim()||planCity||'');
  const gmTransit=withUtm(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`);
  const tf=mins=>mins<60?`${mins} min`:`${Math.floor(mins/60)}h ${mins%60}min`;
  const flightCity=encodeURIComponent(planCity||to.name||'');
  return(<div style={{marginTop:'12px'}}>
    <Lbl c={c}>⏱️ {t.gettingThere}</Lbl>
    {/* Smart suggestion */}
    {suggestion&&<div style={{background:`${c.A}10`,border:`1px solid ${c.A}30`,borderRadius:'10px',padding:'10px 14px',marginBottom:'10px',display:'flex',gap:'8px',alignItems:'center'}}><span style={{fontSize:'20px'}}>{suggestion.icon}</span><span style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{suggestion.msg}</span></div>}
    {/* Public transit */}
    <div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px',marginBottom:'8px'}}>
      <div style={{fontSize:'13px',color:c.T,fontWeight:'500',marginBottom:'6px'}}>🚇 {t.publicTransport}</div>
      <a href={gmTransit} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'9px',background:`${c.A}15`,border:`1px solid ${c.A}40`,borderRadius:'8px',color:c.A,textDecoration:'none',fontSize:'13px',fontWeight:'600'}}>{t.transitBtn}</a>
    </div>
    {/* Calc from location */}
    {!asked&&<button onClick={req} style={{width:'100%',padding:'11px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',marginBottom:'8px'}}>📍 {t.calcBtn}</button>}
    {(asked&&!pos&&!ldg||ldg)&&<div style={{fontSize:'12px',color:c.M,textAlign:'center',padding:'8px'}}>{t.calcLoading}</div>}
    {!ldg&&Object.keys(times).length>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
      {TMODES.map(m=>{const tm=times[m.k];if(!tm)return null;const gmUrl=m.k==='foot'?withUtm(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`):m.k==='car'||m.k==='moto'?withUtm(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`):gmTransit;return<a key={m.k} href={gmUrl} target="_blank" rel="noreferrer" style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 12px',textDecoration:'none',display:'block'}}><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{m[lang]||m.en}</div><div style={{fontSize:'15px',color:c.A,fontWeight:'700'}}>{tf(tm.mins)}</div><div style={{fontSize:'11px',color:c.M2}}>{tm.dist} km</div></a>;})}
    </div>}
    {/* Quick links: taxis, trains */}
    <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
      {[{n:'Uber',u:uberLink(),i:'⚫'},{n:'Cabify',u:'https://cabify.com/',i:'🟣'},{n:'Renfe',u:'https://www.renfe.com/',i:'🚆'},{n:'Trainline',u:affLink('https://www.thetrainline.com/','trainline'),i:'🎫'},{n:'BlaBlaCar',u:affLink(`https://www.blablacar.es/search-rides?fn=&tn=${encodeURIComponent(planCity||'')}&db=${new Date().toISOString().split('T')[0]}`,'blablacar'),i:'🚗'}].map(tx=><a key={tx.n} href={tx.u} target="_blank" rel="noreferrer" style={{padding:'6px 10px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',textDecoration:'none',fontSize:'12px',color:c.T,fontWeight:'500'}}>{tx.i} {tx.n}</a>)}
    </div>
    {/* Flights section */}
    {(roadDist===null||roadDist>200)&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px'}}>
      <div style={{fontSize:'13px',color:c.T,fontWeight:'500',marginBottom:'8px'}}>✈️ {t.flights}</div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {[{n:'Google Flights',u:withUtm(`https://www.google.com/travel/flights?q=flights+to+${flightCity}`),i:'🔍'},{n:'Skyscanner',u:affLink(`https://www.skyscanner.net/transport/flights/anywhere/${flightCity.replace(/%20/g,'-').toLowerCase()}/`,'skyscanner'),i:'🌐'},{n:'Travala',u:affLink(`https://www.travala.com/flights?to=${flightCity}`,'travala'),i:'💎'}].map(f=><a key={f.n} href={f.u} target="_blank" rel="noreferrer" style={{padding:'7px 10px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',textDecoration:'none',fontSize:'12px',color:c.T,fontWeight:'500'}}>{f.i} {f.n}</a>)}
      </div>
    </div>}
  </div>);
}

// ─── PAYMENT MODAL ────────────────────────────────────
