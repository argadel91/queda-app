import React, { useState } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { Back } from '../components/ui.jsx'

const TEMPLATES={
  social:[
    {k:'dinner',emoji:'🍕',data:{stops:[{id:1,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null}],dressCode:'casual'}},
    {k:'party',emoji:'🎉',data:{dressCode:'party',bring:[{id:1,text:'drinks'}]}},
    {k:'sport',emoji:'⚽',data:{dressCode:'sport'}},
    {k:'trip',emoji:'🏖️',data:{stops:[{id:1,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null},{id:2,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null}],bring:[{id:1,text:'sunscreen'}]}},
  ],
  intimate:[
    {k:'date',emoji:'🍷',data:{stops:[{id:1,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null}]}},
    {k:'home',emoji:'🏠',data:{stops:[]}},
    {k:'getaway',emoji:'🌄',data:{stops:[{id:1,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null},{id:2,name:'',cat:0,address:'',cost:'',link:'',lat:null,lng:null}]}},
  ],
  professional:[
    {k:'meeting',emoji:'📋',data:{customRoles:['Organizador','Asistente']}},
    {k:'training',emoji:'🎓',data:{customRoles:['Profesor','Alumno']}},
    {k:'event',emoji:'🤝',data:{customRoles:['Organizador','Ponente','Asistente']}},
  ],
};

export default function ModeSelect({onSelect,onBack,c,lang}){
  const t=T[lang];
  const[selMode,setSelMode]=useState(null);
  if(selMode){
    const mc=getMC(selMode,c);const tpls=TEMPLATES[selMode]||[];
    return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
      <Back onClick={()=>setSelMode(null)} label={t.back} c={c}/>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.tplTitle||'Quick start'}</h2>
      <p style={{color:c.M2,fontSize:'13px',marginBottom:'24px'}}>{t.tplSub||'Choose a template or start from scratch.'}</p>
      {tpls.map(tp=>{const tpl=t.tpls?.[tp.k];return(
        <div key={tp.k} onClick={()=>onSelect(selMode,tp.data)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'18px 20px',marginBottom:'10px',cursor:'pointer',display:'flex',alignItems:'center',gap:'14px'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=mc+'80';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=c.BD;}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',background:`${mc}20`,border:`1.5px solid ${mc}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{tp.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'15px',fontWeight:'700',color:c.T}}>{tpl?.n||tp.k}</div>
            <div style={{fontSize:'12px',color:c.M2,marginTop:'2px'}}>{tpl?.d||''}</div>
          </div>
          <span style={{color:c.M2,fontSize:'18px',flexShrink:0}}>→</span>
        </div>);
      })}
      <div onClick={()=>onSelect(selMode,null)} style={{background:'transparent',border:`1px dashed ${c.BD}`,borderRadius:'16px',padding:'16px 20px',marginTop:'6px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=mc+'80';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=c.BD;}}>
        <span style={{fontSize:'14px',fontWeight:'600',color:c.M2}}>{t.tplScratch||'Start from scratch'}</span>
      </div>
    </div>);
  }
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'6px'}}>{t.modeQ}</h2>
    <p style={{color:c.M2,fontSize:'13px',marginBottom:'24px'}}>{t.modeSubQ}</p>
    {['social','intimate','professional'].map(mk=>{const m=t.modes[mk];const col=getMC(mk,c);return(
      <div key={mk} onClick={()=>setSelMode(mk)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'20px',marginBottom:'12px',cursor:'pointer',position:'relative',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=col+'80';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=c.BD;}}>
        <div style={{position:'absolute',top:0,left:0,width:'4px',height:'100%',background:col}}/>
        <div style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'12px',background:`${col}20`,border:`1.5px solid ${col}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{m.label.split(' ')[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'17px',fontWeight:'700',color:c.T,marginBottom:'2px'}}>{m.label}</div>
            <div style={{fontSize:'12px',color:c.M2,marginBottom:'8px'}}>{m.vibe}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>{m.ex.map((ex,i)=><span key={i} style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',background:c.CARD2,color:c.M2,border:`1px solid ${c.BD}`}}>{ex}</span>)}</div>
          </div>
          <span style={{color:c.M2,fontSize:'20px',flexShrink:0}}>→</span>
        </div>
      </div>);
    })}
  </div>);
}

// ─── HOME ─────────────────────────────────────────────
