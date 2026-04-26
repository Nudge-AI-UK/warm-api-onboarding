export function CrashScreen() {
  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem', padding:'2rem', background:'#0a0f1a', color:'#e8e8ec', fontFamily:'system-ui'}}>
      <h1 style={{fontSize:'1.5rem'}}>Something went wrong</h1>
      <p style={{opacity:0.7}}>Reload the page to continue.</p>
      <button
        onClick={() => window.location.reload()}
        style={{padding:'0.5rem 1.5rem', borderRadius:'0.5rem', background:'#f97316', color:'#fff', border:'none', cursor:'pointer', fontSize:'1rem'}}
      >Reload</button>
    </div>
  )
}
