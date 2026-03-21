import React, { useState, useEffect, useMemo } from 'react'
import T from './constants/translations.js'
import { C, getSysTheme, applyTheme, getMC } from './constants/theme.js'
import { db, setToastFn } from './lib/supabase.js'
import { authSignOut, getSession, getOrCreateProfile } from './lib/auth.js'
import { saveProfile, loadProfile, loadPlan } from './lib/supabase.js'
import { ls, getMyPlans } from './lib/storage.js'
import { fmtDate, daysUntil, fmtShort } from './lib/utils.js'

import AuthScreen from './pages/AuthScreen.jsx'
import ResetPasswordScreen from './pages/ResetPasswordScreen.jsx'
import Home from './pages/Home.jsx'
import ModeSelect from './pages/ModeSelect.jsx'
import Create from './pages/Create.jsx'
import Share from './pages/Share.jsx'
import PlanPreview from './pages/PlanPreview.jsx'
import Respond from './pages/Respond.jsx'
import Results from './pages/Results.jsx'
import Profile from './pages/Profile.jsx'
import Discover from './pages/Discover.jsx'

export default function App(){
  const[theme,setTheme]=useState(()=>ls.get('q_theme',null)||getSysTheme());
  const[lang,setLang]=useState(()=>{
    const saved=ls.get('q_lang',null);
    if(saved)return saved;
    const bl=(navigator.language||'es').slice(0,2).toLowerCase();
    const supported=['es','en','pt','fr','de','it'];
    return supported.includes(bl)?bl:'es';
  });
  const[screen,setScreen]=useState('home');
  const[plan,setPlan]=useState(null);
  const[isOrg,setIsOrg]=useState(false);
  const[pendingMode,setPendingMode]=useState(null);
  const[toast,setToast]=useState(null);
  const[langOpen,setLangOpen]=useState(false);
  const[avatarOpen,setAvatarOpen]=useState(false);
  const[authUser,setAuthUser]=useState(null);   // supabase user object
  const[profile,setProfile]=useState(null);     // {name, email, contacts}
  const[authLoading,setAuthLoading]=useState(true); // checking session
  const[resetMode,setResetMode]=useState(false); // password recovery flow
  const c=useMemo(()=>C(theme),[theme]);
  useEffect(()=>{applyTheme(theme);},[theme]);
  useEffect(()=>{setToastFn(msg=>{setToast(msg);setTimeout(()=>setToast(null),4000);});},[]);
  const tgTheme=()=>setTheme(t=>{const n=t==='dark'?'light':'dark';applyTheme(n);ls.set('q_theme',n);return n;});
  const LANGS=['es','en','pt','fr','de','it'];
  const LANG_FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};

  // Auth: check session on load + listen for changes
  useEffect(()=>{
    // Timeout safety - if Supabase doesn't respond in 5s, show login
    const timeout=setTimeout(()=>setAuthLoading(false),5000);
    getSession().then(async session=>{
      clearTimeout(timeout);
      if(session?.user){
        try{
          let prof=await loadProfile(session.user.id);
          if(!prof){
            prof={name:session.user.email.split('@')[0],email:session.user.email,contacts:[]};
            await saveProfile(session.user.id,prof);
          }
          setAuthUser(session.user);
          setProfile(prof);
          if(prof?.lang)setLang(prof.lang);
        }catch(e){console.error('Profile load error:',e);}
      }
      setAuthLoading(false);
    }).catch(e=>{
      clearTimeout(timeout);
      console.error('Session check error:',e);
      setAuthLoading(false);
    });
    const{data:{subscription}}=db.auth.onAuthStateChange(async(event,session)=>{
      // Clear auth tokens from URL hash
      if(window.location.hash&&(window.location.hash.includes('access_token')||window.location.hash.includes('type=recovery'))){
        window.history.replaceState(null,'',window.location.pathname+window.location.search);
      }
      // Password recovery - show reset form, don't log in
      if(event==='PASSWORD_RECOVERY'){
        setResetMode(true);
        setAuthLoading(false);
        return;
      }
      if(session?.user){
        try{
          const prof=await loadProfile(session.user.id);
          setAuthUser(session.user);
          setProfile(prof);
          if(prof?.lang)setLang(prof.lang);
        }catch(e){console.error(e);}
      }else{
        setAuthUser(null);setProfile(null);
        setResetMode(false);
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  const handleAuth=(user,prof)=>{setAuthUser(user);setProfile(prof);if(prof?.lang)setLang(prof.lang);};
  const handleSignOut=async()=>{try{await authSignOut();}catch(e){console.error('signOut error:',e);}ls.set('q_state',{});ls.set('q_plans',[]);window.location.reload();};
  const updateProfile=async(updates)=>{
    if(!authUser)return;
    const updated={...profile,...updates};
    setProfile(updated);
    await saveProfile(authUser.id,updated);
    if(updates.lang)setLang(updates.lang);
  };

  useEffect(()=>{
    const code=new URLSearchParams(location.search).get('code');
    if(code){loadPlan(code).then(p=>{if(p){setPlan(p);setIsOrg(false);setScreen('preview');}});return;}
    const saved=ls.get('q_state',null);
    if(saved?.planId){loadPlan(saved.planId).then(p=>{if(p){setPlan(p);setIsOrg(false);setScreen(saved.screen||'home');}});}
  },[]);
  const nav=(s,p=null,org=false)=>{setScreen(s);if(p)setPlan(p);if(!p&&s==='home'){setPlan(null);setIsOrg(false);}else setIsOrg(org);if(s!=='home')ls.set('q_state',{screen:s,planId:p?.id||plan?.id,isOrg:org});else ls.set('q_state',{});};
  const handleJoin=async code=>{const p=await loadPlan(code);if(p){setPlan(p);setIsOrg(false);setScreen('preview');ls.set('q_state',{screen:'preview',planId:p.id,isOrg:false});return true;}return false;};
  const handleFromProfile=async id=>{const p=await loadPlan(id);if(p){const mine=getMyPlans().find(x=>x.id===id);nav('results',p,mine?.role==='organizer');}};
  const handleDiscoverJoin=async id=>{const p=await loadPlan(id);if(p){setPlan(p);setIsOrg(false);setScreen('preview');}};
  const mc=plan?.mode?getMC(plan.mode,c):c.A;
  const noNav=['home','create','select-mode','profile','discover','preview'];
  if(authLoading)return(<div style={{minHeight:'100vh',background:c.BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}><div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'28px',color:c.T}}>queda<span style={{color:c.A}}>.</span></div><div style={{width:'24px',height:'24px',border:`3px solid ${c.BD}`,borderTop:`3px solid ${c.A}`,borderRadius:'50%',animation:'spin 1s linear infinite'}}/></div>);
  if(resetMode)return<ResetPasswordScreen onDone={()=>{setResetMode(false);authSignOut();}} c={c} lang={lang}/>;
  if(!authUser)return<AuthScreen onAuth={handleAuth} c={c} lang={lang} onLangChange={l=>{setLang(l);ls.set('q_lang',l);}}/>
  return(<div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}} onClick={()=>{setLangOpen(false);setAvatarOpen(false);}}>
    {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:'#ef4444',color:'#fff',padding:'12px 20px',borderRadius:'30px',fontWeight:'600',fontSize:'13px',zIndex:300,boxShadow:'0 4px 20px rgba(0,0,0,.4)',whiteSpace:'nowrap',animation:'slideDown .3s ease'}}>⚠️ {toast}</div>}
    <div style={{borderBottom:`1px solid ${c.BD}`,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:c.BG+'F0',backdropFilter:'blur(10px)',zIndex:10}}>
      <div onClick={()=>nav('home')} style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',cursor:'pointer',color:c.T,letterSpacing:'-.02em'}}>queda<span style={{color:c.A}}>.</span></div>
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        {plan&&!noNav.includes(screen)&&<span style={{color:mc,fontWeight:'800',fontSize:'12px',letterSpacing:'.1em'}}>{plan.id}</span>}
        <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setLangOpen(o=>!o)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',gap:'4px',color:c.T,fontFamily:'inherit',fontWeight:'500'}}>
            {LANG_FLAGS[lang]||'🌐'} <span style={{fontSize:'11px'}}>{lang.toUpperCase()}</span> <span style={{fontSize:'10px',color:c.M}}>▾</span>
          </button>
          {langOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'130px'}}>
            {LANGS.map(l=><button key={l} onClick={()=>{setLang(l);ls.set('q_lang',l);setLangOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'10px 14px',background:l===lang?`${c.A}15`:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:l===lang?c.A:c.T,fontWeight:l===lang?'700':'400',textAlign:'left'}}>
              <span>{LANG_FLAGS[l]}</span><span>{({es:'Español',en:'English',pt:'Português',fr:'Français',de:'Deutsch',it:'Italiano'})[l]}</span>
              {l===lang&&<span style={{marginLeft:'auto',color:c.A}}>✓</span>}
            </button>)}
          </div>}
        </div>
        <button onClick={tgTheme} title={theme==='dark'?(lang==='es'?'Modo claro':'Light mode'):(lang==='es'?'Modo oscuro':'Dark mode')} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'6px 10px',cursor:'pointer',fontSize:'15px'}}>{theme==='dark'?'☀️':'🌙'}</button>
        {authUser&&<div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button onClick={e=>{e.stopPropagation();setAvatarOpen(o=>!o);}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontSize:'13px',color:c.T,fontFamily:'inherit',fontWeight:'500',display:'flex',alignItems:'center',gap:'5px'}}>
            <span style={{width:'22px',height:'22px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:0}}>{(profile?.name||authUser.email||'?')[0].toUpperCase()}</span>
            <span style={{maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||authUser.email}</span>
            <span style={{fontSize:'10px',color:c.M}}>▾</span>
          </button>
          {avatarOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'150px'}}>
            <button onClick={e=>{e.stopPropagation();nav('profile');setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:c.T,textAlign:'left'}}>👤 {T[lang]?.myPlansT||'Mi perfil'}</button>
            <button onClick={e=>{e.stopPropagation();handleSignOut();setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:'#ef4444',textAlign:'left'}}>🚪 {T[lang]?.signOut||'Cerrar sesión'}</button>
          </div>}
        </div>}
      </div>
    </div>
    {screen==='home'&&<Home onCreate={()=>nav('select-mode')} onJoin={handleJoin} onProfile={()=>nav('profile')} onDiscover={()=>nav('discover')} c={c} lang={lang}/>}
    {screen==='select-mode'&&<ModeSelect onSelect={m=>{setPendingMode(m);nav('create');}} onBack={()=>nav('home')} c={c} lang={lang}/>}
    {screen==='profile'&&<Profile onBack={()=>nav('home')} onOpen={handleFromProfile} c={c} lang={lang} authUser={authUser} profile={profile} onUpdateProfile={updateProfile} onSignOut={handleSignOut}/>}
    {screen==='discover'&&<Discover onBack={()=>nav('home')} onJoin={handleDiscoverJoin} c={c} lang={lang}/>}
    {screen==='create'&&<Create onBack={()=>nav('select-mode')} onCreated={p=>nav('share',p,true)} c={c} lang={lang} mode={pendingMode||'social'} authUser={authUser} profile={profile}/>}
    {screen==='share'&&plan&&<Share plan={plan} onViewResults={()=>nav('results',plan,isOrg)} onBack={()=>nav('home')} c={c} lang={lang}/>}
    {screen==='preview'&&plan&&<PlanPreview plan={plan} onRespond={()=>nav('respond',plan,false)} onBack={()=>nav('home')} c={c} lang={lang}/>}
    {screen==='respond'&&plan&&<Respond plan={plan} onBack={()=>nav('preview',plan,false)} onDone={()=>nav('results',plan,false)} onCreateOwn={()=>nav('select-mode')} c={c} lang={lang} authUser={authUser} profile={profile}/>}
    {screen==='results'&&plan&&<Results plan={plan} onBack={()=>nav('home')} isOrg={isOrg} c={c} lang={lang}/>}
  </div>);
}
