var G=Object.defineProperty;var Q=(t,i,a)=>i in t?G(t,i,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[i]=a;var _=(t,i,a)=>Q(t,typeof i!="symbol"?i+"":i,a);import"./style-WLU6Igt5.js";class J{constructor(i){_(this,"state");_(this,"spare",null);this.state=i>>>0||1}next(){let i=this.state;return i^=i<<13,i^=i>>>17,i^=i<<5,this.state=i>>>0,this.state/4294967296}normal(i=0,a=1){if(this.spare!==null){const r=this.spare;return this.spare=null,i+a*r}let o=0,e=0;for(;o<=Number.EPSILON;)o=this.next();for(;e<=Number.EPSILON;)e=this.next();const l=Math.sqrt(-2*Math.log(o)),m=l*Math.cos(2*Math.PI*e),b=l*Math.sin(2*Math.PI*e);return this.spare=b,i+a*m}}const z={T:1e3,dt:1,numParticles:100,diffusionSd:.5,initClusterSd:.1},C={axisLimit:50,pointSize:2.5,playbackSpeed:1,targetFps:30};function d(t,i,a){return Math.min(a,Math.max(i,t))}function $(){return Math.random()*4294967295>>>0}function W(t,i){const a=d(Math.round(t.T),20,2e4),o=d(t.dt,.05,20),e=d(Math.round(t.numParticles),1,5e3),l=d(t.diffusionSd,0,20),m=d(t.initClusterSd,0,20),b=Math.max(2,Math.floor(a/o)),r=new Float32Array(b*e),y=new Float32Array(b*e),S=new J(i);for(let f=0;f<e;f+=1)r[f]=S.normal(0,m),y[f]=S.normal(0,m);for(let f=1;f<b;f+=1){const N=(f-1)*e,k=f*e;for(let x=0;x<e;x+=1){const P=S.normal(0,l),h=S.normal(0,l);r[k+x]=r[N+x]+P*o,y[k+x]=y[N+x]+h*o}}return{x:r,y,frames:b,numParticles:e,dt:o,totalTime:a}}function s(t){const i=document.querySelector(t);if(!i)throw new Error(`Missing element: ${t}`);return i}function v(t,i,a=3){if(Number.isInteger(i)){t.value=String(i);return}t.value=Number(i.toFixed(a)).toString()}function V(t){const i=window.devicePixelRatio||1,a=t.getBoundingClientRect(),o=Math.max(1,Math.round(a.width*i)),e=Math.max(1,Math.round(a.height*i));(t.width!==o||t.height!==e)&&(t.width=o,t.height=e)}function I(t,i,a,o){V(t);const e=t.getContext("2d");if(!e)return;const l=t.width,m=t.height;e.clearRect(0,0,l,m),e.fillStyle="#03060b",e.fillRect(0,0,l,m);const b=window.devicePixelRatio||1,r=Math.max(1,o.axisLimit),y=l/2,S=m/2,f=l/(2*r),N=m/(2*r);e.save(),e.strokeStyle="rgba(120, 170, 255, 0.12)",e.lineWidth=1;const k=r>=80?20:r>=40?10:5;for(let h=-Math.floor(r/k)*k;h<=r;h+=k){const F=y+h*f,T=S-h*N;e.beginPath(),e.moveTo(F,0),e.lineTo(F,m),e.stroke(),e.beginPath(),e.moveTo(0,T),e.lineTo(l,T),e.stroke()}e.restore(),e.save(),e.strokeStyle="rgba(180, 220, 255, 0.28)",e.lineWidth=1.25,e.beginPath(),e.moveTo(y,0),e.lineTo(y,m),e.moveTo(0,S),e.lineTo(l,S),e.stroke(),e.restore();const x=d(Math.floor(a),0,i.frames-1)*i.numParticles,P=Math.max(.8,o.pointSize)*b;e.fillStyle="rgba(66, 200, 255, 0.9)";for(let h=0;h<i.numParticles;h+=1){const F=y+i.x[x+h]*f,T=S-i.y[x+h]*N;F<-P||F>l+P||T<-P||T>m+P||(e.beginPath(),e.arc(F,T,P,0,Math.PI*2),e.fill())}e.fillStyle="rgba(232, 243, 255, 0.92)",e.font=`${12*b}px Avenir Next, Segoe UI, sans-serif`,e.fillText("2D Diffusion of Particles",12*b,20*b)}const X=s("#app");X.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_1</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_1</h1>
      <p class="subtitle">
        Pure 2D Brownian diffusion with no barriers or forces. This web version
        preserves the Python script's core update rule while adding replay,
        seeded reruns, and adjustable simulation/display parameters.
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
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
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
                <div class="field"><label for="init-cluster-sd">Initial cluster SD</label><input id="init-cluster-sd" type="number" min="0" max="20" step="0.05" /></div>
                <div class="field"><label for="axis-limit">Axis limit (+/-)</label><input id="axis-limit" type="number" min="5" max="500" step="1" /></div>
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
              <dt>Frames total</dt><dd id="status-frames-total">0</dd>
              <dt>Particles</dt><dd id="status-particles">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
            </dl>
          </div>

          <div class="group">
            <p class="group-label">Equation (Euler Update)</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> controls the standard deviation of the sampled random
                rate terms <code>dxdt</code> and <code>dydt</code>. In this implementation, the
                resulting per-step displacement spread is <code>diffusionSd × dt</code>.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_1.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="2D diffusion particle simulation"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #42c8ff"></span>Brownian particles</span>
          <span>No boundaries, no forces, no interactions</span>
        </div>
      </section>
    </div>
  </div>
`;const D=s("#sim-canvas"),n={numParticles:s("#num-particles"),diffusionSd:s("#diffusion-sd"),playbackSpeed:s("#playback-speed"),seed:s("#seed"),totalTime:s("#total-time"),dt:s("#dt"),initClusterSd:s("#init-cluster-sd"),axisLimit:s("#axis-limit"),pointSize:s("#point-size"),targetFps:s("#target-fps")},w={frame:s("#status-frame"),time:s("#status-time"),framesTotal:s("#status-frames-total"),particles:s("#status-particles"),dt:s("#status-dt"),stepSd:s("#status-step-sd"),seed:s("#status-seed")},Y=s("#equation-block"),L={togglePlay:s("#toggle-play"),rerun:s("#rerun"),resetDefaults:s("#reset-defaults"),rewind:s("#rewind"),randomSeed:s("#random-seed")};let u={...z},p={...C},g=$(),c=W(u,g),E=!0,M=0,A=performance.now();function q(){v(n.numParticles,u.numParticles,0),v(n.diffusionSd,u.diffusionSd,3),v(n.playbackSpeed,p.playbackSpeed,2),v(n.seed,g,0),v(n.totalTime,u.T,0),v(n.dt,u.dt,3),v(n.initClusterSd,u.initClusterSd,3),v(n.axisLimit,p.axisLimit,0),v(n.pointSize,p.pointSize,2),v(n.targetFps,p.targetFps,0)}function Z(){return{T:d(Number(n.totalTime.value)||z.T,20,2e4),dt:d(Number(n.dt.value)||z.dt,.05,20),numParticles:d(Math.round(Number(n.numParticles.value)||z.numParticles),1,5e3),diffusionSd:d(Number(n.diffusionSd.value)||0,0,20),initClusterSd:d(Number(n.initClusterSd.value)||0,0,20)}}function K(){return{axisLimit:d(Number(n.axisLimit.value)||C.axisLimit,5,500),pointSize:d(Number(n.pointSize.value)||C.pointSize,.5,8),playbackSpeed:d(Number(n.playbackSpeed.value)||C.playbackSpeed,.1,8),targetFps:d(Math.round(Number(n.targetFps.value)||C.targetFps),1,120)}}function B(t){w.frame.textContent=`${t+1}`,w.time.textContent=(t*c.dt).toFixed(1),w.framesTotal.textContent=`${c.frames}`,w.particles.textContent=`${c.numParticles}`,w.dt.textContent=c.dt.toFixed(2),w.stepSd.textContent=(u.diffusionSd*u.dt).toFixed(3),w.seed.textContent=`${g>>>0}`}function H(){const t=u.diffusionSd,i=u.dt,a=t*i;Y.innerHTML=['<span class="accent">Pedagogical stochastic-rate form</span>',"dx/dt = ξ_x(t),   dy/dt = ξ_y(t)","ξ_x, ξ_y ~ Normal(0, σ²),  where σ = diffusionSd","",'<span class="accent-2">Euler step used in this simulation</span>',"x[i+1] = x[i] + dxdt[i] · dt","y[i+1] = y[i] + dydt[i] · dt","dxdt[i], dydt[i] ~ Normal(0, diffusionSd²)","",`Current: diffusionSd = ${t.toFixed(3)}, dt = ${i.toFixed(3)}`,`Per-step displacement SD = diffusionSd × dt = ${a.toFixed(3)}`].join(`
`)}function R(t=!0){u=Z(),p=K(),g=d(Math.floor(Number(n.seed.value)||g),0,4294967295)>>>0,c=W(u,g),t&&(M=0),q(),H()}function j(){p=K(),q(),H()}function O(t){E=t,L.togglePlay.textContent=E?"Pause":"Play"}q();H();B(0);I(D,c,0,p);L.togglePlay.addEventListener("click",()=>{O(!E)});L.rerun.addEventListener("click",()=>{R(!0)});L.rewind.addEventListener("click",()=>{M=0,B(0),I(D,c,0,p)});L.resetDefaults.addEventListener("click",()=>{u={...z},p={...C},g=$(),q(),R(!0),O(!0)});L.randomSeed.addEventListener("click",()=>{g=$(),v(n.seed,g,0),R(!0)});const tt=["numParticles","diffusionSd","seed","totalTime","dt","initClusterSd"];for(const t of tt)n[t].addEventListener("change",()=>{R(t!=="seed")});const et=["playbackSpeed","axisLimit","pointSize","targetFps"];for(const t of et)n[t].addEventListener("change",()=>{j()});window.addEventListener("resize",()=>{I(D,c,Math.floor(M),p)});function U(t){const i=(t-A)/1e3;A=t,E&&c.frames>0&&(M+=i*p.targetFps*p.playbackSpeed,M>=c.frames&&(M%=c.frames));const a=d(Math.floor(M),0,Math.max(0,c.frames-1));B(a),I(D,c,a,p),requestAnimationFrame(U)}requestAnimationFrame(t=>{A=t,U(t)});
