import React, { useState } from 'react'
import T from '../constants/translations.js'
import { getMC } from '../constants/theme.js'
import { ls, getGroups, saveGroups } from '../lib/storage.js'
import { Btn, Card, Lbl } from './ui.jsx'

export default function SavedGroups({plan, c, lang}){
  const t=T[lang];const isEs=lang==='es'; const mc=getMC(plan.mode,c);
  const[groups,setGroups]=useState(getGroups());
  const[open,setOpen]=useState(false);
  const[newName,setNewName]=useState('');
  const base=location.href.split('?')[0];
  const saveGroup=()=>{
    if(!newName.trim())return;
    const g=[...groups,{id:Date.now(),name:newName.trim(),planId:plan.id,createdAt:new Date().toISOString()}];
    saveGroups(g);setGroups(g);setNewName('');setOpen(false);
  };
  const delGroup=id=>{const g=groups.filter(x=>x.id!==id);saveGroups(g);setGroups(g);};
  const planGroups=groups.filter(g=>g.planId===plan.id);
  // Groups from other plans - reusable templates
  const otherGroups=groups.filter(g=>g.planId!==plan.id);
  return(<div style={{marginTop:'10px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
      <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase'}}>👥 {t.savedGroupsLbl}</div>
      <button onClick={()=>setOpen(o=>!o)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'4px 10px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>+ {t.saveGroupBtn}</button>
    </div>
    {open&&<div style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px',marginBottom:'10px',display:'flex',gap:'8px'}}>
      <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={t.groupNamePh} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
      <button onClick={saveGroup} style={{padding:'8px 12px',background:newName.trim()?mc:'transparent',border:`1px solid ${newName.trim()?mc:c.BD}`,borderRadius:'8px',color:newName.trim()?'#0A0A0A':c.M,cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'13px',flexShrink:0}}>OK</button>
    </div>}
    {planGroups.map(g=><div key={g.id} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 12px',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div><div style={{fontSize:'13px',color:c.T,fontWeight:'500'}}>{g.name}</div><div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{t.groupForPlan}</div></div>
      <button onClick={()=>delGroup(g.id)} style={{background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px'}}>×</button>
    </div>)}
    {otherGroups.length>0&&<div style={{fontSize:'12px',color:c.M2,marginTop:'4px'}}>{isEs?`${otherGroups.length} grupo${otherGroups.length!==1?'s':''} guardado${otherGroups.length!==1?'s':''} de otros planes`:`${otherGroups.length} saved group${otherGroups.length!==1?'s':''} from other plans`}</div>}
  </div>);
}


// ─── EXPENSE SPLITTER ────────────────────────────────
