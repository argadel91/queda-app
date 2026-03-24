import React, { useState, useRef } from 'react'
import { getCityTz } from '../constants/weather.js'

const getPlacesLib = async () => {
  if (window.__loadGoogleMaps) window.__loadGoogleMaps()
  if (!window.google?.maps) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => clearInterval(check), 10000)
    })
  }
  if(google.maps.importLibrary)return google.maps.importLibrary('places')
  return Promise.resolve()
}

export default function CityInput({value,onChange,onSelect,placeholder,c}){
  const[results,setResults]=useState([]);
  const[open,setOpen]=useState(false);
  const debRef=useRef(null);

  const search=async(q)=>{
    if(debRef.current)clearTimeout(debRef.current);
    if(!q||q.length<2){setResults([]);setOpen(false);return;}
    debRef.current=setTimeout(async()=>{
      try{
        const{Place}=await getPlacesLib();
        const{places}=await Place.searchByText({textQuery:q,fields:['displayName','formattedAddress','location','addressComponents'],includedType:'locality',maxResultCount:5});
        if(places?.length){
          const cities=places.map(p=>({
            name:p.displayName||'',
            country:p.addressComponents?.find(c=>c.types?.includes('country'))?.longText||'',
            lat:p.location?.lat(),
            lng:p.location?.lng()
          }));
          setResults(cities);
          setOpen(true);
        }else{setResults([]);setOpen(false);}
      }catch{
        // Fallback to legacy textSearch if new API not available
        try{
          const div=document.createElement('div');
          const service=new google.maps.places.PlacesService(div);
          service.textSearch({query:q+' city'},(res,status)=>{
            if(status==='OK'&&res){
              const cities=res.slice(0,5).map(r=>{
                const addr=r.formatted_address||'';
                const country=addr.split(',').pop()?.trim()||'';
                return{name:r.name||'',country,lat:r.geometry.location.lat(),lng:r.geometry.location.lng()};
              });
              setResults(cities);setOpen(cities.length>0);
            }else{setResults([]);setOpen(false);}
          });
        }catch{setResults([]);setOpen(false);}
      }
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
