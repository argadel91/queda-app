import React, { useEffect, useRef } from 'react'

export default function RouteMap({stops,c}){
  const mapRef=useRef(null);
  const valid=stops.filter(s=>s.lat&&s.lng);

  useEffect(()=>{
    if(!mapRef.current||!window.L||valid.length===0)return;
    const map=L.map(mapRef.current,{zoomControl:true,attributionControl:false}).setView([40,-3],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const bounds=L.latLngBounds();
    valid.forEach((s,i)=>{
      const ll=[s.lat,s.lng];
      bounds.extend(ll);
      L.marker(ll,{icon:L.divIcon({className:'',html:`<div style="width:28px;height:28px;border-radius:50%;background:#CDFF6C;border:2px solid #CDFF6C;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0A0A0A">${i+1}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);
    });
    if(valid.length>1){
      L.polyline(valid.map(s=>[s.lat,s.lng]),{color:'#CDFF6C',weight:2,opacity:0.6,dashArray:'8 8'}).addTo(map);
    }
    map.fitBounds(bounds,{padding:[30,30]});
    if(valid.length===1)map.setZoom(15);
    return()=>{map.remove();};
  },[stops]);

  if(valid.length===0)return<div style={{textAlign:'center',padding:'20px',color:c?.M2,fontSize:'13px'}}>No map locations set</div>;
  return<div ref={mapRef} style={{width:'100%',height:'280px',borderRadius:'12px',overflow:'hidden',border:`1px solid ${c?.BD}`}}/>;
}
