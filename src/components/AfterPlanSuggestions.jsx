import React from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'

export default function AfterPlanSuggestions({plan, c, lang}){
  const t=T[lang];const isEs=lang==='es'; const mc=getMC(plan.mode,c);
  const city=plan.city||'';
  const cityEnc=encodeURIComponent(city);
  const date=plan.confirmedDate||plan.dates?.[0]||'';
  const dateEnc=encodeURIComponent(date);
  return(<div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
    {/* Accommodation */}
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px'}}>
      <div style={{fontSize:'13px',fontWeight:'600',color:c.T,marginBottom:'10px'}}>🏨 {t.stayOvernight}</div>
      <div style={{fontSize:'12px',color:c.M2,marginBottom:'10px',lineHeight:1.5}}>{isEs?"Si la noche se alarga o vienes de lejos — opciones de alojamiento cerca:":"If the night runs long or you're travelling far — accommodation options nearby:"}</div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {[{n:'Booking',u:`https://www.booking.com/search.html?ss=${cityEnc}&checkin=${date}`,i:'🔵'},{n:'Airbnb',u:`https://www.airbnb.com/s/${cityEnc}/homes?checkin=${date}`,i:'🏠'},{n:'Travala',u:`https://www.travala.com/hotels?destination=${cityEnc}`,i:'💎'},{n:'Hotels.com',u:`https://www.hotels.com/search.do?destination=${cityEnc}&startDate=${date}`,i:'🏨'}].map(h=><a key={h.n} href={h.u} target="_blank" rel="noreferrer" style={{padding:'7px 10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',textDecoration:'none',fontSize:'12px',color:c.T,fontWeight:'500'}}>{h.i} {h.n}</a>)}
      </div>
    </div>
    {/* Smart after-plan tips */}
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px'}}>
      <div style={{fontSize:'13px',fontWeight:'600',color:c.T,marginBottom:'10px'}}>💡 {t.ifNightRunsOn}</div>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {[
          {icon:'🚕',text:isEs?'Si bebes, pide un taxi de antemano — los precios suben de noche.':"If you're drinking, book a taxi in advance — prices surge at night.",link:'https://m.uber.com/',linkText:'Uber'},
          {icon:'🍔',text:isEs?'¿Hamburguesa de madrugada? Los mejores sitios siempre tienen cola.':'Late night burger? The best spots always have a queue.',link:null,linkText:null},
          {icon:'🎵',text:isEs?'¿Continuar la fiesta? Busca salas o bares de copas cercanos.':'Continue the party? Find nearby clubs or bars.',link:`https://www.google.com/maps/search/nightclub+near+${cityEnc}`,linkText:'Google Maps'},
          {icon:'🌅',text:isEs?'Si amaneces fuera, el desayuno es sagrado.':"If you're out till sunrise, breakfast is sacred.",link:`https://www.google.com/maps/search/breakfast+near+${cityEnc}`,linkText:'Google Maps'},
          plan.mode==='intimate'?{icon:'🌹',text:t.specialNightTip,link:('https://www.airbnb.com/s/'+cityEnc+'/homes?room_types%5B%5D=Entire+home%2Fapt&checkin='+date),linkText:'Airbnb'}:null,
        ].filter(Boolean).map((tip,i)=><div key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',padding:'8px 0',borderBottom:i<4?`1px solid ${c.BD}`:'none'}}><span style={{fontSize:'18px',flexShrink:0}}>{tip.icon}</span><div><div style={{fontSize:'13px',color:c.T,lineHeight:1.5}}>{tip.text}</div>{tip.link&&<a href={tip.link} target="_blank" rel="noreferrer" style={{fontSize:'12px',color:mc,textDecoration:'none',fontWeight:'600'}}>{tip.linkText} →</a>}</div></div>)}
      </div>
    </div>
  </div>);
}


// ─── POST-PLAN SURVEY ────────────────────────────────
