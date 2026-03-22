import React, { useState, useRef, useEffect } from 'react'
import T from '../constants/translations.js'

export default function ChatBot({c, lang, plan}){
  const t=T[lang];
  const[open,setOpen]=useState(false);
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const scrollRef=useRef(null);

  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[messages]);

  const send=async()=>{
    const msg=input.trim();
    if(!msg||loading)return;
    setInput('');
    setMessages(p=>[...p,{role:'user',text:msg}]);
    setLoading(true);
    try{
      const context=plan?`Plan: ${plan.name}, ${plan.stops?.length||0} stops, ${plan.dates?.length||0} dates, city: ${plan.city||'unknown'}`:'';
      const res=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,lang,context})
      });
      const data=await res.json();
      setMessages(p=>[...p,{role:'ai',text:data.reply||data.error||'Error'}]);
    }catch{
      setMessages(p=>[...p,{role:'ai',text:t.chatError||'Something went wrong. Try again.'}]);
    }
    setLoading(false);
  };

  if(!open)return(
    <button onClick={()=>setOpen(true)} style={{position:'fixed',bottom:'24px',right:'24px',width:'56px',height:'56px',borderRadius:'50%',background:c.A,color:'#0A0A0A',border:'none',cursor:'pointer',fontSize:'24px',boxShadow:'0 4px 20px rgba(0,0,0,.3)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
      💬
    </button>
  );

  return(
    <div style={{position:'fixed',bottom:'24px',right:'24px',width:'340px',maxWidth:'calc(100vw - 48px)',height:'460px',maxHeight:'calc(100vh - 100px)',background:c.CARD,border:`1px solid ${c.BD}`,borderRadius:'16px',boxShadow:'0 8px 40px rgba(0,0,0,.4)',zIndex:50,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${c.BD}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:c.A,color:'#0A0A0A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'800'}}>q.</div>
          <div>
            <div style={{fontSize:'14px',fontWeight:'700',color:c.T}}>queda AI</div>
            <div style={{fontSize:'11px',color:c.M2}}>{t.chatSubtitle||'Your plan assistant'}</div>
          </div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:c.M2,cursor:'pointer',fontSize:'18px',padding:'4px'}}>✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'10px'}}>
        {messages.length===0&&(
          <div style={{textAlign:'center',padding:'24px 0',color:c.M2}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🤖</div>
            <div style={{fontSize:'14px',fontWeight:'600',color:c.T,marginBottom:'4px'}}>{t.chatWelcome||'Hi! I\'m queda AI'}</div>
            <div style={{fontSize:'12px',lineHeight:1.6}}>{t.chatWelcomeSub||'Ask me anything: restaurant ideas, plan tips, or how the app works.'}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',justifyContent:'center',marginTop:'12px'}}>
              {[
                t.chatSuggest1||'Restaurant for 8 people?',
                t.chatSuggest2||'Dress code for a party?',
                t.chatSuggest3||'How do I share my plan?',
              ].map((s,i)=><button key={i} onClick={()=>{setInput(s);}} style={{padding:'6px 12px',background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'20px',color:c.T,cursor:'pointer',fontFamily:'inherit',fontSize:'11px'}}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?c.A+'20':c.CARD2,color:c.T,fontSize:'13px',lineHeight:1.6,border:`1px solid ${m.role==='user'?c.A+'30':c.BD}`}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',justifyContent:'flex-start'}}><div style={{padding:'10px 14px',borderRadius:'14px 14px 14px 4px',background:c.CARD2,border:`1px solid ${c.BD}`,fontSize:'13px',color:c.M2}}>...</div></div>}
      </div>

      {/* Input */}
      <div style={{padding:'10px 12px',borderTop:`1px solid ${c.BD}`,display:'flex',gap:'8px'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send();}} placeholder={t.chatPlaceholder||'Ask something...'} style={{flex:1,background:c.CARD2,border:`1px solid ${c.BD}`,borderRadius:'10px',padding:'10px 14px',color:c.T,fontSize:'13px',fontFamily:'inherit',outline:'none'}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{padding:'10px 14px',background:c.A,color:'#0A0A0A',border:'none',borderRadius:'10px',cursor:loading?'not-allowed':'pointer',fontWeight:'700',fontSize:'14px',opacity:loading||!input.trim()?.3:1}}>→</button>
      </div>
    </div>
  );
}
