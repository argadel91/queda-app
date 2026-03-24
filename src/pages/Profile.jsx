import React, { useState } from 'react'
import T from '../constants/translations.js'
import { Btn, Back } from '../components/ui.jsx'

const FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};
const LANG_NAMES={es:'Español',en:'English',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano'};
const LANGS=['es','en','pt','fr','de','it'];

export default function Profile({onBack,c,lang,authUser,profile,onUpdateProfile,onSignOut,onLangChange,onThemeToggle,theme}){
  const t=T[lang];
  const[editing,setEditing]=useState(false);
  const[newName,setNewName]=useState(profile?.name||'');
  const[newUsername,setNewUsername]=useState(profile?.username||'');
  const save=async()=>{
    if(!newName.trim())return;
    await onUpdateProfile({name:newName.trim(),username:newUsername.trim()||null});
    setEditing(false);
  };

  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <h2 style={{fontFamily:"'Syne',serif",fontSize:'26px',fontWeight:'800',color:c.T,marginBottom:'20px'}}>{t.myProfile||'My profile'}</h2>

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


        {/* Language */}
        <div style={{marginBottom:'12px'}}>
          <div style={{fontSize:'12px',color:c.M,marginBottom:'6px'}}>🌐 {t.langLabel||'Language'}</div>
          <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
            {LANGS.map(l=><button key={l} onClick={()=>onLangChange&&onLangChange(l)} style={{padding:'5px 10px',borderRadius:'8px',border:`1px solid ${l===lang?c.A+'60':c.BD}`,background:l===lang?`${c.A}15`:c.CARD,cursor:'pointer',fontSize:'13px',color:l===lang?c.A:c.T,fontWeight:l===lang?'700':'400',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'4px'}}>{FLAGS[l]} <span style={{fontSize:'11px'}}>{LANG_NAMES[l]}</span></button>)}
          </div>
        </div>
        {/* Theme */}
        <div style={{marginBottom:'16px'}}>
          <button onClick={onThemeToggle} style={{width:'100%',padding:'10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>{theme==='dark'?'☀️':'🌙'} {theme==='dark'?t.lightMode:t.darkMode}</button>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setEditing(true)} style={{flex:1,padding:'10px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600'}}>✏️ {t.editBtn||'Edit'}</button>
          <button onClick={onSignOut} style={{flex:1,padding:'10px',background:'transparent',border:'1px solid #ef444440',borderRadius:'10px',color:'#ef4444',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'500'}}>{t.signOut}</button>
        </div>
      </>:<>
        {/* Edit mode */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.nameLbl||'Name *'}</div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={t.yourNamePh2||'Your name'} style={{background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'13px',color:c.M,marginBottom:'4px'}}>{t.usernameLbl||'Username *'}</div>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
              <span style={{color:c.M,fontSize:'15px',fontWeight:'600'}}>@</span>
              <input value={newUsername} onChange={e=>setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20))} placeholder="username" style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'10px 12px',color:c.T,fontSize:'14px',fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div style={{fontSize:'11px',color:c.M2,marginTop:'4px'}}>{t.usernameHint||'So others can find you.'}</div>
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
