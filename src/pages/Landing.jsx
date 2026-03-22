import React, { useState } from 'react'
import T from '../constants/translations.js'

export default function Landing({onGetStarted, c, lang, onLangChange}){
  const t=T[lang];
  const FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};
  const LANGS=['es','en','pt','fr','de','it'];
  const[langOpen,setLangOpen]=useState(false);

  return(<div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}} onClick={()=>setLangOpen(false)}>
    {/* Nav */}
    <div style={{padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',maxWidth:'600px',margin:'0 auto'}}>
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

    <div style={{maxWidth:'600px',margin:'0 auto',padding:'0 24px'}}>
      {/* Hero */}
      <div style={{paddingTop:'60px',paddingBottom:'48px',textAlign:'center'}}>
        <div style={{display:'inline-block',background:`${c.A}15`,border:`1px solid ${c.A}30`,borderRadius:'20px',padding:'4px 14px',fontSize:'12px',color:c.A,fontWeight:'600',marginBottom:'20px'}}>{t.landingBadge||'Free forever'}</div>
        <h1 style={{fontFamily:"'Syne',serif",fontSize:'52px',fontWeight:'800',lineHeight:1.05,marginBottom:'16px',letterSpacing:'-.03em'}}>{t.landingHero1||'Group plans,'}<br/><span style={{color:c.A}}>{t.landingHero2||'zero chaos.'}</span></h1>
        <p style={{fontSize:'17px',color:c.M2,lineHeight:1.7,marginBottom:'32px',maxWidth:'420px',margin:'0 auto 32px'}}>{t.landingSub||'Dates, venues, routes, weather, outfits & payments — all in one shareable code.'}</p>
        <button onClick={onGetStarted} style={{padding:'16px 40px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px'}}>{t.landingCTA||'Get started — it\'s free'}</button>
        <div style={{fontSize:'13px',color:c.M,marginTop:'8px'}}>{t.landingNoCreditCard||'No credit card required'}</div>
      </div>

      {/* How it works */}
      <div style={{padding:'48px 0'}}>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',textAlign:'center',marginBottom:'32px'}}>{t.landingHowTitle||'How it works'}</h2>
        {[
          {emoji:'📍',title:t.landingStep1T||'Pick the spots',desc:t.landingStep1D||'Search on Google Maps. Rating, price, photos — all automatic.'},
          {emoji:'📅',title:t.landingStep2T||'Choose the dates',desc:t.landingStep2D||'Add possible dates. Everyone votes. The app finds the best one.'},
          {emoji:'📨',title:t.landingStep3T||'Share the code',desc:t.landingStep3D||'One code, one link. WhatsApp, Telegram, email — your choice.'},
        ].map((s,i)=><div key={i} style={{display:'flex',gap:'16px',marginBottom:'24px',alignItems:'flex-start'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'14px',background:`${c.A}15`,border:`1px solid ${c.A}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{s.emoji}</div>
          <div><div style={{fontSize:'16px',fontWeight:'700',marginBottom:'4px'}}>{s.title}</div><div style={{fontSize:'14px',color:c.M2,lineHeight:1.6}}>{s.desc}</div></div>
        </div>)}
      </div>

      {/* Features grid */}
      <div style={{padding:'24px 0 48px'}}>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',textAlign:'center',marginBottom:'32px'}}>{t.landingFeaturesTitle||'Everything you need'}</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {[
            {emoji:'🗺️',label:t.landingF1||'Google Maps'},
            {emoji:'🌤️',label:t.landingF2||'Weather forecast'},
            {emoji:'👗',label:t.landingF3||'Dress code'},
            {emoji:'💰',label:t.landingF4||'Split expenses'},
            {emoji:'🗳️',label:t.landingF5||'Polls & voting'},
            {emoji:'🔔',label:t.landingF6||'Email reminders'},
            {emoji:'🌍',label:t.landingF7||'6 languages'},
            {emoji:'📱',label:t.landingF8||'Works on mobile'},
          ].map((f,i)=><div key={i} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px',display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'20px'}}>{f.emoji}</span>
            <span style={{fontSize:'13px',fontWeight:'600'}}>{f.label}</span>
          </div>)}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{padding:'40px 0 60px',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',marginBottom:'16px'}}>{t.landingBottomTitle||'Ready to plan?'}</h2>
        <p style={{fontSize:'15px',color:c.M2,marginBottom:'24px'}}>{t.landingBottomSub||'Create your first plan in 2 minutes.'}</p>
        <button onClick={onGetStarted} style={{padding:'16px 40px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>{t.landingCTA||'Get started — it\'s free'}</button>
      </div>

      {/* Footer */}
      <div style={{borderTop:`1px solid ${c.BD}`,padding:'20px 0',textAlign:'center',fontSize:'12px',color:c.M}}>
        queda. — {t.landingFooter||'Group plans, zero chaos.'}
      </div>
    </div>
  </div>);
}
