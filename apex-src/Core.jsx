/* هسته‌ی ذرات فیروزه‌ایِ APEX بدون three.js: همان ۱۲۰۰ ذره، همان منطق «توپ جوشان» و همان
   دوربین (z=4.8، fov=50) و گروهِ چرخان (x=0.3، مقیاس 0.55) از ApexCore3D.jsx (نسخه‌ی variant="particles")،
   روی Canvas دوبعدی با ترکیب additive و یک هاله‌ی ارزان به‌جای Bloom. */
import React, { useEffect, useRef } from 'react'

const N = 1200
const CAM = 4.8, TAN = Math.tan((50 / 2) * Math.PI / 180)
const STAGE = 900                 // صحنه‌ی ۹۰۰×۹۰۰ مثل ApexHeroOrb
const F0 = (STAGE / 2) / TAN      // ضریب پرسپکتیو: px = world * F0 / depth
const SCALE = 0.55, TILT = 0.3

const norm = s => { s = String(s || '').toLowerCase(); return s.includes('think') || s.includes('process') ? 'processing' : s.includes('listen') ? 'listening' : s.includes('speak') ? 'speaking' : 'standby' }

function sprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(210,252,255,1)'); r.addColorStop(0.3, 'rgba(0,229,255,0.7)'); r.addColorStop(1, 'rgba(0,229,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c
}

export default function ParticleCore({ state, scale }) {
  const cv = useRef(null), st = useRef('standby')
  st.current = norm(state)

  /* اندازه‌ی بافر نسبت به مقیاسِ CSS صحنه تا روی گوشی تیز ولی سبک بماند */
  useEffect(() => {
    const c = cv.current; if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.max(160, Math.round(STAGE * scale * dpr))
    if (c.width !== px) { c.width = px; c.height = px }
  }, [scale])

  useEffect(() => {
    const c = cv.current; if (!c) return
    const ctx = c.getContext('2d')
    const spr = sprite()
    const mk = n => { const e = document.createElement('canvas'); e.width = e.height = n; return [e, e.getContext('2d')] }
    const [g1, x1] = mk(200), [g2, x2] = mk(100)

    const dir = new Float32Array(N * 3), ballR = new Float32Array(N), ph = new Float32Array(N), sp = new Float32Array(N), pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      dir[i * 3] = Math.sin(p) * Math.cos(th); dir[i * 3 + 1] = Math.sin(p) * Math.sin(th); dir[i * 3 + 2] = Math.cos(p)
      ballR[i] = 0.16 + Math.pow(Math.random(), 0.6) * 0.84
      ph[i] = Math.random() * Math.PI * 2; sp[i] = 0.7 + Math.random() * 1.7
    }
    let rt = 0.85, spin = 0, raf = 0, last = performance.now(), t0 = last
    const cx = Math.cos(TILT), sx = Math.sin(TILT)

    const frame = now => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.1); last = now
      const t = (now - t0) / 1000, k60 = dt * 60
      const s = st.current, sleeping = s === 'standby', speaking = s === 'speaking'
      const target = sleeping ? 0.58 : speaking ? 1.2 : 1.5
      rt += (target - rt) * (1 - Math.pow(0.95, k60)); spin += dt * 0.07
      const amp = sleeping ? 0.17 : 0.10 + 0.08 * rt, wave = 0.5
      const ease = 1 - Math.pow(0.62, k60)
      const cy = Math.cos(spin), sy = Math.sin(spin)
      const size = sleeping ? 0.026 : 0.018, op = sleeping ? 1 : 0.92

      const K = c.width / STAGE
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height)
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = op
      ctx.setTransform(K, 0, 0, K, 0, 0)
      for (let i = 0; i < N; i++) {
        let r = ballR[i] * rt + Math.sin(t * sp[i] + ph[i]) * amp
        if (speaking) r += Math.sin(ballR[i] * 5.5 - t * 5.0) * wave
        else if (!sleeping) r += Math.sin(ballR[i] * 3.0 - t * 1.7) * (wave * 0.22)
        const k = i * 3
        pos[k] += (dir[k] * r - pos[k]) * ease; pos[k + 1] += (dir[k + 1] * r - pos[k + 1]) * ease; pos[k + 2] += (dir[k + 2] * r - pos[k + 2]) * ease
        // دوران: Rx(0.3) ∘ Ry(spin)
        const x0 = pos[k], y0 = pos[k + 1], z0 = pos[k + 2]
        const x1 = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy
        const y2 = y0 * cx - z1 * sx, z2 = y0 * sx + z1 * cx
        const X = x1 * SCALE, Y = y2 * SCALE, Z = z2 * SCALE
        const f = F0 / (CAM - Z), d = size * f
        ctx.drawImage(spr, STAGE / 2 + X * f - d / 2, STAGE / 2 - Y * f - d / 2, d, d)
      }
      /* هاله (جایگزین Bloom): کوچک‌کردن دومرحله‌ای و بزرگ‌کردن نرم */
      x1.clearRect(0, 0, 200, 200); x1.drawImage(c, 0, 0, 200, 200)
      x2.clearRect(0, 0, 100, 100); x2.drawImage(g1, 0, 0, 100, 100)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true
      ctx.globalAlpha = 0.5; ctx.drawImage(g2, 0, 0, c.width, c.height)
      ctx.globalAlpha = 0.25; ctx.drawImage(g1, 0, 0, c.width, c.height)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={cv} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: STAGE, height: STAGE, pointerEvents: 'none' }} />
}
