import React, { useState } from 'react'
import T from '../constants/translations.js'
import { Btn, Lbl, Inp } from './ui.jsx'

export default function PayModal({plan,amount,onClose,c,lang}){
  const t=T[lang];const isEs=lang==='es';const[tab,setTab]=useState('bizum');
  const[bizum,setBizum]=useState(plan.payment?.bizumPhone||'');const[paypal,setPaypal]=useState(plan.payment?.paypalUser||'');const[revolut,setRevolut]=useState(plan.payment?.revolutUser||'');const[stripe,setStripe]=useState(plan.gift?.stripeLink||'');
  const amt=amount||'?';const tabs=[{k:'bizum',l:'📱 Bizum'},{k:'paypal',l:'🅿️ PayPal'},{k:'revolut',l:'🔄 Revolut'},{k:'stripe',l:'💳 Stripe'},{k:'invoice',l:'🧾 Factura'}];
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'24px 24px 0 0',padding:'24px 24px 40px',width:'100%',maxWidth:'480px',maxHeight:'80vh',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div><div style={{fontSize:'17px',fontWeight:'700',color:c.T}}>{T[lang].payTitle}</div><div style={{fontSize:'13px',color:c.M2}}>{plan.name} · <span style={{color:c.A,fontWeight:'700'}}>{amt}€</span></div></div>
        <button onClick={onClose} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'22px'}}>×</button>
      </div>
      <div style={{display:'flex',gap:'5px',overflowX:'auto',paddingBottom:'8px',marginBottom:'16px'}}>
        {tabs.map(tb=><button key={tb.k} onClick={()=>setTab(tb.k)} style={{padding:'6px 10px',borderRadius:'20px',border:`1px solid ${tab===tb.k?c.A+'60':c.BD}`,background:tab===tb.k?`${c.A}15`:c.CARD2,color:tab===tb.k?c.A:c.M2,fontSize:'12px',fontWeight:tab===tb.k?'700':'400',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>{tb.l}</button>)}
      </div>
      {tab==='bizum'&&<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <Lbl c={c}>{t.payOrgPhone}</Lbl><Inp value={bizum} onChange={setBizum} placeholder="+34 600 000 000" c={c}/>
        {bizum&&<a href={`bizum://send?phone=${bizum}&amount=${amt}`} style={{display:'block',textAlign:'center',padding:'13px',background:'#0070f3',borderRadius:'12px',color:'#fff',textDecoration:'none',fontSize:'15px',fontWeight:'700'}}>📱 Abrir Bizum</a>}
      </div>}
      {tab==='paypal'&&<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <Lbl c={c}>PayPal.me</Lbl><Inp value={paypal} onChange={setPaypal} placeholder="username" c={c}/>
        {paypal&&<a href={`https://paypal.me/${paypal}/${amt}`} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'13px',background:'#003087',borderRadius:'12px',color:'#fff',textDecoration:'none',fontSize:'15px',fontWeight:'700'}}>🅿️ Pagar con PayPal</a>}
      </div>}
      {tab==='revolut'&&<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <Lbl c={c}>Revolut.me</Lbl><Inp value={revolut} onChange={setRevolut} placeholder="username" c={c}/>
        {revolut&&<a href={`https://revolut.me/${revolut}/${amt}`} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'13px',background:'#191C1F',borderRadius:'12px',color:'#fff',textDecoration:'none',fontSize:'15px',fontWeight:'700'}}>🔄 Revolut</a>}
      </div>}
      {tab==='stripe'&&<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        <Lbl c={c}>Stripe Link</Lbl><Inp value={stripe} onChange={setStripe} placeholder="https://buy.stripe.com/..." c={c}/>
        {stripe&&<a href={stripe.startsWith('http')?stripe:'https://'+stripe} target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',padding:'13px',background:'#635BFF',borderRadius:'12px',color:'#fff',textDecoration:'none',fontSize:'15px',fontWeight:'700'}}>💳 Stripe</a>}
      </div>}
      {tab==='invoice'&&<div style={{background:c.CARD2,borderRadius:'12px',padding:'16px',fontSize:'13px',lineHeight:'2',color:c.T}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:c.M2}}>{lang==='es'?'De':lang==='pt'?'De':lang==='fr'?'De':lang==='it'?'Da':lang==='de'?'Von':'From'}</span><span style={{fontWeight:'600'}}>{plan.organizer}</span></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:c.M2}}>{t.payDescription}</span><span>{plan.name}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${c.BD}`,marginTop:'8px',paddingTop:'8px'}}><span style={{fontWeight:'700'}}>TOTAL</span><span style={{fontWeight:'800',color:c.A,fontSize:'18px'}}>{amt}€</span></div>
        <Btn onClick={()=>window.print()} v="secondary" full c={c} style={{marginTop:'12px'}}>🖨️ {t.payPrint}</Btn>
      </div>}
    </div>
  </div>);
}


// ─── MODE SELECT ──────────────────────────────────────
