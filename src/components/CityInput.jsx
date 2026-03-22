import React, { useEffect, useRef } from 'react'
import { getCityTz } from '../constants/weather.js'

const waitForGoogle = () => new Promise(resolve => {
  if (window.google?.maps?.places) return resolve()
  const check = setInterval(() => {
    if (window.google?.maps?.places) { clearInterval(check); resolve() }
  }, 100)
  setTimeout(() => clearInterval(check), 10000)
})

export default function CityInput({value,onChange,onSelect,placeholder,c}){
  const wrapRef=useRef(null);
  const inputRef=useRef(null);
  const acRef=useRef(null);

  // Create input outside React to avoid removeChild conflict
  useEffect(()=>{
    if(!wrapRef.current)return;
    const input=document.createElement('input');
    input.placeholder=placeholder||'';
    input.value=value||'';
    input.style.cssText=`background:${c.CARD};border:1px solid ${c.BD};border-radius:10px;padding:12px 14px;color:${c.T};font-size:14px;font-family:inherit;outline:none;width:100%;box-sizing:border-box;`;
    input.addEventListener('input',()=>onChange(input.value));
    wrapRef.current.innerHTML='';
    wrapRef.current.appendChild(input);
    inputRef.current=input;

    waitForGoogle().then(()=>{
      if(!input.isConnected||acRef.current)return;
      const ac=new google.maps.places.Autocomplete(input,{
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
        input.value=label;
        onChange(label);
        onSelect({label,city,country,lat,lon,tz});
      });
      acRef.current=ac;
    });

    return()=>{
      // Clean up pac-container elements Google leaves behind
      document.querySelectorAll('.pac-container').forEach(el=>el.remove());
    };
  },[]);

  // Sync value from parent
  useEffect(()=>{
    if(inputRef.current&&value!==undefined)inputRef.current.value=value;
  },[value]);

  return <div ref={wrapRef} style={{position:'relative'}}/>;
}

// ─── MAP MODAL ────────────────────────────────────────
