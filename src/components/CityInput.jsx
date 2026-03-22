import React, { useState, useEffect, useRef } from 'react'
import { getCityTz } from '../constants/weather.js'

const waitForGoogle = () => new Promise(resolve => {
  if (window.google?.maps?.places) return resolve()
  const check = setInterval(() => {
    if (window.google?.maps?.places) { clearInterval(check); resolve() }
  }, 100)
  setTimeout(() => clearInterval(check), 10000)
})

export default function CityInput({value,onChange,onSelect,placeholder,c}){
  const inputRef=useRef(null);
  const acRef=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    waitForGoogle().then(()=>{
      if(cancelled||!inputRef.current||acRef.current)return;
      const ac=new google.maps.places.Autocomplete(inputRef.current,{
        types:['(cities)'],
        fields:['name','geometry','address_components','formatted_address']
      });
      ac.addListener('place_changed',()=>{
        const place=ac.getPlace();
        if(!place.geometry)return;
        const comps=place.address_components||[];
        const city=comps.find(c=>c.types.includes('locality'))?.long_name||comps.find(c=>c.types.includes('administrative_area_level_2'))?.long_name||place.name||'';
        const country=comps.find(c=>c.types.includes('country'))?.long_name||'';
        const label=`${city}${country?', '+country:''}`.trim();
        const lat=place.geometry.location.lat();
        const lon=place.geometry.location.lng();
        const tz=getCityTz(city);
        onChange(label);
        onSelect({label,city,country,lat,lon,tz});
      });
      acRef.current=ac;
    });
    return()=>{cancelled=true;};
  },[]);

  return(<div style={{position:'relative'}}>
    <input ref={inputRef} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
  </div>);
}

// ─── MAP MODAL ────────────────────────────────────────
