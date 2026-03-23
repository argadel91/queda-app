import React, { useState, useEffect, useRef } from 'react'
import T from '../constants/translations.js'
import { ls, getMyPlans } from '../lib/storage.js'
import { db, loadResps, updatePlan } from '../lib/supabase.js'
import { Btn, Card, Lbl, Back, HR } from '../components/ui.jsx'

const FLAGS={es:'\u{1F1EA}\u{1F1F8}',en:'\u{1F1EC}\u{1F1E7}',pt:'\u{1F1F5}\u{1F1F9}',fr:'\u{1F1EB}\u{1F1F7}',de:'\u{1F1E9}\u{1F1EA}',it:'\u{1F1EE}\u{1F1F9}'};
const LANGS=['es','en','pt','fr','de','it'];

const waMsgs={
  social:{
    es:(n,u,id)=>`\u00A1Oye! \u00DAnete al plan *${n}*.\n\nMarca cu\u00E1ndo puedes:\n${u}\n\nC\u00F3digo: *${id}*`,
    en:(n,u,id)=>`Hey! Join *${n}*.\n\nMark when you can:\n${u}\n\nCode: *${id}*`,
    pt:(n,u,id)=>`Ol\u00E1! Junta-te ao plano *${n}*.\n\nMarca quando podes:\n${u}\n\nC\u00F3digo: *${id}*`,
    fr:(n,u,id)=>`Salut ! Rejoins le plan *${n}*.\n\nIndique tes dispos :\n${u}\n\nCode : *${id}*`,
    de:(n,u,id)=>`Hey! Mach mit bei *${n}*.\n\nMarkiere wann du kannst:\n${u}\n\nCode: *${id}*`,
    it:(n,u,id)=>`Ciao! Unisciti al piano *${n}*.\n\nSegna quando puoi:\n${u}\n\nCodice: *${id}*`
  },
  intimate:{
    es:(n,u)=>`Te tengo una propuesta... \u{1F440}\n\n${u}`,
    en:(n,u)=>`I have a proposal for you \u{1F440}\n\n${u}`,
    pt:(n,u)=>`Tenho uma proposta para ti... \u{1F440}\n\n${u}`,
    fr:(n,u)=>`J'ai une proposition pour toi... \u{1F440}\n\n${u}`,
    de:(n,u)=>`Ich hab einen Vorschlag f\u00FCr dich... \u{1F440}\n\n${u}`,
    it:(n,u)=>`Ho una proposta per te... \u{1F440}\n\n${u}`
  },
  professional:{
    es:(n,u,id)=>`Le convoco a *${n}*.\n\nConfirme asistencia:\n${u}\n\nC\u00F3digo: *${id}*`,
    en:(n,u,id)=>`You are invited to *${n}*.\n\nConfirm attendance:\n${u}\n\nCode: *${id}*`,
    pt:(n,u,id)=>`Est\u00E1 convidado para *${n}*.\n\nConfirme presen\u00E7a:\n${u}\n\nC\u00F3digo: *${id}*`,
    fr:(n,u,id)=>`Vous \u00EAtes invit\u00E9(e) \u00E0 *${n}*.\n\nConfirmez votre pr\u00E9sence :\n${u}\n\nCode : *${id}*`,
    de:(n,u,id)=>`Sie sind eingeladen zu *${n}*.\n\nBitte best\u00E4tigen Sie:\n${u}\n\nCode: *${id}*`,
    it:(n,u,id)=>`\u00C8 invitato/a a *${n}*.\n\nConfermi la presenza:\n${u}\n\nCodice: *${id}*`
  }
};

export default function Share({plan,onViewResults,onBack,c,lang}){
  const t=T[lang];const mc=c.A;const[planState,setPlanState]=useState(plan);
  const[copied,setCopied]=useState(false);const[codeCopied,setCodeCopied]=useState(false);const[count,setCount]=useState(null);const[shareLang,setShareLang]=useState(lang);const[isShareOpen,setShareOpen]=useState(false);
  const url=location.href.split('?')[0]+'?code='+plan.id;
  const copy=()=>{navigator.clipboard?.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const copyCode=()=>{navigator.clipboard?.writeText(plan.id).catch(()=>{});setCodeCopied(true);setTimeout(()=>setCodeCopied(false),2000);};
  const getMsg=()=>{const fn=waMsgs.social[shareLang]||waMsgs.social.en;return fn(plan.name||'queda.',url,plan.id);};
  const wa=()=>window.open('https://wa.me/?text='+encodeURIComponent(getMsg()),'_blank');
  // NOTE: Requires "Realtime" enabled on the "responses" table in Supabase dashboard
  useEffect(()=>{
    const f=async()=>{const rs=await loadResps(plan.id);setCount(rs.length);};
    f();
    const channel=db.channel('share-responses-'+plan.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'responses',filter:'plan_id=eq.'+plan.id},()=>f())
      .subscribe();
    return()=>{db.removeChannel(channel);};
  },[plan.id]);
  return(<div style={{padding:'24px',maxWidth:'420px',margin:'0 auto'}}>
    <Back onClick={onBack} label={t.back} c={c}/>
    <div style={{textAlign:'center',marginBottom:'28px'}}>
      <div style={{fontSize:'52px',marginBottom:'14px'}}>🎉</div>
      <h2 style={{fontFamily:"'Syne',serif",fontSize:'28px',fontWeight:'800',color:c.T,marginBottom:'8px'}}>{t.planCreated}</h2>
      <p style={{color:c.M2,fontSize:'14px'}}>{t.shareWith}</p>
      <p style={{color:c.M,fontSize:'12px',marginTop:'8px'}}>{t.goToMyPlansHint||'Go to My plans to edit or add more details.'}</p>
    </div>
    <div style={{background:c.CARD,border:`1px solid ${mc}40`,borderRadius:'14px',padding:'20px',textAlign:'center',marginBottom:'14px'}}>
      <div style={{fontFamily:'monospace',fontSize:'58px',fontWeight:'900',color:mc,letterSpacing:'.2em',lineHeight:1,margin:'16px 0 12px'}}>{plan.id}</div>
      {plan.name&&<div style={{fontSize:'15px',color:c.T,fontWeight:'600',marginBottom:'4px'}}>{plan.name}</div>}
      <div style={{fontSize:'13px',color:c.M2}}>@ {plan.organizer} · {plan.dates?.length||0} {t.dateWord||'date'}{plan.dates?.length!==1?'s':''}</div>
    </div>
    {count!==null&&<div style={{textAlign:'center',padding:'12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',marginBottom:'14px',fontSize:'14px',color:c.T}}>
      {count===0?t.noResponsesYet:<><span style={{color:mc,fontWeight:'800',fontSize:'20px'}}>{count}</span> {t.personResponded(count)}</>}
    </div>}
    {/* Share button + dropdown */}
    <div style={{position:'relative',marginBottom:'14px'}}>
      <Btn onClick={()=>setShareOpen(o=>!o)} full style={{padding:'16px',fontSize:'16px'}} c={c}>{isShareOpen?(t.closeBtn||'Close'):(t.shareBtn||'Share')} ↗</Btn>
      {isShareOpen&&<div style={{marginTop:'8px',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'14px',overflow:'hidden'}}>
        <div style={{padding:'8px 14px',borderBottom:`1px solid ${c.BD}`}}>
          <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>{t.shareLangLbl||'Language'}</div>
          <div style={{display:'flex',gap:'4px'}}>
            {LANGS.map(l=><button key={l} onClick={()=>setShareLang(l)} style={{padding:'3px 6px',borderRadius:'6px',border:shareLang===l?`2px solid ${mc}`:`1px solid ${c.BD}`,background:shareLang===l?`${mc}20`:c.CARD,cursor:'pointer',fontSize:'14px',lineHeight:1}}>{FLAGS[l]}</button>)}
          </div>
        </div>
        {[
          {l:'WhatsApp',bg:'#25D366',cl:'#fff',fn:wa},
          {l:'Telegram',bg:'#0088cc',cl:'#fff',fn:()=>window.open('https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(getMsg()),'_blank')},
          {l:'Email',bg:'transparent',cl:c.T,fn:()=>window.open('mailto:?subject='+encodeURIComponent(plan.name||'queda.')+'&body='+encodeURIComponent(getMsg()))},
          {l:codeCopied?(t.codeCopied||'✓ Copied'):(t.copyCode||'Copy code'),bg:'transparent',cl:c.T,fn:copyCode},
          {l:copied?t.copied:(t.copyLink||'Copy link'),bg:'transparent',cl:c.T,fn:copy},
        ].map((o,i)=><button key={i} onClick={o.fn} style={{width:'100%',padding:'13px 16px',background:o.bg,color:o.cl,border:'none',borderBottom:`1px solid ${c.BD}`,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',fontWeight:'600',textAlign:'left'}}>{o.l}</button>)}
      </div>}
    </div>
    <div style={{height:'12px'}}/>
    <Btn onClick={onViewResults} v="secondary" full style={{padding:'14px'}} c={c}>{t.viewRes}</Btn>
  </div>);
}

// ─── PERSONALISED LINK ───────────────────────────────
