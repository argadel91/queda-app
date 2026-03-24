import T from '../constants/translations.js'

export const generateICS=(plan,lang)=>{
  const d=plan.confirmedDate;if(!d)return;
  const t=T[lang];
  const dt=d.replace(/-/g,'');
  const time=plan.confirmedStartTime||plan.startTimes?.[0]||null;
  let dtStart,dtEnd;
  if(time){
    const[hh,mm]=(time||'').split(':');
    const pad=n=>String(n).padStart(2,'0');
    dtStart=`${dt}T${pad(hh)}${pad(mm||'00')}00`;
    dtEnd=`${dt}T${pad(parseInt(hh)+2)}${pad(mm||'00')}00`;
  }else{dtStart=dt;dtEnd=dt;}
  const loc=(plan.stops||[]).filter(s=>(s.options?.[0]||s).address||(s.options?.[0]||s).name).map(s=>{const o=s.options?.[0]||s;return o.name||(o.address||'');}).join(' \u2192 ');
  const desc=`${t.icsDesc||'Plan created with queda.'} \u2014 queda.app\r\n${t.icsCode||'Code'}: ${plan.id}${plan.desc?'\r\n'+plan.desc:''}`;
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//queda//queda.app//EN','BEGIN:VEVENT',`UID:${plan.id}@queda.app`,`SUMMARY:${plan.name||'queda.'}`,`DTSTART${time?'':';VALUE=DATE'}:${dtStart}`,`DTEND${time?'':';VALUE=DATE'}:${dtEnd}`,`DESCRIPTION:${desc}`,loc?`LOCATION:${loc}`:'','END:VEVENT','END:VCALENDAR'].filter(x=>x).join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${(plan.name||'plan').replace(/[^a-z0-9]/gi,'_')}.ics`;a.click();
  URL.revokeObjectURL(url);
};
