import React, { useState, useEffect, useMemo } from 'react'
import T from './constants/translations.js'
import { C, getSysTheme, applyTheme } from './constants/theme.js'
import { db, setToastFn } from './lib/supabase.js'
import { authSignOut, getSession } from './lib/auth.js'
import { saveProfile, loadProfile, loadPlan } from './lib/supabase.js'
import { ls, getMyPlans, syncMyPlans } from './lib/storage.js'

import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'

const AuthScreen = React.lazy(() => import('./pages/AuthScreen.jsx'))
const ResetPasswordScreen = React.lazy(() => import('./pages/ResetPasswordScreen.jsx'))
const Create = React.lazy(() => import('./pages/Create.jsx'))
const Respond = React.lazy(() => import('./pages/Respond.jsx'))
const Results = React.lazy(() => import('./pages/Results.jsx'))
const Profile = React.lazy(() => import('./pages/Profile.jsx'))
const MyPlans = React.lazy(() => import('./pages/MyPlans.jsx'))

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

  const[toast,setToast]=useState(null);
  const[showShareModal,setShowShareModal]=useState(false);
  const[langOpen,setLangOpen]=useState(false);
  const[avatarOpen,setAvatarOpen]=useState(false);
  const[installPrompt,setInstallPrompt]=useState(null);
  const[showInstall,setShowInstall]=useState(false);
  const[showAuth,setShowAuth]=useState(false);
  const[previewPlan,setPreviewPlan]=useState(null);
  const[authUser,setAuthUser]=useState(null);   // supabase user object
  const[profile,setProfile]=useState(null);     // {name, email, contacts}
  const[authLoading,setAuthLoading]=useState(true); // checking session
  const[resetMode,setResetMode]=useState(false); // password recovery flow
  const c=useMemo(()=>C(theme),[theme]);
  useEffect(()=>{applyTheme(theme);},[theme]);
  useEffect(()=>{setToastFn((msg,type='error')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);});},[]);
  useEffect(()=>{const handler=e=>{e.preventDefault();setInstallPrompt(e);if(!ls.get('q_install_dismissed',false))setShowInstall(true);};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler);},[]);
  const tgTheme=()=>setTheme(t=>{const n=t==='dark'?'light':'dark';applyTheme(n);ls.set('q_theme',n);return n;});
  const LANGS=['es','en','pt','fr','de','it'];
  const LANG_FLAGS={es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'};

  // Auth: check session on load + listen for changes
  useEffect(()=>{
    // PKCE callback: exchange auth code for session
    if(window.location.pathname==='/auth/callback'){
      const params=new URLSearchParams(window.location.search);
      if(params.get('code')){
        db.auth.exchangeCodeForSession(params.get('code')).then(()=>{
          window.history.replaceState(null,'','/');
        }).catch(()=>{
          window.history.replaceState(null,'','/');
        });
      } else {
        window.history.replaceState(null,'','/');
      }
    }
    // Timeout safety - if Supabase doesn't respond in 5s, show login
    const timeout=setTimeout(()=>setAuthLoading(false),5000);
    getSession().then(async session=>{
      clearTimeout(timeout);
      if(session?.user){
        let prof=null;
        try{prof=await loadProfile(session.user.id);}catch{}
        if(!prof){
          prof={name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]};
          try{await saveProfile(session.user.id,prof);}catch{}
        }
        setAuthUser(session.user);
        setProfile(prof);
        if(prof?.lang)setLang(prof.lang);
        syncMyPlans(session.user.id).catch(()=>{});
      }
      setAuthLoading(false);
    }).catch(e=>{
      clearTimeout(timeout);
      setAuthLoading(false);
    });
    const{data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
      // Clear auth tokens from URL (legacy implicit flow)
      if(window.location.hash&&(window.location.hash.includes('access_token')||window.location.hash.includes('type=recovery'))){
        window.history.replaceState(null,'','/');
      }
      // Password recovery - show reset form, don't log in
      if(event==='PASSWORD_RECOVERY'){
        setResetMode(true);
        setAuthLoading(false);
        return;
      }
      if(session?.user){
        // Load profile in background - don't block auth
        loadProfile(session.user.id).then(prof=>{
          if(!prof){
            prof={name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]};
            saveProfile(session.user.id,prof).catch(()=>{});
          }
          setAuthUser(session.user);
          setProfile(prof);
          const savedLang=ls.get('q_lang',null);
          if(savedLang)setLang(savedLang);
          else if(prof?.lang)setLang(prof.lang);
          syncMyPlans(session.user.id).catch(()=>{});
          setAuthLoading(false);
        }).catch(e=>{
          setAuthUser(session.user);
          setProfile({name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]});
          setAuthLoading(false);
        });
      }else{
        setAuthUser(null);setProfile(null);
        setResetMode(false);
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  // Load plan preview for unauthenticated users with ?code=
  useEffect(()=>{
    const code=new URLSearchParams(location.search).get('code');
    if(code&&!authUser&&!previewPlan){loadPlan(code).then(p=>{if(p)setPreviewPlan(p);});}
  },[authUser]);

  const handleAuth=(user,prof)=>{setAuthUser(user);setProfile(prof);if(prof?.lang)setLang(prof.lang);};
  const handleSignOut=async()=>{try{await authSignOut();}catch{}ls.set('q_state',{});ls.set('q_plans',[]);window.location.reload();};
  const updateProfile=async(updates)=>{
    if(!authUser)return;
    const updated={...profile,...updates};
    setProfile(updated);
    await saveProfile(authUser.id,updated);
    if(updates.lang)setLang(updates.lang);
  };

  // Dynamic title + meta tags for SEO & share previews
  useEffect(()=>{
    if(plan){
      document.title=`${plan.name} — queda.`;
      const desc=document.querySelector('meta[name="description"]');
      if(desc)desc.content=`${plan.organizer} te invita a ${plan.name}. ${plan.stops?.length||0} paradas.`;
      const ogTitle=document.querySelector('meta[property="og:title"]');
      if(ogTitle)ogTitle.content=`${plan.name} — queda.`;
      const ogDesc=document.querySelector('meta[property="og:description"]');
      if(ogDesc)ogDesc.content=`${plan.organizer} te invita. ${plan.dates?.length||0} fechas, ${plan.stops?.length||0} paradas.`;
      const ogUrl=document.querySelector('meta[property="og:url"]');
      if(ogUrl)ogUrl.content=`https://www.queda.xyz?code=${plan.id}`;
      const twTitle=document.querySelector('meta[name="twitter:title"]');
      if(twTitle)twTitle.content=`${plan.name} — queda.`;
      const twDesc=document.querySelector('meta[name="twitter:description"]');
      if(twDesc)twDesc.content=`${plan.organizer} te invita. ${plan.dates?.length||0} fechas, ${plan.stops?.length||0} paradas.`;
      const canonical=document.querySelector('link[rel="canonical"]');
      if(canonical)canonical.href=`https://www.queda.xyz?code=${plan.id}`;
    }else{
      document.title='queda.';
      const desc=document.querySelector('meta[name="description"]');
      if(desc)desc.content='Plan group events without the chaos. Dates, routes, outfits, weather & payments — all in one shareable code.';
      const ogTitle=document.querySelector('meta[property="og:title"]');
      if(ogTitle)ogTitle.content='queda. — Group plans, zero chaos';
      const ogDesc=document.querySelector('meta[property="og:description"]');
      if(ogDesc)ogDesc.content='Dates, routes, outfits, weather & payments in one code. Free.';
      const ogUrl=document.querySelector('meta[property="og:url"]');
      if(ogUrl)ogUrl.content='https://www.queda.xyz';
      const twTitle=document.querySelector('meta[name="twitter:title"]');
      if(twTitle)twTitle.content='queda. — Group plans, zero chaos';
      const twDesc=document.querySelector('meta[name="twitter:description"]');
      if(twDesc)twDesc.content='Dates, routes, outfits, weather & payments in one code. Free.';
      const canonical=document.querySelector('link[rel="canonical"]');
      if(canonical)canonical.href='https://www.queda.xyz';
    }
  },[plan,screen]);

  useEffect(()=>{
    const code=new URLSearchParams(location.search).get('code');
    if(code){loadPlan(code).then(p=>{if(p){setPlan(p);setIsOrg(false);setScreen('respond');}});return;}
    const saved=ls.get('q_state',null);
    if(saved?.planId){loadPlan(saved.planId).then(p=>{if(p){setPlan(p);setIsOrg(false);setScreen(saved.screen||'home');}});}
  },[]);
  const nav=(s,p=null,org=false)=>{setScreen(s);if(p)setPlan(p);if(!p&&s==='home'){setPlan(null);setIsOrg(false);}else setIsOrg(org);if(s!=='home')ls.set('q_state',{screen:s,planId:p?.id||plan?.id,isOrg:org});else ls.set('q_state',{});};
  const handleJoin=async code=>{const p=await loadPlan(code);if(p){setPlan(p);setIsOrg(false);setScreen('respond');ls.set('q_state',{screen:'respond',planId:p.id,isOrg:false});return true;}return false;};
  const handleFromProfile=async id=>{const p=await loadPlan(id);if(p){const mine=getMyPlans().find(x=>x.id===id);nav('results',p,mine?.role==='organizer');}};

  const mc=c.A;
  const noNav=['home','create','profile','myplans'];
  if(authLoading)return(<div style={{minHeight:'100vh',background:c.BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}><div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'28px',color:c.T}}>queda<span style={{color:c.A}}>.</span></div><div style={{width:'24px',height:'24px',border:`3px solid ${c.BD}`,borderTop:`3px solid ${c.A}`,borderRadius:'50%',animation:'spin 1s linear infinite'}}/></div>);
  const Fallback=()=><div style={{minHeight:'100vh',background:c.BG,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',color:c.T}}>queda<span style={{color:c.A}}>.</span></div></div>;
  if(resetMode)return<React.Suspense fallback={<Fallback/>}><ResetPasswordScreen onDone={()=>{setResetMode(false);authSignOut();}} c={c} lang={lang}/></React.Suspense>;
  const hasCode=new URLSearchParams(location.search).get('code');
  if(!authUser){
    if(showAuth)return<React.Suspense fallback={<Fallback/>}><AuthScreen onAuth={handleAuth} c={c} lang={lang} onLangChange={l=>{setLang(l);ls.set('q_lang',l);}}/></React.Suspense>
    if(previewPlan)return<div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:'420px',margin:'0 auto',padding:'40px 24px',textAlign:'center'}}>
        <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',marginBottom:'32px'}}>queda<span style={{color:c.A}}>.</span></div>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>{previewPlan.mode==='intimate'?'💘':previewPlan.mode==='professional'?'💼':'🎉'}</div>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',marginBottom:'8px'}}>{previewPlan.name}</h2>
        <div style={{fontSize:'14px',color:c.M2,marginBottom:'4px'}}>@ {previewPlan.organizer}</div>
        {previewPlan.desc&&<p style={{fontSize:'14px',color:c.M2,lineHeight:1.6,marginBottom:'16px'}}>{previewPlan.desc}</p>}
        {previewPlan.stops?.length>0&&<div style={{marginBottom:'16px'}}>
          {previewPlan.stops.slice(0,3).map((s,i)=>{const opt=s.options?.[0]||s;return opt.name?<div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',justifyContent:'center'}}>
            {opt.photo&&<img src={opt.photo} alt="" style={{width:'32px',height:'32px',borderRadius:'6px',objectFit:'cover'}}/>}
            <span style={{fontSize:'14px',color:c.T}}>{opt.name}</span>
            {opt.rating&&<span style={{fontSize:'12px',color:c.A}}>⭐{opt.rating}</span>}
          </div>:null;})}
        </div>}
        <div style={{fontSize:'13px',color:c.M2,marginBottom:'24px'}}>{previewPlan.dates?.length||0} {T[lang]?.datesStep||'dates'} · {previewPlan.stops?.length||0} {T[lang]?.stop||'stops'}</div>
        <button onClick={()=>setShowAuth(true)} style={{width:'100%',padding:'16px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginBottom:'10px'}}>{T[lang]?.landingCTA||'Join this plan'}</button>
        <div style={{fontSize:'12px',color:c.M}}>{T[lang]?.landingNoCreditCard||'Free, no credit card'}</div>
      </div>
    </div>;
    return<Landing onGetStarted={()=>setShowAuth(true)} c={c} lang={lang} onLangChange={l=>{setLang(l);ls.set('q_lang',l);}}/>
  }
  return(<React.Suspense fallback={<Fallback/>}><div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}} onClick={()=>{setLangOpen(false);setAvatarOpen(false);}}>
    {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:toast.type==='success'?'#22c55e':toast.type==='info'?c.A:'#ef4444',color:toast.type==='info'?'#0A0A0A':'#fff',padding:'12px 20px',borderRadius:'30px',fontWeight:'600',fontSize:'13px',zIndex:300,boxShadow:'0 4px 20px rgba(0,0,0,.4)',whiteSpace:'nowrap',animation:'slideDown .3s ease'}}>{toast.type==='success'?'✓':toast.type==='info'?'ℹ':'⚠️'} {toast.msg}</div>}
    <div style={{borderBottom:`1px solid ${c.BD}`,padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:c.BG+'F0',backdropFilter:'blur(10px)',zIndex:10}}>
      <div onClick={()=>nav('home')} style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',cursor:'pointer',color:c.T,letterSpacing:'-.02em'}}>queda<span style={{color:c.A}}>.</span></div>
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        {plan&&!noNav.includes(screen)&&<span style={{color:mc,fontWeight:'800',fontSize:'12px',letterSpacing:'.1em'}}>{plan.id}</span>}
        {authUser&&<div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button onClick={e=>{e.stopPropagation();setAvatarOpen(o=>!o);}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontSize:'13px',color:c.T,fontFamily:'inherit',fontWeight:'500',display:'flex',alignItems:'center',gap:'5px'}}>
            <span style={{width:'22px',height:'22px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:0}}>{(profile?.name||authUser.email||'?')[0].toUpperCase()}</span>
            <span style={{maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||authUser.email}</span>
            <span style={{fontSize:'10px',color:c.M}}>▾</span>
          </button>
          {avatarOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'150px'}}>
            <button onClick={e=>{e.stopPropagation();nav('profile');setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:c.T,textAlign:'left'}}>👤 {T[lang]?.myProfile||'My profile'}</button>

            <button onClick={e=>{e.stopPropagation();handleSignOut();setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:'#ef4444',textAlign:'left'}}>🚪 {T[lang]?.signOut||'Cerrar sesión'}</button>
          </div>}
        </div>}
      </div>
    </div>
    {screen==='home'&&<Home onCreate={()=>nav('create')} onJoin={handleJoin} onProfile={()=>nav('myplans')} c={c} lang={lang}/>}
    {screen==='profile'&&<Profile onBack={()=>nav('home')} c={c} lang={lang} authUser={authUser} profile={profile} onUpdateProfile={updateProfile} onSignOut={handleSignOut} onLangChange={l=>{setLang(l);ls.set('q_lang',l);if(authUser)saveProfile(authUser.id,{...profile,lang:l}).catch(()=>{});}} onThemeToggle={tgTheme} theme={theme}/>}
    {screen==='myplans'&&<MyPlans onBack={()=>nav('home')} onOpen={handleFromProfile} c={c} lang={lang}/>}

    {screen==='create'&&<Create onBack={()=>nav('home')} onCreated={p=>{setShowShareModal(true);nav('results',p,true);}} c={c} lang={lang} authUser={authUser} profile={profile}/>}
    {screen==='respond'&&plan&&<Respond plan={plan} onBack={()=>nav('home')} onDone={()=>nav('results',plan,false)} onCreateOwn={()=>nav('create')} c={c} lang={lang} authUser={authUser} profile={profile}/>}
    {screen==='results'&&plan&&<Results plan={plan} onBack={()=>nav('home')} isOrg={isOrg} c={c} lang={lang} showShare={showShareModal} onCloseShare={()=>setShowShareModal(false)}/>}
    {showInstall&&<div style={{position:'fixed',bottom:'0',left:'0',right:'0',background:c.CARD,borderTop:`1px solid ${c.BD}`,padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px',zIndex:50}}>
      <div style={{flex:1}}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{T[lang]?.installApp||'Install queda.'}</div>
        <div style={{fontSize:'12px',color:c.M2}}>{T[lang]?.installHint||'Add to home screen for quick access'}</div>
      </div>
      <button onClick={async()=>{if(installPrompt){await installPrompt.prompt();setShowInstall(false);}}} style={{padding:'8px 16px',background:c.A,border:'none',borderRadius:'8px',color:'#0A0A0A',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>{T[lang]?.installBtn||'Install'}</button>
      <button onClick={()=>{setShowInstall(false);ls.set('q_install_dismissed',true);}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'18px',padding:'4px'}}>×</button>
    </div>}
  </div></React.Suspense>);
}
