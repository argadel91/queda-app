import React, { useState } from 'react'
import T from '../constants/translations.js'
import { Btn } from './ui.jsx'
import { getTzLabel } from '../constants/weather.js'

export default function TimePicker({times,onChange,c,lang,tz}){
  const[h,setH]=useState('20');const[m,setM]=useState('00');
  const add=()=>{const v=`${h}:${m}`;if(!times.includes(v))onChange([...times,v].sort());};
  const ss={background:c.CARD,border:`1px solid ${c.BD}`,color:c.T,fontSize:'14px',padding:'10px 12px',borderRadius:'10px',width:'100%',fontFamily:'inherit'};
  return(<div>
    <div style={{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'8px'}}>
      <div style={{flex:1}}><select value={h} onChange={e=>setH(e.target.value)} style={ss}>{Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(hh=><option key={hh} value={hh}>{hh}h</option>)}</select></div>
      <div style={{flex:1}}><select value={m} onChange={e=>setM(e.target.value)} style={ss}>{['00','15','30','45'].map(mm=><option key={mm} value={mm}>:{mm}</option>)}</select></div>
      <Btn onClick={add} sm c={c}>{T[lang].addTime}</Btn>
    </div>
    {tz&&<div style={{fontSize:'12px',color:c.M2,marginBottom:'6px'}}>🌍 {getTzLabel(tz)}</div>}
    {times.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
      {times.map(hh=><span key={hh} onClick={()=>onChange(times.filter(x=>x!==hh))} style={{fontSize:'12px',padding:'5px 11px',borderRadius:'20px',border:`1px solid ${c.A}50`,background:`${c.A}15`,color:c.A,cursor:'pointer',fontWeight:'600'}}>{hh} ×</span>)}
    </div>}
  </div>);
}

// ─── CITY AUTOCOMPLETE ────────────────────────────────
