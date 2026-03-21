export const generateICS=(plan,lang)=>{
  const d=plan.confirmedDate;if(!d)return;
  const isEs=lang==='es';
  const dt=d.replace(/-/g,'');
  const time=plan.times?.[d]?.[0];
  let dtStart,dtEnd;
  if(time){
    const[hh,mm]=time.split(':');
    const pad=n=>n.toString().padStart(2,'0');
    dtStart=`${dt}T${pad(hh)}${pad(mm||'00')}00`;
    dtEnd=`${dt}T${pad(parseInt(hh)+2)}${pad(mm||'00')}00`;
  }else{dtStart=dt;dtEnd=dt;}
  const loc=(plan.stops||[]).filter(s=>s.address||s.name).map(s=>s.name||(s.address||'')).join(' \u2192 ');
  const desc=isEs
    ?`Plan creado con queda. \u2014 queda.app\\nC\u00f3digo: ${plan.id}${plan.desc?'\\n'+plan.desc:''}`
    :`Plan created with queda. \u2014 queda.app\\nCode: ${plan.id}${plan.desc?'\\n'+plan.desc:''}`;
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//queda//queda.app//EN','BEGIN:VEVENT',`UID:${plan.id}@queda.app`,`SUMMARY:${plan.name}`,`DTSTART${time?'':';VALUE=DATE'}:${dtStart}`,`DTEND${time?'':';VALUE=DATE'}:${dtEnd}`,`DESCRIPTION:${desc}`,loc?`LOCATION:${loc}`:'','END:VEVENT','END:VCALENDAR'].filter(x=>x).join('\\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${plan.name.replace(/[^a-z0-9]/gi,'_')}.ics`;a.click();
  URL.revokeObjectURL(url);
};
