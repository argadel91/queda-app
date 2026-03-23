import React, { useState } from 'react'
import T from '../constants/translations.js'
import CityInput from '../components/CityInput.jsx'
import { Btn, Lbl, Back } from '../components/ui.jsx'

export default function Profile({onBack,c,lang,authUser,profile,onUpdateProfile,onSignOut}){
  const t=T[lang];const isEs=lang==='es';
  const[editing,setEditing]=useState(false);
  const[newName,setNewName]=useState(profile?.name||'');
  const[newUsername,setNewUsername]=useState(profile?.username||'');
  const[gender,setGender]=useState(profile?.gender||'');
  const[genderCustom,setGenderCustom]=useState(profile?.genderCustom||'');
  const[birthdate,setBirthdate]=useState(profile?.birthdate||'');
  const[userCity,setUserCity]=useState(profile?.city||'');
  const[userLat,setUserLat]=useState(profile?.lat||null);
  const[userLon,setUserLon]=useState(profile?.lon||null);

  const save=async()=>{
    if(!newName.trim())return;
    await onUpdateProfile({
      name:newName.trim(),
      username:newUsername.trim()||null,
      gender,genderCustom:gender==='other'?genderCustom:'',
      birthdate,city:userCity,lat:userLat,lon:userLon
    });
    setEditing(false);
  };

  const age=birthdate?Math.floor((Date.now()-new Date(birthdate).getTime())/31557600000):null;

  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'20px'}}>{isEs?'Mi perfil':'My profile'}</h2>

    <div style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',padding:'20px'}}>
      {!editing?<>
        {/* View mode */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
          <div style={{width:'52px',height:'52px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'800',flexShrink:0}}>{(profile?.name||'?')[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'18px',fontWeight:'700',color:c.T}}>{profile?.name||'—'}</div>
            {profile?.username&&<div style={{fontSize:'13px',color:c.A,fontWeight:'600'}}>@{profile.username}</div>}
            <div style={{fontSize:'12px',color:c.M2}}>{authUser?.email}</div>
          </div>
        </div>

        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'6px'}}>
          {gender&&<span style={{fontSize:'13px',padding:'4px 12px',background:`${c.A}15`,border:`1px solid ${c.A}30`,borderRadius:'20px',color:c.A}}>{gender==='other'?genderCustom||t.genderOther:gender==='male'?(t.genderMale||'Man'):(t.genderFemale||'Woman')}</span>}
          {age&&<span style={{fontSize:'13px',padding:'4px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'20px',color:c.T}}>{age} {t.yearsOld||'years'}</span>}
          {userCity&&<span style={{fontSize:'13px',padding:'4px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'20px',color:c.T}}>📍 {userCity}</span>}
        </div>
        {(!gender||!birthdate||!userCity)&&<div style={{fontSize:'11px',color:c.M2,marginBottom:'12px'}}>{isEs?'Completa tu género, edad y ubicación para que te encuentren en Discover.':'Complete your gender, age and location so people can find you on Discover.'}</div>}

        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setEditing(true)} style={{flex:1,padding:'10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600'}}>✏️ {isEs?'Editar':'Edit'}</button>
          <button onClick={onSignOut} style={{flex:1,padding:'10px',background:'transparent',border:'1px solid #ef444440',borderRadius:'10px',color:'#ef4444',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'500'}}>{t.signOut}</button>
        </div>
      </>:<>
        {/* Edit mode */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{isEs?'Nombre *':'Name *'}</div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={isEs?'Tu nombre':'Your name'} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{isEs?'Usuario *':'Username *'}</div>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
              <span style={{color:c.M,fontSize:'15px',fontWeight:'600'}}>@</span>
              <input value={newUsername} onChange={e=>setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20))} placeholder="username" style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div style={{fontSize:'11px',color:c.M2,marginTop:'4px'}}>{isEs?'Para que otros puedan encontrarte.':'So others can find you.'}</div>
          </div>
          <div style={{height:'1px',background:c.BD,margin:'4px 0'}}/>
          <div style={{fontSize:'12px',color:c.M2,marginBottom:'-4px'}}>{isEs?'Opcional — útil para planes públicos en Discover':'Optional — useful for public plans on Discover'}</div>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.birthdateLbl||'Date of birth'}</div>
            <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.genderLbl||'Gender'} <span style={{color:c.M2,fontSize:'11px'}}>({isEs?'opcional':'optional'})</span></div>
            <div style={{display:'flex',gap:'6px'}}>
              {[{v:'female',l:t.genderFemale||'Woman'},{v:'male',l:t.genderMale||'Man'},{v:'other',l:t.genderOther||'Other'}].map(o=>
                <button key={o.v} onClick={()=>setGender(gender===o.v?'':o.v)} style={{flex:1,padding:'10px 6px',borderRadius:'10px',border:`1px solid ${gender===o.v?c.A+'60':c.BD}`,background:gender===o.v?`${c.A}15`:c.CARD,color:gender===o.v?c.A:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:gender===o.v?'700':'400'}}>{o.l}</button>
              )}
            </div>
            {gender==='other'&&<input value={genderCustom} onChange={e=>setGenderCustom(e.target.value)} placeholder={t.genderCustomPh||'How do you identify?'} style={{marginTop:'6px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'8px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>}
          </div>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.locationLbl||'Location'} <span style={{color:c.M2,fontSize:'11px'}}>({isEs?'opcional':'optional'})</span></div>
            <CityInput value={userCity} onChange={setUserCity} onSelect={d=>{setUserCity(d.city||d.label);setUserLat(d.lat);setUserLon(d.lon);}} placeholder={isEs?'Tu ciudad...':'Your city...'} c={c}/>
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
            <button onClick={()=>setEditing(false)} style={{flex:1,padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontWeight:'600',fontSize:'14px'}}>{t.cancel||'Cancel'}</button>
            <Btn onClick={save} disabled={!newName.trim()} full style={{flex:1}} c={c}>{t.saveLbl||'Save'}</Btn>
          </div>
        </div>
      </>}
    </div>
  </div>);
}
