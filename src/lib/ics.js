import T from '../constants/translations.js'

const calcDurationMins=(plan)=>{
  const stop=plan.stops?.[0];
  const dur=stop?.duration;
  if(!dur)return 120;
  if(dur==='30min')return 30;if(dur==='1h')return 60;if(dur==='1h30')return 90;
  if(dur==='2h')return 120;if(dur==='3h')return 180;if(dur==='4h+')return 240;
  return 120;
};

export const generateICS=(plan,lang)=>{
  const d=plan.confirmedDate;if(!d)return;
  const t=T[lang];
  const dt=d.replace(/-/g,'');
  const time=plan.confirmedStartTime||plan.startTimes?.[0]||null;
  const durMins=calcDurationMins(plan);
  let dtStart,dtEnd;
  if(time){
    const[hh,mm]=(time||'').split(':');
    const pad=n=>String(n).padStart(2,'0');
    dtStart=`${dt}T${pad(hh)}${pad(mm||'00')}00`;
    const endDate=new Date(2000,0,1,parseInt(hh),parseInt(mm||0)+durMins);
    dtEnd=`${dt}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  }else{dtStart=dt;dtEnd=dt;}
  const loc=(plan.stops||[]).filter(s=>(s.options?.[0]||s).address||(s.options?.[0]||s).name).map(s=>{const o=s.options?.[0]||s;return o.name||(o.address||'');}).join(' \u2192 ');
  const desc=`${t.icsDesc||'Plan created with queda.'} \u2014 queda.app\r\n${t.icsCode||'Code'}: ${plan.id}${plan.desc?'\r\n'+plan.desc:''}`;
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//queda//queda.app//EN','BEGIN:VEVENT',`UID:${plan.id}@queda.app`,`SUMMARY:${plan.name||'queda.'}`,`DTSTART${time?'':';VALUE=DATE'}:${dtStart}`,`DTEND${time?'':';VALUE=DATE'}:${dtEnd}`,`DESCRIPTION:${desc}`,loc?`LOCATION:${loc}`:'','END:VEVENT','END:VCALENDAR'].filter(x=>x).join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${(plan.name||'plan').replace(/[^a-z0-9]/gi,'_')}.ics`;a.click();
  URL.revokeObjectURL(url);
};

export const generateGCalURL=(plan)=>{
  const d=plan.confirmedDate;if(!d)return null;
  const dt=d.replace(/-/g,'');
  const time=plan.confirmedStartTime||plan.startTimes?.[0]||null;
  const durMins=calcDurationMins(plan);
  let dates;
  if(time){
    const[hh,mm]=(time||'').split(':');
    const pad=n=>String(n).padStart(2,'0');
    const start=`${dt}T${pad(hh)}${pad(mm||'00')}00`;
    const endDate=new Date(2000,0,1,parseInt(hh),parseInt(mm||0)+durMins);
    const end=`${dt}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
    dates=`${start}/${end}`;
  }else{
    dates=`${dt}/${dt}`;
  }
  const loc=(plan.stops||[]).filter(s=>(s.options?.[0]||s).address||(s.options?.[0]||s).name).map(s=>{const o=s.options?.[0]||s;return o.name||(o.address||'');}).join(' \u2192 ');
  const params=new URLSearchParams({action:'TEMPLATE',text:plan.name||'queda.',dates,details:`queda.app \u2014 ${plan.id}${plan.desc?'\n'+plan.desc:''}`,location:loc});
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
