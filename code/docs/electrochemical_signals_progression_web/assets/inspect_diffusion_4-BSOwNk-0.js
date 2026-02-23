var yt=Object.defineProperty;var ft=(t,e,n)=>e in t?yt(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var G=(t,e,n)=>ft(t,typeof e!="symbol"?e+"":e,n);import"./style-WLU6Igt5.js";class ht{constructor(e){G(this,"state");G(this,"spare",null);this.state=e>>>0||1}next(){let e=this.state;return e^=e<<13,e^=e>>>17,e^=e<<5,this.state=e>>>0,this.state/4294967296}uniform(e,n){return e+(n-e)*this.next()}normal(e=0,n=1){if(this.spare!==null){const f=this.spare;return this.spare=null,e+n*f}let a=0,i=0;for(;a<=Number.EPSILON;)a=this.next();for(;i<=Number.EPSILON;)i=this.next();const r=Math.sqrt(-2*Math.log(a)),u=r*Math.cos(2*Math.PI*i),p=r*Math.sin(2*Math.PI*i);return this.spare=p,e+n*u}}const F={T:1e3,dt:3,numParticles:500,type0Fraction:.5,boxWidth:100,boxHeight:80,wallThickness:4,diffusionSd:.5,type0YMin:10,type0YMax:11,type1YMin:-30,type1YMax:-10},z={pointSize:2,playbackSpeed:1,targetFps:30};function o(t,e,n){return Math.min(n,Math.max(e,t))}function X(t,e,n){const a=n/2,i=o(Math.min(t,e),-a,a),r=o(Math.max(t,e),-a,a);return r-i<.5?[i,Math.min(a,i+.5)]:[i,r]}function U(){return Math.random()*4294967295>>>0}function l(t){const e=document.querySelector(t);if(!e)throw new Error(`Missing element: ${t}`);return e}function y(t,e,n=3){t.value=Number.isInteger(e)?String(e):Number(e.toFixed(n)).toString()}function Z(t,e){const n=o(Math.round(t.T),20,2e4),a=o(t.dt,.05,20),i=o(Math.round(t.numParticles),1,5e3),r=o(t.type0Fraction,0,1),u=o(t.boxWidth,20,500),p=o(t.boxHeight,20,500),f=o(t.wallThickness,.5,Math.min(50,u-2)),g=o(t.diffusionSd,0,20),[x,b]=X(t.type0YMin,t.type0YMax,p),[v,k]=X(t.type1YMin,t.type1YMax,p),L=-f/2,M=f/2,m=Math.max(2,Math.floor(n/a)),S=new Float32Array(m*i),R=new Float32Array(m*i),_=new Uint8Array(i),H=new ht(e);for(let w=0;w<i;w+=1)_[w]=H.next()<r?0:1,S[w]=H.uniform(-u/2+1,-f/2-1),R[w]=H.uniform(-p/2+1,p/2-1);for(let w=1;w<m;w+=1){const Q=(w-1)*i,J=w*i;for(let W=0;W<i;W+=1){const at=H.normal(0,g),st=H.normal(0,g),E=S[Q+W],O=R[Q+W];let I=E+at*a;const lt=o(O+st*a,-p/2,p/2),ot=E<L&&I>=L,dt=E>M&&I<=M,rt=ot||dt,V=_[W]===0,pt=V?x:v,ct=V?b:k,ut=O>=pt&&O<=ct;rt&&!ut&&(I=E),S[J+W]=I,R[J+W]=lt}}return{x:S,y:R,types:_,frames:m,numParticles:i,dt:a,boxWidth:u,boxHeight:p,leftWall:L,rightWall:M,type0YMin:x,type0YMax:b,type1YMin:v,type1YMax:k}}function bt(t){const e=window.devicePixelRatio||1,n=t.getBoundingClientRect(),a=Math.max(1,Math.round(n.width*e)),i=Math.max(1,Math.round(n.height*e));(t.width!==a||t.height!==i)&&(t.width=a,t.height=i)}function Y(t,e,n,a,i){const r=(t+n.boxWidth/2)/n.boxWidth*a,u=i-(e+n.boxHeight/2)/n.boxHeight*i;return[r,u]}function mt(t,e,n,a,i){t.fillStyle="#03060b",t.fillRect(0,0,n,a),t.strokeStyle="rgba(120, 170, 255, 0.10)",t.lineWidth=1;for(let b=1;b<10;b+=1){const v=n*b/10,k=a*b/10;t.beginPath(),t.moveTo(v,0),t.lineTo(v,a),t.stroke(),t.beginPath(),t.moveTo(0,k),t.lineTo(n,k),t.stroke()}const[r]=Y(e.leftWall,0,e,n,a),[u]=Y(e.rightWall,0,e,n,a);t.fillStyle="rgba(200, 220, 255, 0.08)",t.fillRect(r,0,u-r,a);const[,p]=Y(0,e.type0YMax,e,n,a),[,f]=Y(0,e.type0YMin,e,n,a),[,g]=Y(0,e.type1YMax,e,n,a),[,x]=Y(0,e.type1YMin,e,n,a);t.fillStyle="rgba(255, 98, 98, 0.16)",t.fillRect(r,p,u-r,f-p),t.fillStyle="rgba(66, 200, 255, 0.14)",t.fillRect(r,g,u-r,x-g),t.strokeStyle="rgba(190, 225, 255, 0.48)",t.lineWidth=1.5*i;for(const b of[e.leftWall,e.rightWall]){const[v]=Y(b,0,e,n,a),k=[],L=[[e.type0YMin,e.type0YMax],[e.type1YMin,e.type1YMax]].sort((m,S)=>m[0]-S[0]);let M=-e.boxHeight/2;for(const[m,S]of L)m>M&&k.push([M,m]),M=Math.max(M,S);M<e.boxHeight/2&&k.push([M,e.boxHeight/2]);for(const[m,S]of k){const[,R]=Y(0,m,e,n,a),[,_]=Y(0,S,e,n,a);t.beginPath(),t.moveTo(v,R),t.lineTo(v,_),t.stroke()}}t.strokeStyle="rgba(120, 170, 255, 0.2)",t.lineWidth=1*i,t.strokeRect(.5*i,.5*i,n-i,a-i)}function $(t,e,n,a){bt(t);const i=t.getContext("2d");if(!i)return;const r=t.width,u=t.height,p=window.devicePixelRatio||1;i.clearRect(0,0,r,u),mt(i,e,r,u,p);const f=o(n,0,e.frames-1)*e.numParticles,g=Math.max(.8,a.pointSize)*p;for(let x=0;x<e.numParticles;x+=1){const[b,v]=Y(e.x[f+x],e.y[f+x],e,r,u);i.fillStyle=e.types[x]===0?"rgba(255, 98, 98, 0.92)":"rgba(66, 200, 255, 0.92)",i.beginPath(),i.arc(b,v,g,0,Math.PI*2),i.fill()}i.fillStyle="rgba(232, 243, 255, 0.92)",i.font=`${12*p}px Avenir Next, Segoe UI, sans-serif`,i.fillText("Ion-Specific Diffusion Through Channels",12*p,20*p)}function gt(t,e){const n=o(e,0,t.frames-1)*t.numParticles;let a=0,i=0,r=0,u=0;for(let p=0;p<t.numParticles;p+=1){const f=t.types[p]===0,g=t.x[n+p];g<t.leftWall?f?a+=1:r+=1:g>t.rightWall&&(f?i+=1:u+=1)}return{type0Left:a,type0Right:i,type1Left:r,type1Right:u}}const xt=l("#app");xt.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_4</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_4</h1>
      <p class="subtitle">
        Two particle types diffuse under identical Brownian motion but can cross the membrane only
        through their type-specific channels. This demonstrates selective permeability.
      </p>
    </header>

    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <p class="group-label">Basic Controls</p>
            <div class="button-row">
              <button id="toggle-play" class="primary">Pause</button>
              <button id="rerun">Rerun</button>
              <button id="reset-defaults" class="warn">Reset Defaults</button>
            </div>
            <div class="button-row">
              <button id="rewind">Rewind</button>
              <button id="random-seed">Randomize Seed</button>
            </div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="1" max="5000" step="1" /></div>
              <div class="field"><label for="type0-fraction">Type 0 fraction</label><input id="type0-fraction" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="type0-y-min">Type 0 y min</label><input id="type0-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="type0-y-max">Type 0 y max</label><input id="type0-y-max" type="number" step="0.5" /></div>
              <div class="field"><label for="type1-y-min">Type 1 y min</label><input id="type1-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="type1-y-max">Type 1 y max</label><input id="type1-y-max" type="number" step="0.5" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>
          <details>
            <summary>Advanced Controls</summary>
            <div class="group" style="margin-top: 8px;">
              <div class="control-grid">
                <div class="field"><label for="total-time">Total time T (ms)</label><input id="total-time" type="number" min="20" max="20000" step="10" /></div>
                <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
                <div class="field"><label for="box-width">Box width</label><input id="box-width" type="number" min="20" max="500" step="1" /></div>
                <div class="field"><label for="box-height">Box height</label><input id="box-height" type="number" min="20" max="500" step="1" /></div>
                <div class="field"><label for="wall-thickness">Wall thickness</label><input id="wall-thickness" type="number" min="0.5" max="50" step="0.5" /></div>
                <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
                <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
              </div>
            </div>
          </details>
          <div class="group">
            <p class="group-label">Status</p>
            <dl class="status-list">
              <dt>Frame</dt><dd id="status-frame">0</dd>
              <dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>Type 0 Left</dt><dd id="status-type0-left">0</dd>
              <dt>Type 0 Right</dt><dd id="status-type0-right">0</dd>
              <dt>Type 1 Left</dt><dd id="status-type1-left">0</dd>
              <dt>Type 1 Right</dt><dd id="status-type1-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Selective Gating Rule</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                Same Euler diffusion update for all particles. Channel gating depends on particle type,
                so permeability differs even when <code>diffusionSd</code> is identical.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_4.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="Ion-specific diffusion through selective channels"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #ff6262"></span>Type 0 (Na+-like)</span>
          <span><span class="swatch" style="background: #42c8ff"></span>Type 1 (K+-like)</span>
          <span><span class="swatch" style="background: rgba(255,98,98,0.8)"></span>Type 0 channel</span>
          <span><span class="swatch" style="background: rgba(66,200,255,0.8)"></span>Type 1 channel</span>
        </div>
      </section>
    </div>
  </div>
`;const q=l("#sim-canvas"),vt=l("#equation-block"),s={numParticles:l("#num-particles"),type0Fraction:l("#type0-fraction"),diffusionSd:l("#diffusion-sd"),type0YMin:l("#type0-y-min"),type0YMax:l("#type0-y-max"),type1YMin:l("#type1-y-min"),type1YMax:l("#type1-y-max"),playbackSpeed:l("#playback-speed"),seed:l("#seed"),totalTime:l("#total-time"),dt:l("#dt"),boxWidth:l("#box-width"),boxHeight:l("#box-height"),wallThickness:l("#wall-thickness"),pointSize:l("#point-size"),targetFps:l("#target-fps")},T={frame:l("#status-frame"),time:l("#status-time"),type0Left:l("#status-type0-left"),type0Right:l("#status-type0-right"),type1Left:l("#status-type1-left"),type1Right:l("#status-type1-right"),dt:l("#status-dt"),stepSd:l("#status-step-sd"),seed:l("#status-seed"),frames:l("#status-frames")},C={togglePlay:l("#toggle-play"),rerun:l("#rerun"),resetDefaults:l("#reset-defaults"),rewind:l("#rewind"),randomSeed:l("#random-seed")};let d={...F},h={...z},P=U(),c=Z(d,P),D=!0,N=0,K=performance.now();function B(){y(s.numParticles,d.numParticles,0),y(s.type0Fraction,d.type0Fraction,2),y(s.diffusionSd,d.diffusionSd,3),y(s.type0YMin,d.type0YMin,2),y(s.type0YMax,d.type0YMax,2),y(s.type1YMin,d.type1YMin,2),y(s.type1YMax,d.type1YMax,2),y(s.playbackSpeed,h.playbackSpeed,2),y(s.seed,P,0),y(s.totalTime,d.T,0),y(s.dt,d.dt,3),y(s.boxWidth,d.boxWidth,1),y(s.boxHeight,d.boxHeight,1),y(s.wallThickness,d.wallThickness,2),y(s.pointSize,h.pointSize,2),y(s.targetFps,h.targetFps,0)}function Mt(){const t=o(Number(s.boxHeight.value)||F.boxHeight,20,500);return{T:o(Number(s.totalTime.value)||F.T,20,2e4),dt:o(Number(s.dt.value)||F.dt,.05,20),numParticles:o(Math.round(Number(s.numParticles.value)||F.numParticles),1,5e3),type0Fraction:o(Number(s.type0Fraction.value)||0,0,1),boxWidth:o(Number(s.boxWidth.value)||F.boxWidth,20,500),boxHeight:t,wallThickness:o(Number(s.wallThickness.value)||F.wallThickness,.5,50),diffusionSd:o(Number(s.diffusionSd.value)||0,0,20),type0YMin:o(Number(s.type0YMin.value)||0,-t/2,t/2),type0YMax:o(Number(s.type0YMax.value)||0,-t/2,t/2),type1YMin:o(Number(s.type1YMin.value)||0,-t/2,t/2),type1YMax:o(Number(s.type1YMax.value)||0,-t/2,t/2)}}function tt(){return{pointSize:o(Number(s.pointSize.value)||z.pointSize,.5,8),playbackSpeed:o(Number(s.playbackSpeed.value)||z.playbackSpeed,.1,8),targetFps:o(Math.round(Number(s.targetFps.value)||z.targetFps),1,120)}}function et(){const t=d.diffusionSd*d.dt,e=d.type0YMax-d.type0YMin,n=d.type1YMax-d.type1YMin;vt.innerHTML=['<span class="accent">Shared Euler diffusion update (all particles)</span>',"x_new = x_old + dxdt · dt","y_new = clamp(y_old + dydt · dt, -H/2, H/2)","dxdt, dydt ~ Normal(0, diffusionSd²)","",'<span class="accent-2">Type-selective channel gating</span>',"If type = 0: permit wall crossing only when y_old ∈ [type0_y_min, type0_y_max]","If type = 1: permit wall crossing only when y_old ∈ [type1_y_min, type1_y_max]","Otherwise x_new := x_old","",`Per-step displacement SD = diffusionSd × dt = ${t.toFixed(3)}`,`Channel widths: type0 = ${e.toFixed(1)}, type1 = ${n.toFixed(1)}`].join(`
`)}function j(t){const e=gt(c,t);T.frame.textContent=`${t+1}`,T.time.textContent=(t*c.dt).toFixed(1),T.type0Left.textContent=`${e.type0Left}`,T.type0Right.textContent=`${e.type0Right}`,T.type1Left.textContent=`${e.type1Left}`,T.type1Right.textContent=`${e.type1Right}`,T.dt.textContent=c.dt.toFixed(2),T.stepSd.textContent=(d.diffusionSd*d.dt).toFixed(3),T.seed.textContent=`${P>>>0}`,T.frames.textContent=`${c.frames}`}function A(t=!0){d=Mt(),h=tt(),P=o(Math.floor(Number(s.seed.value)||P),0,4294967295)>>>0,c=Z(d,P),d={...d,boxWidth:c.boxWidth,boxHeight:c.boxHeight,wallThickness:c.rightWall-c.leftWall,type0YMin:c.type0YMin,type0YMax:c.type0YMax,type1YMin:c.type1YMin,type1YMax:c.type1YMax},t&&(N=0),B(),et()}function St(){h=tt(),B()}function nt(t){D=t,C.togglePlay.textContent=D?"Pause":"Play"}B();et();j(0);$(q,c,0,h);C.togglePlay.addEventListener("click",()=>nt(!D));C.rerun.addEventListener("click",()=>A(!0));C.rewind.addEventListener("click",()=>{N=0,j(0),$(q,c,0,h)});C.randomSeed.addEventListener("click",()=>{P=U(),y(s.seed,P,0),A(!0)});C.resetDefaults.addEventListener("click",()=>{d={...F},h={...z},P=U(),B(),A(!0),nt(!0)});const wt=["numParticles","type0Fraction","diffusionSd","type0YMin","type0YMax","type1YMin","type1YMax","seed","totalTime","dt","boxWidth","boxHeight","wallThickness"];for(const t of wt)s[t].addEventListener("change",()=>A(t!=="seed"));for(const t of["playbackSpeed","pointSize","targetFps"])s[t].addEventListener("change",()=>St());window.addEventListener("resize",()=>{$(q,c,Math.floor(N),h)});function it(t){const e=(t-K)/1e3;K=t,D&&c.frames>0&&(N+=e*h.targetFps*h.playbackSpeed,N>=c.frames&&(N%=c.frames));const n=o(Math.floor(N),0,Math.max(0,c.frames-1));j(n),$(q,c,n,h),requestAnimationFrame(it)}requestAnimationFrame(t=>{K=t,it(t)});
