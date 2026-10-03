/* Jarvis · رندر سه‌بعدی روی GPU
   WebGL2 خالص؛ بدون هیچ کتابخانه‌ی بیرونی، پس آفلاین هم کار می‌کند.
   اگر WebGL2 نباشد یا خطایی رخ بدهد، خودکار به رندر دوبعدی قبلی برمی‌گردد. */
(() => {
const G = window.GL3D = { ok: false };
const stage = document.getElementById('stage'), orbEl = document.getElementById('orb');
if(!stage || !orbEl) return;
const cv = document.createElement('canvas'); cv.id = 'glc'; cv.setAttribute('aria-hidden', 'true');
const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
if(!gl) return;
let hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

/* ───────── GLSL ───────── */
const HEAD = '#version 300 es\nprecision highp float;\nprecision highp sampler2D;\n';
const LIB = `
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 hsl(float h,float s,float l){vec3 k=mod(vec3(0,8,4)+h*12.,12.);float a=s*min(l,1.-l);return l-a*clamp(min(k-3.,9.-k),-1.,1.);}
`;
const CAM = 'uniform vec3 uCam;vec4 proj(vec3 p){float w=max(.3,uCam.x-p.z);return vec4(p.x*uCam.y/uCam.z,p.y*uCam.y,-p.z*.25*w,w);}';
const FSV = 'void main(){gl_Position=vec4(vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2))*2.-1.,0,1);}';

// پس‌زمینه: سحابی حجمی + ستاره‌های دو لایه‌ی پارالاکس
const BG = `uniform vec2 uRes,uTilt;uniform vec3 uCam;uniform float uT,uHue,uE,uGlow;out vec4 o;${LIB}
void main(){vec2 uv=(gl_FragCoord.xy/uRes-.5)*vec2(uCam.z,1.);float hu=uHue/360.;
vec2 q=uv+uTilt*.05;float t=uT*.04;
float f=fbm(vec3(q*1.7,t))*.7+fbm(vec3(q*3.4+5.,t*1.6))*.5;
vec3 c=mix(hsl(hu,.9,.5),hsl(hu+.14,.9,.5),f)*pow(f,2.4)*(.2+.55*uE);
for(int i=0;i<2;i++){float z=float(i+1);vec2 p=(uv+uTilt*.04*z)*(36.*z)+z*9.;vec2 id=floor(p);vec2 g=fract(p)-.5;float r=h2(id);
float d=length(g-(vec2(h2(id+3.1),h2(id+7.7))-.5)*.5);
c+=step(.93,r)*(1.-smoothstep(0.,.1,d))*(.5+.5*sin(uT*(1.+r*3.)+r*60.))*(.3+.3*z)*hsl(hu+.05,.5,.8);}
float d=length(uv);c+=hsl(hu,1.,.55)*uGlow*(.06+.4*uE)/(d*d*9.+.25);
o=vec4(c,1);}`;

// هسته‌ی پلاسما: کره‌ی نویزدار که با صدا می‌تپد
const SPV = `layout(location=0)in vec3 aP;uniform mat3 uR;uniform float uT;uniform vec4 uB;out vec3 vN,vW;${LIB}${CAM}
void main(){float n=n3(aP*2.4+vec3(0,uT*.5,uT*.3));float d=(n-.5)*(.2+.9*uB.x)+.04*sin(aP.y*8.+uT*4.)*uB.y;
vec3 p=aP*(.8*(1.+.4*uB.x)+d);vN=uR*aP;vW=uR*p;gl_Position=proj(vW);}`;
const SPF = `in vec3 vN,vW;uniform vec3 uCam;uniform float uT,uHue,uE;uniform vec4 uB;out vec4 o;${LIB}
void main(){vec3 N=normalize(vN),V=normalize(vec3(0,0,uCam.x)-vW);float nv=abs(dot(N,V)),fr=pow(1.-nv,2.2),hu=uHue/360.;
float pl=fbm(vW*3.+vec3(uT*.25,-uT*.35,uT*.2));float bd=.5+.5*sin(vW.y*16.+pl*7.+uT*2.5);
vec3 c=hsl(hu,1.,.5)*(.25+1.1*pl)*(.45+.55*bd)+hsl(hu+.05,1.,.72)*fr*2.;
c=mix(c,vec3(.85,.97,1.),pow(nv,5.)*.55*(.6+uE));o=vec4(c*(.8+1.1*uE+.9*uB.x),1);}`;

// حلقه‌های مداری سه‌بعدی (کمان‌های شکسته مثل آیکون)
const RGV = `layout(location=0)in vec2 aA;uniform mat3 uR,uQ;uniform float uRad,uW;out vec2 vA;${CAM}
void main(){float a=aA.x*6.2831853;vec3 p=vec3(cos(a),sin(a),0)*(uRad+aA.y*uW);vA=aA;gl_Position=proj(uR*(uQ*p));}`;
const RGF = `in vec2 vA;uniform float uPh,uLen,uHue,uAl;out vec4 o;${LIB}
void main(){float x=fract(vA.x-uPh),tl=x/uLen,s=vA.y,hu=uHue/360.;
if(x>uLen)discard;
float cap=smoothstep(0.,.02,x),core=exp(-s*s*16.),halo=exp(-s*s*2.6)*.4;
vec3 c=hsl(hu,1.,.58)*(core*1.5+halo)*(.15+.85*pow(tl,1.7));
c+=vec3(.8,1.,1.)*core*exp(-(uLen-x)*45.);
o=vec4(c*cap*uAl,1);}`;

// ذرات: ابر مداری روی GPU
const PTV = `layout(location=0)in vec4 aS;uniform mat3 uR;uniform float uT,uR0,uSz,uSpd,uHd;uniform vec4 uB;out float vA,vH;${CAM}
void main(){float r=uR0+aS.x*aS.x*1.5,sp=uSpd*(.1+.5*aS.z)/r;
float th=aS.y*6.2831853+uT*sp*3.,ph=acos(2.*aS.z-1.)+.2*sin(uT*.3+aS.w*20.);
r*=1.+(.04+.45*uB.z)*sin(uT*(2.+aS.w*4.)+aS.x*40.);
vec3 w=uR*(vec3(sin(ph)*cos(th),cos(ph),sin(ph)*sin(th))*r);vec4 c=proj(w);gl_Position=c;
gl_PointSize=uSz*(.35+aS.w*aS.w*1.1)*(1.+1.5*uB.w)*3.6/c.w;
vH=aS.w;vA=clamp(1.3-(c.w-1.2)/3.,0.,1.)*mix(1.,smoothstep(.5,1.2,length(w.xy)),uHd)*(.6+.4*sin(uT*3.+aS.w*50.));}`;
const PTF = `in float vA,vH;uniform float uHue;out vec4 o;${LIB}
void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.;float a=exp(-r*3.5)*(1.-smoothstep(.75,1.,r));
o=vec4(hsl(uHue/360.+(vH-.5)*.1,.9,.62)*a*vA*1.5,1);}`;

// صورت هولوگرامی: همان مش قبلی، حالا با عمق واقعی، سایه‌ی نرم، لبه‌ی درخشان و اسکن
const HV = `layout(location=0)in vec3 aP;layout(location=1)in vec3 aN;layout(location=2)in float aF;
uniform vec2 uCss,uC;uniform float uK,uScan,uAmp,uZo;out vec3 vN;out float vF,vY,vA;
void main(){float w=max(.35,4.6-aP.z),k=4.6/w*uK;vec2 s=vec2(uC.x+aP.x*k,uC.y-aP.y*k);
gl_Position=vec4(s.x/uCss.x*2.-1.,1.-s.y/uCss.y*2.,-aP.z*.5+uZo,1);
vN=aN;vF=aF;vY=aP.y;float fr=pow(abs(1.-abs(aN.z)),1.5),e=(aP.y-uScan)/.13;
vA=aN.z>-.05?(.1+.42*fr+.3*exp(-e*e))*aF*(.8+.45*uAmp):0.;}`;
const HSF = `in vec3 vN;in float vF,vY;uniform float uHue,uAmp,uScan,uT;out vec4 o;${LIB}
void main(){vec3 N=normalize(vN);if(N.z<.02)discard;
float fres=pow(clamp(1.-N.z,0.,1.),1.7),lam=clamp(dot(N,vec3(-.55,.5,.52)),0.,1.);
float br=(.26+.2*fres+.66*pow(lam,1.05))*vF*(.88+.24*uAmp),e=(vY-uScan)/.11,hu=uHue/360.;
float sl=.9+.1*sin(gl_FragCoord.y*.9+uT*4.);
o=vec4(hsl(hu,.95,clamp(br*.64,0.,.7))*sl+hsl(hu+.03,1.,.7)*(exp(-e*e)*.3+fres*.3*(.6+uAmp)),1);}`;
const HWF = `in float vA;uniform float uHue;out vec4 o;${LIB}
void main(){o=vec4(hsl(uHue/360.,1.,.72)*vA*1.6,1);}`;

// پس‌پردازش: بلوم، انحراف رنگی کم، وینیت، دانه‌ی فیلم، تون‌مپ
const BRF = `uniform sampler2D tS;uniform vec2 uDst,uPx;uniform float uTh;out vec4 o;
void main(){vec2 uv=gl_FragCoord.xy/uDst;
vec3 c=(texture(tS,uv+uPx).rgb+texture(tS,uv-uPx).rgb+texture(tS,uv+vec2(uPx.x,-uPx.y)).rgb+texture(tS,uv+vec2(-uPx.x,uPx.y)).rgb)*.25;
o=vec4(max(c-uTh,0.)*1.5,1);}`;
const BLF = `uniform sampler2D tS;uniform vec2 uDst,uDir;out vec4 o;
void main(){vec2 uv=gl_FragCoord.xy/uDst;vec3 c=texture(tS,uv).rgb*.227027;
c+=(texture(tS,uv+uDir).rgb+texture(tS,uv-uDir).rgb)*.316216;
c+=(texture(tS,uv+uDir*2.3333).rgb+texture(tS,uv-uDir*2.3333).rgb)*.07027;o=vec4(c,1);}`;
const CPF = `uniform sampler2D tS,tB;uniform vec2 uDst;uniform float uT,uBloom;out vec4 o;${LIB}
void main(){vec2 uv=gl_FragCoord.xy/uDst,d=uv-.5;vec2 sh=d*dot(d,d)*.03;
vec3 s=vec3(texture(tS,uv+sh).r,texture(tS,uv).g,texture(tS,uv-sh).b);
vec3 c=s+texture(tB,uv).rgb*uBloom;c*=1.-dot(d,d)*.7;c+=(h2(gl_FragCoord.xy+fract(uT)*91.)-.5)*.015;
c=1.-exp(-max(c,0.)*1.15);o=vec4(c,clamp(max(c.r,max(c.g,c.b)),0.,1.));}`;

/* ───────── ابزارهای GL ───────── */
const prog = (vs, fs) => {
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, HEAD + s); gl.compileShader(x); if(!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return { p, u: {} };
};
const uni = (p, o) => {
  for(const k in o){
    if(!(k in p.u)) p.u[k] = gl.getUniformLocation(p.p, k);
    const l = p.u[k], v = o[k]; if(!l) continue;
    if(k[0] === 't') gl.uniform1i(l, v);
    else if(typeof v === 'number') gl.uniform1f(l, v);
    else if(v.length === 2) gl.uniform2fv(l, v);
    else if(v.length === 3) gl.uniform3fv(l, v);
    else if(v.length === 4) gl.uniform4fv(l, v);
    else if(v.length === 9) gl.uniformMatrix3fv(l, false, v);
  }
};
const use = (p, o) => { gl.useProgram(p.p); uni(p, o); };
const buf = (d, u, tg) => { tg = tg || gl.ARRAY_BUFFER; const b = gl.createBuffer(); gl.bindBuffer(tg, b); gl.bufferData(tg, d, u || gl.STATIC_DRAW); return b; };
const vao = (list, idx) => {
  const v = gl.createVertexArray(); gl.bindVertexArray(v);
  list.forEach(([b, loc, size]) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); });
  if(idx) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bindVertexArray(null); return v;
};
const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
const mul3 = (a, b) => { const r = new Float32Array(9); for(let c = 0; c < 3; c++) for(let q = 0; q < 3; q++){ let s = 0; for(let k = 0; k < 3; k++) s += a[k * 3 + q] * b[c * 3 + k]; r[c * 3 + q] = s; } return r; };

const NS = 200, NP = 3200, V = {};
let Z, SPN = 0, hd = null;
function setup(){
  const z = {};
  z.bg = prog(FSV, BG); z.sp = prog(SPV, SPF); z.rg = prog(RGV, RGF); z.pt = prog(PTV, PTF);
  z.hs = prog(HV, HSF); z.hw = prog(HV, HWF); z.br = prog(FSV, BRF); z.bl = prog(FSV, BLF); z.cp = prog(FSV, CPF);
  const sv = [], si = [], NU = 48, NV = 32;
  for(let j = 0; j <= NV; j++){ const ph = j / NV * Math.PI; for(let i = 0; i <= NU; i++){ const th = i / NU * 6.2831853; sv.push(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)); } }
  for(let j = 0; j < NV; j++) for(let i = 0; i < NU; i++){ const a = j * (NU + 1) + i, b = a + NU + 1; si.push(a, b, a + 1, b, b + 1, a + 1); }
  SPN = si.length;
  V.sp = vao([[buf(new Float32Array(sv)), 0, 3]], buf(new Uint16Array(si), gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER));
  const ra = []; for(let i = 0; i <= NS; i++) ra.push(i / NS, -1, i / NS, 1);
  V.rg = vao([[buf(new Float32Array(ra)), 0, 2]]);
  const pa = new Float32Array(NP * 4); for(let i = 0; i < pa.length; i++) pa[i] = Math.random();
  V.pt = vao([[buf(pa), 0, 4]]);
  return z;
}
function initHead(M){
  const mk = n => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, n, gl.DYNAMIC_DRAW); return b; };
  const p = mk(M.nv * 12), n = mk(M.nv * 12), f = buf(M.fade), ib = d => buf(d, gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER);
  hd = { p, n };
  V.hs = vao([[p, 0, 3], [n, 1, 3], [f, 2, 1]], ib(M.f));
  V.hw = vao([[p, 0, 3], [n, 1, 3], [f, 2, 1]], ib(M.e));
}
try { Z = setup(); } catch(err){ console.warn('GL3D: init failed', err); return; }

/* ───────── اندازه و فریم‌بافرها ───────── */
let CW = 0, CH = 0, PR = 1, scale = 1, FB = null, ox = 0, oy = 0, dirty = true, need = false, okm = false;
const dprCap = Math.min(window.devicePixelRatio || 1, 2);
function fbo(w, h, depth){
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  if(hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  let r = null;
  if(depth){ r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, r); }
  return { t, f, r, w, h, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE };
}
function freeFB(){ if(!FB) return; for(const k in FB){ const b = FB[k]; gl.deleteTexture(b.t); gl.deleteFramebuffer(b.f); if(b.r) gl.deleteRenderbuffer(b.r); } FB = null; }
function build(){
  freeFB();
  const w = Math.max(2, Math.round(CW * dprCap * scale)), h = Math.max(2, Math.round(CH * dprCap * scale));
  cv.width = w; cv.height = h; PR = w / CW;
  for(let a = 0; a < 2; a++){
    FB = { s: fbo(w, h, true), a: fbo(w >> 2 || 1, h >> 2 || 1, false), b: fbo(w >> 2 || 1, h >> 2 || 1, false) };
    if(FB.s.ok && FB.a.ok && FB.b.ok) return;
    freeFB(); hdr = false;
  }
  throw new Error('framebuffer');
}
function measure(){
  const sr = stage.getBoundingClientRect(), or = orbEl.getBoundingClientRect();
  ox = or.left - sr.left; oy = or.top - sr.top;
  if(sr.width < 2 || sr.height < 2) return false;
  if(Math.abs(sr.width - CW) > .5 || Math.abs(sr.height - CH) > .5){ CW = sr.width; CH = sr.height; need = true; }
  return true;
}

/* ───────── حالت، ورودی لمسی، پیشرفت زمان ───────── */
const RG = [[1.08, .03, 1.2, 0, .13, .6, 0], [1.08, .03, 1.2, 0, .13, .22, .55], [1.35, .04, .5, 1, -.09, .45, .2], [1.62, .03, -.4, .6, .065, .72, .5], [1.9, .05, 1.35, -.5, -.05, .34, .1], [1.9, .05, 1.35, -.5, -.05, .18, .62]];
const ST = { idle: [.1, .25], connecting: [.35, 1.1], listening: [.28, .5], thinking: [.55, 1.7], speaking: [.4, .9], text: [.45, 1.2] };
let e = .1, spd = .25, T = 0, rx = .32, ry = 0, vx = 0, vy = 0, drag = false, lx = 0, ly = 0, acc = 0, nfr = 0, good = 0, chk = 0;
const B = [0, 0, 0, 0], ang = new Float32Array(6);
stage.addEventListener('pointerdown', ev => { drag = true; lx = ev.clientX; ly = ev.clientY; vx = vy = 0; });
addEventListener('pointermove', ev => { if(!drag) return; const dx = ev.clientX - lx, dy = ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; ry += dx * .009; rx = Math.max(-1.2, Math.min(1.2, rx + dy * .009)); vy = dx * .5; vx = dy * .5; });
addEventListener('pointerup', () => { drag = false; }); addEventListener('pointercancel', () => { drag = false; });
addEventListener('resize', () => { dirty = true; }); addEventListener('orientationchange', () => { dirty = true; });
if(window.ResizeObserver) new ResizeObserver(() => { dirty = true; }).observe(stage);

function fail(){ G.ok = false; stage.classList.remove('gl'); cv.style.display = 'none'; }
cv.addEventListener('webglcontextlost', ev => { ev.preventDefault(); fail(); });

/* ───────── رسم ───────── */
function draw(t, dt, o){
  if(dirty){ dirty = false; okm = measure(); }
  if(!okm) return;
  if(need){ build(); need = false; }
  acc += dt;
  if(++nfr >= 45){
    const a = acc / nfr; acc = nfr = 0;
    if(a > .027 && scale > .55){ scale = Math.max(.55, scale - .15); need = true; good = 0; }
    else if(a < .0185 && scale < 1 && ++good > 3){ scale = Math.min(1, scale + .15); need = true; good = 0; }
  }
  const core = o.core, st = ST[o.state] || ST.idle, k = 1 - Math.exp(-dt * 4);
  e += (Math.min(1.6, st[0] + o.lvl * 1.4) - e) * k; spd += (st[1] - spd) * k;
  const f = o.fbuf, av = (a, b) => { let s = 0; for(let i = a; i < b; i++) s += f[i]; return s / (b - a) / 255; };
  [av(0, 4), av(4, 10), av(10, 20), av(20, 40)].forEach((n, i) => { const v = Math.max(n * 1.7, o.lvl * (1 - .12 * i)); B[i] += (v - B[i]) * (v > B[i] ? .55 : .12); });
  T += dt * (.8 + .6 * spd);
  if(!drag){ ry += (vy + (core ? .12 : .05)) * dt; rx += vx * dt + (.32 - rx) * Math.min(1, dt * 1.2); vy *= .94; vx *= .94; }
  const C = { uRes: [cv.width, cv.height], uCam: [3.6, 1.9, CW / CH], uT: T, uHue: o.hue, uE: e, uB: B, uR: mul3(rotX(rx), rotY(ry)), uTilt: [Math.sin(ry), Math.sin(rx - .3)], uGlow: core ? 1.2 : .7, uHd: core ? 0 : 1, uSz: 7 * PR, uSpd: spd, uR0: core ? .95 : 1.6 };

  gl.bindFramebuffer(gl.FRAMEBUFFER, FB.s.f); gl.viewport(0, 0, FB.s.w, FB.s.h);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.depthMask(true); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindVertexArray(null); use(Z.bg, C); gl.drawArrays(gl.TRIANGLES, 0, 3);

  let Hd = null, r = 0;
  if(core){
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    use(Z.sp, C); gl.bindVertexArray(V.sp); gl.drawElements(gl.TRIANGLES, SPN, gl.UNSIGNED_SHORT, 0);
  } else {
    Hd = o.Head; Hd.pose(); if(!hd) initHead(o.M);
    gl.bindBuffer(gl.ARRAY_BUFFER, hd.p); gl.bufferSubData(gl.ARRAY_BUFFER, 0, Hd.pv);
    gl.bindBuffer(gl.ARRAY_BUFFER, hd.n); gl.bufferSubData(gl.ARRAY_BUFFER, 0, Hd.pn);
    r = o.H / ((1 - o.minY) * 1.10);
    const HU = { uCss: [CW, CH], uC: [ox + o.W / 2, oy + o.H * .035 + r * 1.06], uK: r, uScan: Hd.scan, uAmp: Hd.glow, uHue: o.hue, uT: T, uZo: 0 };
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    use(Z.hs, HU); gl.bindVertexArray(V.hs); gl.drawElements(gl.TRIANGLES, o.M.nf * 3, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    HU.uZo = -.02; use(Z.hw, HU); gl.bindVertexArray(V.hw); gl.drawElements(gl.LINES, o.M.ne * 2, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
  }

  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  use(Z.rg, C); gl.bindVertexArray(V.rg);
  for(let i = core ? 0 : 3; i < 6; i++){
    const q = RG[i]; ang[i] = (ang[i] + dt * q[4] * (.4 + spd)) % 1;
    uni(Z.rg, {
      uQ: mul3(rotX(q[2] + .18 * Math.sin(T * .3 + i)), rotY(q[3] + .18 * Math.cos(T * .25 + i * 1.7))),
      uRad: q[0] * (1 + .05 * B[i & 3]), uW: q[1] * (1 + 2.2 * B[i & 3] + .6 * e),
      uPh: (((ang[i] + q[6]) % 1) + 1) % 1, uLen: q[5], uAl: (core ? 1 : .55) * (.6 + .5 * e)
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (NS + 1) * 2);
  }
  use(Z.pt, C); gl.bindVertexArray(V.pt); gl.drawArrays(gl.POINTS, 0, NP);

  // بلوم + ترکیب نهایی
  gl.disable(gl.BLEND); gl.bindVertexArray(null);
  const tex = (u, tt) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, tt); };
  const pass = (dst, src, p, uo) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null); gl.viewport(0, 0, dst ? dst.w : cv.width, dst ? dst.h : cv.height);
    tex(0, src.t); use(p, uo); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const blur = (d, s, x, y) => pass(d, s, Z.bl, { tS: 0, uDst: [d.w, d.h], uDir: [x * 1.3846 / d.w, y * 1.3846 / d.h] });
  const Sc = FB.s, A = FB.a, Bf = FB.b;
  pass(A, Sc, Z.br, { tS: 0, uDst: [A.w, A.h], uPx: [1 / Sc.w, 1 / Sc.h], uTh: hdr ? .8 : .42 });
  blur(Bf, A, 1, 0); blur(A, Bf, 0, 1); blur(Bf, A, 1.8, 0); blur(A, Bf, 0, 1.8);
  tex(1, A.t);
  pass(null, Sc, Z.cp, { tS: 0, tB: 1, uDst: [cv.width, cv.height], uT: T, uBloom: hdr ? .85 : 1.05 });
  tex(1, null); tex(0, null);

  // چشم‌ها، ابروها و لب‌ها روی بوم دوبعدی (همان کدِ قبلی) با همان تصویر‌سازی
  if(Hd){
    const pv = Hd.pv, xs = Hd.xs, ys = Hd.ys, cx = o.W / 2, cy = o.H * .035 + r * 1.06;
    for(let i = 0; i < o.M.nv; i++){ const w = Math.max(.35, 4.6 - pv[i * 3 + 2]), kk = 4.6 / w * r; xs[i] = cx + pv[i * 3] * kk; ys[i] = cy - pv[i * 3 + 1] * kk; }
    Hd.features(o.ctx, r, o.hue, Hd.glow);
  }
  if(chk < 3){ chk++; const er = gl.getError(); if(er) throw new Error('GL error ' + er); }
}

G.frame = (t, dt, o) => {
  if(!G.ok) return false;
  if(gl.isContextLost()){ fail(); return false; }
  try { draw(t, dt, o); return true; } catch(err){ console.warn('GL3D', err); fail(); return false; }
};
stage.insertBefore(cv, stage.firstChild); stage.classList.add('gl'); G.ok = true;
})();
