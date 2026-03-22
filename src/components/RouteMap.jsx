import React, { useEffect, useRef, useState } from 'react'

const waitForGoogle = () => {
  if (window.__loadGoogleMaps) window.__loadGoogleMaps()
  return new Promise(resolve => {
    if (window.google?.maps) return resolve()
    const check = setInterval(() => {
      if (window.google?.maps) { clearInterval(check); resolve() }
    }, 100)
    setTimeout(() => clearInterval(check), 10000)
  })
}

export default function RouteMap({stops,c}){
  const mapRef=useRef(null);
  const mapObjRef=useRef(null);
  const markersRef=useRef([]);
  const polyRef=useRef(null);
  const[ready,setReady]=useState(false);
  const valid=stops.filter(s=>s.lat&&s.lng);

  useEffect(()=>{
    let cancelled=false;
    if(valid.length===0)return;
    waitForGoogle().then(async()=>{
      if(cancelled||!mapRef.current)return;
      await google.maps.importLibrary('maps');

      if(!mapObjRef.current){
        mapObjRef.current=new google.maps.Map(mapRef.current,{
          disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'
        });
        setReady(true);
      }
      const map=mapObjRef.current;

      // Clear old markers/polyline
      markersRef.current.forEach(m=>m.setMap(null));
      markersRef.current=[];
      if(polyRef.current)polyRef.current.setMap(null);

      const bounds=new google.maps.LatLngBounds();
      valid.forEach((s,i)=>{
        const pos={lat:s.lat,lng:s.lng};
        bounds.extend(pos);
        const marker=new google.maps.Marker({
          position:pos,map,
          label:{text:String(i+1),color:'#0A0A0A',fontWeight:'800',fontSize:'12px'},
          icon:{path:google.maps.SymbolPath.CIRCLE,scale:14,fillColor:'#CDFF6C',fillOpacity:1,strokeColor:'#CDFF6C',strokeWeight:2}
        });
        markersRef.current.push(marker);
      });
      if(valid.length>1){
        polyRef.current=new google.maps.Polyline({
          path:valid.map(s=>({lat:s.lat,lng:s.lng})),map,
          strokeColor:'#CDFF6C',strokeOpacity:0.6,strokeWeight:2,geodesic:true,
          icons:[{icon:{path:'M 0,-1 0,1',strokeOpacity:1,scale:3},offset:'0',repeat:'16px'}]
        });
      }
      map.fitBounds(bounds,{top:30,right:30,bottom:30,left:30});
      if(valid.length===1)map.setZoom(15);
    });
    return()=>{cancelled=true;};
  },[stops]);

  if(valid.length===0)return<div style={{textAlign:'center',padding:'20px',color:c?.M2,fontSize:'13px'}}>No map locations set</div>;
  return<div ref={mapRef} style={{width:'100%',height:'280px',borderRadius:'12px',overflow:'hidden',border:`1px solid ${c?.BD}`}}>{!ready&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:c?.M}}>...</div>}</div>;
}
