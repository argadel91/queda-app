import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { getOutfitTip } from '../constants/weather.js'
import { daysUntil } from '../lib/utils.js'

export default function OutfitCard({dressCode, dressNote, city, date, mc, c, lang, t}){
  const[weather,setW]=useState(null);
  useEffect(()=>{
    if(!city||!date)return;
    const du=daysUntil(date);
    if(du>16||du<-1)return;
    (async()=>{
      try{
        const geo=await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(city)+"&count=1").then(r=>r.json());
        if(!geo.results?.length)return;
        const{latitude:lat,longitude:lon}=geo.results[0];
        const wd=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date="+date+"&end_date="+date).then(r=>r.json());
        if(wd.daily)setW({code:wd.daily.weathercode[0],max:Math.round(wd.daily.temperature_2m_max[0]),min:Math.round(wd.daily.temperature_2m_min[0])});
      }catch{}
    })();
  },[city,date]);
  // Handle both array and string dressCode
  const codes=Array.isArray(dressCode)?dressCode:dressCode?[dressCode]:[];
  const labels=codes.map(dc=>t.dressCodes.find(d=>d.k===dc)?.l||dc).filter(Boolean);
  const tip=codes[0]?getOutfitTip(codes[0],weather?.code,weather?.max,weather?.min,lang):null;
  return(<div style={{background:`${mc}12`,border:`1px solid ${mc}35`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
    <div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'8px'}}>{t.dresscodeOfPlan}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
      {labels.map((l,i)=><span key={i} style={{fontSize:'14px',fontWeight:'600',color:c.T,padding:'4px 12px',background:`${mc}20`,border:`1px solid ${mc}40`,borderRadius:'20px'}}>{l}</span>)}
    </div>
    {tip&&<div style={{fontSize:'13px',color:c.T,lineHeight:1.6,marginBottom:tip.wtip?'10px':'0'}}>{tip.base}</div>}
    {tip?.wtip&&<div style={{fontSize:'13px',color:c.T,padding:'10px 12px',background:c.CARD2,borderRadius:'8px',borderLeft:`3px solid ${mc}`,lineHeight:1.5,marginTop:'6px'}}>{tip.wtip}</div>}
    {dressNote&&<div style={{fontSize:'12px',color:c.M2,marginTop:'10px',fontStyle:'italic'}}>"{dressNote}"</div>}
  </div>);
}
