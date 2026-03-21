import React, { useRef, useEffect } from 'react'
import { Card } from './ui.jsx'

export default function RouteMap({stops,c}){
  const mapRef=useRef(null);const lmap=useRef(null);
  const valid=stops.filter(s=>s.lat&&s.lng);
  useEffect(()=>{if(!mapRef.current||lmap.current)return;const center=valid[0]?[valid[0].lat,valid[0].lng]:[40.4168,-3.7038];lmap.current=L.map(mapRef.current,{center,zoom:valid.length?13:5});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(lmap.current);valid.forEach((s,i)=>{const icon=L.divIcon({html:`<div style="background:#CDFF6C;color:#0A0A0A;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">${i+1}</div>`,iconSize:[28,28],className:''});L.marker([s.lat,s.lng],{icon}).addTo(lmap.current).bindPopup(`<b>${s.name||'Parada '+(i+1)}</b>`);});if(valid.length>1){const lls=valid.map(s=>[s.lat,s.lng]);L.polyline(lls,{color:'#CDFF6C',weight:2,opacity:.7,dashArray:'8 4'}).addTo(lmap.current);lmap.current.fitBounds(lls,{padding:[30,30]});}},[]);
  if(valid.length===0)return<Card c={c} style={{textAlign:'center',padding:'24px'}}><div style={{fontSize:'28px',marginBottom:'8px'}}>🗺️</div><div style={{color:c.M2,fontSize:'13px'}}>Busca los lugares en el mapa para verlos aquí</div></Card>;
  return<div ref={mapRef} style={{height:'300px',borderRadius:'12px',overflow:'hidden'}}/>;
}

// ─── WEATHER WIDGET ───────────────────────────────────
