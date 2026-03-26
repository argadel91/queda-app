import React from 'react'
import { Card, Lbl } from '../ui.jsx'

export default function MoreTab({plan,rs,c,mc,lang,t,shareUrl,waShare,copyShare}){
  return<>
    {/* Share */}
    <Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>{t.sharePlanBtn||'Share'}</Lbl>
      <div style={{display:'flex',gap:'8px'}}>
        <button onClick={waShare} style={{flex:1,padding:'12px',background:'#25D366',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>WhatsApp</button>
        <button onClick={()=>{window.open('https://t.me/share/url?url='+encodeURIComponent(shareUrl),'_blank');}} style={{flex:1,padding:'12px',background:'#0088cc',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Telegram</button>
        <button aria-label="Copy link" onClick={copyShare} style={{flex:1,padding:'12px',background:c.CARD2,color:c.T,border:`1px solid ${c.BD}`,borderRadius:'12px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>🔗</button>
      </div>
    </Card>

    {/* Plan code */}
    <Card c={c} style={{marginBottom:'12px',textAlign:'center'}}>
      <div style={{fontSize:'11px',color:c.M2,marginBottom:'4px'}}>{t.codeLbl||'Plan code'}</div>
      <div style={{fontFamily:'monospace',fontSize:'28px',fontWeight:'900',color:mc,letterSpacing:'.15em'}}>{plan.id}</div>
    </Card>

    {/* Poll results */}
    {plan.poll?.q&&rs.some(r=>r.pollVote)&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>🗳️ {plan.poll.q}</Lbl>
      {plan.poll.opts.filter(o=>o.trim()).map(o=>{const cnt=rs.filter(r=>r.pollVote===o).length;const pct=rs.length>0?Math.round(cnt/rs.length*100):0;return(<div key={o} style={{marginBottom:'8px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{fontSize:'13px',color:c.T}}>{o}</span><span style={{fontSize:'12px',color:mc,fontWeight:'600'}}>{cnt} ({pct}%)</span></div>
        <div style={{height:'6px',background:c.BD,borderRadius:'3px',overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:mc,borderRadius:'3px',transition:'width .5s'}}/></div>
      </div>);})}
    </Card>}

    {/* Comments */}
    {rs.some(r=>r.comment)&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>💬 {t.comments}</Lbl>
      {rs.filter(r=>r.comment).map((r,i)=><div key={i} style={{marginBottom:'8px',padding:'8px 12px',background:c.CARD2,borderRadius:'10px'}}>
        <div style={{fontSize:'12px',fontWeight:'600',color:mc,marginBottom:'2px'}}>{r.name}</div>
        <div style={{fontSize:'13px',color:c.M2,fontStyle:'italic'}}>"{r.comment}"</div>
      </div>)}
    </Card>}

    {/* Transport */}
    {rs.some(r=>r.how)&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>🚗 {t.transportLbl||'Transport'}</Lbl>
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
        {rs.filter(r=>r.how).map((r,i)=><span key={i} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'20px',background:c.CARD2,border:`1px solid ${c.BD}`,color:c.T}}>{({car:'🚗',moto:'🏍️',transit:'🚇',taxi:'🚕',walk:'🚶',bike:'🚲'})[r.how]||''} {r.name}</span>)}
      </div>
    </Card>}

    {/* Change history */}
    {(plan.changeLog||[]).length>0&&<Card c={c} style={{marginBottom:'12px'}}>
      <Lbl c={c}>📋 {t.changeHistoryLbl||'Change history'}</Lbl>
      {[...(plan.changeLog||[])].reverse().map((log,i)=><div key={i} style={{fontSize:'12px',color:c.M2,marginBottom:'4px',display:'flex',gap:'8px'}}>
        <span style={{color:c.M,flexShrink:0}}>{new Date(log.at).toLocaleDateString(lang)}</span>
        <span style={{color:log.type==='confirm'?'#22c55e':c.T}}>{log.type==='confirm'?'📌':'✏️'} {log.desc}</span>
      </div>)}
    </Card>}
  </>;
}
