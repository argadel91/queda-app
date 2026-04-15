import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'

const CATS=[
  ['☕','Café','#FFB86C'],['🍽️','Food','#FF6B8A'],['🍻','Drinks','#FFD700'],
  ['⚽','Sport','#CDFF6C'],['🥾','Hiking','#6BFFD4'],['🎬','Cinema','#FF6B6B'],
  ['🎭','Culture','#B48CFF'],['🎵','Music','#FF8ED4'],['🎮','Games','#6BC5FF'],
  ['📚','Study','#FFF06B'],['✈️','Travel','#6BFFE0'],['🧘','Wellness','#C4A6FF'],
  ['🛍️','Shopping','#FF9EB1'],['🤝','Volunteer','#A8FF44'],['🗣️','Languages','#8ED4FF'],
  ['📌','Other','#F0EBE1']
]

const PLANS=[
  {e:'☕',t:'Coffee & Walk',p:'Retiro Park',h:'10:00',s:3,f:60,c:'#FFB86C'},
  {e:'🍻',t:'Friday Beers',p:'La Latina',h:'20:00',s:5,f:40,c:'#FFD700'},
  {e:'🥾',t:'Sierra Hike',p:'Navacerrada',h:'09:00',s:2,f:80,c:'#6BFFD4'},
  {e:'🎵',t:'Jazz Night',p:'Malasaña',h:'21:30',s:4,f:50,c:'#FF8ED4'},
  {e:'⚽',t:'Park Football',p:'Casa de Campo',h:'11:00',s:6,f:30,c:'#CDFF6C'},
]

const LT={
  es:{title:'queda.',sub:'Planes para la gente correcta.',go:'Empezar',orb:'Un plan para cada',orbGr:'momento',s1:'Crea.',s2:'Descubre.',s3:'Queda.',
    s4:'Crea un plan, elige quién puede verlo. Descubre planes donde encajas. Sin algoritmos raros. Solo gente con tus mismos planes.',
    s_create:'Crea tu plan',s_create_sub:'Elige actividad, lugar y quién quieres que venga',
    s_discover:'Descubre planes',s_discover_sub:'Solo ves los planes donde tu perfil encaja',
    s_meet:'Queda en persona',s_meet_sub:'Chatea con el grupo y queda',
    ctaWords:['Deja','de','aburrirte.'],c4:'Crear un plan',cta:'Abrir app'},
  en:{title:'queda.',sub:'Plans for the right people.',go:'Get started',orb:'A plan for every',orbGr:'moment',s1:'Create.',s2:'Discover.',s3:'Meet.',
    s4:'Create a plan, choose who sees it. Discover plans where you fit. No weird algorithms. Just people with the same plans as you.',
    s_create:'Create your plan',s_create_sub:'Pick activity, place and who you want there',
    s_discover:'Discover plans',s_discover_sub:'Only see plans where your profile fits',
    s_meet:'Meet in person',s_meet_sub:'Chat with the group and show up',
    ctaWords:['Stop','being','bored.'],c4:'Create a plan',cta:'Open app'},
  pt:{title:'queda.',sub:'Planos para as pessoas certas.',go:'Começar',orb:'Um plano para cada',orbGr:'momento',s1:'Cria.',s2:'Descobre.',s3:'Combina.',
    s4:'Cria um plano, escolhe quem pode ver. Descobre planos onde encaixas. Sem algoritmos estranhos. Só gente com os mesmos planos.',
    s_create:'Cria o teu plano',s_create_sub:'Escolhe atividade, lugar e quem queres',
    s_discover:'Descobre planos',s_discover_sub:'Só vês planos onde o teu perfil encaixa',
    s_meet:'Encontra-te pessoalmente',s_meet_sub:'Fala com o grupo e aparece',
    ctaWords:['Para','de','te','aborrecer.'],c4:'Criar um plano',cta:'Abrir app'},
  fr:{title:'queda.',sub:'Des plans pour les bonnes personnes.',go:'Commencer',orb:'Un plan pour chaque',orbGr:'moment',s1:'Créez.',s2:'Découvrez.',s3:'Sortez.',
    s4:'Crée un plan, choisis qui peut le voir. Découvre des plans qui te correspondent. Pas d\'algorithmes bizarres. Juste des gens avec les mêmes plans.',
    s_create:'Crée ton plan',s_create_sub:'Choisis activité, lieu et qui tu veux',
    s_discover:'Découvre des plans',s_discover_sub:'Vois seulement les plans qui te correspondent',
    s_meet:'Rencontre en personne',s_meet_sub:'Discute avec le groupe et retrouve-vous',
    ctaWords:['Arrête','de','t\'ennuyer.'],c4:'Créer un plan',cta:'Ouvrir'},
  de:{title:'queda.',sub:'Pläne für die richtigen Leute.',go:'Loslegen',orb:'Ein Plan für jeden',orbGr:'Moment',s1:'Erstelle.',s2:'Entdecke.',s3:'Triff dich.',
    s4:'Erstelle einen Plan, bestimme wer ihn sieht. Entdecke Pläne, die zu dir passen. Keine komischen Algorithmen. Nur Leute mit denselben Plänen.',
    s_create:'Erstelle deinen Plan',s_create_sub:'Wähle Aktivität, Ort und wen du willst',
    s_discover:'Entdecke Pläne',s_discover_sub:'Sieh nur Pläne, die zu dir passen',
    s_meet:'Triff dich persönlich',s_meet_sub:'Chatte mit der Gruppe und triff dich',
    ctaWords:['Hör','auf','dich','zu','langweilen.'],c4:'Plan erstellen',cta:'Öffnen'},
  it:{title:'queda.',sub:'Piani per le persone giuste.',go:'Inizia',orb:'Un piano per ogni',orbGr:'momento',s1:'Crea.',s2:'Scopri.',s3:'Esci.',
    s4:'Crea un piano, scegli chi può vederlo. Scopri piani dove il tuo profilo si adatta. Niente algoritmi strani. Solo gente con i tuoi stessi piani.',
    s_create:'Crea il tuo piano',s_create_sub:'Scegli attività, luogo e chi vuoi',
    s_discover:'Scopri piani',s_discover_sub:'Vedi solo i piani dove il tuo profilo si adatta',
    s_meet:'Incontra di persona',s_meet_sub:'Chatta con il gruppo e incontrali',
    ctaWords:['Smetti','di','annoiarti.'],c4:'Creare un piano',cta:'Apri'},
}

function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`}

const STEPS=[
  {icon:'📝',key:'s_create'},{icon:'🔍',key:'s_discover'},{icon:'🤝',key:'s_meet'},
]

const PER_RING=[5,7,8]
const RING_R=[150,250,350]

export default function Landing({ onGetStarted, onLangChange }) {
  const appCtx = useApp()
  const lang = appCtx?.lang || 'en'
  const t = LT[lang] || LT.en

  const canvasRef = useRef(null)
  const phoneRef = useRef(null)
  const particlesRef = useRef([])
  const mouseRef = useRef({x:-999,y:-999})
  const animRef = useRef(null)
  const carouselIntervalRef = useRef(null)

  // ═══ PARTICLE SYSTEM ═══
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    resize()

    class Particle {
      constructor() { this.reset() }
      reset() {
        const cat = CATS[Math.floor(Math.random()*CATS.length)]
        this.x=Math.random()*W;this.y=Math.random()*H
        this.vx=(Math.random()-.5)*.25;this.vy=(Math.random()-.5)*.25
        this.size=Math.random()*12+10;this.emoji=cat[0];this.color=cat[2]
        this.alpha=Math.random()*.12+.04;this.curAlpha=this.alpha
        this.rotation=Math.random()*Math.PI*2;this.rotSpd=(Math.random()-.5)*.008
        this.pulsePhase=Math.random()*Math.PI*2
      }
      update(time) {
        const m=mouseRef.current,dx=this.x-m.x,dy=this.y-m.y
        const dist=Math.sqrt(dx*dx+dy*dy)
        let tAlpha=this.alpha
        if(dist<220){const force=(220-dist)/220*.6;this.vx+=dx/dist*force;this.vy+=dy/dist*force;tAlpha=Math.min(this.alpha*4,.45)}
        this.curAlpha+=(tAlpha-this.curAlpha)*.04
        this.curAlpha+=Math.sin(time*.001+this.pulsePhase)*.01
        this.vx*=.985;this.vy*=.985;this.x+=this.vx;this.y+=this.vy;this.rotation+=this.rotSpd
        if(this.x<-60)this.x=W+60;if(this.x>W+60)this.x=-60
        if(this.y<-60)this.y=H+60;if(this.y>H+60)this.y=-60
      }
      draw() {
        ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rotation)
        ctx.globalAlpha=Math.max(0,this.curAlpha);ctx.font=this.size+'px serif';ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.fillText(this.emoji,0,0)
        ctx.globalAlpha=Math.max(0,this.curAlpha*.3);ctx.shadowColor=this.color;ctx.shadowBlur=this.size
        ctx.fillText(this.emoji,0,0);ctx.restore()
      }
    }

    function initParticles() {
      const count=Math.min(Math.floor(W*H/22000),55)
      particlesRef.current=[];for(let i=0;i<count;i++)particlesRef.current.push(new Particle())
    }
    initParticles()

    function drawConnections() {
      const p=particlesRef.current
      for(let i=0;i<p.length;i++){for(let j=i+1;j<p.length;j++){
        const dx=p[i].x-p[j].x,dy=p[i].y-p[j].y,dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<140){
          const alpha=(1-dist/140)*0.07
          const mx=(p[i].x+p[j].x)/2,my=(p[i].y+p[j].y)/2
          ctx.lineWidth=.6
          ctx.beginPath();ctx.moveTo(p[i].x,p[i].y);ctx.lineTo(mx,my);ctx.strokeStyle=`rgba(${hexToRgb(p[i].color)},${alpha})`;ctx.stroke()
          ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(p[j].x,p[j].y);ctx.strokeStyle=`rgba(${hexToRgb(p[j].color)},${alpha})`;ctx.stroke()
        }
      }}
    }

    function drawMouseGlow() {
      const m=mouseRef.current;if(m.x<0)return
      const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,280)
      g.addColorStop(0,'rgba(205,255,108,0.025)');g.addColorStop(.4,'rgba(107,197,255,0.015)');g.addColorStop(1,'transparent')
      ctx.fillStyle=g;ctx.fillRect(m.x-280,m.y-280,560,560)
    }

    function animate(time) {
      ctx.clearRect(0,0,W,H);drawMouseGlow();drawConnections()
      particlesRef.current.forEach(p=>{p.update(time);p.draw()})
      animRef.current=requestAnimationFrame(animate)
    }
    animRef.current=requestAnimationFrame(animate)

    const onResize = () => { resize(); initParticles() }
    const onMove = e => { mouseRef.current={x:e.clientX,y:e.clientY} }
    const onLeave = () => { mouseRef.current={x:-999,y:-999} }
    window.addEventListener('resize',onResize)
    document.addEventListener('mousemove',onMove)
    document.addEventListener('mouseleave',onLeave)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize',onResize)
      document.removeEventListener('mousemove',onMove)
      document.removeEventListener('mouseleave',onLeave)
    }
  }, [])

  // ═══ 3D TILT ═══
  useEffect(() => {
    const phone = phoneRef.current
    if (!phone) return
    const onMove = e => {
      const rect=phone.getBoundingClientRect()
      const x=(e.clientX-rect.left)/rect.width-.5
      const y=(e.clientY-rect.top)/rect.height-.5
      phone.style.transition='transform .15s ease-out'
      phone.style.transform=`rotateY(${x*15}deg) rotateX(${-y*10}deg) scale(1.02)`
    }
    const onLeave = () => { phone.style.transition='transform 1.2s cubic-bezier(.16,1,.3,1)'; phone.style.transform='' }
    phone.addEventListener('mousemove',onMove)
    phone.addEventListener('mouseleave',onLeave)
    return () => { phone.removeEventListener('mousemove',onMove); phone.removeEventListener('mouseleave',onLeave) }
  }, [])

  // ═══ SCROLL OBSERVERS ═══
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const d = parseInt(e.target.dataset.d || 0)
          setTimeout(() => e.target.classList.add('visible'), d)
          obs.unobserve(e.target)
          if (e.target.classList.contains('lp-phone')) startCarousel()
        }
      })
    }, { threshold: 0.2 })

    const ctaObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          e.target.querySelectorAll('.lp-cta-word').forEach((w, i) => {
            setTimeout(() => { w.style.opacity='1'; w.style.transform='translateY(0) scale(1)' }, i * 200)
          })
          ctaObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.3 })

    document.querySelectorAll('.lp-phone,.lp-side,.lp-step').forEach(el => obs.observe(el))
    document.querySelectorAll('.lp-cta').forEach(el => ctaObs.observe(el))

    return () => { obs.disconnect(); ctaObs.disconnect() }
  }, [])

  // ═══ CAROUSEL ═══
  const currentCardRef = useRef(0)
  function startCarousel() {
    const cards = document.querySelectorAll('.lp-pcard')
    cards.forEach((c, i) => {
      if (i > 3) return
      setTimeout(() => {
        c.classList.add('active')
        setTimeout(() => { const fill = c.querySelector('.lp-pcard-fill'); if (fill) fill.style.width = PLANS[i].f + '%' }, 300 + i * 150)
      }, i * 180)
    })
    currentCardRef.current = 3

    carouselIntervalRef.current = setInterval(() => {
      const cards = document.querySelectorAll('.lp-pcard')
      const top = cards[currentCardRef.current - 3]
      if (top) top.classList.replace('active', 'exit')
      currentCardRef.current = (currentCardRef.current + 1) % PLANS.length
      setTimeout(() => {
        cards.forEach((c, i) => {
          c.classList.remove('active', 'exit')
          c.style.top = `${((i - currentCardRef.current + 3 + PLANS.length) % PLANS.length) * 96 + 8}px`
        })
        for (let j = 0; j < 4 && j < PLANS.length; j++) {
          const idx = (currentCardRef.current - 3 + j + PLANS.length) % PLANS.length
          cards[idx].classList.add('active')
          const fill = cards[idx].querySelector('.lp-pcard-fill')
          if (fill) fill.style.width = PLANS[idx].f + '%'
        }
      }, 600)
    }, 3000)
  }

  useEffect(() => { return () => { if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current) } }, [])

  // Build orbit emojis
  const orbits = PER_RING.map((count, ri) => {
    const r = RING_R[ri]
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      const ci = (ri * 5 + i) % CATS.length
      return { emoji: CATS[ci][0], color: CATS[ci][2], left: `calc(50% + ${Math.cos(angle)*r}px - 14px)`, top: `calc(50% + ${Math.sin(angle)*r}px - 14px)` }
    })
  })

  // Hero chars — always "queda."
  const titleChars = [...'queda.'].map((ch, i) => (
    <span key={i} className={'lp-char' + (ch === '.' ? ' lp-dot' : '')} style={{ animationDelay: (.15 + i * .08) + 's' }}>{ch}</span>
  ))

  // CTA words
  const ctaWords = (t.ctaWords || ['Stop','being','bored.']).map((w, i) => (
    <React.Fragment key={i}><span className="lp-cta-word">{w}</span>{' '}</React.Fragment>
  ))

  const handleCTA = useCallback(() => { if (onGetStarted) onGetStarted() }, [onGetStarted])

  return (
    <>
      <style>{`
.lp-bg-mesh{position:fixed;inset:0;z-index:0;overflow:hidden}
.lp-blob{position:absolute;border-radius:50%;filter:blur(120px);opacity:0.4;animation:lp-blobDrift 20s ease-in-out infinite}
.lp-b1{width:50vw;height:50vw;top:-10%;left:-10%;background:radial-gradient(circle,rgba(40,10,60,0.8),transparent 70%);animation-duration:25s}
.lp-b2{width:45vw;height:45vw;bottom:-5%;right:-10%;background:radial-gradient(circle,rgba(10,30,60,0.7),transparent 70%);animation-delay:-7s;animation-duration:22s}
.lp-b3{width:40vw;height:40vw;top:40%;left:50%;background:radial-gradient(circle,rgba(15,50,30,0.5),transparent 70%);animation-delay:-13s;animation-duration:28s}
.lp-b4{width:35vw;height:35vw;top:10%;right:20%;background:radial-gradient(circle,rgba(50,15,40,0.4),transparent 70%);animation-delay:-4s;animation-duration:30s}
.lp-b5{width:30vw;height:30vw;bottom:20%;left:30%;background:radial-gradient(circle,rgba(10,40,50,0.4),transparent 70%);animation-delay:-18s;animation-duration:26s}
@keyframes lp-blobDrift{0%,100%{transform:translate(0,0) scale(1)}20%{transform:translate(60px,-80px) scale(1.15)}40%{transform:translate(-40px,60px) scale(0.9)}60%{transform:translate(80px,40px) scale(1.1)}80%{transform:translate(-60px,-40px) scale(0.95)}}
.lp-canvas{position:fixed;inset:0;z-index:1;pointer-events:none}
.lp-grain{position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0.022;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:128px}
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:rgba(3,3,3,0.5);backdrop-filter:blur(40px)}
.lp-logo{font-family:'Syne',serif;font-weight:800;font-size:20px}.lp-logo span{color:#CDFF6C}
.lp-nav-r{display:flex;gap:10px;align-items:center}
.lp-lang{background:0;color:#555;border:1px solid #1A1A1A;padding:5px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;outline:0;transition:all .3s}
.lp-lang:hover{border-color:#CDFF6C;color:#F0EBE1}
.lp-lang option{background:#111}
.lp-nav-btn{background:#CDFF6C;color:#000;border:0;padding:7px 16px;border-radius:8px;font-family:'Syne',serif;font-weight:700;font-size:12px;cursor:pointer;transition:all .3s}
.lp-nav-btn:hover{box-shadow:0 0 24px rgba(205,255,108,0.5)}
.lp-content{position:relative;z-index:3}
.lp-hero{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;padding:24px}
.lp-hero h1{font-family:'Syne',serif;font-weight:800;font-size:clamp(80px,15vw,180px);line-height:0.85;letter-spacing:-7px;position:relative;color:#F0EBE1}
.lp-char{display:inline-block;opacity:0;transform:translateY(60px) rotate(8deg);animation:lp-charIn .6s cubic-bezier(.16,1,.3,1) both}
.lp-dot{color:#CDFF6C;text-shadow:0 0 80px rgba(205,255,108,0.5)}
.lp-hero .lp-sub{color:#555;font-size:clamp(13px,1.5vw,16px);margin-top:28px;letter-spacing:1px;opacity:0;animation:lp-fadeUp .8s 1.2s both}
.lp-hero .lp-go{margin-top:40px;opacity:0;animation:lp-fadeUp .8s 1.5s both}
.lp-btn{background:linear-gradient(135deg,#CDFF6C,#A8FF44);color:#000;border:0;padding:18px 52px;border-radius:60px;font-family:'Syne',serif;font-weight:700;font-size:16px;cursor:pointer;display:inline-block;transition:all .4s}
.lp-btn:hover{transform:scale(1.08);box-shadow:0 0 60px rgba(205,255,108,0.35),0 0 120px rgba(107,255,212,0.15)}
.lp-arrow{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);opacity:0;animation:lp-fadeUp .8s 2s both}
.lp-arrow svg{width:20px;height:20px;stroke:#555;animation:lp-bob 2.5s ease-in-out infinite}
@keyframes lp-charIn{to{opacity:1;transform:translateY(0) rotate(0)}}
@keyframes lp-fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
.lp-orbit{padding:100px 24px;position:relative;overflow:hidden;min-height:520px}
.lp-orbit-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Syne',serif;font-weight:800;font-size:clamp(22px,3.5vw,38px);text-align:center;letter-spacing:-1px;z-index:3;pointer-events:none;line-height:1.2;color:#F0EBE1}
.lp-gr{background:linear-gradient(135deg,#CDFF6C,#6BC5FF,#B48CFF);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.lp-ring{position:absolute;top:50%;left:50%;border-radius:50%;transform:translate(-50%,-50%)}
.lp-ring:nth-child(1){width:300px;height:300px;border:1px solid rgba(205,255,108,0.06);animation:lp-spin 30s linear infinite}
.lp-ring:nth-child(2){width:500px;height:500px;border:1px solid rgba(107,197,255,0.05);animation:lp-spin 45s linear infinite reverse}
.lp-ring:nth-child(3){width:700px;height:700px;border:1px solid rgba(180,140,255,0.04);animation:lp-spin 60s linear infinite}
.lp-orbit-emoji{position:absolute;font-size:28px;transition:all .3s;cursor:default;filter:drop-shadow(0 0 8px rgba(0,0,0,0.5))}
.lp-orbit-emoji:hover{transform:scale(1.8)!important;z-index:10}
@keyframes lp-spin{0%{transform:translate(-50%,-50%) rotate(0)}100%{transform:translate(-50%,-50%) rotate(360deg)}}
.lp-show{padding:80px 24px 120px;display:flex;justify-content:center;align-items:center;gap:56px;max-width:960px;margin:0 auto;flex-wrap:wrap}
.lp-phone-wrap{perspective:800px;flex-shrink:0}
.lp-phone{width:250px;height:500px;background:#0C0C0C;border-radius:32px;border:1.5px solid #1A1A1A;position:relative;overflow:hidden;box-shadow:0 60px 120px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.02);transform:translateY(80px) scale(0.9);opacity:0;transition:transform 1.2s cubic-bezier(.16,1,.3,1),opacity 1.2s cubic-bezier(.16,1,.3,1);transform-style:preserve-3d;will-change:transform}
.lp-phone.visible{transform:translateY(0) scale(1);opacity:1}
.lp-phone-shine{position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:32px;background:linear-gradient(135deg,rgba(255,255,255,0.06),transparent 60%);opacity:0;transition:opacity .3s}
.lp-phone:hover .lp-phone-shine{opacity:1}
.lp-notch{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:72px;height:22px;background:#030303;border-radius:14px;z-index:2}
.lp-carousel{position:absolute;inset:0;top:40px;padding:8px 12px;overflow:hidden}
.lp-pcard{position:absolute;left:12px;right:12px;background:#1A1A1A;border-radius:18px;padding:14px;border:1px solid #222;transition:all .6s cubic-bezier(.16,1,.3,1);opacity:0;transform:translateY(20px) scale(0.95)}
.lp-pcard.active{opacity:1;transform:translateY(0) scale(1)!important}
.lp-pcard.exit{opacity:0;transform:translateY(-30px) scale(0.9)!important}
.lp-pcard-t{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.lp-pcard-title{font-family:'Syne',serif;font-weight:700;font-size:13px;color:#F0EBE1}
.lp-pcard-badge{padding:2px 8px;border-radius:6px;font-size:9px;font-weight:600}
.lp-pcard-meta{font-size:10px;color:#555}
.lp-pcard-bar{margin-top:8px;height:3px;border-radius:3px;background:#222}
.lp-pcard-fill{height:100%;border-radius:3px;transition:width 1.2s cubic-bezier(.16,1,.3,1)}
.lp-side{max-width:300px;transform:translateY(80px);opacity:0;transition:all 1.2s .2s cubic-bezier(.16,1,.3,1)}
.lp-side.visible{transform:translateY(0);opacity:1}
.lp-side h2{font-family:'Syne',serif;font-weight:800;font-size:clamp(28px,4vw,44px);line-height:1;letter-spacing:-1.5px;margin-bottom:14px}
.lp-w1{color:#CDFF6C}.lp-w2{color:#6BC5FF}.lp-w3{color:#FF8ED4}
.lp-side-p{color:#555;font-size:13px;line-height:1.6}
.lp-how{padding:40px 24px 60px;max-width:800px;margin:0 auto;display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.lp-step{text-align:center;opacity:0;transform:translateY(30px);transition:all .6s cubic-bezier(.16,1,.3,1);max-width:200px;flex:1;min-width:150px}
.lp-step.visible{opacity:1;transform:translateY(0)}
.lp-step-icon{font-size:36px;margin-bottom:8px;display:block}
.lp-step-num{font-family:'Syne',serif;font-weight:800;font-size:11px;color:#CDFF6C;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.lp-step-title{font-family:'Syne',serif;font-weight:800;font-size:16px;color:#F0EBE1;margin-bottom:4px}
.lp-step-sub{font-size:12px;color:#555;line-height:1.5}
.lp-cta{text-align:center;padding:120px 24px 80px;position:relative;overflow:hidden}
.lp-cta::before{content:'';position:absolute;bottom:-100px;left:50%;transform:translateX(-50%);width:1200px;height:700px;background:radial-gradient(ellipse,rgba(205,255,108,0.07),rgba(107,197,255,0.04) 35%,rgba(180,140,255,0.025) 55%,transparent 75%);pointer-events:none;opacity:0;transition:opacity 2s ease}
.lp-cta.visible::before{opacity:1}
.lp-cta h2{font-family:'Syne',serif;font-weight:800;font-size:clamp(48px,9vw,110px);line-height:0.9;letter-spacing:-5px;margin-bottom:28px;color:#F0EBE1}
.lp-cta .lp-gr{color:#CDFF6C;text-shadow:0 0 60px rgba(205,255,108,0.3)}
.lp-cta .lp-sub{color:#555;font-size:14px;margin-bottom:36px;opacity:0;transform:translateY(20px);transition:all .6s .5s cubic-bezier(.16,1,.3,1)}
.lp-cta.visible .lp-sub{opacity:1;transform:translateY(0)}
.lp-cta .lp-btn-wrap{opacity:0;transform:translateY(20px);transition:all .6s .7s cubic-bezier(.16,1,.3,1)}
.lp-cta.visible .lp-btn-wrap{opacity:1;transform:translateY(0)}
.lp-cta-word{display:inline-block;opacity:0;transform:translateY(40px) scale(0.9);transition:all .5s cubic-bezier(.16,1,.3,1)}
.lp-footer{border-top:1px solid #1A1A1A;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555;position:relative;z-index:3}
@media(max-width:768px){.lp-nav-btn{display:none}.lp-show{flex-direction:column;gap:32px}.lp-side{text-align:center}.lp-hero h1{letter-spacing:-3px}.lp-ring:nth-child(3){display:none}.lp-footer{flex-direction:column;gap:6px}}
      `}</style>

      <div style={{background:'#030303',color:'#F0EBE1',fontFamily:"'DM Sans',sans-serif",overflowX:'hidden',minHeight:'100vh'}}>
        <div className="lp-bg-mesh">
          <div className="lp-blob lp-b1" /><div className="lp-blob lp-b2" /><div className="lp-blob lp-b3" /><div className="lp-blob lp-b4" /><div className="lp-blob lp-b5" />
        </div>
        <canvas ref={canvasRef} className="lp-canvas" />
        <div className="lp-grain" />

        <nav className="lp-nav">
          <div className="lp-logo">queda<span>.</span></div>
          <div className="lp-nav-r">
            <select className="lp-lang" value={lang} onChange={e => onLangChange?.(e.target.value)} aria-label="Language">
              {['es','en','pt','fr','de','it'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <button className="lp-nav-btn" onClick={handleCTA}>{t.cta}</button>
          </div>
        </nav>

        <div className="lp-content">
          <section className="lp-hero">
            <h1>{titleChars}</h1>
            <p className="lp-sub">{t.sub}</p>
            <div className="lp-go"><button className="lp-btn" onClick={handleCTA}>{t.go}</button></div>
            <div className="lp-arrow"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg></div>
          </section>

          <section className="lp-orbit">
            {orbits.map((emojis, ri) => (
              <div key={ri} className="lp-ring">
                {emojis.map((em, i) => (
                  <div key={i} className="lp-orbit-emoji" style={{ left: em.left, top: em.top, filter: `drop-shadow(0 0 10px ${em.color}40)` }}>{em.emoji}</div>
                ))}
              </div>
            ))}
            <div className="lp-orbit-center">{t.orb}<br /><span className="lp-gr">{t.orbGr}</span></div>
          </section>

          <section className="lp-show">
            <div className="lp-phone-wrap">
              <div className="lp-phone" ref={phoneRef}>
                <div className="lp-phone-shine" />
                <div className="lp-notch" />
                <div className="lp-carousel">
                  {PLANS.map((plan, i) => (
                    <div key={i} className="lp-pcard" style={{ top: `${i * 96 + 8}px` }}>
                      <div className="lp-pcard-t">
                        <span className="lp-pcard-title">{plan.e} {plan.t}</span>
                        <span className="lp-pcard-badge" style={{ background: plan.c + '15', color: plan.c }}>{plan.s} spots</span>
                      </div>
                      <div className="lp-pcard-meta">📍 {plan.p} · ⏰ {plan.h}</div>
                      <div className="lp-pcard-bar"><div className="lp-pcard-fill" style={{ width: '0%', background: plan.c }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lp-side">
              <h2><span className="lp-w1">{t.s1}</span> <span className="lp-w2">{t.s2}</span><br /><span className="lp-w3">{t.s3}</span></h2>
              <p className="lp-side-p">{t.s4}</p>
            </div>
          </section>

          <div className="lp-how">
            {STEPS.map((s, i) => (
              <div key={i} className="lp-step" data-d={i * 120}>
                <div className="lp-step-icon">{s.icon}</div>
                <div className="lp-step-num">0{i + 1}</div>
                <div className="lp-step-title">{t[s.key]}</div>
                <div className="lp-step-sub">{t[s.key + '_sub']}</div>
              </div>
            ))}
          </div>

          <section className="lp-cta">
            <h2>{ctaWords}<span className="lp-cta-word lp-gr">queda.</span></h2>
            <div className="lp-btn-wrap"><button className="lp-btn" onClick={handleCTA}>{t.c4}</button></div>
          </section>
        </div>

        <footer className="lp-footer">
          <div className="lp-logo">queda<span>.</span></div>
          <div>© 2026</div>
        </footer>
      </div>
    </>
  )
}
