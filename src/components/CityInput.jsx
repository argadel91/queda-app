import React, { useState, useRef, useEffect } from 'react'
import { getCityTz } from '../constants/weather.js'

const waitForGoogle = () => new Promise(resolve => {
  if (window.google?.maps?.places) return resolve()
  const check = setInterval(() => {
    if (window.google?.maps?.places) { clearInterval(check); resolve() }
  }, 100)
  setTimeout(() => clearInterval(check), 10000)
})

export default function CityInput({value,onChange,onSelect,placeholder,c}){
  const[results,setResults]=useState([]);
  const[open,setOpen]=useState(false);
  const[ready,setReady]=useState(false);
  const debRef=useRef(null);
  const mapDiv=useRef(null);
  const serviceRef=useRef(null);

  useEffect(()=>{
    // Create a hidden div for PlacesService (requires a map or div)
    const div=document.createElement('div');
    mapDiv.current=div;
    waitForGoogle().then(()=>{
      serviceRef.current=new google.maps.places.PlacesService(div);
      setReady(true);
    });
  },[]);

  const search=(q)=>{
    if(debRef.current)clearTimeout(debRef.current);
    if(!q||q.length<2||!serviceRef.current){setResults([]);setOpen(false);return;}
    debRef.current=setTimeout(()=>{
      serviceRef.current.textSearch({query:q+' city',type:'locality'},(res,status)=>{
        if(status==='OK'&&res){
          const cities=res.slice(0,5).map(r=>{
            const name=r.name||'';
            const addr=r.formatted_address||'';
            const parts=addr.split(',').map(s=>s.trim());
            const country=parts[parts.length-1]||'';
            return{name,country,addr,lat:r.geometry.location.lat(),lng:r.geometry.location.lng()};
          });
          setResults(cities);
          setOpen(cities.length>0);
        }else{setResults([]);setOpen(false);}
      });
    },300);
  };

  const pick=(r)=>{
    const label=`${r.name}${r.country?', '+r.country:''}`.trim();
    const tz=getCityTz(r.name);
    onChange(label);
    onSelect({label,city:r.name,country:r.country,lat:r.lat,lon:r.lng,tz});
    setOpen(false);setResults([]);
  };

  return(<div style={{position:'relative'}}>
    <input value={value} onChange={e=>{onChange(e.target.value);search(e.target.value);}} onFocus={()=>results.length>0&&setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder={placeholder} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
    {open&&<div style={{position:'absolute',top:'100%',left:0,right:0,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:50,overflow:'hidden',marginTop:'4px'}}>
      {results.map((r,i)=><div key={i} onMouseDown={()=>pick(r)} style={{padding:'12px 14px',cursor:'pointer',borderBottom:i<results.length-1?`1px solid ${c.BD}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{r.name}</div>
        <div style={{fontSize:'12px',color:c.M2}}>{r.country}</div>
      </div>)}
    </div>}
  </div>);
}

// ─── MAP MODAL ────────────────────────────────────────
