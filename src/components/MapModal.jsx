import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'

const getGoogleLibs = async () => {
  if (!window.google?.maps) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => clearInterval(check), 10000)
    })
  }
  await google.maps.importLibrary('maps')
  await google.maps.importLibrary('places')
}

export default function MapModal({onSelect,onClose,c,lang,init}){
  const t=T[lang];
  const containerRef=useRef(null);
  const mapDivRef=useRef(null);
  const markerRef=useRef(null);
  const inputRef=useRef(null);
  const mapObjRef=useRef(null);
  const[selected,setSelected]=useState(null);
  const[loading,setLoading]=useState(true);
  const[results,setResults]=useState([]);

  // Create map div outside React and init Google Maps
  useEffect(()=>{
    let cancelled=false;
    const mapDiv=document.createElement('div');
    mapDiv.style.cssText='flex:1;width:100%;';
    mapDivRef.current=mapDiv;

    getGoogleLibs().then(()=>{
      if(cancelled)return;
      if(containerRef.current){
        containerRef.current.innerHTML='';
        containerRef.current.appendChild(mapDiv);
      }
      setLoading(false);
      const map=new google.maps.Map(mapDiv,{
        center:{lat:40.4168,lng:-3.7038},
        zoom:5,
        disableDefaultUI:true,
        zoomControl:true,
        gestureHandling:'greedy'
      });
      mapObjRef.current=map;

      map.addListener('click',(e)=>{
        const lat=e.latLng.lat();const lng=e.latLng.lng();
        const geocoder=new google.maps.Geocoder();
        geocoder.geocode({location:{lat,lng}},(res,status)=>{
          if(status==='OK'&&res[0]){
            const r=res[0];
            const sel={name:r.address_components?.[0]?.long_name||'',address:r.formatted_address||'',lat,lng};
            setSelected(sel);setResults([]);
            if(inputRef.current)inputRef.current.value=r.formatted_address||'';
            if(markerRef.current)markerRef.current.setMap(null);
            markerRef.current=new google.maps.Marker({position:{lat,lng},map});
            map.panTo({lat,lng});
          }
        });
      });

      if(init){
        const geocoder=new google.maps.Geocoder();
        geocoder.geocode({address:init},(res,status)=>{
          if(status==='OK'&&res[0]){
            const loc=res[0].geometry.location;
            map.setCenter(loc);map.setZoom(13);
          }
        });
      }
    });
    return()=>{
      cancelled=true;
      if(markerRef.current)markerRef.current.setMap(null);
      if(mapDiv.parentNode)mapDiv.parentNode.removeChild(mapDiv);
    };
  },[]);

  const searchPlaces=async(query)=>{
    if(!query?.trim())return;
    try{
      const{Place}=await google.maps.importLibrary('places');
      const{places}=await Place.searchByText({textQuery:query,fields:['displayName','formattedAddress','location'],maxResultCount:6});
      if(places?.length){
        setResults(places.map(p=>({name:p.displayName||'',address:p.formattedAddress||'',lat:p.location?.lat(),lng:p.location?.lng()})));
      }else{setResults([]);}
    }catch{
      try{
        const map=mapObjRef.current;
        if(!map)return;
        const service=new google.maps.places.PlacesService(map);
        service.textSearch({query,bounds:map.getBounds()},(res,status)=>{
          if(status==='OK'&&res){
            setResults(res.slice(0,6).map(r=>({name:r.name||'',address:r.formatted_address||'',lat:r.geometry.location.lat(),lng:r.geometry.location.lng()})));
          }else{setResults([]);}
        });
      }catch{setResults([]);}
    }
  };

  const handleKeyDown=(e)=>{
    if(e.key==='Enter'){e.preventDefault();searchPlaces(inputRef.current?.value);}
  };

  const pickResult=(r)=>{
    const map=mapObjRef.current;
    setSelected(r);setResults([]);
    if(inputRef.current)inputRef.current.value=r.name;
    if(map){
      map.setCenter({lat:r.lat,lng:r.lng});map.setZoom(16);
      if(markerRef.current)markerRef.current.setMap(null);
      markerRef.current=new google.maps.Marker({position:{lat:r.lat,lng:r.lng},map});
    }
  };

  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:200,display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:'8px',background:c.CARD,borderBottom:`1px solid ${c.BD}`}}>
      <div style={{flex:1,position:'relative'}}>
        <input ref={inputRef} defaultValue={init||''} onKeyDown={handleKeyDown} placeholder={t.searchPlacePh||'Search for a place... (press Enter)'} autoFocus style={{width:'100%',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 36px 10px 14px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        <button onClick={()=>{if(inputRef.current){inputRef.current.value='';setSelected(null);setResults([]);inputRef.current.focus();}}} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'16px',padding:'8px'}}>×</button>
      </div>
      <button onClick={()=>searchPlaces(inputRef.current?.value)} style={{background:c.A||'#CDFF6C',border:'none',borderRadius:'10px',padding:'8px 14px',color:'#0A0A0A',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'700'}}>🔍</button>
      <button onClick={onClose} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'8px 14px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'600'}}>✕</button>
    </div>
    {results.length>0&&<div style={{background:c.CARD,borderBottom:`1px solid ${c.BD}`,maxHeight:'240px',overflowY:'auto'}}>
      {results.map((r,i)=><div key={i} onClick={()=>pickResult(r)} style={{padding:'12px 16px',cursor:'pointer',borderBottom:i<results.length-1?`1px solid ${c.BD}`:'none'}} onMouseEnter={e=>e.currentTarget.style.background=c.CARD2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'500'}}>{r.name}</div>
        <div style={{fontSize:'12px',color:c.M2}}>{r.address}</div>
      </div>)}
    </div>}
    <div ref={containerRef} style={{flex:1,display:'flex'}}>{loading&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',color:c.M}}>...</div>}</div>
    {selected&&<div style={{padding:'14px 16px',background:c.CARD,borderTop:`1px solid ${c.BD}`,display:'flex',alignItems:'center',gap:'10px'}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.name}</div>
        <div style={{fontSize:'12px',color:c.M2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.address}</div>
      </div>
      <button onClick={()=>onSelect(selected)} style={{padding:'10px 18px',background:c.A||'#CDFF6C',color:'#0A0A0A',border:'none',borderRadius:'10px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',flexShrink:0}}>{t.selectPlace||'Select'}</button>
    </div>}
  </div>);
}
