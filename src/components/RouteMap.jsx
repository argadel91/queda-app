import React, { useEffect, useRef } from 'react'

const loadGM = () => {
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
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const markersRef=useRef([]);
  const polyRef=useRef(null);
  const dirRendererRef=useRef(null);
  const valid=stops.filter(s=>s.lat&&s.lng);

  useEffect(()=>{
    if(valid.length===0||!containerRef.current)return;
    let cancelled=false;

    // Create map div outside React
    const mapDiv=document.createElement('div');
    mapDiv.style.cssText='width:100%;height:280px;border-radius:12px;overflow:hidden;';
    containerRef.current.innerHTML='';
    containerRef.current.appendChild(mapDiv);

    loadGM().then(async()=>{
      if(cancelled)return;
      await google.maps.importLibrary('maps');
      await google.maps.importLibrary('marker');

      const map=new google.maps.Map(mapDiv,{
        disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'
      });
      mapRef.current=map;

      const bounds=new google.maps.LatLngBounds();
      valid.forEach((s,i)=>{
        const pos={lat:s.lat,lng:s.lng};
        bounds.extend(pos);
        // Create label element for AdvancedMarkerElement
        const label=document.createElement('div');
        label.style.cssText='width:28px;height:28px;border-radius:50%;background:#CDFF6C;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0A0A0A;';
        label.textContent=String(i+1);
        const marker=new google.maps.marker.AdvancedMarkerElement({position:pos,map,content:label});
        markersRef.current.push(marker);
      });

      if(valid.length>1){
        try{
          const directionsService=new google.maps.DirectionsService();
          const waypoints=valid.slice(1,-1).map(s=>({location:new google.maps.LatLng(s.lat,s.lng),stopover:true}));
          directionsService.route({
            origin:new google.maps.LatLng(valid[0].lat,valid[0].lng),
            destination:new google.maps.LatLng(valid[valid.length-1].lat,valid[valid.length-1].lng),
            waypoints,
            travelMode:google.maps.TravelMode.DRIVING
          },(result,status)=>{
            if(status==='OK'&&result.routes?.length){
              // Extract all points from the route and draw as polyline
              const path=[];
              result.routes[0].legs.forEach(leg=>{
                leg.steps.forEach(step=>{
                  step.path?.forEach(p=>path.push(p));
                });
              });
              if(path.length>0){
                polyRef.current=new google.maps.Polyline({path,map,strokeColor:'#CDFF6C',strokeOpacity:0.9,strokeWeight:4});
              }
            }else{
              console.log('Directions failed:',status);
              polyRef.current=new google.maps.Polyline({
                path:valid.map(s=>({lat:s.lat,lng:s.lng})),map,
                strokeColor:'#CDFF6C',strokeOpacity:0.5,strokeWeight:2,geodesic:true
              });
            }
          });
        }catch(e){
          polyRef.current=new google.maps.Polyline({
            path:valid.map(s=>({lat:s.lat,lng:s.lng})),map,
            strokeColor:'#CDFF6C',strokeOpacity:0.5,strokeWeight:2,geodesic:true
          });
        }
      }
      map.fitBounds(bounds,{top:30,right:30,bottom:30,left:30});
      if(valid.length===1)setTimeout(()=>map.setZoom(15),200);
    });

    return()=>{
      cancelled=true;
      markersRef.current.forEach(m=>{if(m.map)m.map=null;});
      markersRef.current=[];
      if(polyRef.current){polyRef.current.setMap(null);polyRef.current=null;}
      if(dirRendererRef.current){dirRendererRef.current.setMap(null);dirRendererRef.current=null;}
      if(mapDiv.parentNode)mapDiv.parentNode.removeChild(mapDiv);
    };
  },[stops]);

  if(valid.length===0)return<div style={{textAlign:'center',padding:'20px',color:c?.M2,fontSize:'13px'}}>No map locations set</div>;
  return<div ref={containerRef} style={{border:`1px solid ${c?.BD}`,borderRadius:'12px',overflow:'hidden'}}/>;
}
