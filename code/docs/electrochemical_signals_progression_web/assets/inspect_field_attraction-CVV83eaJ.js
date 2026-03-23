var V=Object.defineProperty;var $=(t,e,r)=>e in t?V(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r;var R=(t,e,r)=>$(t,typeof e!="symbol"?e+"":e,r);import{a as j,i as G}from"./theme-BJJ86vkc.js";import{D as J,a as Z,M as O,g as tt,S as et,f as it,p as nt}from"./sim_shared-BWgPgds5.js";j();class Y{constructor(e){R(this,"state");R(this,"spare",null);this.state=e>>>0||1}next(){let e=this.state;return e^=e<<13,e^=e>>>17,e^=e<<5,this.state=e>>>0,this.state/4294967296}normal(e=0,r=1){if(this.spare!==null){const l=this.spare;return this.spare=null,e+r*l}let n=0,i=0;for(;n<=Number.EPSILON;)n=this.next();for(;i<=Number.EPSILON;)i=this.next();const c=Math.sqrt(-2*Math.log(n)),o=c*Math.cos(2*Math.PI*i),a=c*Math.sin(2*Math.PI*i);return this.spare=a,e+r*o}}const g={T:1e3,dt:1,numParticles:Z,diffusionSd:J,initClusterSd:.1,source0Attraction:.15,source1Attraction:.15,source2Attraction:.15,source3Attraction:.15,fixedAnionX:-20,fixedAnionY:0},P={axisLimit:50,pointSize:2.5,playbackSpeed:1,targetFps:30},v=[{x:20,y:0},{x:0,y:20},{x:0,y:-20}];function d(t,e,r){return Math.min(r,Math.max(e,t))}function D(t,e,r){let n=t;for(;n<e||n>r;)n<e&&(n=e+(e-n)),n>r&&(n=r-(n-r));return d(n,e,r)}function z(){return Math.random()*4294967295>>>0}function p(t){const e=document.querySelector(t);if(!e)throw new Error(`Missing element: ${t}`);return e}function x(t,e,r=3){if(Number.isInteger(e)){t.value=String(e);return}t.value=Number(e.toFixed(r)).toString()}function B(t,e){const r=d(t.dt,.05,20),n=d(Math.round(t.numParticles),1,O),i=d(t.initClusterSd,0,20),c=new Y(e),o=new Float32Array(n),a=new Float32Array(n);for(let l=0;l<n;l+=1)o[l]=c.normal(0,i),a[l]=c.normal(0,i);return{x:o,y:a,numParticles:n,dt:r,simTime:0,stepCount:0,fixedAnionX:d(t.fixedAnionX,-500,500),fixedAnionY:d(t.fixedAnionY,-500,500)}}function rt(t,e,r,n){if(e===t.numParticles)return t;const i=new Float32Array(e),c=new Float32Array(e),o=Math.min(t.numParticles,e);i.set(t.x.subarray(0,o)),c.set(t.y.subarray(0,o));for(let a=o;a<e;a+=1)i[a]=r.normal(0,n),c[a]=r.normal(0,n);return{...t,x:i,y:c,numParticles:e}}function ot(t,e){const r=Math.max(1,e);for(let n=0;n<t.numParticles;n+=1)t.x[n]=D(t.x[n],-r,r),t.y[n]=D(t.y[n],-r,r)}function U(t){return[{x:t.fixedAnionX,y:t.fixedAnionY,strength:-s.source0Attraction},{x:v[0].x,y:v[0].y,strength:-s.source1Attraction},{x:v[1].x,y:v[1].y,strength:-s.source2Attraction},{x:v[2].x,y:v[2].y,strength:-s.source3Attraction}]}function st(t,e,r,n){const i=Math.max(1,r.axisLimit),c=U(t).map(o=>({...o,strength:d(o.strength,-10,10)}));for(let o=0;o<t.numParticles;o+=1){let a=0,l=0;for(const m of c){const b=m.x-t.x[o],w=m.y-t.y[o],[E,T]=nt(b,w,m.strength,1);a+=E,l+=T}t.x[o]=D(t.x[o]+(n.normal(0,e.diffusionSd)+a)*t.dt,-i,i),t.y[o]=D(t.y[o]+(n.normal(0,e.diffusionSd)+l)*t.dt,-i,i)}t.stepCount+=1,t.simTime=t.stepCount*t.dt}function at(t){const e=window.devicePixelRatio||1,r=t.getBoundingClientRect(),n=Math.max(1,Math.round(r.width*e)),i=Math.max(1,Math.round(r.height*e));(t.width!==n||t.height!==i)&&(t.width=n,t.height=i)}function ct(t,e,r){const n=tt();at(t);const i=t.getContext("2d");if(!i)return;const c=t.width,o=t.height;i.clearRect(0,0,c,o);const a=window.devicePixelRatio||1,l=Math.max(1,r.axisLimit),m=c/2,b=o/2,w=c/(2*l),E=o/(2*l);i.strokeStyle=n.gridA,i.lineWidth=1;const T=l>=80?20:l>=40?10:5;for(let f=-Math.floor(l/T)*T;f<=l;f+=T){const A=m+f*w,S=b-f*E;i.beginPath(),i.moveTo(A,0),i.lineTo(A,o),i.stroke(),i.beginPath(),i.moveTo(0,S),i.lineTo(c,S),i.stroke()}i.strokeStyle=n.gridB,i.lineWidth=1.25,i.beginPath(),i.moveTo(m,0),i.lineTo(m,o),i.moveTo(0,b),i.lineTo(c,b),i.stroke(),i.strokeStyle=n.gridC,i.lineWidth=1.25*a,i.strokeRect(.75*a,.75*a,c-1.5*a,o-1.5*a);const F=Math.max(.8,r.pointSize)*a;i.fillStyle=et.particle;for(let f=0;f<e.numParticles;f+=1){const A=m+e.x[f]*w,S=b-e.y[f]*E;A<-F||A>c+F||S<-F||S>o+F||(i.beginPath(),i.arc(A,S,F,0,Math.PI*2),i.fill())}for(const f of U(e))i.fillStyle=it(f.strength),i.beginPath(),i.arc(m+f.x*w,b-f.y*E,4*a,0,Math.PI*2),i.fill();i.fillStyle=n.ink}const lt=p("#app");lt.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">← Back</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <p class="eyebrow">Point-Source Electrical Drift</p>
      <h1>Electrical Field Attraction</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>Electrical force attracts opposite charges; diffusion spreads them out.</li>
        <li>These forces act in opposition — particles cluster near the charge source but don't all land on it.</li>
        <li>Stronger electric force → tighter clustering despite diffusion.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>What does the particle distribution look like when electric strength is very low? Very high?</li>
        <li>Can you find a setting where diffusion and electrical attraction are visually balanced?</li>
      </ul>
    </header>

    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <div class="button-row">
              <button id="toggle-play" class="primary">Pause</button>
              <button id="rerun">Rerun</button>
              <button id="reset-defaults" class="warn">Reset Defaults</button>
            </div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="1" max="5000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="source0-attraction">Electric strength 1 (+ attract, - repel)</label><input id="source0-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source1-attraction">Electric strength 2 (+ attract, - repel)</label><input id="source1-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source2-attraction">Electric strength 3 (+ attract, - repel)</label><input id="source2-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source3-attraction">Electric strength 4 (+ attract, - repel)</label><input id="source3-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <canvas id="sim-canvas" aria-label="2D diffusion particle simulation"></canvas>
      </section>
    </div>
  </div>
`;const ut=p("#sim-canvas"),u={numParticles:p("#num-particles"),diffusionSd:p("#diffusion-sd"),source0Attraction:p("#source0-attraction"),source1Attraction:p("#source1-attraction"),source2Attraction:p("#source2-attraction"),source3Attraction:p("#source3-attraction"),playbackSpeed:p("#playback-speed")},N={togglePlay:p("#toggle-play"),rerun:p("#rerun"),resetDefaults:p("#reset-defaults")};let s={...g},y={...P},M=z(),_=new Y(M),h=B(s,M),C=!0,X=performance.now(),I=0;function L(){x(u.numParticles,s.numParticles,0),x(u.diffusionSd,s.diffusionSd,3),x(u.source0Attraction,s.source0Attraction,3),x(u.source1Attraction,s.source1Attraction,3),x(u.source2Attraction,s.source2Attraction,3),x(u.source3Attraction,s.source3Attraction,3),x(u.playbackSpeed,y.playbackSpeed,2)}function W(){return{T:g.T,dt:g.dt,numParticles:d(Math.round(Number(u.numParticles.value)||g.numParticles),1,O),diffusionSd:d(Number(u.diffusionSd.value)||0,0,20),initClusterSd:g.initClusterSd,source0Attraction:d(Number(u.source0Attraction.value)||0,-10,10),source1Attraction:d(Number(u.source1Attraction.value)||0,-10,10),source2Attraction:d(Number(u.source2Attraction.value)||0,-10,10),source3Attraction:d(Number(u.source3Attraction.value)||0,-10,10),fixedAnionX:g.fixedAnionX,fixedAnionY:g.fixedAnionY}}function H(){return{axisLimit:P.axisLimit,pointSize:P.pointSize,playbackSpeed:d(Number(u.playbackSpeed.value)||P.playbackSpeed,.1,8),targetFps:P.targetFps}}function K(){s=W(),y=H(),_=new Y(M),h=B(s,M),I=0,L()}function dt(){s=W(),h=rt(h,s.numParticles,_,s.initClusterSd),h.dt=s.dt,h.fixedAnionX=s.fixedAnionX,h.fixedAnionY=s.fixedAnionY,L()}function ft(){y=H(),ot(h,y.axisLimit),L()}function q(t){C=t,N.togglePlay.textContent=C?"Pause":"Play"}function k(){ct(ut,h,y)}L();k();N.togglePlay.addEventListener("click",()=>q(!C));N.rerun.addEventListener("click",()=>{M=z(),K(),q(!0),k()});N.resetDefaults.addEventListener("click",()=>{s={...g},y={...P},M=z(),L(),K(),q(!0),k()});for(const t of["numParticles","diffusionSd","source0Attraction","source1Attraction","source2Attraction","source3Attraction"])u[t].addEventListener("change",()=>{dt(),k()});u.playbackSpeed.addEventListener("change",()=>{ft(),k()});G(p("#theme-toggle"));function Q(t){const e=Math.max(0,(t-X)/1e3);if(X=t,C){I+=e*y.targetFps*y.playbackSpeed;const r=Math.min(120,Math.floor(I));if(r>0){I-=r;for(let n=0;n<r;n+=1)st(h,s,y,_)}}k(),requestAnimationFrame(Q)}requestAnimationFrame(t=>{X=t,Q(t)});
