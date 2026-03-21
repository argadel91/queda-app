import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { fetchVenue, CL } from '../constants/weather.js'

export default function VenueInfo({name,lat,lng,c,lang}){
  const t=T[lang];const isEs=lang==='es';
  const[info,setInfo]=useState(null);const[tried,setTried]=useState(false);
  useEffect(()=>{if(!lat||!lng||tried)return;setTried(true);fetchVenue(name,lat,lng).then(setInfo);},[lat,lng]);
  if(!lat||!lng)return null;
  const gmUrl=`https://www.google.com/maps/search/${encodeURIComponent(name||'')}/@${lat},${lng},17z`;
  const cuisineL=info?.cuisine?(CL[lang]?.[info.cuisine]||`🍴 ${info.cuisine}`):null;
  const tags=[cuisineL,info?.vegan==='yes'?'🌱 Vegan':null,info?.vegetarian==='yes'&&info?.vegan!=='yes'?(t.venueVegetarian):null,info?.outdoor==='yes'?(t.venueTerrace):null,info?.wheelchair==='yes'?'♿':null].filter(Boolean);
  return(<div style={{marginTop:'8px'}}>
    {tags.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'6px'}}>{tags.map((t,i)=><span key={i} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:`${c.A}15`,color:c.A,border:`1px solid ${c.A}30`,fontWeight:'600'}}>{t}</span>)}</div>}
    {info?.hours&&<div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>🕐 {info.hours}</div>}
    {info?.phone&&<div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>📞 <a href={`tel:${info.phone}`} style={{color:c.A,textDecoration:'none'}}>{info.phone}</a></div>}
    {info?.website&&<a href={info.website.startsWith('http')?info.website:'https://'+info.website} target="_blank" rel="noreferrer" style={{display:'block',fontSize:'11px',color:c.A,marginBottom:'4px'}}>🌐 {info.website.replace(/^https?:\/\//,'').split('/')[0]}</a>}
    <a href={gmUrl} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 10px',background:'#4285F415',border:'1px solid #4285F440',borderRadius:'8px',textDecoration:'none',fontSize:'12px',color:'#4285F4',fontWeight:'600',marginTop:'4px'}}>🗺️ {t.venueGoogleMaps} ↗</a>
  </div>);
}

// ─── TRANSPORT PANEL ──────────────────────────────────
