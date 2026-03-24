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
      if(google.maps.importLibrary)await google.maps.importLibrary('maps');
      if(google.maps.importLibrary)await google.maps.importLibrary('geometry');

      const map=new google.maps.Map(mapDiv,{
        disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'
      });
      mapRef.current=map;

      const bounds=new google.maps.LatLngBounds();
      let venueIdx=0;
      valid.forEach((s)=>{
        const pos={lat:s.lat,lng:s.lng};
        bounds.extend(pos);
        const isMp=s.isMeetingPoint;
        if(!isMp)venueIdx++;
        const marker=new google.maps.Marker({position:pos,map,label:{text:isMp?'0':String(venueIdx),color:isMp?'#fff':'#0A0A0A',fontWeight:'800',fontSize:'12px'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:isMp?12:16,fillColor:isMp?'#f59e0b':'#CDFF6C',fillOpacity:1,strokeColor:isMp?'#d97706':'#9ABF50',strokeWeight:2},title:s.name||''});
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
              // Decode overview_polyline for the smoothest route line
              let path;
              try{
                const encoded=result.routes[0].overview_polyline;
                path=google.maps.geometry.encoding.decodePath(encoded);
              }catch(decodeErr){
                // Fallback: extract points from steps
                path=[];
                result.routes[0].legs.forEach(leg=>{
                  leg.steps.forEach(step=>{
                    step.path?.forEach(p=>path.push(p));
                  });
                });
              }
              if(path&&path.length>0){
                polyRef.current=new google.maps.Polyline({path,map,strokeColor:'#CDFF6C',strokeOpacity:0.9,strokeWeight:4});
              }
            }else{
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
      if(mapDiv.parentNode)mapDiv.parentNode.removeChild(mapDiv);
    };
  },[stops]);

  if(valid.length===0)return<div style={{textAlign:'center',padding:'20px',color:c?.M2,fontSize:'13px'}}>📍</div>;
  return<div ref={containerRef} style={{border:`1px solid ${c?.BD}`,borderRadius:'12px',overflow:'hidden'}}/>;
}
