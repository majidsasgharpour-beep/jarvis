/* Jarvis visual compatibility layer.
   The old APEX renderer has been removed. The runtime still expects Char.step/poke,
   so these small hooks keep voice/state code working while the new UI is rebuilt. */
(function(){
  'use strict';
  const map = s => s === 'listening' ? 'listening' :
    s === 'speaking' ? 'speaking' :
    (s === 'thinking' || s === 'drawing' || s === 'connecting' || s === 'text') ? 'thinking' : 'idle';

  function setState(state){
    const root=document.getElementById('app');
    const status=document.getElementById('status');
    const s=map(state);
    if(root) root.dataset.state=s;
    if(status){
      status.textContent =
        s==='listening' ? 'در حال شنیدن' :
        s==='speaking' ? 'در حال صحبت' :
        s==='thinking' ? 'در حال پردازش' : 'آماده';
    }
  }

  const Char={
    poke(){ document.documentElement.classList.add('jarvis-active'); setTimeout(()=>document.documentElement.classList.remove('jarvis-active'),450); },
    pointer(){},
    step(dt,amp,speaking,state,inLvl){ setState(state); },
    paint(){}
  };

  if(typeof module!=='undefined' && module.exports) module.exports=Char;
  else window.Char=Char;
})();