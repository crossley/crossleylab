var se=Object.defineProperty;var ae=(t,e,i)=>e in t?se(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var A=(t,e,i)=>ae(t,typeof e!="symbol"?e+"":e,i);import"./style-WLU6Igt5.js";class le{constructor(e){A(this,"state");A(this,"spare",null);this.state=e>>>0||1}next(){let e=this.state;return e^=e<<13,e^=e>>>17,e^=e<<5,this.state=e>>>0,this.state/4294967296}normal(e=0,i=1){if(this.spare!==null){const v=this.spare;return this.spare=null,e+i*v}let c=0,n=0;for(;c<=Number.EPSILON;)c=this.next();for(;n<=Number.EPSILON;)n=this.next();const s=Math.sqrt(-2*Math.log(c)),a=s*Math.cos(2*Math.PI*n),f=s*Math.sin(2*Math.PI*n);return this.spare=f,e+i*a}uniform(e,i){return e+(i-e)*this.next()}}const M={T:1e3,dt:1,numParticles:100,boxWidth:100,boxHeight:60,wallThickness:4,channelYMin:-10,channelYMax:10,diffusionSd:.3},H={pointSize:2.5,playbackSpeed:1,targetFps:30};function d(t,e,i){return Math.min(i,Math.max(e,t))}function G(){return Math.random()*4294967295>>>0}function l(t){const e=document.querySelector(t);if(!e)throw new Error(`Missing element: ${t}`);return e}function m(t,e,i=3){if(Number.isInteger(e)){t.value=String(e);return}t.value=Number(e.toFixed(i)).toString()}function oe(t,e,i){const c=i/2,n=d(Math.min(t,e),-c,c),s=d(Math.max(t,e),-c,c);return s-n<.5?[n,Math.min(c,n+.5)]:[n,s]}function Q(t,e){const i=d(Math.round(t.T),20,2e4),c=d(t.dt,.05,20),n=d(Math.round(t.numParticles),1,5e3),s=d(t.boxWidth,20,500),a=d(t.boxHeight,20,500),f=d(t.wallThickness,.5,Math.min(50,s-2)),v=d(t.diffusionSd,0,20),[F,Y]=oe(t.channelYMin,t.channelYMax,a),N=-f/2,P=f/2,T=Math.max(2,Math.floor(i/c)),h=new Float32Array(T*n),p=new Float32Array(T*n),x=new le(e);for(let g=0;g<n;g+=1)h[g]=x.uniform(-s/2+1,0),p[g]=x.uniform(-a/2+1,a/2-1);for(let g=1;g<T;g+=1){const z=(g-1)*n,R=g*n;for(let W=0;W<n;W+=1){const Z=x.normal(0,v),j=x.normal(0,v),_=h[z+W],$=p[z+W];let D=_+Z*c,ee=d($+j*c,-a/2,a/2);const te=_<N&&D>=N,ne=_>P&&D<=P,ie=$>=F&&$<=Y;(te||ne)&&!ie&&(D=_),h[R+W]=D,p[R+W]=ee}}return{x:h,y:p,frames:T,numParticles:n,dt:c,totalTime:i,leftWall:N,rightWall:P,boxWidth:s,boxHeight:a,channelYMin:F,channelYMax:Y}}function de(t){const e=window.devicePixelRatio||1,i=t.getBoundingClientRect(),c=Math.max(1,Math.round(i.width*e)),n=Math.max(1,Math.round(i.height*e));(t.width!==c||t.height!==n)&&(t.width=c,t.height=n)}function y(t,e,i,c,n){const s=(t+i.boxWidth/2)/i.boxWidth*c,a=n-(e+i.boxHeight/2)/i.boxHeight*n;return[s,a]}function L(t,e,i,c){de(t);const n=t.getContext("2d");if(!n)return;const s=t.width,a=t.height,f=window.devicePixelRatio||1;n.clearRect(0,0,s,a),n.fillStyle="#03060b",n.fillRect(0,0,s,a),n.strokeStyle="rgba(120, 170, 255, 0.10)",n.lineWidth=1;for(let h=1;h<10;h+=1){const p=s*h/10,x=a*h/10;n.beginPath(),n.moveTo(p,0),n.lineTo(p,a),n.stroke(),n.beginPath(),n.moveTo(0,x),n.lineTo(s,x),n.stroke()}const[v]=y(e.leftWall,0,e,s,a),[F]=y(e.rightWall,0,e,s,a);n.fillStyle="rgba(200, 220, 255, 0.08)",n.fillRect(v,0,F-v,a);const[,Y]=y(0,e.channelYMax,e,s,a),[,N]=y(0,e.channelYMin,e,s,a);n.fillStyle="rgba(159, 255, 106, 0.10)",n.fillRect(v,Y,F-v,N-Y),n.strokeStyle="rgba(190, 225, 255, 0.45)",n.lineWidth=1.5*f;for(const h of[e.leftWall,e.rightWall]){const[p]=y(h,0,e,s,a),[,x]=y(0,e.boxHeight/2,e,s,a),[,g]=y(0,e.channelYMax,e,s,a),[,z]=y(0,e.channelYMin,e,s,a),[,R]=y(0,-e.boxHeight/2,e,s,a);n.beginPath(),n.moveTo(p,x),n.lineTo(p,g),n.moveTo(p,z),n.lineTo(p,R),n.stroke()}n.strokeStyle="rgba(120, 170, 255, 0.2)",n.lineWidth=1*f,n.strokeRect(.5*f,.5*f,s-f,a-f);const P=d(Math.floor(i),0,e.frames-1)*e.numParticles,T=Math.max(.8,c.pointSize)*f;n.fillStyle="rgba(66, 200, 255, 0.92)";for(let h=0;h<e.numParticles;h+=1){const[p,x]=y(e.x[P+h],e.y[P+h],e,s,a);n.beginPath(),n.arc(p,x,T,0,Math.PI*2),n.fill()}n.fillStyle="rgba(232, 243, 255, 0.92)",n.font=`${12*f}px Avenir Next, Segoe UI, sans-serif`,n.fillText("Diffusion Through a Channel",12*f,20*f)}function ce(t,e){const i=d(e,0,t.frames-1)*t.numParticles;let c=0,n=0;for(let s=0;s<t.numParticles;s+=1){const a=t.x[i+s];a<t.leftWall?c+=1:a>t.rightWall&&(n+=1)}return{left:c,right:n}}const re=l("#app");re.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_2</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_2</h1>
      <p class="subtitle">
        Diffusion in a two-compartment box with a membrane-like wall and one open channel.
        Crossing attempts are blocked outside the channel by reverting x (reflection).
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
              <div class="field"><label for="channel-y-min">Channel y min</label><input id="channel-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="channel-y-max">Channel y max</label><input id="channel-y-max" type="number" step="0.5" /></div>
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
              <dt>Particles Left</dt><dd id="status-left">0</dd>
              <dt>Particles Right</dt><dd id="status-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>

          <div class="group">
            <p class="group-label">Equation + Rule</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> sets the SD of the sampled rate terms
                <code>dxdt</code>, <code>dydt</code>. The membrane/channel affects only whether the x-step is accepted.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_2.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="Diffusion through membrane channel simulation"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #42c8ff"></span>Diffusing particles</span>
          <span><span class="swatch" style="background: #9fff6a"></span>Open channel</span>
          <span>Wall blocks crossing attempts outside channel</span>
        </div>
      </section>
    </div>
  </div>
`;const I=l("#sim-canvas"),o={numParticles:l("#num-particles"),diffusionSd:l("#diffusion-sd"),channelYMin:l("#channel-y-min"),channelYMax:l("#channel-y-max"),playbackSpeed:l("#playback-speed"),seed:l("#seed"),totalTime:l("#total-time"),dt:l("#dt"),boxWidth:l("#box-width"),boxHeight:l("#box-height"),wallThickness:l("#wall-thickness"),pointSize:l("#point-size"),targetFps:l("#target-fps")},w={frame:l("#status-frame"),time:l("#status-time"),left:l("#status-left"),right:l("#status-right"),dt:l("#status-dt"),stepSd:l("#status-step-sd"),seed:l("#status-seed"),frames:l("#status-frames")},ue=l("#equation-block"),C={togglePlay:l("#toggle-play"),rerun:l("#rerun"),resetDefaults:l("#reset-defaults"),rewind:l("#rewind"),randomSeed:l("#random-seed")};let r={...M},b={...H},S=G(),u=Q(r,S),E=!0,k=0,O=performance.now();function q(){m(o.numParticles,r.numParticles,0),m(o.diffusionSd,r.diffusionSd,3),m(o.channelYMin,r.channelYMin,2),m(o.channelYMax,r.channelYMax,2),m(o.playbackSpeed,b.playbackSpeed,2),m(o.seed,S,0),m(o.totalTime,r.T,0),m(o.dt,r.dt,3),m(o.boxWidth,r.boxWidth,1),m(o.boxHeight,r.boxHeight,1),m(o.wallThickness,r.wallThickness,2),m(o.pointSize,b.pointSize,2),m(o.targetFps,b.targetFps,0)}function he(){const t=d(Number(o.boxHeight.value)||M.boxHeight,20,500);return{T:d(Number(o.totalTime.value)||M.T,20,2e4),dt:d(Number(o.dt.value)||M.dt,.05,20),numParticles:d(Math.round(Number(o.numParticles.value)||M.numParticles),1,5e3),boxWidth:d(Number(o.boxWidth.value)||M.boxWidth,20,500),boxHeight:t,wallThickness:d(Number(o.wallThickness.value)||M.wallThickness,.5,50),channelYMin:d(Number(o.channelYMin.value)||0,-t/2,t/2),channelYMax:d(Number(o.channelYMax.value)||0,-t/2,t/2),diffusionSd:d(Number(o.diffusionSd.value)||0,0,20)}}function U(){return{pointSize:d(Number(o.pointSize.value)||H.pointSize,.5,8),playbackSpeed:d(Number(o.playbackSpeed.value)||H.playbackSpeed,.1,8),targetFps:d(Math.round(Number(o.targetFps.value)||H.targetFps),1,120)}}function J(){const t=r.diffusionSd,e=r.dt,i=t*e;ue.innerHTML=['<span class="accent">Euler diffusion update</span>',"x_new = x_old + dxdt · dt","y_new = clamp(y_old + dydt · dt, -H/2, H/2)","dxdt, dydt ~ Normal(0, diffusionSd²)","",'<span class="accent-2">Membrane / channel crossing rule</span>',"If x-step crosses wall boundary and y_old is outside [channel_y_min, channel_y_max]:","    x_new := x_old   (blocked / reflected in x)","",`Current: diffusionSd = ${t.toFixed(3)}, dt = ${e.toFixed(3)}`,`Per-step displacement SD (before wall rule) = diffusionSd × dt = ${i.toFixed(3)}`].join(`
`)}function K(t){const e=ce(u,t);w.frame.textContent=`${t+1}`,w.time.textContent=(t*u.dt).toFixed(1),w.left.textContent=`${e.left}`,w.right.textContent=`${e.right}`,w.dt.textContent=u.dt.toFixed(2),w.stepSd.textContent=(r.diffusionSd*r.dt).toFixed(3),w.seed.textContent=`${S>>>0}`,w.frames.textContent=`${u.frames}`}function B(t=!0){r=he(),b=U(),S=d(Math.floor(Number(o.seed.value)||S),0,4294967295)>>>0,u=Q(r,S),r={...r,boxWidth:u.boxWidth,boxHeight:u.boxHeight,wallThickness:u.rightWall-u.leftWall,channelYMin:u.channelYMin,channelYMax:u.channelYMax},t&&(k=0),q(),J()}function fe(){b=U(),q()}function V(t){E=t,C.togglePlay.textContent=E?"Pause":"Play"}q();J();K(0);L(I,u,0,b);C.togglePlay.addEventListener("click",()=>V(!E));C.rerun.addEventListener("click",()=>B(!0));C.rewind.addEventListener("click",()=>{k=0,K(0),L(I,u,0,b)});C.randomSeed.addEventListener("click",()=>{S=G(),m(o.seed,S,0),B(!0)});C.resetDefaults.addEventListener("click",()=>{r={...M},b={...H},S=G(),q(),B(!0),V(!0)});const pe=["numParticles","diffusionSd","channelYMin","channelYMax","seed","totalTime","dt","boxWidth","boxHeight","wallThickness"];for(const t of pe)o[t].addEventListener("change",()=>B(t!=="seed"));for(const t of["playbackSpeed","pointSize","targetFps"])o[t].addEventListener("change",()=>fe());window.addEventListener("resize",()=>{L(I,u,Math.floor(k),b)});function X(t){const e=(t-O)/1e3;O=t,E&&u.frames>0&&(k+=e*b.targetFps*b.playbackSpeed,k>=u.frames&&(k%=u.frames));const i=d(Math.floor(k),0,Math.max(0,u.frames-1));K(i),L(I,u,i,b),requestAnimationFrame(X)}requestAnimationFrame(t=>{O=t,X(t)});
