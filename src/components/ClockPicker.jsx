import React, { useState, useRef } from 'react'
import useFocusTrap from '../hooks/useFocusTrap.js'

export default function ClockPicker({value,onChange,c,autoOpen,onClose}){
  const[open,setOpen]=useState(!!autoOpen);
  const close=()=>{setOpen(false);if(onClose)onClose();};
  const modalRef=useRef(null);
  useFocusTrap(open?modalRef:null);
  const[mode,setMode]=useState('hour'); // 'hour' or 'min'
  const[selH,setSelH]=useState(value?parseInt(value.split(':')[0]):null);
  const[selM,setSelM]=useState(value?parseInt(value.split(':')[1]):0);

  const fmt=v=>String(v).padStart(2,'0');
  const confirm=()=>{if(selH!==null){onChange(`${fmt(selH)}:${fmt(selM)}`);close();}};

  const hours=Array.from({length:24},(_,i)=>i);
  const mins=[0,5,10,15,20,25,30,35,40,45,50,55];

  // Calculate position on circle
  const pos=(val,total,radius)=>{
    const angle=((val/total)*360-90)*(Math.PI/180);
    return{x:50+radius*Math.cos(angle),y:50+radius*Math.sin(angle)};
  };

  return<div style={{position:'relative'}}>
    {!autoOpen&&<button onClick={()=>setOpen(true)} style={{width:'100%',padding:'12px 14px',background:c?.CARD,border:`1px solid ${c?.BD}`,borderRadius:'10px',color:value?c?.T:c?.M,fontSize:'15px',fontFamily:'inherit',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span>{value?`${value} (${(parseInt(value.split(':')[0])%12||12)}:${value.split(':')[1]} ${parseInt(value.split(':')[0])>=12?'PM':'AM'})`:'--:--'}</span>
      <span style={{fontSize:'18px'}}>🕐</span>
    </button>}

    {open&&<div role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape')close();}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>close()}>
      <div ref={modalRef} onClick={e=>e.stopPropagation()} style={{background:c?.CARD||'#1A1A1A',borderRadius:'20px',padding:'24px',width:'100%',maxWidth:'300px'}}>
        {/* Display */}
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'4px',marginBottom:'20px'}}>
          <button onClick={()=>setMode('hour')} style={{fontSize:'36px',fontWeight:'800',fontFamily:'monospace',background:'none',border:'none',color:mode==='hour'?c?.A||'#CDFF6C':c?.M||'#666',cursor:'pointer',padding:'4px 8px',borderRadius:'8px'}}>{selH!==null?fmt(selH):'--'}</button>
          <span style={{fontSize:'36px',fontWeight:'800',color:c?.M||'#666'}}>:</span>
          <button onClick={()=>setMode('min')} style={{fontSize:'36px',fontWeight:'800',fontFamily:'monospace',background:'none',border:'none',color:mode==='min'?c?.A||'#CDFF6C':c?.M||'#666',cursor:'pointer',padding:'4px 8px',borderRadius:'8px'}}>{fmt(selM)}</button>
          {selH!==null&&<span style={{fontSize:'14px',color:c?.M2||'#888',marginLeft:'8px',fontWeight:'600'}}>{(selH%12||12)}:{fmt(selM)} {selH>=12?'PM':'AM'}</span>}
        </div>

        {/* Clock face */}
        <div style={{position:'relative',width:'220px',height:'220px',margin:'0 auto',marginBottom:'16px'}}>
          <svg viewBox="0 0 100 100" style={{width:'100%',height:'100%'}}>
            <circle cx="50" cy="50" r="48" fill={c?.CARD2||'#111'} stroke={c?.BD||'#333'} strokeWidth="0.5"/>
            {/* Hand line */}
            {(()=>{
              const val=mode==='hour'?selH:selM;
              const total=mode==='hour'?24:60;
              if(val===null)return null;
              // For 24h: inner ring 12-23, outer ring 0-11
              const radius=mode==='hour'?(val>=12?28:38):38;
              const p=pos(mode==='hour'?(val%12):val/5*1,mode==='hour'?12:12,radius);
              return<line x1="50" y1="50" x2={p.x} y2={p.y} stroke={c?.A||'#CDFF6C'} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>;
            })()}
          </svg>

          {/* Hour numbers */}
          {mode==='hour'&&<>
            {/* Outer ring: 0-11 */}
            {hours.filter(h=>h<12).map(h=>{
              const p=pos(h,12,38);
              const sel=selH===h;
              return<div key={h} onClick={()=>{setSelH(h);setMode('min');}} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:sel?'800':'500',background:sel?c?.A||'#CDFF6C':'transparent',color:sel?'#0A0A0A':c?.T||'#fff',cursor:'pointer'}}>{h}</div>;
            })}
            {/* Inner ring: 12-23 */}
            {hours.filter(h=>h>=12).map(h=>{
              const p=pos(h-12,12,25);
              const sel=selH===h;
              return<div key={h} onClick={()=>{setSelH(h);setMode('min');}} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:sel?'800':'400',background:sel?c?.A||'#CDFF6C':'transparent',color:sel?'#0A0A0A':c?.M2||'#888',cursor:'pointer'}}>{h}</div>;
            })}
          </>}

          {/* Minute numbers */}
          {mode==='min'&&mins.map(m=>{
            const p=pos(m/5,12,38);
            const sel=selM===m;
            return<div key={m} onClick={()=>setSelM(m)} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:sel?'800':'500',background:sel?c?.A||'#CDFF6C':'transparent',color:sel?'#0A0A0A':c?.T||'#fff',cursor:'pointer'}}>{fmt(m)}</div>;
          })}
        </div>

        {/* Buttons */}
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>close()} style={{flex:1,padding:'12px',background:c?.CARD2||'#222',border:`1px solid ${c?.BD||'#333'}`,borderRadius:'10px',color:c?.T||'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:'14px'}}>✕</button>
          <button onClick={confirm} disabled={selH===null} style={{flex:2,padding:'12px',background:selH!==null?c?.A||'#CDFF6C':'#333',border:'none',borderRadius:'10px',color:'#0A0A0A',cursor:selH!==null?'pointer':'not-allowed',fontFamily:'inherit',fontSize:'14px',fontWeight:'700',opacity:selH===null?.4:1}}>✓ {selH!==null?`${fmt(selH)}:${fmt(selM)}`:''}</button>
        </div>
      </div>
    </div>}
  </div>;
}
