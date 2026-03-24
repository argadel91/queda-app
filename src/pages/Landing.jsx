import React, { useState } from 'react'
import T from '../constants/translations.js'

export default function Landing({onGetStarted, c, lang, onLangChange}){
  const t=T[lang];
  const FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};
  const LANGS=['es','en','pt','fr','de','it'];
  const[langOpen,setLangOpen]=useState(false);

  const hero={
    es:['Crea tu plan','en menos de 1 minuto.'],
    en:['Create your plan','in less than 1 minute.'],
    pt:['Cria o teu plano','em menos de 1 minuto.'],
    fr:['Crée ton plan','en moins d\'1 minute.'],
    de:['Erstelle deinen Plan','in unter 1 Minute.'],
    it:['Crea il tuo piano','in meno di 1 minuto.'],
  };
  const steps={
    es:[{e:'📅',l:'Elige una fecha'},{e:'🕐',l:'Elige una hora'},{e:'📍',l:'Elige un lugar'},{e:'📨',l:'Comparte el código'}],
    en:[{e:'📅',l:'Pick a date'},{e:'🕐',l:'Pick a time'},{e:'📍',l:'Pick a place'},{e:'📨',l:'Share the code'}],
    pt:[{e:'📅',l:'Escolhe uma data'},{e:'🕐',l:'Escolhe uma hora'},{e:'📍',l:'Escolhe um local'},{e:'📨',l:'Partilha o código'}],
    fr:[{e:'📅',l:'Choisis une date'},{e:'🕐',l:'Choisis une heure'},{e:'📍',l:'Choisis un lieu'},{e:'📨',l:'Partage le code'}],
    de:[{e:'📅',l:'Wähle ein Datum'},{e:'🕐',l:'Wähle eine Uhrzeit'},{e:'📍',l:'Wähle einen Ort'},{e:'📨',l:'Teile den Code'}],
    it:[{e:'📅',l:'Scegli una data'},{e:'🕐',l:'Scegli un orario'},{e:'📍',l:'Scegli un luogo'},{e:'📨',l:'Condividi il codice'}],
  };
  const h=hero[lang]||hero.en;
  const st=steps[lang]||steps.en;

  return(<div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif",display:'flex',flexDirection:'column'}} onClick={()=>setLangOpen(false)}>
    {/* Nav */}
    <div style={{padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',maxWidth:'500px',width:'100%',margin:'0 auto'}}>
      <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',letterSpacing:'-.02em'}}>queda<span style={{color:c.A}}>.</span></div>
      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
        <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setLangOpen(o=>!o)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',gap:'4px',color:c.T,fontFamily:'inherit'}}>{FLAGS[lang]} <span style={{fontSize:'10px',color:c.M}}>▾</span></button>
          {langOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'120px'}}>
            {LANGS.map(l=><button key={l} onClick={()=>{onLangChange(l);setLangOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'10px 14px',background:l===lang?`${c.A}15`:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontSize:'13px',color:l===lang?c.A:c.T,fontWeight:l===lang?'700':'400',textAlign:'left',fontFamily:'inherit'}}>{FLAGS[l]}</button>)}
          </div>}
        </div>
        <button onClick={onGetStarted} style={{background:'transparent',border:`1px solid ${c.A}`,borderRadius:'8px',padding:'6px 16px',color:c.A,cursor:'pointer',fontSize:'13px',fontWeight:'600',fontFamily:'inherit'}}>{t.landingSignIn||'Sign in'}</button>
      </div>
    </div>

    {/* Content */}
    <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',maxWidth:'500px',width:'100%',margin:'0 auto',padding:'0 24px'}}>
      {/* Hero */}
      <div style={{textAlign:'center',marginBottom:'48px'}}>
        <h1 style={{fontFamily:"'Syne',serif",fontSize:'48px',fontWeight:'800',lineHeight:1.05,marginBottom:'14px',letterSpacing:'-.03em'}}>{t.landingHero1||'Group plans,'}<br/><span style={{color:c.A}}>{t.landingHero2||'zero chaos.'}</span></h1>
        <p style={{fontSize:'16px',color:c.M2,lineHeight:1.7,marginBottom:'28px'}}>{h[0]} {h[1]}</p>
        <button onClick={onGetStarted} style={{padding:'16px 40px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>{t.landingCTA2||'Get started'}</button>
      </div>

      {/* 4 steps — compact row */}
      <div style={{display:'flex',gap:'6px',marginBottom:'32px'}}>
        {st.map((s,i)=><div key={i} style={{flex:1,textAlign:'center',padding:'10px 4px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px'}}>
          <div style={{fontSize:'18px',marginBottom:'2px'}}>{s.e}</div>
          <div style={{fontSize:'10px',fontWeight:'600',color:c.T}}>{s.l}</div>
        </div>)}
      </div>
    </div>

    {/* Footer */}
    <div style={{padding:'16px 24px',textAlign:'center',fontSize:'12px',color:c.M}}>
      queda.
    </div>
  </div>);
}
