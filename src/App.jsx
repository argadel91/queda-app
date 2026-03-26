import React, { useState, useEffect, useMemo } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
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
const Results = React.lazy(() => import('./pages/Results.jsx'))
const Profile = React.lazy(() => import('./pages/Profile.jsx'))
const MyPlans = React.lazy(() => import('./pages/MyPlans.jsx'))

function AppInner(){
  const navigate=useNavigate();
  const location=useLocation();
  const[theme,setTheme]=useState(()=>ls.get('q_theme',null)||getSysTheme());
  const[lang,setLang]=useState(()=>{
    const saved=ls.get('q_lang',null);
    if(saved)return saved;
    const bl=(navigator.language||'es').slice(0,2).toLowerCase();
    const supported=['es','en','pt','fr','de','it'];
    return supported.includes(bl)?bl:'es';
  });
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
  const[authUser,setAuthUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[resetMode,setResetMode]=useState(false);
  const c=useMemo(()=>C(theme),[theme]);
  useEffect(()=>{applyTheme(theme);},[theme]);
  useEffect(()=>{setToastFn((msg,type='error')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);});},[]);
  useEffect(()=>{const handler=e=>{e.preventDefault();setInstallPrompt(e);if(!ls.get('q_install_dismissed',false))setShowInstall(true);};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler);},[]);
  useEffect(()=>{
    const off=()=>setToast({msg:T[lang]?.offlineMsg||'No internet connection',type:'error'});
    const on=()=>setToast({msg:T[lang]?.onlineMsg||'Back online',type:'success'});
    window.addEventListener('offline',off);window.addEventListener('online',on);
    return()=>{window.removeEventListener('offline',off);window.removeEventListener('online',on);};
  },[lang]);
  const tgTheme=()=>setTheme(t=>{const n=t==='dark'?'light':'dark';applyTheme(n);ls.set('q_theme',n);return n;});

  // Auth
  useEffect(()=>{
    if(window.location.pathname==='/auth/callback'){
      const params=new URLSearchParams(window.location.search);
      if(params.get('code')){
        db.auth.exchangeCodeForSession(params.get('code')).then(()=>{navigate('/',{replace:true});}).catch(()=>{navigate('/',{replace:true});});
      }else{navigate('/',{replace:true});}
    }
    const timeout=setTimeout(()=>setAuthLoading(false),5000);
    getSession().then(async session=>{
      clearTimeout(timeout);
      if(session?.user){
        let prof=null;
        try{prof=await loadProfile(session.user.id);}catch{}
        if(!prof){prof={name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]};try{await saveProfile(session.user.id,prof);}catch{}}
        setAuthUser(session.user);setProfile(prof);if(prof?.lang)setLang(prof.lang);Sentry.setUser({id:session.user.id,email:session.user.email});
        syncMyPlans(session.user.id).catch(()=>{});
      }
      setAuthLoading(false);
    }).catch(()=>{clearTimeout(timeout);setAuthLoading(false);});
    const{data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
      if(window.location.hash&&(window.location.hash.includes('access_token')||window.location.hash.includes('type=recovery'))){navigate('/',{replace:true});}
      if(event==='PASSWORD_RECOVERY'){setResetMode(true);setAuthLoading(false);return;}
      if(session?.user){
        loadProfile(session.user.id).then(prof=>{
          if(!prof){prof={name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]};saveProfile(session.user.id,prof).catch(()=>{});}
          setAuthUser(session.user);setProfile(prof);Sentry.setUser({id:session.user.id,email:session.user.email});
          const savedLang=ls.get('q_lang',null);if(savedLang)setLang(savedLang);else if(prof?.lang)setLang(prof.lang);
          syncMyPlans(session.user.id).catch(()=>{});setAuthLoading(false);
        }).catch(()=>{setAuthUser(session.user);setProfile({name:session.user.email?.split('@')[0]||'User',email:session.user.email||'',contacts:[]});setAuthLoading(false);});
      }else{setAuthUser(null);setProfile(null);setResetMode(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  // Load preview for unauth users on /plan/:code
  useEffect(()=>{
    const m=location.pathname.match(/^\/plan\/([A-Z0-9]+)$/i);
    const code=m?.[1]||new URLSearchParams(location.search).get('code');
    if(code&&!authUser&&!previewPlan)loadPlan(code).then(p=>{if(p)setPreviewPlan(p);});
  },[authUser,location.pathname]);

  const handleAuth=(user,prof)=>{setAuthUser(user);setProfile(prof);if(prof?.lang)setLang(prof.lang);Sentry.setUser({id:user?.id,email:user?.email});};
  const handleSignOut=async()=>{Sentry.setUser(null);try{await authSignOut();}catch{}ls.set('q_plans',[]);navigate('/');window.location.reload();};
  const updateProfile=async(updates)=>{if(!authUser)return;const updated={...profile,...updates};setProfile(updated);await saveProfile(authUser.id,updated);if(updates.lang)setLang(updates.lang);};

  // Nav helper
  const nav=(path,p=null,org=false)=>{
    if(p)setPlan(p);
    setIsOrg(org);
    if(path==='/'||path==='home'){setPlan(null);setIsOrg(false);navigate('/');}
    else navigate(path);
  };
  const handleJoin=async code=>{const p=await loadPlan(code);if(p){setPlan(p);setIsOrg(false);navigate('/plan/'+p.id);return true;}return false;};
  const handleFromProfile=async id=>{const p=await loadPlan(id);if(p){const mine=getMyPlans().find(x=>x.id===id);const isOwner=mine?.role==='organizer'||(authUser&&p._owner===authUser.id);setPlan(p);setIsOrg(isOwner);navigate('/plan/'+id);}};

  // SEO — update all meta tags per page
  useEffect(()=>{
    const set=(sel,attr,val)=>{const el=document.querySelector(sel);if(el)el[attr]=val;};
    if(plan){
      const title=`${plan.name||'Plan'} — queda.`;
      const desc=`${plan.organizer} invites you to ${plan.name||'a plan'}. Vote now!`;
      const url=`https://www.queda.xyz/plan/${plan.id}`;
      document.title=title;
      set('meta[name="description"]','content',desc);
      set('meta[property="og:title"]','content',title);
      set('meta[property="og:description"]','content',desc);
      set('meta[property="og:url"]','content',url);
      set('meta[name="twitter:title"]','content',title);
      set('meta[name="twitter:description"]','content',desc);
      set('link[rel="canonical"]','href',url);
    }else{
      const title='queda. — Group plans, zero chaos';
      const desc='One date, one time, one place — everyone votes. Free.';
      document.title='queda.';
      set('meta[name="description"]','content',desc);
      set('meta[property="og:title"]','content',title);
      set('meta[property="og:description"]','content',desc);
      set('meta[property="og:url"]','content','https://www.queda.xyz');
      set('meta[name="twitter:title"]','content',title);
      set('meta[name="twitter:description"]','content',desc);
      set('link[rel="canonical"]','href','https://www.queda.xyz');
    }
  },[plan,location.pathname]);

  const mc=c.A;
  const Fallback=()=><div style={{minHeight:'100vh',background:c.BG,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',color:c.T}}>queda<span style={{color:c.A}}>.</span></div></div>;
  if(authLoading)return(<div style={{minHeight:'100vh',background:c.BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}><div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'28px',color:c.T}}>queda<span style={{color:c.A}}>.</span></div><div style={{width:'24px',height:'24px',border:`3px solid ${c.BD}`,borderTop:`3px solid ${c.A}`,borderRadius:'50%',animation:'spin 1s linear infinite'}}/></div>);
  if(resetMode)return<React.Suspense fallback={<Fallback/>}><ResetPasswordScreen onDone={()=>{setResetMode(false);authSignOut();}} c={c} lang={lang}/></React.Suspense>;
  if(!authUser){
    if(showAuth)return<React.Suspense fallback={<Fallback/>}><AuthScreen onAuth={handleAuth} c={c} lang={lang} onLangChange={l=>{setLang(l);ls.set('q_lang',l);}}/></React.Suspense>
    if(previewPlan)return<div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:'420px',margin:'0 auto',padding:'40px 24px',textAlign:'center'}}>
        <div style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',marginBottom:'32px'}}>queda<span style={{color:c.A}}>.</span></div>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🎉</div>
        <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',marginBottom:'8px'}}>{previewPlan.name}</h2>
        <div style={{fontSize:'14px',color:c.M2,marginBottom:'4px'}}>@ {previewPlan.organizer}</div>
        {previewPlan.desc&&<p style={{fontSize:'14px',color:c.M2,lineHeight:1.6,marginBottom:'16px'}}>{previewPlan.desc}</p>}
        <div style={{fontSize:'13px',color:c.M2,marginBottom:'24px'}}>{previewPlan.dates?.length||0} {T[lang]?.datesStep||'dates'} · {previewPlan.stops?.length||0} {T[lang]?.stop||'stops'}</div>
        <button onClick={()=>setShowAuth(true)} style={{width:'100%',padding:'16px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',marginBottom:'10px'}}>{T[lang]?.landingCTA||'Join this plan'}</button>
        <div style={{fontSize:'12px',color:c.M}}>{T[lang]?.landingNoCreditCard||'Free, no credit card'}</div>
      </div>
    </div>;
    return<Landing onGetStarted={()=>setShowAuth(true)} c={c} lang={lang} onLangChange={l=>{setLang(l);ls.set('q_lang',l);}}/>
  }

  // Plan loader component for /plan/:code route
  const PlanPage=()=>{
    const{code}=useParams();
    useEffect(()=>{
      if(code&&(!plan||plan.id!==code)){
        loadPlan(code).then(p=>{if(p){setPlan(p);const mine=getMyPlans().find(x=>x.id===code);const isOwner=mine?.role==='organizer'||(authUser&&p._owner===authUser.id);setIsOrg(!!isOwner);}});
      }
    },[code]);
    if(!plan||plan.id!==code)return<Fallback/>;
    return<Results plan={plan} onBack={()=>navigate('/plans')} isOrg={isOrg} c={c} lang={lang} showShare={showShareModal} onCloseShare={()=>setShowShareModal(false)}/>;
  };

  // Preview loader for legacy ?code= URLs
  const LegacyCodeRedirect=()=>{
    const[sp]=useSearchParams();
    const code2=sp.get('code');
    useEffect(()=>{if(code2)navigate('/plan/'+code2,{replace:true});},[code2]);
    return<Fallback/>;
  };

  const isHome=location.pathname==='/';
  return(<React.Suspense fallback={<Fallback/>}><div style={{minHeight:'100vh',background:c.BG,color:c.T,fontFamily:"'DM Sans',system-ui,sans-serif"}} onClick={()=>{setLangOpen(false);setAvatarOpen(false);}}>
    {toast&&<div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:toast.type==='success'?'#22c55e':toast.type==='info'?c.A:'#ef4444',color:toast.type==='info'?'#0A0A0A':'#fff',padding:'12px 20px',borderRadius:'30px',fontWeight:'600',fontSize:'13px',zIndex:300,boxShadow:'0 4px 20px rgba(0,0,0,.4)',whiteSpace:'nowrap',animation:'slideDown .3s ease'}}>{toast.type==='success'?'✓':toast.type==='info'?'ℹ':'⚠️'} {toast.msg}</div>}
    <div style={{borderBottom:`1px solid ${c.BD}`,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:c.BG+'F0',backdropFilter:'blur(10px)',zIndex:10}}>
      <div onClick={()=>navigate('/')} style={{fontFamily:"'Syne',serif",fontWeight:'800',fontSize:'22px',cursor:'pointer',color:c.T,letterSpacing:'-.02em'}}>queda<span style={{color:c.A}}>.</span></div>
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button title={T[lang]?.tipLang} aria-label="Change language" onClick={()=>setLangOpen(o=>!o)} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 8px',cursor:'pointer',fontSize:'14px',color:c.T,fontFamily:'inherit'}}>{({es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'})[lang]}</button>
          {langOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden'}}>
            {['es','en','pt','fr','de','it'].map(l=><button key={l} onClick={()=>{setLang(l);ls.set('q_lang',l);if(authUser)saveProfile(authUser.id,{...profile,lang:l}).catch(()=>{});setLangOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'10px 14px',background:l===lang?`${c.A}15`:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontSize:'13px',color:l===lang?c.A:c.T,fontWeight:l===lang?'700':'400',fontFamily:'inherit'}}>{({es:'🇪🇸',en:'🇬🇧',pt:'🇵🇹',fr:'🇫🇷',de:'🇩🇪',it:'🇮🇹'})[l]}</button>)}
          </div>}
        </div>
        <button title={T[lang]?.tipTheme} aria-label="Toggle theme" onClick={tgTheme} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 8px',cursor:'pointer',fontSize:'14px',color:c.T,fontFamily:'inherit'}}>{theme==='dark'?'☀️':'🌙'}</button>
        {!isHome&&<button title={T[lang]?.tipHome} aria-label="Go home" onClick={()=>navigate('/')} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontSize:'12px',color:c.T,fontFamily:'inherit',fontWeight:'600'}}>🏠</button>}
        {plan&&location.pathname.startsWith('/plan/')&&<span style={{color:mc,fontWeight:'800',fontSize:'12px',letterSpacing:'.1em'}}>{plan.id}</span>}
        {authUser&&<div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
          <button title={T[lang]?.tipProfile} onClick={e=>{e.stopPropagation();setAvatarOpen(o=>!o);}} style={{background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'8px',padding:'5px 8px',cursor:'pointer',fontSize:'13px',color:c.T,fontFamily:'inherit',fontWeight:'500',display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{width:'22px',height:'22px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:0}}>{(profile?.name||authUser.email||'?')[0].toUpperCase()}</span>
            <span style={{fontSize:'10px',color:c.M}}>▾</span>
          </button>
          {avatarOpen&&<div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'10px',boxShadow:'0 8px 24px rgba(0,0,0,.3)',zIndex:100,overflow:'hidden',minWidth:'150px'}}>
            <button onClick={e=>{e.stopPropagation();navigate('/profile');setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:c.T,textAlign:'left'}}>👤 {T[lang]?.myProfile||'My profile'}</button>
            <button onClick={e=>{e.stopPropagation();handleSignOut();setAvatarOpen(false);}} style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'11px 14px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',color:'#ef4444',textAlign:'left'}}>🚪 {T[lang]?.signOut||'Sign out'}</button>
          </div>}
        </div>}
      </div>
    </div>
    <Routes>
      <Route path="/" element={<Home onCreate={()=>navigate('/create/date')} onJoin={handleJoin} onProfile={()=>navigate('/plans')} c={c} lang={lang}/>}/>
      <Route path="/create" element={<Create onBack={()=>navigate('/')} onCreated={p=>{setPlan(p);setIsOrg(true);navigate('/plan/'+p.id);}} c={c} lang={lang} authUser={authUser} profile={profile}/>}/>
      <Route path="/create/:step" element={<Create onBack={()=>navigate('/')} onCreated={p=>{setPlan(p);setIsOrg(true);navigate('/plan/'+p.id);}} c={c} lang={lang} authUser={authUser} profile={profile}/>}/>
      <Route path="/plans" element={<MyPlans onBack={()=>navigate('/')} onOpen={handleFromProfile} c={c} lang={lang}/>}/>
      <Route path="/plan/:code" element={<PlanPage/>}/>
      <Route path="/profile" element={<Profile onBack={()=>navigate('/')} c={c} lang={lang} authUser={authUser} profile={profile} onUpdateProfile={updateProfile} onSignOut={handleSignOut} onLangChange={l=>{setLang(l);ls.set('q_lang',l);if(authUser)saveProfile(authUser.id,{...profile,lang:l}).catch(()=>{});}} onThemeToggle={tgTheme} theme={theme}/>}/>
      {/* Legacy ?code= redirect */}
      <Route path="*" element={<LegacyCodeRedirect/>}/>
    </Routes>
    {showInstall&&<div style={{position:'fixed',bottom:'0',left:'0',right:'0',background:c.CARD,borderTop:`1px solid ${c.BD}`,padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px',zIndex:50}}>
      <div style={{flex:1}}>
        <div style={{fontSize:'14px',color:c.T,fontWeight:'600'}}>{T[lang]?.installApp||'Install queda.'}</div>
        <div style={{fontSize:'12px',color:c.M2}}>{T[lang]?.installHint||'Add to home screen'}</div>
      </div>
      <button onClick={async()=>{if(installPrompt){await installPrompt.prompt();setShowInstall(false);}}} style={{padding:'8px 16px',background:c.A,border:'none',borderRadius:'8px',color:'#0A0A0A',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>{T[lang]?.installBtn||'Install'}</button>
      <button onClick={()=>{setShowInstall(false);ls.set('q_install_dismissed',true);}} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'18px',padding:'4px'}}>×</button>
    </div>}
  </div></React.Suspense>);
}

export default function App(){
  return<BrowserRouter><AppInner/></BrowserRouter>;
}
