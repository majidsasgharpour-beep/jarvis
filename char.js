/* کاراکتر انیمه‌ای اورجینال جارویس — رسم با Canvas 2D، بدون هیچ تصویر یا کتابخانه‌ی بیرونی */
(function(){
'use strict';
const rate = (dt, tau) => 1 - Math.exp(-dt / tau);
const TAU = Math.PI * 2;

const Char = {
  t: 0, mouth: 0, wide: 0, glow: 0, blink: 0, blinkAt: 2.2, blinkT: -1,
  gaze: [0, 0], gz: [0, 0], gazeAt: 0, look: [0, 0], lookT: 0, bias: [0, 0],
  lids: 1, brow: 0, browBias: 0, happy: 0, bounce: 0, tilt: 0, tiltGoal: 0, lvl: 0, state: 'idle',

  poke(){ this.happy = 1.2; this.bounce = 1; },
  pointer(nx, ny){ this.look = [Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny))]; this.lookT = 2.2; },

  step(dt, amp, speaking, st, inLvl){
    this.t += dt; const t = this.t; this.state = st; this.lvl = inLvl || 0;
    // دهان: پوش صدا + کمی تنوع تا شبیه حرف زدن شود
    const shape = speaking ? .55 + .45 * Math.abs(Math.sin(t * 10.5 + Math.sin(t * 2.3) * 2)) : 1;
    const target = speaking ? Math.min(1, Math.pow(Math.max(0, (amp - .04) / .5), .7) * shape) : 0;
    this.mouth += (target - this.mouth) * rate(dt, target > this.mouth ? .03 : speaking ? .022 : .08);
    if(this.mouth < .002) this.mouth = 0;
    const wt = speaking ? .8 * Math.sin(t * 3.3 + 1) * Math.min(1, this.mouth * 2) : 0;
    this.wide += (wt - this.wide) * rate(dt, .06);
    this.glow += (amp - this.glow) * rate(dt, amp > this.glow ? .05 : .25);
    // حالت‌ها
    let bx = 0, by = 0, bb = 0, lids = 1, tg = 0;
    if(st === 'thinking' || st === 'drawing'){ bx = -.55; by = -.8; bb = .55; tg = -.07; lids = .92; }
    else if(st === 'connecting' || st === 'text'){ bx = .55; by = -.15; bb = .15; tg = .03; }
    else if(st === 'listening'){ bb = .3; tg = .05; }
    else if(st === 'speaking'){ tg = Math.sin(t * 1.4) * .035; }
    else { lids = .84; tg = Math.sin(t * .5) * .02; }
    this.bias[0] += (bx - this.bias[0]) * rate(dt, .25); this.bias[1] += (by - this.bias[1]) * rate(dt, .25);
    this.browBias += (bb - this.browBias) * rate(dt, .2);
    this.lids += (lids - this.lids) * rate(dt, .3);
    this.tilt += (tg - this.tilt) * rate(dt, .35);
    // نگاه تصادفی + دنبال کردن انگشت
    this.gazeAt -= dt;
    if(this.gazeAt <= 0){ const s = speaking ? 1 : .45; this.gz = [(Math.random() - .5) * s, (Math.random() - .5) * s * .6]; this.gazeAt = .6 + Math.random() * (speaking ? 1.2 : 2.6); }
    this.lookT -= dt; if(this.lookT <= 0){ this.look[0] *= .9; this.look[1] *= .9; }
    for(let k = 0; k < 2; k++){
      const goal = Math.max(-1, Math.min(1, this.gz[k] * (this.lookT > 0 ? .2 : 1) + this.bias[k] + this.look[k]));
      this.gaze[k] += (goal - this.gaze[k]) * rate(dt, .07);
    }
    // پلک زدن
    this.blinkAt -= dt;
    if(this.blinkAt <= 0 && this.blinkT < 0){ this.blinkT = 0; this.blinkAt = 2.4 + Math.random() * 3.6; }
    if(this.blinkT >= 0){ this.blinkT += dt; const p = this.blinkT / .16; this.blink = p < .5 ? p * 2 : Math.max(0, 2 - p * 2); if(p >= 1){ this.blinkT = -1; this.blink = 0; } }
    const bt = this.browBias + (speaking ? .5 * Math.min(1, this.glow * 1.6) : 0);
    this.brow += (bt - this.brow) * rate(dt, .12);
    this.happy = Math.max(0, this.happy - dt);
    this.bounce = Math.max(0, this.bounce - dt * 2.2);
  },

  paint(ctx, W, H, hue, hair){
    const t = this.t, k = Math.min(W / 118, H / 136);
    const skin = '#ffe4d3', skinSh = '#f4c8b4';
    const hM = `hsl(${hair},56%,40%)`, hD = `hsl(${hair},52%,24%)`, hL = `hsl(${hair},72%,66%)`;
    const acc = `hsl(${hue},90%,64%)`;
    const bob = Math.sin(t * 1.6) * .7 - Math.sin(Math.min(1, this.bounce) * Math.PI) * 3.2;
    const path = (fn) => { ctx.beginPath(); fn(); };
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const headT = () => { ctx.translate(0, bob); ctx.translate(0, 34); ctx.rotate(this.tilt); ctx.translate(0, -34); };

    ctx.save();
    ctx.translate(W / 2, H / 2 + 1); ctx.scale(k, k);

    // هاله‌ی خیلی ملایم پشت کاراکتر (تقریباً دیده نمی‌شود)
    const ag = ctx.createRadialGradient(0, 6, 0, 0, 6, 74);
    ag.addColorStop(0, `hsla(${hue},80%,60%,${.10 + .08 * this.glow})`); ag.addColorStop(1, `hsla(${hue},80%,60%,0)`);
    ctx.fillStyle = ag; ctx.fillRect(-80, -80, 160, 160);

    // موی پشتی
    ctx.save(); headT();
    const bg = ctx.createLinearGradient(0, -48, 0, 50); bg.addColorStop(0, hM); bg.addColorStop(1, hD);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-40, 6);
    ctx.bezierCurveTo(-46, -52, 46, -52, 40, 6);
    ctx.bezierCurveTo(44, 22, 46, 36, 40, 50);
    ctx.bezierCurveTo(34, 46, 30, 52, 24, 48); ctx.lineTo(-24, 48);
    ctx.bezierCurveTo(-30, 52, -34, 46, -40, 50);
    ctx.bezierCurveTo(-46, 36, -44, 22, -40, 6); ctx.fill();
    ctx.restore();

    // گردن و بدن
    ctx.save(); ctx.translate(0, bob * .4);
    ctx.fillStyle = skinSh; ctx.fillRect(-6.5, 24, 13, 19);
    const br = 1 + Math.sin(t * 1.6) * .012;
    ctx.save(); ctx.translate(0, 70); ctx.scale(1, br); ctx.translate(0, -70);
    const cg = ctx.createLinearGradient(0, 40, 0, 72); cg.addColorStop(0, `hsl(${hue},42%,28%)`); cg.addColorStop(1, `hsl(${hue},48%,15%)`);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-50, 74);
    ctx.bezierCurveTo(-49, 52, -27, 44, -9, 40.5); ctx.lineTo(9, 40.5);
    ctx.bezierCurveTo(27, 44, 49, 52, 50, 74); ctx.closePath(); ctx.fill();
    ctx.fillStyle = skinSh; ctx.beginPath(); ctx.moveTo(-9, 40.5); ctx.lineTo(0, 53); ctx.lineTo(9, 40.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-9.5, 40); ctx.lineTo(0, 54); ctx.lineTo(9.5, 40); ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},30%,85%,.8)`; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, 52); ctx.lineTo(-4.2, 63); ctx.moveTo(3, 52); ctx.lineTo(4.2, 63); ctx.stroke();
    // هسته‌ی کوچک روی سینه
    ctx.shadowColor = acc; ctx.shadowBlur = 4 + 8 * this.glow; ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(-24, 62, 2.4 + this.glow * .8, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore(); ctx.restore();

    // سر
    ctx.save(); headT();
    const facePath = () => { ctx.beginPath(); ctx.moveTo(-30, -6); ctx.bezierCurveTo(-31, -36, 31, -36, 30, -6); ctx.bezierCurveTo(30, 14, 16, 31, 0, 32); ctx.bezierCurveTo(-16, 31, -30, 14, -30, -6); ctx.closePath(); };
    const fg = ctx.createLinearGradient(0, -20, 0, 32); fg.addColorStop(0, '#ffe9dc'); fg.addColorStop(1, '#ffd8c5');
    facePath(); ctx.fillStyle = fg; ctx.fill();
    const BANG = [[34, 2], [29, -8], [25, -3], [20, -13], [14, -3], [8, -16], [2, -4], [-4, -17], [-10, -3], [-16, -14], [-22, -3], [-28, -9], [-33, 2], [-37, 8]];
    const bangsPath = () => { ctx.beginPath(); ctx.moveTo(37, 8); ctx.bezierCurveTo(45, -52, -45, -52, -37, 8); BANG.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); };
    // سایه‌ی موی جلو روی پیشانی
    ctx.save(); facePath(); ctx.clip(); ctx.translate(0, 3.6); bangsPath(); ctx.fillStyle = 'rgba(120,60,70,.2)'; ctx.fill(); ctx.restore();
    // سایه‌ی زیر چانه
    ctx.save(); facePath(); ctx.clip(); ctx.fillStyle = 'rgba(200,120,110,.10)'; ctx.beginPath(); ctx.ellipse(0, 36, 30, 8, 0, 0, TAU); ctx.fill(); ctx.restore();

    // گونه‌ها
    const hp = Math.min(1, this.happy);
    ctx.fillStyle = `rgba(255,105,140,${.22 + .12 * this.glow + .28 * hp})`;
    for(const s of [-1, 1]){ ctx.beginPath(); ctx.ellipse(s * 19.5, 16.5, 5.4, 2.8, 0, 0, TAU); ctx.fill(); }
    if(hp > .1){ ctx.strokeStyle = `rgba(255,90,130,${.6 * hp})`; ctx.lineWidth = .7; ctx.lineCap = 'round'; for(const s of [-1, 1]) for(let j = 0; j < 3; j++){ ctx.beginPath(); ctx.moveTo(s * (16.6 + j * 2.6), 17.8); ctx.lineTo(s * (17.8 + j * 2.6), 14.8); ctx.stroke(); } }

    // چشم‌ها
    const open = this.lids * (1 - this.blink);
    for(const s of [-1, 1]){
      const cx = s * 13.5, cy = 7.5, w = 8.4, hh = Math.max(.7, 9.2 * open);
      if(this.happy > .05){
        ctx.strokeStyle = '#33203a'; ctx.lineWidth = 2.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy + 3.2, 6.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue;
      }
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, w, hh, 0, 0, TAU); ctx.clip();
      const sg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh); sg.addColorStop(0, '#c9d0ec'); sg.addColorStop(.35, '#ffffff'); sg.addColorStop(1, '#f1f4ff');
      ctx.fillStyle = sg; ctx.fillRect(cx - w - 1, cy - hh - 1, w * 2 + 2, hh * 2 + 2);
      const ix = cx + this.gaze[0] * 2.5, iy = cy + this.gaze[1] * 2.3 + .4;
      const ig = ctx.createLinearGradient(0, iy - 8, 0, iy + 8);
      ig.addColorStop(0, `hsl(${hue},72%,20%)`); ig.addColorStop(.55, `hsl(${hue},88%,52%)`); ig.addColorStop(1, `hsl(${(hue + 28) % 360},96%,74%)`);
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, 5.9, 8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `hsla(${hue},80%,16%,.85)`; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = '#151126'; ctx.beginPath(); ctx.ellipse(ix, iy, 2.7, 3.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.beginPath(); ctx.ellipse(ix - 1.9, iy - 3.3, 2, 2.4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ix + 2.3, iy + 3.1, 1, 0, TAU); ctx.fill();
      const ls = ctx.createLinearGradient(0, cy - hh, 0, cy - hh + 5.5); ls.addColorStop(0, 'rgba(70,30,90,.38)'); ls.addColorStop(1, 'rgba(70,30,90,0)');
      ctx.fillStyle = ls; ctx.fillRect(cx - w - 1, cy - hh, w * 2 + 2, 6);
      ctx.restore();
      ctx.strokeStyle = '#2a1830'; ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(cx, cy, w, hh, 0, Math.PI * 1.03, Math.PI * 1.97); ctx.stroke();
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx + s * (w - .5), cy - hh * .35);
      ctx.quadraticCurveTo(cx + s * (w + 2.2), cy - hh * .4 - 1, cx + s * (w + 3.6), cy - hh * .55 - 2.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,70,85,.5)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(cx, cy, w - .6, hh, 0, Math.PI * .15, Math.PI * .85); ctx.stroke();
    }

    // بینی
    ctx.strokeStyle = 'rgba(185,115,110,.6)'; ctx.lineWidth = .9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-1, 14.4); ctx.quadraticCurveTo(.2, 15.6, 1.3, 14.4); ctx.stroke();

    // دهان
    const m = this.mouth, wd = this.wide;
    if(m < .06){
      const sm = this.happy > .05 ? 2.2 : 0;
      ctx.strokeStyle = '#b9505a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3.8 - sm * .4, 21 - sm * .3); ctx.quadraticCurveTo(0, 23.6 + sm, 3.8 + sm * .4, 21 - sm * .3); ctx.stroke();
    } else {
      const rx = 3 + m * 1.4 + wd * 1.6, ry = .8 + m * 5.4, my = 21.4 + ry * .55;
      ctx.fillStyle = '#5c1b2f'; ctx.beginPath(); ctx.ellipse(0, my, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, my, rx, ry, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = '#ff7f96'; ctx.beginPath(); ctx.ellipse(0, my + ry * .95, rx * .7, ry * .6, 0, 0, TAU); ctx.fill();
      if(m > .25){ ctx.fillStyle = '#fff'; ctx.fillRect(-rx * .72, my - ry - .1, rx * 1.44, Math.min(1.9, ry * .32)); }
      ctx.restore();
      ctx.strokeStyle = '#b9505a'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(0, my, rx, ry, 0, 0, TAU); ctx.stroke();
    }

    // موی جلو (بنگ)
    const bgr = ctx.createLinearGradient(0, -46, 0, 8); bgr.addColorStop(0, hM); bgr.addColorStop(1, `hsl(${hair},54%,30%)`);
    bangsPath(); ctx.fillStyle = bgr; ctx.fill();
    ctx.strokeStyle = `hsla(${hair},50%,14%,.55)`; ctx.lineWidth = .8; ctx.lineJoin = 'round'; ctx.stroke();
    // طره‌های کنار صورت
    for(const s of [-1, 1]){
      ctx.beginPath(); ctx.moveTo(s * 37, 4);
      ctx.bezierCurveTo(s * 41, 16, s * 40, 32, s * 34, 41);
      ctx.bezierCurveTo(s * 32, 30, s * 31, 14, s * 29, -2); ctx.closePath();
      ctx.fillStyle = hM; ctx.fill(); ctx.strokeStyle = `hsla(${hair},50%,14%,.5)`; ctx.stroke();
    }
    // براق‌های مو
    ctx.lineCap = 'round'; ctx.strokeStyle = hL; ctx.globalAlpha = .5; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-26, -27); ctx.bezierCurveTo(-12, -38, 12, -38, 26, -27); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-18, -22); ctx.bezierCurveTo(-8, -29, 8, -29, 18, -22); ctx.stroke();
    ctx.globalAlpha = 1;

    // ابروها
    ctx.strokeStyle = `hsla(${hair},55%,16%,.9)`; ctx.lineWidth = 1.5;
    const th = this.state === 'thinking' || this.state === 'drawing';
    for(const s of [-1, 1]){
      const bx = s * 13.5, by = -6.5 - this.brow * 2.4, inD = th ? -1.6 : .4;
      ctx.beginPath(); ctx.moveTo(bx - s * 5.6, by + inD); ctx.quadraticCurveTo(bx, by - 1.7, bx + s * 5.6, by + 1.3); ctx.stroke();
    }

    // هدفون
    ctx.strokeStyle = `hsl(${hue},22%,88%)`; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 6, 42.5, Math.PI * 1.03, Math.PI * 1.97); ctx.stroke();
    for(const s of [-1, 1]){
      const x = s * 42.5 - 4.8;
      rr(x, -2, 9.6, 21, 4.6); ctx.fillStyle = `hsl(${hue},28%,17%)`; ctx.fill();
      ctx.shadowColor = acc; ctx.shadowBlur = 3 + 10 * this.glow;
      rr(x + 2.2, 2, 5.2, 13, 2.6); ctx.fillStyle = acc; ctx.fill(); ctx.shadowBlur = 0;
      if(this.state === 'listening' && this.lvl > .03){
        ctx.strokeStyle = acc; ctx.lineWidth = 1.5;
        for(let j = 0; j < 2; j++){
          ctx.globalAlpha = Math.min(1, this.lvl * 1.6) * (1 - j * .45);
          const r = 13 + j * 5.5 + Math.sin(t * 8 - j) * 1.2, a0 = s > 0 ? -.75 : Math.PI - .75;
          ctx.beginPath(); ctx.arc(s * 42.5, 8.5, r, a0, a0 + 1.5); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    // آهوگه (تار مو بالای سر) و سنجاق
    const aw = Math.sin(t * 2.2) * 2.2 - this.tilt * 14;
    ctx.strokeStyle = hM; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.bezierCurveTo(-3 + aw, -46, 7 + aw, -52, 3 + aw * 1.6, -62); ctx.stroke();
    ctx.strokeStyle = hL; ctx.globalAlpha = .5; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-.8, -37); ctx.bezierCurveTo(-3.4 + aw, -46, 6 + aw, -51, 2.6 + aw * 1.6, -60); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(-22, -32); ctx.lineTo(-19.6, -28.6); ctx.lineTo(-22, -25.2); ctx.lineTo(-24.4, -28.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-27, -26); ctx.lineTo(-25.5, -24); ctx.lineTo(-27, -22); ctx.lineTo(-28.5, -24); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // نقطه‌های «در حال فکر کردن»
    if(this.state === 'thinking' || this.state === 'drawing'){
      ctx.fillStyle = acc;
      for(let i = 0; i < 3; i++){ const a = (Math.sin(t * 5 - i * .9) + 1) / 2; ctx.globalAlpha = .35 + .65 * a; ctx.beginPath(); ctx.arc(40 + i * 7, -48 - a * 2.6 + bob, 2.2 + a * .7, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};

if(typeof module !== 'undefined' && module.exports) module.exports = Char; else window.Char = Char;
})();
