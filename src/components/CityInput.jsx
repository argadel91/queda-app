import React, { useState, useRef } from 'react'
import { getCityTz } from '../constants/weather.js'

export default function CityInput({value,onChange,onSelect,placeholder,c}){
  const[res,setRes]=useState([]);const[open,setOpen]=useState(false);const[ldg,setL]=useState(false);
  const deb=useRef(null);
  const search=q=>{if(deb.current)clearTimeout(deb.current);if(q.length<2){setRes([]);setOpen(false);return;}deb.current=setTimeout(async()=>{setL(true);try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&featuretype=settlement`).then(x=>x.json());setRes(r.slice(0,6));setOpen(r.length>0);}catch{}setL(false);},400);};
  const pick=r=>{const city=r.address?.city||r.address?.town||r.address?.village||r.address?.county||r.display_name.split(',')[0];const country=r.address?.country||'';const label=`${city}${country?', '+country:''}`.trim();const tz=getCityTz(city);onChange(label);onSelect({label,city,country,lat:parseFloat(r.lat),lon:parseFloat(r.lon),tz});setOpen(false);setRes([]);};
  return(<div style={{position:'relative'}}>
    <div style={{position:'relative'}}>
      <input value={value} onChange={e=>{onChange(e.target.value);search(e.target.value);}} onFocus={()=>res.length>0&&setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder={placeholder} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
      {ldg&&<div style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',color:c.M}}>...</div>}
    </div>
    {open&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:50,overflow:'hidden',marginTop:'4px'}}>
      {res.map((r,i)=>{const city=r.address?.city||r.address?.town||r.address?.village||r.display_name.split(',')[0];const country=r.address?.country||'';const state=r.address?.state||'';const dispName=r.address?.city||r.address?.town||r.address?.village||r.address?.county||r.display_name.split(',')[0];const dispCountry=r.address?.country||'';const dispState=r.address?.state||r.address?.county||'';return(<div key={i} onMouseDown={()=>pick(r)} style={{padding:'12px 14px',cursor:'pointer',borderBottom:i<res.length-1?`1px solid ${c.BD}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{dispName}</div><div style={{fontSize:'12px',color:c.M2,display:'flex',gap:'4px',alignItems:'center'}}>{dispCountry&&<span style={{background:c.BD,padding:'1px 6px',borderRadius:'10px',fontSize:'11px'}}>{dispCountry}</span>}{dispState&&<span>{dispState}</span>}</div></div>);})}
    </div>}
  </div>);
}

// ─── MAP MODAL ────────────────────────────────────────
