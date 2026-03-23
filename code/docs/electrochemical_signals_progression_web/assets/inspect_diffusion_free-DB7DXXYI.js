var Q=Object.defineProperty;var X=(e,t,s)=>t in e?Q(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var E=(e,t,s)=>X(e,typeof t!="symbol"?t+"":t,s);import{a as j,i as G}from"./theme-BJJ86vkc.js";import{D as J,a as V,M as _,g as Y,S as Z}from"./sim_shared-BWgPgds5.js";j();class N{constructor(t){E(this,"state");E(this,"spare",null);this.state=t>>>0||1}next(){let t=this.state;return t^=t<<13,t^=t>>>17,t^=t<<5,this.state=t>>>0,this.state/4294967296}normal(t=0,s=1){if(this.spare!==null){const o=this.spare;return this.spare=null,t+s*o}let n=0,i=0;for(;n<=Number.EPSILON;)n=this.next();for(;i<=Number.EPSILON;)i=this.next();const a=Math.sqrt(-2*Math.log(n)),l=a*Math.cos(2*Math.PI*i),r=a*Math.sin(2*Math.PI*i);return this.spare=r,t+s*l}}const S={T:1e3,dt:1,numParticles:V,diffusionSd:J,initClusterSd:.1},v={axisLimit:50,pointSize:2.5,playbackSpeed:1,targetFps:30};function p(e,t,s){return Math.min(s,Math.max(t,e))}function F(e,t,s){let n=e;for(;n<t||n>s;)n<t&&(n=t+(t-n)),n>s&&(n=s-(n-s));return p(n,t,s)}function R(){return Math.random()*4294967295>>>0}function d(e){const t=document.querySelector(e);if(!t)throw new Error(`Missing element: ${e}`);return t}function A(e,t,s=3){if(Number.isInteger(t)){e.value=String(t);return}e.value=Number(t.toFixed(s)).toString()}function U(e,t){const s=p(e.dt,.05,20),n=p(Math.round(e.numParticles),1,_),i=p(e.initClusterSd,0,20),a=new N(t),l=new Float32Array(n),r=new Float32Array(n);for(let o=0;o<n;o+=1)l[o]=a.normal(0,i),r[o]=a.normal(0,i);return{x:l,y:r,numParticles:n,dt:s,simTime:0,stepCount:0}}function ee(e,t,s,n){if(t===e.numParticles)return e;const i=new Float32Array(t),a=new Float32Array(t),l=Math.min(e.numParticles,t);i.set(e.x.subarray(0,l)),a.set(e.y.subarray(0,l));for(let r=l;r<t;r+=1)i[r]=s.normal(0,n),a[r]=s.normal(0,n);return{...e,x:i,y:a,numParticles:t}}function te(e,t){const s=Math.max(1,t);for(let n=0;n<e.numParticles;n+=1)e.x[n]=F(e.x[n],-s,s),e.y[n]=F(e.y[n],-s,s)}function ie(e,t,s,n){const i=Math.max(1,s.axisLimit);for(let a=0;a<e.numParticles;a+=1)e.x[a]=F(e.x[a]+n.normal(0,t.diffusionSd)*e.dt,-i,i),e.y[a]=F(e.y[a]+n.normal(0,t.diffusionSd)*e.dt,-i,i);e.stepCount+=1,e.simTime=e.stepCount*e.dt}function ne(e){const t=window.devicePixelRatio||1,s=e.getBoundingClientRect(),n=Math.max(1,Math.round(s.width*t)),i=Math.max(1,Math.round(s.height*t));(e.width!==n||e.height!==i)&&(e.width=n,e.height=i)}function se(e,t,s){const n=Y();ne(e);const i=e.getContext("2d");if(!i)return;const a=e.width,l=e.height;i.clearRect(0,0,a,l);const r=window.devicePixelRatio||1,o=Math.max(1,s.axisLimit),M=a/2,k=l/2,B=a/(2*o),O=l/(2*o);i.strokeStyle=n.gridA,i.lineWidth=1;const D=o>=80?20:o>=40?10:5;for(let u=-Math.floor(o/D)*D;u<=o;u+=D){const b=M+u*B,y=k-u*O;i.beginPath(),i.moveTo(b,0),i.lineTo(b,l),i.stroke(),i.beginPath(),i.moveTo(0,y),i.lineTo(a,y),i.stroke()}i.strokeStyle=n.gridB,i.lineWidth=1.25,i.beginPath(),i.moveTo(M,0),i.lineTo(M,l),i.moveTo(0,k),i.lineTo(a,k),i.stroke(),i.strokeStyle=n.gridC,i.lineWidth=1.25*r,i.strokeRect(.75*r,.75*r,a-1.5*r,l-1.5*r);const x=Math.max(.8,s.pointSize)*r;i.fillStyle=Z.particle;for(let u=0;u<t.numParticles;u+=1){const b=M+t.x[u]*B,y=k-t.y[u]*O;b<-x||b>a+x||y<-x||y>l+x||(i.beginPath(),i.arc(b,y,x,0,Math.PI*2),i.fill())}i.fillStyle=n.ink,i.font=`${12*r}px Avenir Next, Segoe UI, sans-serif`}const ae=d("#app");ae.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">← Back</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <p class="eyebrow">Electrochemical Signalling in Nerve Cells</p>
      <h1>Free Diffusion</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>Particles undergo continuous random motion from thermal collisions — this is Brownian motion.</li>
        <li>Individual particle paths are unpredictable; the overall distribution is not.</li>
        <li>Over time, the distribution becomes uniform — this is diffusion.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>What happens to the spreading rate when you increase Diffusion SD?</li>
        <li>Does increasing the number of particles change the final distribution?</li>
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
`;const re=d("#sim-canvas"),m={numParticles:d("#num-particles"),diffusionSd:d("#diffusion-sd"),playbackSpeed:d("#playback-speed")},I={togglePlay:d("#toggle-play"),rerun:d("#rerun"),resetDefaults:d("#reset-defaults")};let c={...S},f={...v},P=R(),z=new N(P),h=U(c,P),L=!0,C=performance.now(),T=0;function w(){A(m.numParticles,c.numParticles,0),A(m.diffusionSd,c.diffusionSd,3),A(m.playbackSpeed,f.playbackSpeed,2)}function W(){return{T:S.T,dt:S.dt,numParticles:p(Math.round(Number(m.numParticles.value)||S.numParticles),1,_),diffusionSd:p(Number(m.diffusionSd.value)||0,0,20),initClusterSd:S.initClusterSd}}function H(){return{axisLimit:v.axisLimit,pointSize:v.pointSize,playbackSpeed:p(Number(m.playbackSpeed.value)||v.playbackSpeed,.1,8),targetFps:v.targetFps}}function $(){c=W(),f=H(),z=new N(P),h=U(c,P),T=0,w()}function le(){c=W(),h=ee(h,c.numParticles,z,c.initClusterSd),h.dt=c.dt,w()}function oe(){f=H(),te(h,f.axisLimit),w()}function q(e){L=e,I.togglePlay.textContent=L?"Pause":"Play"}function g(){se(re,h,f)}w();g();I.togglePlay.addEventListener("click",()=>q(!L));I.rerun.addEventListener("click",()=>{P=R(),$(),q(!0),g()});I.resetDefaults.addEventListener("click",()=>{c={...S},f={...v},P=R(),w(),$(),q(!0),g()});for(const e of["numParticles","diffusionSd"])m[e].addEventListener("change",()=>{le(),g()});m.playbackSpeed.addEventListener("change",()=>{oe(),g()});window.addEventListener("resize",()=>g());G(d("#theme-toggle"));function K(e){const t=Math.max(0,(e-C)/1e3);if(C=e,L){T+=t*f.targetFps*f.playbackSpeed;const s=Math.min(120,Math.floor(T));if(s>0){T-=s;for(let n=0;n<s;n+=1)ie(h,c,f,z)}}g(),requestAnimationFrame(K)}requestAnimationFrame(e=>{C=e,K(e)});
