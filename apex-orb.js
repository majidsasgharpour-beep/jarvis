/* پل بین جارویس و صحنه‌ی APEX (apex-world.js). همان API قبلیِ Char را نگه می‌دارد
   (poke / pointer / step / paint) تا کد صوتی و حالت‌ها دست‌نخورده بمانند. */
(function(){
'use strict';
const map = st => st === 'listening' ? 'listening' : st === 'speaking' ? 'speaking'
  : (st === 'thinking' || st === 'drawing' || st === 'connecting' || st === 'text') ? 'thinking' : 'idle';
const W = () => window.ApexWorld;
const Char = {
  poke(){ const w = W(); if(w) w.poke(); },
  pointer(){},
  step(dt, amp, speaking, st, inLvl){
    const s = map(st), lv = Math.max(0, Math.min(1, Math.max(amp || 0, inLvl || 0)));
    window.__apexLast = s; window.__apexLvl = lv;
    const w = W(); if(w) w.setState(s);
  },
  paint(){}   // رسم را APEX انجام می‌دهد
};
if(typeof module !== 'undefined' && module.exports) module.exports = Char; else window.Char = Char;
})();
