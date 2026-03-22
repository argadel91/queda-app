import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',background:'#0A0A0A',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>😵</div>
          <h2 style={{fontFamily:"'Syne',serif",fontSize:'24px',fontWeight:'800',color:'#F0EBE1',marginBottom:'8px'}}>Oops</h2>
          <p style={{color:'#888',fontSize:'14px',marginBottom:'20px'}}>Something went wrong</p>
          <button onClick={()=>window.location.reload()} style={{padding:'12px 24px',background:'#CDFF6C',color:'#0A0A0A',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
