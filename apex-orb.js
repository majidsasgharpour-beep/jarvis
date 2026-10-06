/* اوربِ APEX برای جارویس — پورت Canvas 2D از APEX-UI (MIT، Ruben Mouradian / Reznikov Engineering).
   حلقه‌ی طلایی، موج‌های صوتی، هسته‌ی ذرات، گراف استدلال و اکولایزر؛ بدون کتابخانه‌ی بیرونی.
   همان API قبلی (poke / pointer / step / paint) را دارد تا index.html تغییر زیادی نکند. */
(function(){
'use strict';
const TAU = Math.PI * 2;
const rate = (dt, tau) => 1 - Math.exp(-dt / tau);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hsla = (h, s, l, a) => 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ذرات هسته (توزیع ثابت روی کره + داخل آن)
let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const N = reduce ? 150 : 400;
const PT = [];
for(let i = 0; i < N; i++){
  const th = TAU * rnd(), ph = Math.acos(2 * rnd() - 1);
  const rr = i < N * .68 ? .84 + .16 * rnd() : Math.cbrt(rnd()) * .8;
  PT.push({ x: rr * Math.sin(ph) * Math.cos(th), y: rr * Math.sin(ph) * Math.sin(th), z: rr * Math.cos(ph), ph: rnd() * TAU, sp: .6 + rnd() * 1.2, sz: .7 + rnd() * .9 });
}

// گرهِ عامل‌ها (نسخه‌ی کوچک‌شده‌ی ReasoningWeb): [زاویه، ضریب شعاع افقی، ضریب شعاع عمودی، نوع]
const NODES = [
  [-2.55, 1.55, 1.15, 0], [-1.95, 1.7, 1.28, 2], [-1.35, 1.5, 1.3, 0], [-.75, 1.72, 1.25, 1], [-.2, 1.6, 1.1, 0], [.35, 1.78, 1.05, 2],
  [.9, 1.55, 1.2, 1], [1.45, 1.7, 1.28, 0], [2.0, 1.5, 1.3, 2], [2.55, 1.74, 1.18, 1], [3.1, 1.6, 1.02, 0], [-3.05, 1.82, 1.0, 1]
];
const KCOL = [[187, 100, 50], [38, 91, 55], [205, 22, 62]]; // مشاور / انجام‌دهنده / ابزار

const sprites = {};
function sprite(h, l){
  const k = h + '_' + l; if(sprites[k]) return sprites[k];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hsla(h, 100, l, 1)); gr.addColorStop(.35, hsla(h, 100, l, .5)); gr.addColorStop(1, hsla(h, 100, l, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return sprites[k] = c;
}
const norm = st => st === 'thinking' || st === 'drawing' || st === 'connecting' || st === 'text' ? 'thinking' : st === 'listening' ? 'listening' : st === 'speaking' ? 'speaking' : 'idle';

const Char = {
  t: 0, e: 0, lvl: 0, lvlS: 0, state: 'idle', mode: 'idle', listenW: 0, thinkW: 0, speakW: 0, surge: 0,
  spin: 0, tilt: 0, ph1: 0, ph2: 0, ph3: 0, wave: 0, look: [0, 0], lookT: 0, par: [0, 0], pulses: [], spawnAcc: 0,

  poke(){ this.surge = 1; },
  pointer(nx, ny){ this.look = [clamp(nx, -1, 1), clamp(ny, -1, 1)]; this.lookT = 2.2; },

  step(dt, amp, speaking, st, inLvl){
    this.t += dt; this.state = st; const m = this.mode = norm(st);
    const lv = clamp(Math.max(amp || 0, inLvl || 0), 0, 1);
    this.lvl = lv; this.lvlS += (lv - this.lvlS) * rate(dt, lv > this.lvlS ? .05 : .2);
    this.listenW += ((m === 'listening' ? 1 : 0) - this.listenW) * rate(dt, .35);
    this.thinkW += ((m === 'thinking' ? 1 : 0) - this.thinkW) * rate(dt, .3);
    this.speakW += ((m === 'speaking' ? 1 : 0) - this.speakW) * rate(dt, .25);
    this.surge = Math.max(0, this.surge - dt * .9);
    const goal = m === 'idle' ? .12 : m === 'listening' ? .5 + this.lvlS * .5 : m === 'thinking' ? .78 : .55 + this.lvlS * .9;
    this.e += (Math.min(1.2, goal + this.surge * .6) - this.e) * rate(dt, .3);
    const e = this.e;
    this.spin += dt * (.22 + e * 1.1 + this.thinkW * .9);
    this.tilt += dt * (.12 + e * .2);
    this.ph1 += dt / (m === 'idle' ? 16 : m === 'thinking' ? 3.2 : 6);   // چرخش حلقه‌ی درونی (ساعت‌گرد)
    this.ph2 += dt / (m === 'idle' ? 11 : m === 'thinking' ? 2.2 : 4);   // حلقه‌ی کوچک‌تر (پادساعت‌گرد)
    this.ph3 += dt / 7;                                                  // مدار خط‌چین «فکر کردن»
    this.wave += dt * (.28 + e * .55 + this.listenW * .35);
    this.lookT -= dt; if(this.lookT <= 0){ this.look[0] *= .92; this.look[1] *= .92; }
    this.par[0] += (this.look[0] - this.par[0]) * rate(dt, .25); this.par[1] += (this.look[1] - this.par[1]) * rate(dt, .25);
    // جرقه‌های ذره روی خط‌های گراف
    const spawnRate = m === 'thinking' ? 9 : m === 'speaking' ? 2 + this.lvlS * 6 : m === 'listening' ? 2.5 : .5;
    this.spawnAcc += dt * spawnRate;
    while(this.spawnAcc >= 1){ this.spawnAcc -= 1; if(this.pulses.length < 26) this.pulses.push({ n: (Math.random() * NODES.length) | 0, t: 0, v: .55 + Math.random() * .6, out: Math.random() < .35 }); }
    for(let i = this.pulses.length - 1; i >= 0; i--){ const p = this.pulses[i]; p.t += dt * p.v; if(p.t >= 1) this.pulses.splice(i, 1); }
  },

  paint(ctx, W, H, hue, ringHue){
    const t = this.t, e = this.e, m = this.mode;
    const core = hue == null ? 187 : hue, ring = ringHue == null ? 38 : ringHue;
    // چیدمان: اورب بالا، نوار اکولایزر پایین
    const barY = H - 38;
    const s = Math.max(.3, Math.min(W / 520, (H - 70) / 450));
    const cx = W / 2 + this.par[0] * 6, cy = (H - 60) / 2 + 4 + this.par[1] * 4;
    const R = 155 * s;
    const grow = 1 + .13 * this.listenW + .05 * this.lvlS + .05 * this.surge;
    const gold = (l, a) => hsla(ring, 91, l == null ? 55 : l, a), goldB = a => hsla(ring, 100, 75, a);
    ctx.save();
    ctx.lineCap = 'round';

    // — هاله‌ی محیطی (همیشه نفس می‌کشد)
    const br = .5 + .5 * Math.sin(t * (m === 'speaking' ? 4.5 : 1.6));
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1);
    g.addColorStop(0, gold(55, .09 + .08 * e + .05 * br)); g.addColorStop(1, gold(55, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // — گراف استدلال: خط‌ها، گره‌ها و ذره‌های در حال عبور
    ctx.save(); ctx.translate(cx, cy); ctx.scale(grow, grow);
    const nodeAlpha = .1 + .12 * this.thinkW + .05 * e;
    const pos = NODES.map((n, i) => { const a = n[0] + Math.sin(t * .25 + i * 1.7) * .05 + this.par[0] * .04; return [Math.cos(a) * R * n[1] * .92, Math.sin(a) * R * n[2] * .86 + Math.sin(t * .4 + i) * 2]; });
    ctx.lineWidth = Math.max(.6, 1 * s * 1.6);
    for(let i = 0; i < NODES.length; i++){
      const p = pos[i], c = KCOL[NODES[i][3]];
      ctx.strokeStyle = hsla(c[0], 70, 60, nodeAlpha);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p[0] * .5 - p[1] * .12, p[1] * .5 + p[0] * .12, p[0], p[1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < NODES.length; i++){
      const p = pos[i], c = KCOL[NODES[i][3]], r = (NODES[i][3] === 0 ? 4.2 : 3.4) * Math.max(.7, s * 1.5);
      const pulse = .5 + .5 * Math.sin(t * (1 + this.thinkW * 2.4) + i * 1.3);
      ctx.fillStyle = hsla(c[0], c[1], c[2], .25 + .35 * pulse * (.4 + this.thinkW + e * .4));
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
      ctx.drawImage(sprite(c[0], 60), p[0] - r * 3, p[1] - r * 3, r * 6, r * 6);
    }
    for(const q of this.pulses){
      const p = pos[q.n], k = q.out ? 1 - q.t : q.t, x = p[0] * k, y = p[1] * k + (p[0] * .12) * Math.sin(k * Math.PI) * .5;
      const sz = 6 * Math.max(.8, s * 1.8), al = Math.sin(q.t * Math.PI);
      ctx.globalAlpha = clamp(al * (.5 + .5 * this.thinkW + .3 * e), 0, 1);
      ctx.drawImage(sprite(core, 82), x - sz, y - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1; ctx.restore();

    // — حلقه‌های نازک بیرونی + علامت‌های هدف‌گیری
    ctx.save(); ctx.translate(cx, cy); ctx.scale(grow, grow);
    const OUT = [178, 194, 212, 230, 250];
    for(let i = 0; i < OUT.length; i++){
      ctx.strokeStyle = gold(55, Math.max(.03, .16 - i * .026 + .04 * e)); ctx.lineWidth = i === 0 ? .8 : .5;
      ctx.setLineDash(i % 2 ? [3 * s * 1.6, 7 * s * 1.6] : []); ctx.beginPath(); ctx.arc(0, 0, OUT[i] * s, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.strokeStyle = gold(55, .3);
    ctx.beginPath(); ctx.moveTo(0, -OUT[4] * s - 8); ctx.lineTo(0, -OUT[4] * s + 8); ctx.moveTo(0, OUT[4] * s - 8); ctx.lineTo(0, OUT[4] * s + 8); ctx.stroke();

    // — موج‌های صوتی (همیشه روشن؛ در حالت فعال پررنگ‌تر و بزرگ‌تر)
    const wMax = (230 + 15 * Math.min(1, e) + 35 * this.listenW) * s;
    const wA = .18 + .4 * Math.min(1, e) + .12 * this.listenW;
    for(let i = 0; i < 4; i++){
      const ph = ((this.wave + i * .25) % 1), eo = 1 - Math.pow(1 - ph, 2.2);
      ctx.strokeStyle = gold(58, wA * Math.pow(1 - ph, 1.35)); ctx.lineWidth = (.8 + 1.1 * Math.min(1, e)) * (1 - ph * .6) * Math.max(.8, s * 1.4);
      ctx.beginPath(); ctx.arc(0, 0, R + (wMax - R) * eo, 0, TAU); ctx.stroke();
    }
    // مدار خط‌چینِ «در حال فکر کردن»
    if(this.thinkW > .02){
      ctx.strokeStyle = gold(55, .45 * this.thinkW); ctx.lineWidth = 1; ctx.setLineDash([8 * s * 1.6, 14 * s * 1.6]); ctx.lineDashOffset = -this.ph3 * TAU * (R + 22 * s) * 1.0;
      ctx.beginPath(); ctx.arc(0, 0, R + 22 * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }

    // — حلقه‌ی اصلی: پر شدن شعاعی + لایه‌های درخشش + خط روشن
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, gold(55, 0)); g.addColorStop(.7, gold(55, .04)); g.addColorStop(.88, gold(55, .17 + .06 * e)); g.addColorStop(1, goldB(.5));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const gl = .75 + .25 * br + .35 * e;
    ctx.strokeStyle = gold(55, .05 * gl); ctx.lineWidth = 26 * s; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = gold(55, .09 * gl); ctx.lineWidth = 15 * s; ctx.stroke();
    ctx.strokeStyle = gold(55, .3 * gl); ctx.lineWidth = 6 * s; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = goldB(.95); ctx.lineWidth = Math.max(1.6, 2.5 * s * 1.3); ctx.stroke();
    // قوس درخشان چرخان روی حلقه
    const a0 = this.spin * .8;
    ctx.strokeStyle = hsla(ring, 100, 92, .85); ctx.lineWidth = Math.max(2.2, 3.4 * s * 1.3);
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a0 + .75 + .5 * e); ctx.stroke();

    // — حلقه‌های خط‌چینِ درونی (می‌چرخند)
    const act = Math.min(1, e);
    ctx.lineWidth = Math.max(1, 1.5 * s * 1.3);
    ctx.strokeStyle = gold(55, .13 + .32 * act); ctx.setLineDash([55 * s, 25 * s]); ctx.lineDashOffset = -this.ph1 * TAU * R * .58;
    ctx.beginPath(); ctx.arc(0, 0, R * .58, 0, TAU); ctx.stroke();
    ctx.strokeStyle = gold(55, .09 + .24 * act); ctx.setLineDash([28 * s, 18 * s]); ctx.lineDashOffset = this.ph2 * TAU * R * .35; ctx.lineWidth = Math.max(.8, s * 1.3);
    ctx.beginPath(); ctx.arc(0, 0, R * .35, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;

    // — هسته‌ی ذرات فیروزه‌ای (توپِ در حال جوشیدن)
    const ballR = R * (.4 + .13 * Math.min(1, e) + .1 * this.lvlS + .05 * this.surge);
    const boil = .05 + .05 * this.thinkW + .22 * this.lvlS * (m === 'speaking' || m === 'listening' ? 1 : .3);
    const cyA = this.spin, cxA = .45 + Math.sin(this.tilt) * .3 + this.par[1] * .25, cyB = cyA + this.par[0] * .5;
    const sy = Math.sin(cyB), cyc = Math.cos(cyB), sx = Math.sin(cxA), cxc = Math.cos(cxA);
    ctx.globalCompositeOperation = 'lighter';
    const hg = ballR * 2.2;
    ctx.globalAlpha = clamp(.5 + .35 * act + .2 * this.surge, 0, 1); ctx.drawImage(sprite(core, 50), -hg, -hg, hg * 2, hg * 2);
    ctx.globalAlpha = clamp(.25 + .4 * act, 0, 1); ctx.drawImage(sprite(core, 88), -ballR * .9, -ballR * .9, ballR * 1.8, ballR * 1.8);
    const sp = sprite(core, 72), dim = hsla(core, 100, 50, 1);
    for(let i = 0; i < N; i++){
      const p = PT[i], k = 1 + Math.sin(t * p.sp * 2.2 + p.ph) * boil + Math.sin(p.ph * 3 + t * 9) * this.lvlS * .18;
      let x = p.x * k, y = p.y * k, z = p.z * k;
      let x1 = x * cyc + z * sy, z1 = -x * sy + z * cyc;
      let y1 = y * cxc - z1 * sx, z2 = y * sx + z1 * cxc;
      const pers = 1 / (1 - z2 * .28), px = x1 * ballR * pers, py = y1 * ballR * pers;
      const d = (z2 + 1) / 2, size = (2.2 + p.sz * 2.4) * Math.max(.75, s * 1.7) * (.6 + d * .7) * pers;
      ctx.globalAlpha = clamp((.18 + .62 * d) * (.7 + .5 * act), 0, 1);
      ctx.drawImage(sp, px - size, py - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; void dim;
    ctx.restore();

    // — نوار وضعیت پایین: اکولایزر + حلقه‌ی کوچک مرکزی
    const bw = clamp(W * .5, 150, 220), bars = 28, bwid = Math.max(2, bw / bars * .4), gap = (bw - bars * bwid) / (bars - 1);
    const on = m !== 'idle';
    ctx.strokeStyle = gold(55, on ? .5 : .18); ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(W / 2 - bw / 2 - 70, barY); ctx.lineTo(W / 2 - bw / 2 - 6, barY); ctx.moveTo(W / 2 + bw / 2 + 6, barY); ctx.lineTo(W / 2 + bw / 2 + 70, barY); ctx.stroke(); ctx.setLineDash([]);
    for(let i = 0; i < bars; i++){
      const x = W / 2 - bw / 2 + i * (bwid + gap);
      const base = 3 + Math.abs(Math.sin(i * .6)) * 5, top = 7 + Math.abs(Math.sin(i * .8)) * 20;
      const wob = .5 + .5 * Math.sin(t * (4 + (i % 5) * 1.3) + i * .9);
      const mix = on ? clamp(.2 + .55 * wob * (.4 + this.lvlS * 1.4) + .25 * this.thinkW * wob + this.surge * .4, 0, 1) : .1 * wob;
      const h = base + (top - base) * mix;
      ctx.fillStyle = gold(55, on ? .85 : .3);
      if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x, barY - h / 2, bwid, h, bwid / 2); ctx.fill(); } else ctx.fillRect(x, barY - h / 2, bwid, h);
    }
    ctx.fillStyle = '#030200'; ctx.strokeStyle = gold(55, .55 + .25 * Math.sin(t * 2.5)); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(W / 2, barY, 15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sprite(ring, 78), W / 2 - 15, barY - 15, 30, 30);
    ctx.fillStyle = goldB(.95); ctx.beginPath(); ctx.arc(W / 2, barY, 4.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
};

if(typeof module !== 'undefined' && module.exports) module.exports = Char; else window.Char = Char;
})();
