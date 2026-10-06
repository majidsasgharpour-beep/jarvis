/* ورودیِ بیلدِ ایستا برای جارویس: همان کامپوننت‌های APEX-UI (حلقه‌ی طلایی، گراف عامل‌ها،
   پس‌زمینه‌ی شیدر، نوار وضعیت) بدون Next.js. هسته‌ی ذرات سه‌بعدی (three / react-three-fiber)
   جایگزین شده با Core.jsx (Canvas دوبعدی). API: window.ApexWorld = { setState, setLevel, poke } */
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ApexOrb from './components/ApexOrb'
import ReasoningWeb from './components/ReasoningWeb'
import ShaderBackground from './components/ShaderBackground'
import OrbStatusBar from './components/OrbStatusBar'
import ParticleCore from './Core'
import './components/apex-orb.css'
import './extra.css'

/* ── وضعیت مشترک بین پل apex-orb.js و React ── */
const subs = new Set()
let cur = 'idle', pokeTimer = null, poked = false
const emit = () => subs.forEach(f => f(poked && cur === 'idle' ? 'thinking' : cur))
const api = {
  setState(s) { if (s !== cur) { cur = s; emit() } },
  setLevel(v) { window.__apexLvl = v },
  poke() { poked = true; emit(); if (pokeTimer) clearTimeout(pokeTimer); pokeTimer = setTimeout(() => { poked = false; emit() }, 1400) },
}

/* حلقه‌ی طلاییِ APEX داخل صحنه‌ی ۹۰۰×۹۰۰ که با اندازه‌ی کادر مقیاس می‌شود */
function HeroOrb({ state, reduced }) {
  const box = useRef(null)
  const [scale, setScale] = useState(0.6)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setScale(Math.min(1.6, el.clientWidth / 560, el.clientHeight / 540))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' }}>
      <div data-apex-stage style={{ position: 'absolute', left: '50%', top: '50%', width: 900, height: 900, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div style={{ position: 'absolute', left: 0, top: (900 - 520) / 2 }}>
          <ApexOrb state={state} variant="frame" />
        </div>
        {!reduced && <ParticleCore state={state} scale={scale} />}
      </div>
    </div>
  )
}

function World() {
  const [state, setState] = useState('idle')
  const [rect, setRect] = useState({ left: 0, top: 0, width: 360, height: 320 })
  const [reduced, setReduced] = useState(false)
  const pulse = useRef(null)

  useEffect(() => {
    subs.add(setState)
    if (window.__apexLast) api.setState(window.__apexLast)
    return () => { subs.delete(setState) }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  /* صحنه همیشه روی #stage می‌نشیند */
  useEffect(() => {
    const st = document.getElementById('stage')
    if (!st) return
    const upd = () => {
      const r = st.getBoundingClientRect()
      setRect(o => Math.abs(o.left - r.left) + Math.abs(o.top - r.top) + Math.abs(o.width - r.width) + Math.abs(o.height - r.height) < 0.5 ? o : { left: r.left, top: r.top, width: r.width, height: r.height })
    }
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(st)
    const app = document.getElementById('app'); if (app) ro.observe(app)
    addEventListener('resize', upd); window.visualViewport?.addEventListener('resize', upd)
    const iv = setInterval(upd, 800)
    return () => { ro.disconnect(); removeEventListener('resize', upd); window.visualViewport?.removeEventListener('resize', upd); clearInterval(iv) }
  }, [])

  /* ضربان ملایم حلقه با شدت صدا */
  useEffect(() => {
    let raf = 0, sm = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      sm += ((window.__apexLvl || 0) - sm) * 0.25
      if (pulse.current) pulse.current.style.transform = `scale(${1 + 0.05 * sm})`
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const web = state === 'thinking' ? 'processing' : state === 'speaking' ? 'speaking' : state === 'listening' ? 'listening' : 'standby'
  const BAR = 84
  const h = Math.max(150, rect.height - BAR)
  const cy = rect.top + h / 2
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 95% 70% at 50% 24%, #122c43 0%, #0c1d30 38%, #07111f 72%, #050b14 100%)' }} />
      {!reduced && <div style={{ position: 'absolute', inset: 0 }}><ShaderBackground opacity={0.12} voiceActive={state === 'speaking'} gold={false} /></div>}
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', transition: 'background .6s ease',
        background: `radial-gradient(circle at 50% ${cy}px, rgba(13,210,255,${state === 'speaking' ? 0.3 : 0.18}) 0%, rgba(13,170,228,0.08) 18%, rgba(8,17,31,0) 42%)` }} />
      <div style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: h }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <ReasoningWeb state={web} mode="full" coreless onSelect={() => {}} />
          </div>
          <div ref={pulse} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}>
            <HeroOrb state={state} reduced={reduced} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 420, height: 150, transform: 'translateX(-50%) scale(.66)', transformOrigin: '50% 100%' }}>
          <OrbStatusBar state={state} />
        </div>
      </div>
    </div>
  )
}

function mount() {
  const el = document.getElementById('apexWorld')
  if (!el) return
  createRoot(el).render(<World />)
  window.ApexWorld = api
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount()
