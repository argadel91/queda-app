import React from 'react'

export const Btn=({children,onClick,v='primary',disabled,full,sm,style={},c,accent})=>{
  const variants={
    primary:{background:accent||c?.A||'#CDFF6C',color:'#0A0A0A',border:'none'},
    secondary:{background:'transparent',color:c?.T||'#F0EBE1',border:`1px solid ${c?.BD||'#2A2A2A'}`},
    danger:{background:'transparent',color:'#ef4444',border:'1px solid #ef444440'},
    wa:{background:'#25D366',color:'#fff',border:'none'},
  };
  return<button onClick={onClick} disabled={disabled} style={{padding:sm?'8px 16px':'12px 24px',borderRadius:'12px',cursor:disabled?'not-allowed':'pointer',fontSize:sm?'14px':'16px',fontWeight:'600',fontFamily:'inherit',opacity:disabled?.3:1,width:full?'100%':'auto',transition:'opacity .15s',...(variants[v]||variants.secondary),...style}}>{children}</button>;
};
export const Inp=({value,onChange,onKey,placeholder,type='text',mono,c})=><input value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKey} placeholder={placeholder} type={type} style={{background:c?.CARD,border:`1px solid ${c?.BD}`,borderRadius:'12px',padding:'12px 16px',color:c?.T,fontSize:mono?'24px':'14px',fontFamily:mono?'monospace':'inherit',outline:'none',width:'100%',letterSpacing:mono?'.18em':'normal',fontWeight:mono?'800':'400',boxSizing:'border-box'}}/>;
export const Txa=({value,onChange,placeholder,rows=3,c})=><textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{background:c?.CARD,border:`1px solid ${c?.BD}`,borderRadius:'12px',padding:'12px 16px',color:c?.T,fontSize:'14px',fontFamily:'inherit',outline:'none',width:'100%',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>;
export const Lbl=({children,c,htmlFor})=><label htmlFor={htmlFor} style={{fontSize:'12px',color:c?.M||'#555',fontWeight:'600',letterSpacing:'.07em',textTransform:'uppercase',marginBottom:'8px',display:'block'}}>{children}</label>;
export const HR=({c})=><div style={{height:'1px',background:c?.BD,margin:'24px 0'}}/>;
export const Back=({onClick,label,c})=><button onClick={onClick} style={{background:'none',border:'none',color:c?.M2,cursor:'pointer',fontSize:'14px',padding:'8px 0 16px',fontFamily:'inherit',display:'block',minHeight:'44px'}}>{label}</button>;
export const Badge=({children,color})=><span style={{fontSize:'12px',fontWeight:'700',padding:'4px 12px',borderRadius:'20px',background:`${color}18`,color,border:`1px solid ${color}35`}}>{children}</span>;
export const Card=({children,style={},c,accent})=><div style={{background:c?.CARD,border:`1px solid ${accent?c?.A+'50':c?.BD}`,borderRadius:'16px',padding:'16px',marginBottom:'12px',...style}}>{children}</div>;
export const Stepper=({cur,labels,c,accent})=><div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>{labels.map((s,i)=><div key={s} style={{flex:1,textAlign:'center'}}><div style={{height:'4px',borderRadius:'2px',background:i<=cur?accent||c?.A:c?.BD,marginBottom:'8px',transition:'background .2s'}}/><span style={{fontSize:'12px',color:i===cur?accent||c?.A:c?.M,fontWeight:i===cur?'700':'400'}}>{s}</span></div>)}</div>;
