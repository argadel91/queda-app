import React, { useState } from 'react'
import T from '../constants/translations.js'
import { authSignIn, authSignUp, authResetPassword, authSignInWithProvider } from '../lib/auth.js'
import { saveProfile } from '../lib/supabase.js'

export default function AuthScreen({onAuth,c,lang,onLangChange}){
  const t=T[lang];
  const[mode,setMode]=useState('login'); // login | register | reset | confirmEmail
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const[showPass,setShowPass]=useState(false);
  const[langMenuOpen,setLangMenuOpen]=useState(false);

  const validate=()=>{
    if(!email.trim()||!email.includes('@')){setErr(t.authInvalidEmail);return false;}
    if(mode!=='reset'&&password.length<6){setErr(t.authPassMin);return false;}
    return true;
  };

  const handleLogin=async()=>{
    if(!validate())return;
    setLoading(true);setErr('');
    try{
      const{data,error}=await authSignIn(email.trim().toLowerCase(),password);
      if(error){
        if(error.message?.includes('Invalid login')||error.message?.includes('invalid_grant')){
          setErr(t.authWrongPass);
        }else if(error.message?.includes('Email not confirmed')){
          setErr(t.confirmEmailFirst);
        }else{
          setErr(error.message||t.signInError);
        }
        setLoading(false);return;
      }
      onAuth(data.user,{name:data.user.email.split('@')[0],email:data.user.email,contacts:[]});
    }catch(e){
      setErr(t.authConnError);
      setLoading(false);
    }
  };

  const handleRegister=async()=>{
    if(!validate())return;
    setLoading(true);setErr('');
    try{
      const{data,error}=await authSignUp(email.trim().toLowerCase(),password);
      if(error){
        if(error.message?.includes('already registered')||error.message?.includes('already been registered')){
          setErr(t.authAlreadyReg);
        }else{
          setErr(error.message||t.createAccountError);
        }
        setLoading(false);return;
      }
      // If Supabase returned a session, user can enter directly (email confirmation disabled)
      if(data.session){
        const prof={name:email.trim().toLowerCase().split('@')[0],email:email.trim().toLowerCase(),lang,contacts:[]};
        await saveProfile(data.user.id,prof);
        onAuth(data.user,prof);
        setTimeout(()=>window.location.reload(),100);
      }else{
        setMode('confirmEmail');
      }
    }catch(e){
      setErr(t.authConnError);
    }
    setLoading(false);
  };

  const handleReset=async()=>{
    if(!email.trim()||!email.includes('@')){setErr(t.authInvalidEmail);return;}
    setLoading(true);setErr('');
    const{error}=await authResetPassword(email.trim().toLowerCase());
    if(error){setErr(t.sendEmailError);setLoading(false);return;}
    setMsg(t.authEmailSent);
    setLoading(false);
  };

  const FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};
  const LANG_NAMES={es:'Español',en:'English',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano'};

  return(<div style={{minHeight:'100vh',background:c.BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setLangMenuOpen(false)}>
    <div style={{width:'100%',maxWidth:'400px'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'40px'}}>
        <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'32px',color:c.T,letterSpacing:'-.02em'}}>queda<span style={{color:c.A}}>.</span></div>
        <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setLangMenuOpen(o=>!o)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',gap:'4px',color:c.T,fontFamily:'inherit'}}>
            {FLAGS[lang]} <span style={{fontSize:'11px'}}>{lang.toUpperCase()}</span> <span style={{fontSize:'10px',color:c.M}}>▾</span>
          </button>
          {langMenuOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'130px'}}>
            {['es','en','pt','fr','de','it'].map(l=><button key={l} onClick={()=>{onLangChange(l);setLangMenuOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'10px 14px',background:l===lang?`${c.A}15`:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:l===lang?c.A:c.T,fontWeight:l===lang?'700':'400',textAlign:'left'}}>
              <span>{FLAGS[l]}</span><span>{LANG_NAMES[l]}</span>
              {l===lang&&<span style={{marginLeft:'auto',color:c.A}}>✓</span>}
            </button>)}
          </div>}
        </div>
      </div>

      {/* Email confirmation screen */}
      {mode==='confirmEmail'&&<div style={{textAlign:'center',padding:'20px 0'}}>
        <div style={{fontSize:'52px',marginBottom:'16px'}}>📧</div>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:c.T,marginBottom:'10px'}}>{t.checkYourEmail}</h2>
        <p style={{color:c.M2,fontSize:'14px',lineHeight:1.6,marginBottom:'8px'}}>{t.sentConfirmTo}</p>
        <p style={{color:c.A,fontSize:'15px',fontWeight:'600',marginBottom:'20px'}}>{email}</p>
        <p style={{color:c.M2,fontSize:'13px',lineHeight:1.6,marginBottom:'24px'}}>{t.clickToConfirm}</p>
        <p style={{color:c.M,fontSize:'12px',marginBottom:'20px'}}>{t.checkSpam}</p>
        <button onClick={()=>{setMode('login');setErr('');setMsg('');}} style={{width:'100%',padding:'14px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
          {t.goToSignIn}
        </button>
      </div>}

      {/* Normal auth forms */}
      {mode!=='confirmEmail'&&<>
      {/* Mode tabs */}
      <div style={{display:'flex',gap:'4px',background:c.CARD2,borderRadius:'10px',padding:'4px',marginBottom:'28px'}}>
        {[['login',t.authSignInTab],['register',t.authRegisterTab]].map(([m,lbl])=>(
          <button key={m} onClick={()=>{setMode(m);setErr('');setMsg('');}} style={{flex:1,padding:'9px',borderRadius:'7px',border:'none',background:mode===m?c.CARD:'transparent',color:mode===m?c.T:c.M2,fontWeight:mode===m?'700':'400',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',transition:'all .15s'}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={e=>{e.preventDefault();mode==='reset'?handleReset():mode==='register'?handleRegister():handleLogin();}} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {mode==='reset'&&<div style={{fontSize:'14px',color:c.M2,marginBottom:'4px'}}>{t.authResetInfo}</div>}

        <div>
          <div style={{fontSize:'13px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>Email</div>
          <input id="email" name="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value.slice(0,100))} maxLength={100} type="email" placeholder={t.emailPh} autoFocus style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>

        {mode!=='reset'&&<div>
          <div style={{fontSize:'13px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>{t.authPassword}</div>
          <div style={{position:'relative'}}>
            <input id="password" name="password" autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value.slice(0,100))} maxLength={100} type={showPass?'text':'password'} placeholder={mode==='register'?(t.authMinChars):'••••••••'} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 44px 12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            <button type="button" onClick={()=>setShowPass(s=>!s)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px',padding:'4px'}}>{showPass?'🙈':'👁'}</button>
          </div>
        </div>}

        {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px',border:'1px solid #ef444430'}}>{err}</div>}
        {msg&&<div style={{color:'#22c55e',fontSize:'13px',padding:'8px 12px',background:'#22c55e10',borderRadius:'8px',border:'1px solid #22c55e30'}}>{msg}</div>}

        <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',opacity:loading?0.7:1,marginTop:'4px'}}>
          {loading?'...':(mode==='reset'?(t.authSendEmail):(mode==='register'?t.authCreateAccount:t.authSignInTab))}
        </button>

        {mode==='login'&&<button type="button" onClick={()=>{setMode('reset');setErr('');setMsg('');}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'13px',fontFamily:'inherit',padding:'4px',textAlign:'center'}}>
          {t.authForgotPass}
        </button>}
        {mode==='reset'&&<button type="button" onClick={()=>{setMode('login');setErr('');setMsg('');}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'13px',fontFamily:'inherit',padding:'4px',textAlign:'center'}}>
          {t.authBackLogin}
        </button>}
      </form>

      {mode!=='reset'&&<>
        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'20px 0'}}>
          <div style={{flex:1,height:'1px',background:c.BD}}/>
          <span style={{fontSize:'12px',color:c.M,whiteSpace:'nowrap'}}>{t.orContinueWith}</span>
          <div style={{flex:1,height:'1px',background:c.BD}}/>
        </div>

        {/* OAuth buttons */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <button onClick={()=>authSignInWithProvider('google')} disabled={loading} style={{width:'100%',padding:'12px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600',color:c.T,display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t.continueGoogle}
          </button>
        </div>
      </>}
      </>}
    </div>
  </div>);
}
