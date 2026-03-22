import React, { useState } from 'react'
import T from '../constants/translations.js'
import { ls } from '../lib/storage.js'
import { Card, Btn, Lbl } from './ui.jsx'

export default function ExpenseSplitter({plan, rs, mc, c, lang}){
  const t=T[lang];
  const[expenses,setExp]=useState(()=>ls.get('q_exp_'+plan.id,[]));
  const[open,setOpen]=useState(false);
  const[who,setWho]=useState('');const[what,setWhat]=useState('');const[amt,setAmt]=useState('');
  const attendees=(rs||[]).filter(r=>(plan.dates||[]).some(d=>r.avail?.[d]==='yes')).map(r=>r.name);
  const saveExp=exp=>{ls.set('q_exp_'+plan.id,exp);setExp(exp);};
  const add=()=>{if(!who||!what||!amt)return;const e=[...expenses,{id:Date.now(),who,what,amt:parseFloat(amt),at:new Date().toISOString()}];saveExp(e);setWho('');setWhat('');setAmt('');};
  const rem=id=>saveExp(expenses.filter(e=>e.id!==id));
  const total=expenses.reduce((s,e)=>s+e.amt,0);
  const perPerson=attendees.length>0?total/attendees.length:0;
  // Calculate who owes what
  const paid={};expenses.forEach(e=>{paid[e.who]=(paid[e.who]||0)+e.amt;});
  const balances={};attendees.forEach(p=>{balances[p]=(paid[p]||0)-perPerson;});
  const debtors=Object.entries(balances).filter(([,b])=>b<-0.01).sort((a,b)=>a[1]-b[1]);
  const creditors=Object.entries(balances).filter(([,b])=>b>0.01).sort((a,b)=>b[1]-a[1]);
  const transfers=[];
  const d2=[...debtors.map(([n,b])=>({n,b:Math.abs(b)}))];
  const c2=[...creditors.map(([n,b])=>({n,b}))];
  let i=0,j=0;
  while(i<d2.length&&j<c2.length){
    const amt2=Math.min(d2[i].b,c2[j].b);
    if(amt2>0.01)transfers.push({from:d2[i].n,to:c2[j].n,amt:amt2.toFixed(2)});
    d2[i].b-=amt2;c2[j].b-=amt2;
    if(d2[i].b<0.01)i++;
    if(c2[j].b<0.01)j++;
  }
  if(expenses.length===0&&!open)return(<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'12px',padding:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>💰 {t.splitExpensesLbl}</div><div style={{fontSize:'12px',color:c.M2}}>{t.splitExpensesSub}</div></div>
    <button onClick={()=>setOpen(true)} style={{background:`${mc}20`,border:`1px solid ${mc}40`,borderRadius:'8px',padding:'7px 12px',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'600'}}>{t.addLbl}</button>
  </div>);
  return(<Card c={c}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
      <Lbl c={c}>💰 {t.planExpenses}</Lbl>
      <button onClick={()=>setOpen(o=>!o)} style={{background:`${mc}15`,border:`1px solid ${mc}40`,borderRadius:'8px',padding:'5px 10px',color:mc,cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600'}}>+ {t.addExpenseLbl}</button>
    </div>
    {open&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px',marginBottom:'12px',display:'flex',flexDirection:'column',gap:'8px'}}>
      <select value={who} onChange={e=>setWho(e.target.value)} style={{background:c.CARD,border:`1px solid ${c.BD}`,color:who?c.T:c.M,fontSize:'13px',padding:'9px 12px',borderRadius:'8px',fontFamily:'inherit',width:'100%'}}>
        <option value="">{t.whoPaidLbl}</option>
        {attendees.map(a=><option key={a} value={a}>{a}</option>)}
        <option value={t.meOrganiser.split(' ')[0]}>{t.meOrganiser}</option>
      </select>
      <input value={what} onChange={e=>setWhat(e.target.value)} placeholder={t.whatWasIt}  style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
      <div style={{display:'flex',gap:'8px'}}>
        <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="€" style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'9px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
        <button onClick={add} disabled={!who||!what||!amt} style={{padding:'9px 16px',background:who&&what&&amt?mc:'transparent',border:`1px solid ${who&&what&&amt?mc:c.BD}`,borderRadius:'8px',color:who&&what&&amt?'#0A0A0A':c.M,cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px'}}>{'OK'}</button>
      </div>
    </div>}
    {expenses.map(e=><div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${c.BD}`,fontSize:'13px'}}>
      <div><span style={{color:mc,fontWeight:'600'}}>{e.who}</span><span style={{color:c.M2}}> — {e.what}</span></div>
      <div style={{display:'flex',gap:'8px',alignItems:'center'}}><span style={{color:c.T,fontWeight:'700'}}>{e.amt.toFixed(2)}€</span><button onClick={()=>rem(e.id)} title={lang==='es'?'Eliminar gasto':'Remove expense'} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'14px',padding:'0'}}>×</button></div>
    </div>)}
    {expenses.length>0&&<>
      <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:`1px solid ${c.BD}`,marginTop:'4px',fontSize:'14px'}}><span style={{color:c.M2}}>{t.statTotal}</span><span style={{color:mc,fontWeight:'800'}}>{total.toFixed(2)}€</span></div>
      {attendees.length>1&&perPerson>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'12px'}}><span style={{color:c.M2}}>{t.perPersonLbl}</span><span style={{color:c.T,fontWeight:'600'}}>{perPerson.toFixed(2)}€</span></div>}
      {transfers.length>0&&<div style={{background:`${mc}08`,border:`1px solid ${mc}25`,borderRadius:'10px',padding:'12px'}}>
        <div style={{fontSize:'11px',color:mc,fontWeight:'700',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'8px'}}>{t.transfersLbl}</div>
        {transfers.map((t2,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:'13px',borderBottom:i<transfers.length-1?`1px solid ${c.BD}`:'none'}}>
          <span style={{color:c.T}}><span style={{color:'#ef4444',fontWeight:'600'}}>{t2.from}</span> → <span style={{color:'#22c55e',fontWeight:'600'}}>{t2.to}</span></span>
          <span style={{color:c.T,fontWeight:'700'}}>{t2.amt}€</span>
        </div>)}
      </div>}
      {transfers.length===0&&expenses.length>0&&attendees.length>1&&<div style={{fontSize:'12px',color:'#22c55e',textAlign:'center',padding:'8px'}}>✓ {t.allSettledLbl}</div>}
    </>}
  </Card>);
}

