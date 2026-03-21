import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'

export default function MapModal({onSelect,onClose,c,lang,init=''}){
  const t=T[lang];const isEs=lang==='es';const mapRef=useRef(null);const lmap=useRef(null);const mkr=useRef(null);
  const[q,setQ]=useState(init);const[srch,setSrch]=useState(false);const[sel,setSel]=useState(null);const[results,setResults]=useState([]);
  useEffect(()=>{if(!mapRef.current||lmap.current)return;lmap.current=L.map(mapRef.current,{center:[40.4168,-3.7038],zoom:5});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(lmap.current);lmap.current.on('click',async e=>{const{lat,lng}=e.latlng;try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`).then(x=>x.json());const addr=r.display_name||'';const name=r.name||r.address?.amenity||r.address?.road||'';pickResult({name,address:addr,lat,lng});}catch{}});},[]);
  const pickResult=(s)=>{setSel(s);setResults([]);if(lmap.current){lmap.current.setView([s.lat,s.lng],16);if(mkr.current)mkr.current.remove();mkr.current=L.marker([s.lat,s.lng]).addTo(lmap.current).bindPopup(s.name||s.address).openPopup();}};
  const search=async()=>{if(!q.trim())return;setSrch(true);setResults([]);setSel(null);
    try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&accept-language=${lang}`).then(x=>x.json());
      if(r.length>0){setResults(r);// Auto-pick first result and zoom
        const{lat,lon,display_name,name,address}=r[0];const lN=parseFloat(lat),lgN=parseFloat(lon);
        lmap.current?.setView([lN,lgN],15);if(mkr.current)mkr.current.remove();
        mkr.current=L.marker([lN,lgN]).addTo(lmap.current).bindPopup(name||display_name).openPopup();
      }else{setResults([]);}
    }catch{}setSrch(false);};
  const clearSel=()=>{setSel(null);if(mkr.current){mkr.current.remove();mkr.current=null;}};
  return(<div className="map-wrap" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="map-inner">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}><span style={{fontSize:'16px',fontWeight:'600',color:'#F0EBE1'}}>{t.searchMap}</span><button onClick={onClose} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'22px'}}>×</button></div>
      <div style={{display:'flex',gap:'8px',position:'relative'}}>
        <input value={q} onChange={e=>{setQ(e.target.value);}} onKeyDown={e=>e.key==='Enter'&&search()} placeholder={lang==='es'?'Busca un restaurante, bar, dirección...':lang==='fr'?'Cherche un restaurant, bar, adresse...':lang==='de'?'Restaurant, Bar, Adresse suchen...':lang==='it'?'Cerca ristorante, bar, indirizzo...':lang==='pt'?'Procura restaurante, bar, morada...':'Search a restaurant, bar, address...'} style={{flex:1,background:'#1C1C1C',border:'1px solid #2A2A2A',borderRadius:'10px',padding:'10px 14px',color:'#F0EBE1',fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
        {q&&<button onClick={()=>{setQ('');setResults([]);setSel(null);}} style={{position:'absolute',right:'70px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'16px',padding:'4px'}}>×</button>}
        <button onClick={search} style={{background:'#CDFF6C',border:'none',borderRadius:'10px',padding:'10px 16px',color:'#0A0A0A',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>{srch?'...':t.go}</button>
      </div>
      {results.length>0&&!sel&&<div style={{background:'#1C1C1C',border:'1px solid #2A2A2A',borderRadius:'10px',maxHeight:'160px',overflowY:'auto',marginTop:'4px'}}>
        {results.map((r,i)=>{const name=r.name||r.address?.amenity||r.address?.shop||r.address?.tourism||r.display_name.split(',')[0];const addr=[r.address?.road,r.address?.city||r.address?.town,r.address?.country].filter(Boolean).join(', ');return(<div key={i} onClick={()=>pickResult({name,address:r.display_name,lat:parseFloat(r.lat),lng:parseFloat(r.lon)})} style={{padding:'10px 14px',cursor:'pointer',borderBottom:i<results.length-1?'1px solid #2A2A2A':'none',display:'flex',flexDirection:'column',gap:'2px'}} onMouseEnter={e=>e.currentTarget.style.background='#2A2A2A'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <div style={{fontSize:'13px',color:'#F0EBE1',fontWeight:'500'}}>{name}</div>
          <div style={{fontSize:'11px',color:'#888'}}>{addr}</div>
        </div>);})}
      </div>}
      <div ref={mapRef} style={{flex:1,borderRadius:'12px',overflow:'hidden',minHeight:'160px',marginTop:'8px'}}/>
      {sel&&<div style={{background:'#1C1C1C',borderRadius:'10px',padding:'12px',fontSize:'13px',color:'#F0EBE1',marginTop:'8px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
          <div style={{fontWeight:'600',flex:1}}>{sel.name||sel.address}</div>
          <button onClick={clearSel} style={{background:'none',border:'1px solid #555',borderRadius:'6px',color:'#888',cursor:'pointer',fontSize:'12px',padding:'2px 8px',marginLeft:'8px',flexShrink:0}}>{lang==='es'?'Cambiar':lang==='fr'?'Changer':lang==='de'?'Ändern':lang==='it'?'Cambia':lang==='pt'?'Alterar':'Change'}</button>
        </div>
        <div style={{color:'#888',fontSize:'11px',marginBottom:'10px'}}>{sel.address}</div>
        <button onClick={()=>onSelect(sel)} style={{width:'100%',background:'#CDFF6C',border:'none',borderRadius:'10px',padding:'11px',color:'#0A0A0A',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'14px'}}>✓ {lang==='es'?'Seleccionar este lugar':lang==='fr'?'Sélectionner ce lieu':lang==='de'?'Diesen Ort wählen':lang==='it'?'Seleziona questo luogo':lang==='pt'?'Selecionar este local':'Select this place'}</button>
      </div>}
    </div>
  </div>);
}

// ─── ROUTE MAP ────────────────────────────────────────
