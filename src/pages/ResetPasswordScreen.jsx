import React, { useState } from 'react'
import { db } from '../lib/supabase.js'
import T from '../constants/translations.js'

export default function ResetPasswordScreen({onDone,c,lang}){
  const t=T[lang];const isEs=lang==='es';
  const[password,setPassword]=useState('');
  const[password2,setPassword2]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[done,setDone]=useState(false);
  const[showPass,setShowPass]=useState(false);

  const submit=async()=>{
    if(password.length<6){setErr(t.authPassMin);return;}
    if(password!==password2){setErr(t.passwordsNoMatch);return;}
    setLoading(true);setErr('');
    try{
      const{error}=await db.auth.updateUser({password});
      if(error){setErr(error.message||t.passwordChangeError);setLoading(false);return;}
      setDone(true);
      setTimeout(()=>onDone(),2000);
    }catch(e){
      setErr(t.connectionError);
    }
    setLoading(false);
  };

  return(<div style={{minHeight:'100vh',background:c.BG,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
    <div style={{width:'100%',maxWidth:'400px'}}>
      <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'32px',color:c.T,marginBottom:'32px'}}>queda<span style={{color:c.A}}>.</span></div>
      {done?<div style={{textAlign:'center',padding:'40px 0'}}>
        <div style={{fontSize:'40px',marginBottom:'16px'}}>✅</div>
        <div style={{fontSize:'18px',fontWeight:'700',color:c.T,marginBottom:'8px'}}>{t.passwordUpdated}</div>
        <div style={{fontSize:'14px',color:c.M2}}>{t.nowCanSignIn}</div>
      </div>:<div>
        <div style={{fontSize:'20px',fontWeight:'700',color:c.T,marginBottom:'8px'}}>{t.newPassword}</div>
        <div style={{fontSize:'14px',color:c.M2,marginBottom:'24px'}}>{t.chooseNewPassword}</div>
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{position:'relative'}}>
            <input value={password} onChange={e=>setPassword(e.target.value)} type={showPass?'text':'password'} placeholder={t.authMinChars} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 44px 12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            <button onClick={()=>setShowPass(s=>!s)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px'}}>{showPass?'🙈':'👁'}</button>
          </div>
          <input value={password2} onChange={e=>setPassword2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} type={showPass?'text':'password'} placeholder={t.repeatPassword} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px'}}>{err}</div>}
          <button onClick={submit} disabled={loading||!password||!password2} style={{width:'100%',padding:'14px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',opacity:loading?0.7:1}}>
            {loading?'...':(t.changePassword)}
          </button>
        </div>
      </div>}
    </div>
  </div>);
}

// ─── APP ─────────────────────────────────────────────
