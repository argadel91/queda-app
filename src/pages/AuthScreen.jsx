import React, { useState } from 'react'
import T from '../constants/translations.js'
import { authSignIn, authSignUp, authResetPassword } from '../lib/auth.js'
import { loadProfile, saveProfile } from '../lib/supabase.js'

export default function AuthScreen({onAuth,c,lang,onLangChange}){
  const t=T[lang];const isEs=lang==='es';
  const[mode,setMode]=useState('login'); // login | register | reset
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[name,setName]=useState('');
  const[username,setUsername]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const[showPass,setShowPass]=useState(false);
  const[langMenuOpen,setLangMenuOpen]=useState(false);

  const validate=()=>{
    if(!email.trim()||!email.includes('@')){setErr(t.authInvalidEmail);return false;}
    if(mode!=='reset'&&password.length<6){setErr(t.authPassMin);return false;}
    if(mode==='register'&&!name.trim()){setErr(t.authEnterName);return false;}
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
          setErr(isEs?'Confirma tu email antes de entrar.':'Please confirm your email first.');
        }else{
          setErr(error.message||isEs?'Error al iniciar sesión.':'Sign in error.');
        }
        setLoading(false);return;
      }
      let prof=await loadProfile(data.user.id);
      if(!prof){
        // No profile exists yet - create one
        prof={name:data.user.email.split('@')[0],email:data.user.email,lang,contacts:[]};
        await saveProfile(data.user.id,prof);
      }
      onAuth(data.user,prof);
      // Small delay then reload to ensure state is clean
      setTimeout(()=>window.location.reload(),100);
    }catch(e){
      console.error('Login error:',e);
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
          setErr(error.message||isEs?'Error al crear la cuenta.':'Error creating account.');
        }
        setLoading(false);return;
      }
      const prof={name:name.trim(),username:username.trim()||null,email:email.trim().toLowerCase(),lang,contacts:[]};
      await saveProfile(data.user.id,prof);
      onAuth(data.user,prof);
    }catch(e){
      console.error('Register error:',e);
      setErr(t.authConnError);
    }
    setLoading(false);
  };

  const handleReset=async()=>{
    if(!email.trim()||!email.includes('@')){setErr(t.authInvalidEmail);return;}
    setLoading(true);setErr('');
    const{error}=await authResetPassword(email.trim().toLowerCase());
    if(error){setErr(isEs?'Error al enviar el email.':'Error sending email.');setLoading(false);return;}
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

      {/* Mode tabs */}
      <div style={{display:'flex',gap:'4px',background:c.CARD2,borderRadius:'10px',padding:'4px',marginBottom:'28px'}}>
        {[[`login`,t.authSignInTab],[`register`,t.authRegisterTab]].map(([m,lbl])=>(
          <button key={m} onClick={()=>{setMode(m);setErr('');setMsg('');}} style={{flex:1,padding:'9px',borderRadius:'7px',border:'none',background:mode===m?c.CARD:'transparent',color:mode===m?c.T:c.M2,fontWeight:mode===m?'700':'400',cursor:'pointer',fontFamily:'inherit',fontSize:'14px',transition:'all .15s'}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {mode==='reset'&&<div style={{fontSize:'14px',color:c.M2,marginBottom:'4px'}}>{t.authResetInfo}</div>}

        {mode==='register'&&<>
          <div>
            <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>{t.authNameLabel||isEs?'Tu nombre':'Your name'}</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.authDisplayName} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>{t.authAliasLabel||isEs?'Alias (opcional)':'Alias (optional)'}</div>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:c.M,fontSize:'15px',fontWeight:'600'}}>@</span>
              <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20))} placeholder="tu_alias" style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px 12px 30px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            </div>
          </div>
        </>}

        <div>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>Email</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(mode==='reset'?handleReset():mode==='register'?handleRegister():handleLogin())} type="email" placeholder={isEs?'tu@email.com':'you@email.com'} autoFocus style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
        </div>

        {mode!=='reset'&&<div>
          <div style={{fontSize:'11px',color:c.M,fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'5px'}}>{t.authPassword}</div>
          <div style={{position:'relative'}}>
            <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(mode==='register'?handleRegister():handleLogin())} type={showPass?'text':'password'} placeholder={mode==='register'?(t.authMinChars):'••••••••'} style={{width:'100%',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'12px 44px 12px 14px',color:c.T,fontSize:'15px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
            <button onClick={()=>setShowPass(s=>!s)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:c.M,cursor:'pointer',fontSize:'16px',padding:'4px'}}>{showPass?'🙈':'👁'}</button>
          </div>
        </div>}

        {err&&<div style={{color:'#ef4444',fontSize:'13px',padding:'8px 12px',background:'#ef444410',borderRadius:'8px',border:'1px solid #ef444430'}}>{err}</div>}
        {msg&&<div style={{color:'#22c55e',fontSize:'13px',padding:'8px 12px',background:'#22c55e10',borderRadius:'8px',border:'1px solid #22c55e30'}}>{msg}</div>}

        <button onClick={mode==='reset'?handleReset:mode==='register'?handleRegister:handleLogin} disabled={loading} style={{width:'100%',padding:'14px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',opacity:loading?0.7:1,marginTop:'4px'}}>
          {loading?'...':(mode==='reset'?(t.authSendEmail):(mode==='register'?t.authCreateAccount:t.authSignInTab))}
        </button>

        {mode==='login'&&<button onClick={()=>{setMode('reset');setErr('');setMsg('');}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'13px',fontFamily:'inherit',padding:'4px',textAlign:'center'}}>
          {t.authForgotPass}
        </button>}
        {mode==='reset'&&<button onClick={()=>{setMode('login');setErr('');setMsg('');}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'13px',fontFamily:'inherit',padding:'4px',textAlign:'center'}}>
          {t.authBackLogin}
        </button>}
      </div>
    </div>
  </div>);
}


// ─── RESET PASSWORD SCREEN ────────────────────────────
