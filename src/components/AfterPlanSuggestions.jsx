import React from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { affLink, uberLink, withUtm } from '../lib/affiliates.js'

export default function AfterPlanSuggestions({plan, c, lang}){
  const t=T[lang]; const mc=getMC(plan.mode,c);
  const city=plan.city||'';
  const cityEnc=encodeURIComponent(city);
  const date=plan.confirmedDate||plan.dates?.[0]||'';
  const dateEnc=encodeURIComponent(date);
  return(<div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
    {/* Nearby places */}
    {plan.stops?.some(s=>(s.options?.[0]?.lat||s.lat))&&(()=>{
      const opt=plan.stops.flatMap(s=>s.options||[s]).find(o=>o.lat&&o.lng)||{};
      const lat=opt.lat;const lng=opt.lng;
      if(!lat||!lng)return null;
      const links=[
        {emoji:'🍽️',label:t.nearbyRestaurants||'Restaurants nearby',url:`https://www.google.com/maps/search/restaurants/@${lat},${lng},15z`},
        {emoji:'🍸',label:t.nearbyBars||'Bars nearby',url:`https://www.google.com/maps/search/bars/@${lat},${lng},15z`},
        {emoji:'☕',label:t.nearbyCafes||'Cafés nearby',url:`https://www.google.com/maps/search/cafes/@${lat},${lng},15z`},
        {emoji:'🎭',label:t.nearbyActivities||'Activities nearby',url:`https://www.google.com/maps/search/things+to+do/@${lat},${lng},15z`},
      ];
      return <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
        <div style={{fontSize:'13px',fontWeight:'600',color:c.T,marginBottom:'10px'}}>📍 {t.nearbyPlaces||'Explore nearby'}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
          {links.map((l,i)=><a key={i} href={withUtm(l.url)} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',textDecoration:'none',fontSize:'13px',color:c.T,fontWeight:'500'}}>{l.emoji} {l.label}</a>)}
        </div>
      </div>;
    })()}
    {/* Accommodation */}
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px'}}>
      <div style={{fontSize:'13px',fontWeight:'600',color:c.T,marginBottom:'10px'}}>🏨 {t.stayOvernight}</div>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'10px',lineHeight:1.5}}>{t.accommodationSub}</div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {[{n:'Booking',u:affLink(`https://www.booking.com/search.html?ss=${cityEnc}&checkin=${date}`,'booking'),i:'🔵'},{n:'Airbnb',u:affLink(`https://www.airbnb.com/s/${cityEnc}/homes?checkin=${date}`,'airbnb'),i:'🏠'},{n:'Travala',u:affLink(`https://www.travala.com/hotels?destination=${cityEnc}`,'travala'),i:'💎'},{n:'Hotels.com',u:affLink(`https://www.hotels.com/search.do?destination=${cityEnc}&startDate=${date}`,'hotels'),i:'🏨'}].map(h=><a key={h.n} href={h.u} target="_blank" rel="noreferrer" style={{padding:'7px 10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',textDecoration:'none',fontSize:'12px',color:c.T,fontWeight:'500'}}>{h.i} {h.n}</a>)}
      </div>
    </div>
    {/* Smart after-plan tips */}
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px'}}>
      <div style={{fontSize:'13px',fontWeight:'600',color:c.T,marginBottom:'10px'}}>💡 {t.ifNightRunsOn}</div>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {[
          {icon:'🚕',text:t.taxiTip,link:uberLink(),linkText:'Uber'},
          {icon:'🍔',text:t.burgerTip,link:null,linkText:null},
          {icon:'🎵',text:t.continueParty,link:withUtm(`https://www.google.com/maps/search/nightclub+near+${cityEnc}`),linkText:'Google Maps'},
          {icon:'🌅',text:t.breakfastTip,link:withUtm(`https://www.google.com/maps/search/breakfast+near+${cityEnc}`),linkText:'Google Maps'},
          plan.mode==='intimate'?{icon:'🌹',text:t.specialNightTip,link:affLink('https://www.airbnb.com/s/'+cityEnc+'/homes?room_types%5B%5D=Entire+home%2Fapt&checkin='+date,'airbnb'),linkText:'Airbnb'}:null,
        ].filter(Boolean).map((tip,i)=><div key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',padding:'8px 0',borderBottom:i<4?`1px solid ${c.BD}`:'none'}}><span style={{fontSize:'18px',flexShrink:0}}>{tip.icon}</span><div><div style={{fontSize:'13px',color:c.T,lineHeight:1.5}}>{tip.text}</div>{tip.link&&<a href={tip.link} target="_blank" rel="noreferrer" style={{fontSize:'12px',color:mc,textDecoration:'none',fontWeight:'600'}}>{tip.linkText} →</a>}</div></div>)}
      </div>
    </div>
  </div>);
}


// ─── POST-PLAN SURVEY ────────────────────────────────
