import React, { useState, useEffect } from 'react'
import T from '../constants/translations.js'
import { getMC, MC_DARK } from '../constants/theme.js'
import CityInput from '../components/CityInput.jsx'
import { ls, getMyPlans } from '../lib/storage.js'
import { loadPlan, db } from '../lib/supabase.js'
import { daysUntil, fmtDate, fmtShort, dayStart } from '../lib/utils.js'
import { Btn, Card, Lbl, Back, ModeBadge } from '../components/ui.jsx'

export default function Profile({onBack,onOpen,c,lang,authUser,profile,onUpdateProfile,onSignOut}){
  const t=T[lang];
  const[plans,setPlans]=useState(getMyPlans());
  const[confirm,setConfirm]=useState(null);
  const[editingName,setEditingName]=useState(false);
  const[newName,setNewName]=useState(profile?.name||'');
  const[newUsername,setNewUsername]=useState(profile?.username||'');
  const[editingProfile,setEditingProfile]=useState(false);
  const[gender,setGender]=useState(profile?.gender||'');
  const[genderCustom,setGenderCustom]=useState(profile?.genderCustom||'');
  const[birthdate,setBirthdate]=useState(profile?.birthdate||'');
  const[userCity,setUserCity]=useState(profile?.city||'');
  const[userLat,setUserLat]=useState(profile?.lat||null);
  const[userLon,setUserLon]=useState(profile?.lon||null);
  const saveName=async()=>{if(!newName.trim())return;await onUpdateProfile({name:newName.trim(),username:newUsername.trim()||null});setEditingName(false);};
  const[tab,setTab]=useState('upcoming');
  const[dates,setDates]=useState({});const[modes,setModes]=useState({});const[fullPlans,setFullPlans]=useState({});
  const now=dayStart();
  useEffect(()=>{plans.forEach(async p=>{if(!dates[p.id]){const full=await loadPlan(p.id);if(full){setDates(prev=>({...prev,[p.id]:full.confirmedDate||full.dates?.[0]||null}));setModes(prev=>({...prev,[p.id]:full.mode||p.mode||'social'}));setFullPlans(prev=>({...prev,[p.id]:full}));}}})},[]);
  const isPast=id=>{const d=dates[id];if(!d)return false;return new Date(d+'T23:59:59')<now;};
  const sortByDate=arr=>[...arr].sort((a,b)=>(dates[a.id]||'9999').localeCompare(dates[b.id]||'9999'));
  const upcoming=sortByDate(plans.filter(p=>!isPast(p.id)));
  const past=sortByDate(plans.filter(p=>isPast(p.id))).reverse();
  const shown=tab==='upcoming'?upcoming:past;
  const removeLocal=id=>{const u=getMyPlans().filter(x=>x.id!==id);ls.set('q_plans',u);setPlans(u);setConfirm(null);};
  const delFull=async id=>{try{await db.from('responses').delete().eq('plan_id',id);await db.from('plans').delete().eq('id',id);}catch{}removeLocal(id);};
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    {confirm&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setConfirm(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'340px'}}>
        <div style={{fontSize:'32px',textAlign:'center',marginBottom:'12px'}}>{confirm.role==='organizer'?'🗑️':'👋'}</div>
        <div style={{fontSize:'16px',fontWeight:'700',color:c.T,textAlign:'center',marginBottom:'8px'}}>{confirm.role==='organizer'?t.delConfirm:t.leaveConfirm}</div>
        <div style={{fontSize:'13px',color:c.M2,textAlign:'center',marginBottom:'20px'}}>{confirm.role==='organizer'?t.delWarn:t.leaveWarn}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel}</button>
          <button onClick={()=>confirm.role==='organizer'?delFull(confirm.id):removeLocal(confirm.id)} style={{flex:1,padding:'12px',background:'#ff4444',border:'none',borderRadius:'10px',color:'#fff',cursor:'pointer',fontFamily:'inherit',fontWeight:'700',fontSize:'14px'}}>{confirm.role==='organizer'?t.del:t.leave}</button>
        </div>
      </div>
    </div>}
    <div style={{display:'flex',alignItems:'center',marginBottom:'20px'}}>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T}}>{t.myPlansT}</h2>
      <div style={{display:'flex',gap:'5px',marginLeft:'auto'}}>
        {Object.entries(MC_DARK).map(([m,col])=><div key={m} style={{width:'9px',height:'9px',borderRadius:'50%',background:col}} title={m}/>)}
      </div>
    </div>
    {/* Account info */}
    {authUser&&<div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
        <div style={{width:'44px',height:'44px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'800',flexShrink:0}}>{(profile?.name||authUser.email||'?')[0].toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'16px',fontWeight:'700',color:c.T,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||'—'}</div>
          <div style={{fontSize:'12px',color:c.M2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.username&&<span style={{color:c.A,fontWeight:'600',marginRight:'6px'}}>@{profile.username}</span>}{authUser.email}</div>
        </div>
        <button onClick={()=>setEditingName(true)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>✏️</button>
      </div>
      {editingName&&<><div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName()} placeholder={t.editName} autoFocus style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
        <button onClick={saveName} style={{padding:'8px 14px',background:c.A,border:'none',borderRadius:'8px',color:'#0A0A0A',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>OK</button>
        <button onClick={()=>setEditingName(false)} style={{padding:'8px 10px',background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>×</button>
      </div>
      <div style={{display:'flex',gap:'8px',marginBottom:'10px',alignItems:'center'}}>
        <span style={{color:c.M,fontSize:'15px',fontWeight:'600'}}>@</span>
        <input value={newUsername} onChange={e=>setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20))} placeholder={t.authAliasPlaceholder||'username'} style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
      </div></>}
      <button onClick={onSignOut} style={{width:'100%',padding:'9px',background:'transparent',border:'1px solid #ef444440',borderRadius:'10px',color:'#ef4444',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'500'}}>
        {t.signOut}
      </button>
    </div>}
    {/* Personal info */}
    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <Lbl c={c}>{t.personalInfo||'Personal info'}</Lbl>
        <button onClick={()=>setEditingProfile(p=>!p)} style={{background:'none',border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',color:c.M2,cursor:'pointer',fontFamily:'inherit',fontSize:'12px'}}>{editingProfile?'✕':'✏️'}</button>
      </div>
      {!editingProfile?<div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
        {gender&&<span style={{fontSize:'13px',padding:'4px 12px',background:`${c.A}15`,border:`1px solid ${c.A}30`,borderRadius:'20px',color:c.A}}>{gender==='other'?genderCustom||t.genderOther:gender==='male'?t.genderMale:t.genderFemale}</span>}
        {birthdate&&<span style={{fontSize:'13px',padding:'4px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'20px',color:c.T}}>{Math.floor((Date.now()-new Date(birthdate).getTime())/31557600000)} {t.yearsOld||'years'}</span>}
        {userCity&&<span style={{fontSize:'13px',padding:'4px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'20px',color:c.T}}>📍 {userCity}</span>}
        {!gender&&!birthdate&&!userCity&&<span style={{fontSize:'13px',color:c.M2}}>{t.completeProfile||'Complete your profile for better Discover recommendations'}</span>}
      </div>
      :<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <div>
          <div style={{fontSize:'13px',color:c.M,marginBottom:'6px'}}>{t.genderLbl||'Gender'}</div>
          <div style={{display:'flex',gap:'6px'}}>
            {[{v:'female',l:t.genderFemale||'Woman'},{v:'male',l:t.genderMale||'Man'},{v:'other',l:t.genderOther||'Other'}].map(o=>
              <button key={o.v} onClick={()=>setGender(gender===o.v?'':o.v)} style={{flex:1,padding:'10px 8px',borderRadius:'10px',border:`1px solid ${gender===o.v?c.A+'60':c.BD}`,background:gender===o.v?`${c.A}15`:c.CARD,color:gender===o.v?c.A:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:gender===o.v?'700':'400'}}>{o.l}</button>
            )}
          </div>
          {gender==='other'&&<input value={genderCustom} onChange={e=>setGenderCustom(e.target.value)} placeholder={t.genderCustomPh||'How do you identify?'} style={{marginTop:'6px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
        </div>
        <div>
          <div style={{fontSize:'13px',color:c.M,marginBottom:'6px'}}>{t.birthdateLbl||'Date of birth'}</div>
          <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
        </div>
        <div>
          <div style={{fontSize:'13px',color:c.M,marginBottom:'6px'}}>{t.locationLbl||'Location'}</div>
          <CityInput value={userCity} onChange={setUserCity} onSelect={d=>{setUserCity(d.city||d.label);setUserLat(d.lat);setUserLon(d.lon);}} placeholder={t.cityPh||'Your city...'} c={c}/>
        </div>
        <Btn onClick={async()=>{await onUpdateProfile({gender,genderCustom:gender==='other'?genderCustom:'',birthdate,city:userCity,lat:userLat,lon:userLon});setEditingProfile(false);}} full sm c={c}>{t.saveLbl||'Save'}</Btn>
      </div>}
    </div>
    {/* Quick stats */}
    {plans.length>0&&(()=>{
      const org=plans.filter(p=>p.role==='organizer').length;
      const modes=plans.reduce((a,p)=>{a[p.mode||'social']=(a[p.mode||'social']||0)+1;return a;},{});
      const topMode=Object.entries(modes).sort((a,b)=>b[1]-a[1])[0];
      return(<div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
        {[{l:t.statTotal,v:plans.length},{l:t.statAsOrg,v:org},{l:t.statFavMode,v:topMode?T[lang].modes[topMode[0]]?.label||topMode[0]:'—'}].map((s,i)=><div key={i} style={{flex:1,background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 8px',textAlign:'center'}}>
          <div style={{fontSize:'18px',fontWeight:'800',color:c.A}}>{s.v}</div>
          <div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{s.l}</div>
        </div>)}
      </div>);
    })()}
    <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
      {['upcoming','past'].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`1px solid ${tab===tb?c.A+'60':c.BD}`,background:tab===tb?`${c.A}15`:c.CARD,color:tab===tb?c.A:c.M2,fontSize:'13px',fontWeight:tab===tb?'700':'400',cursor:'pointer',fontFamily:'inherit'}}>
        {tb==='upcoming'?`${t.upcoming} (${upcoming.length})`:`${t.pastTab} (${past.length})`}
      </button>)}
    </div>
    {shown.length===0?<div style={{textAlign:'center',padding:'32px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px'}}><div style={{fontSize:'36px',marginBottom:'12px'}}>📋</div><div style={{color:c.T,fontWeight:'500',marginBottom:'6px'}}>{tab==='upcoming'?t.noPlansUp:t.noPlansPast}</div>{tab==='upcoming'&&<div style={{color:c.M2,fontSize:'13px'}}>{t.noPlansUpS}</div>}</div>
    :shown.map(p=>{
      const mode=modes[p.id]||p.mode||'social';const mc=getMC(mode,c);const d=dates[p.id];
      const du=d?daysUntil(d):null;const isToday=du===0;const isTmrw=du===1;const isSoon=du!=null&&du<=3&&du>=0;
      const fp=fullPlans[p.id];
      const stopsWithName=(fp?.stops||[]).filter(s=>(s.options||[]).some(o=>o.name));
      return(<div key={p.id} onClick={()=>{ls.set('q_seen_'+p.id,Date.now());onOpen(p.id);}} style={{background:`linear-gradient(135deg,${mc}12,${mc}04)`,border:`2px solid ${mc}30`,borderRadius:'16px',padding:'16px',marginBottom:'12px',cursor:'pointer',opacity:isPast(p.id)?0.6:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'11px',color:mc,letterSpacing:'.08em',textTransform:'uppercase'}}>queda.</div>
          <button onClick={e=>{e.stopPropagation();setConfirm(p);}} style={{background:'none',border:'none',color:'#ff666640',cursor:'pointer',fontSize:'14px',padding:'0'}}>×</button>
        </div>
        <div style={{textAlign:'center',marginBottom:'8px'}}>
          <div style={{fontFamily:'monospace',fontSize:'28px',fontWeight:'900',color:mc,letterSpacing:'.15em'}}>{p.id}</div>
          {p.name&&<div style={{fontSize:'14px',color:c.T,fontWeight:'600',marginTop:'4px'}}>{p.name}</div>}
          <div style={{fontSize:'11px',color:c.M2,marginTop:'2px'}}>{p.role==='organizer'?t.organizer:t.guest}{fp?.organizer?' · '+fp.organizer:''}</div>
        </div>
        {d&&<div style={{textAlign:'center',marginBottom:'6px'}}>
          <span style={{fontSize:'13px',padding:'3px 12px',borderRadius:'10px',background:isSoon?`${mc}20`:c.CARD2,color:isSoon?mc:c.T,border:`1px solid ${isSoon?mc+'40':c.BD}`,fontWeight:'600',textTransform:'capitalize'}}>{isToday?t.todayLbl:isTmrw?t.tomorrowLbl:fmtShort(d,lang)}{fp?.startTimes?.[0]?' · '+fp.startTimes[0]:''}</span>
        </div>}
        {stopsWithName.length>0&&<div style={{borderTop:`1px solid ${mc}20`,paddingTop:'6px',marginTop:'6px'}}>
          {stopsWithName.slice(0,3).map((s,si)=>{const opt=(s.options||[])[0]||{};return<div key={si} style={{display:'flex',alignItems:'center',gap:'5px',justifyContent:'center',fontSize:'11px',color:c.M2,marginBottom:'2px'}}>
            <span style={{color:mc,fontWeight:'700'}}>{si+1}.</span>
            {opt.photo&&<img src={opt.photo} alt="" style={{width:'16px',height:'16px',borderRadius:'3px',objectFit:'cover'}}/>}
            <span>{opt.name}</span>
            {opt.rating&&<span style={{color:mc,fontSize:'10px'}}>⭐{opt.rating}</span>}
          </div>;})}
          {stopsWithName.length>3&&<div style={{fontSize:'10px',color:c.M2,textAlign:'center'}}>+{stopsWithName.length-3}</div>}
        </div>}
      </div>);
    })}
  </div>);
}

// ─── DISCOVER ─────────────────────────────────────────
