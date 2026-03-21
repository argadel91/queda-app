import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { WX, WX_ES, WX_EN, weatherAdvice } from '../constants/weather.js'
import { daysUntil } from '../lib/utils.js'

export default function WeatherWidget({city,date,c,lang,showAdvice=false}){
  const[w,setW]=useState(null);const[state,setState]=useState('idle');
  useEffect(()=>{
    if(!city||!date){setState('idle');return;}
    const du=daysUntil(date);
    if(du>16){setState('early');return;}
    setState('loading');setW(null);
    (async()=>{try{
      const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}`).then(r=>r.json());
      if(!geo.results?.length){setState('notfound');return;}
      const{latitude:lat,longitude:lon}=geo.results[0];
      const wd=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto&start_date=${date}&end_date=${date}`).then(r=>r.json());
      if(wd.daily){setState('ok');setW({code:wd.daily.weathercode[0],max:Math.round(wd.daily.temperature_2m_max[0]),min:Math.round(wd.daily.temperature_2m_min[0]),rain:wd.daily.precipitation_probability_max[0],wind:Math.round(wd.daily.windspeed_10m_max?.[0]||0)});}
      else setState('notfound');
    }catch{setState('notfound');}})();
  },[city,date]);
  if(!city||!date||state==='idle')return null;
  const isEs=lang==='es';const du=date?daysUntil(date):0;
  const t=T[lang];
  if(state==='early')return<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'12px 14px',display:'flex',gap:'10px',alignItems:'center'}}><div style={{fontSize:'22px'}}>📅</div><div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{t.tooEarlyT}</div><div style={{fontSize:'12px',color:c.M2}}>{du-16} {t.tooEarlyD}</div></div></div>;
  if(state==='notfound')return<div style={{fontSize:'12px',color:c.M2,padding:'6px'}}>{t.cityNotFound}</div>;
  if(state==='loading')return<div style={{fontSize:'12px',color:c.M,padding:'8px'}}>...</div>;
  if(!w)return null;
  const desc=lang==='en'?WX_EN[w.code]||'':WX_ES[w.code]||'';
  const adv=showAdvice?weatherAdvice(w.code,w.max,w.min,w.rain,lang):null;
  return(<div>
    <div style={{background:`${c.A}0A`,border:`1px solid ${c.A}25`,borderRadius:'12px',padding:'14px 16px',marginBottom:adv?'8px':'0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'18px',marginBottom:'4px'}}>{WX[w.code]||'🌡️'} <span style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{desc}</span></div><div style={{display:'flex',gap:'12px',fontSize:'12px',color:c.M2}}><span>💧 {w.rain}%</span>{w.wind>0&&<span>💨 {w.wind} km/h</span>}</div></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:'32px',fontWeight:'800',color:c.A,lineHeight:1}}>{w.max}°</div><div style={{fontSize:'13px',color:c.M2}}>{w.min}° min</div></div>
      </div>
    </div>
    {adv&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
      <div style={{fontSize:'13px',color:c.T}}>{adv.cloth}</div>
      <div style={{fontSize:'13px',color:c.T}}>{adv.trans}</div>
      {adv.ext.map((e,i)=><div key={i} style={{fontSize:'12px',color:c.M2,background:`${c.A}10`,padding:'5px 10px',borderRadius:'8px'}}>{e}</div>)}
    </div>}
  </div>);
}

// ─── VENUE INFO ───────────────────────────────────────
