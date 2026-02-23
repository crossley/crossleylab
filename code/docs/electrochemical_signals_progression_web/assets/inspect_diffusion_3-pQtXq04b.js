var oe=Object.defineProperty;var le=(e,t,i)=>t in e?oe(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var O=(e,t,i)=>le(e,typeof t!="symbol"?t+"":t,i);import"./style-WLU6Igt5.js";class re{constructor(t){O(this,"state");O(this,"spare",null);this.state=t>>>0||1}next(){let t=this.state;return t^=t<<13,t^=t>>>17,t^=t<<5,this.state=t>>>0,this.state/4294967296}normal(t=0,i=1){if(this.spare!==null){const w=this.spare;return this.spare=null,t+i*w}let c=0,l=0;for(;c<=Number.EPSILON;)c=this.next();for(;l<=Number.EPSILON;)l=this.next();const n=Math.sqrt(-2*Math.log(c)),o=n*Math.cos(2*Math.PI*l),u=n*Math.sin(2*Math.PI*l);return this.spare=u,t+i*o}uniform(t,i){return t+(i-t)*this.next()}}const x={T:1e3,dt:1,numParticles:100,boxWidth:100,boxHeight:60,wallThickness:4,diffusionSd:.5,narrowYMin:-5,narrowYMax:5,wideYMin:-20,wideYMax:20},L={pointSize:2.5,playbackSpeed:1,targetFps:30};function r(e,t,i){return Math.min(i,Math.max(t,e))}function K(){return Math.random()*4294967295>>>0}function a(e){const t=document.querySelector(e);if(!t)throw new Error(`Missing element: ${e}`);return t}function f(e,t,i=3){e.value=Number.isInteger(t)?String(t):Number(t.toFixed(i)).toString()}function ce(e,t,i){const c=i/2,l=r(Math.min(e,t),-c,c),n=r(Math.max(e,t),-c,c);return n-l<.5?[l,Math.min(c,l+.5)]:[l,n]}function $(e,t){const i=r(Math.round(e.T),20,2e4),c=r(e.dt,.05,20),l=r(Math.round(e.numParticles),1,5e3),n=r(e.boxWidth,20,500),o=r(e.boxHeight,20,500),u=r(e.wallThickness,.5,Math.min(50,n-2)),w=r(e.diffusionSd,0,20),[Y,N]=ce(e.channelYMin,e.channelYMax,o),T=-u/2,F=u/2,k=Math.max(2,Math.floor(i/c)),W=new Float32Array(k*l),p=new Float32Array(k*l),b=new re(t);for(let h=0;h<l;h+=1)W[h]=b.uniform(-n/2+1,0),p[h]=b.uniform(-o/2+1,o/2-1);for(let h=1;h<k;h+=1){const _=(h-1)*l,z=h*l;for(let S=0;S<l;S+=1){const te=b.normal(0,w),ne=b.normal(0,w),H=W[_+S],A=p[_+S];let E=H+te*c;const ie=r(A+ne*c,-o/2,o/2),ae=H<T&&E>=T,se=H>F&&E<=F,de=A>=Y&&A<=N;(ae||se)&&!de&&(E=H),W[z+S]=E,p[z+S]=ie}}return{x:W,y:p,frames:k,numParticles:l,dt:c,boxWidth:n,boxHeight:o,leftWall:T,rightWall:F,channelYMin:Y,channelYMax:N}}function ue(e){const t=window.devicePixelRatio||1,i=e.getBoundingClientRect(),c=Math.max(1,Math.round(i.width*t)),l=Math.max(1,Math.round(i.height*t));(e.width!==c||e.height!==l)&&(e.width=c,e.height=l)}function y(e,t,i,c,l){const n=(e+i.boxWidth/2)/i.boxWidth*c,o=l-(t+i.boxHeight/2)/i.boxHeight*l;return[n,o]}function U(e,t,i,c,l){ue(e);const n=e.getContext("2d");if(!n)return;const o=e.width,u=e.height,w=window.devicePixelRatio||1;n.clearRect(0,0,o,u),n.fillStyle="#03060b",n.fillRect(0,0,o,u),n.strokeStyle="rgba(120, 170, 255, 0.10)",n.lineWidth=1;for(let p=1;p<10;p+=1){const b=o*p/10,h=u*p/10;n.beginPath(),n.moveTo(b,0),n.lineTo(b,u),n.stroke(),n.beginPath(),n.moveTo(0,h),n.lineTo(o,h),n.stroke()}const[Y]=y(t.leftWall,0,t,o,u),[N]=y(t.rightWall,0,t,o,u),[,T]=y(0,t.channelYMax,t,o,u),[,F]=y(0,t.channelYMin,t,o,u);n.fillStyle="rgba(200, 220, 255, 0.08)",n.fillRect(Y,0,N-Y,u),n.fillStyle="rgba(159, 255, 106, 0.12)",n.fillRect(Y,T,N-Y,F-T),n.strokeStyle="rgba(190, 225, 255, 0.48)",n.lineWidth=1.5*w;for(const p of[t.leftWall,t.rightWall]){const[b]=y(p,0,t,o,u),[,h]=y(0,t.boxHeight/2,t,o,u),[,_]=y(0,t.channelYMax,t,o,u),[,z]=y(0,t.channelYMin,t,o,u),[,S]=y(0,-t.boxHeight/2,t,o,u);n.beginPath(),n.moveTo(b,h),n.lineTo(b,_),n.moveTo(b,z),n.lineTo(b,S),n.stroke()}n.strokeStyle="rgba(120, 170, 255, 0.2)",n.lineWidth=1*w,n.strokeRect(.5*w,.5*w,o-w,u-w);const k=r(i,0,t.frames-1)*t.numParticles;n.fillStyle="rgba(66, 200, 255, 0.92)";const W=Math.max(.8,c)*w;for(let p=0;p<t.numParticles;p+=1){const[b,h]=y(t.x[k+p],t.y[k+p],t,o,u);n.beginPath(),n.arc(b,h,W,0,Math.PI*2),n.fill()}n.fillStyle="rgba(232, 243, 255, 0.92)",n.font=`${12*w}px Avenir Next, Segoe UI, sans-serif`,n.fillText(l,12*w,20*w)}function J(e,t){const i=r(t,0,e.frames-1)*e.numParticles;let c=0,l=0;for(let n=0;n<e.numParticles;n+=1){const o=e.x[i+n];o<e.leftWall?c+=1:o>e.rightWall&&(l+=1)}return{left:c,right:l}}const pe=a("#app");pe.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_3</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_3</h1>
      <p class="subtitle">
        Side-by-side comparison of narrow vs wide channels under identical diffusive dynamics.
        This web port uses the same seed for both conditions so geometry differences dominate.
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
              <div class="field"><label for="narrow-y-min">Narrow y min</label><input id="narrow-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="narrow-y-max">Narrow y max</label><input id="narrow-y-max" type="number" step="0.5" /></div>
              <div class="field"><label for="wide-y-min">Wide y min</label><input id="wide-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="wide-y-max">Wide y max</label><input id="wide-y-max" type="number" step="0.5" /></div>
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
              <dt>Narrow Right</dt><dd id="status-narrow-right">0</dd>
              <dt>Wide Right</dt><dd id="status-wide-right">0</dd>
              <dt>Narrow Left</dt><dd id="status-narrow-left">0</dd>
              <dt>Wide Left</dt><dd id="status-wide-left">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Comparison Logic</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                Both panels use the same seeded random samples (same initial positions and Brownian draws)
                so the main difference is channel geometry (effective permeability proxy).
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Paired Comparison</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_3.py</code></span>
        </div>
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Narrow Channel</h3><span class="tiny" id="narrow-range-label"></span></div>
            <canvas id="narrow-canvas" aria-label="Narrow channel diffusion comparison"></canvas>
          </div>
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Wide Channel</h3><span class="tiny" id="wide-range-label"></span></div>
            <canvas id="wide-canvas" aria-label="Wide channel diffusion comparison"></canvas>
          </div>
        </div>
        <div class="legend">
          <span><span class="swatch" style="background: #42c8ff"></span>Diffusing particles</span>
          <span><span class="swatch" style="background: #9fff6a"></span>Open channel region</span>
          <span>Both conditions share seed/noise; only channel size differs</span>
        </div>
      </section>
    </div>
  </div>
`;const he=a("#narrow-canvas"),fe=a("#wide-canvas"),me=a("#equation-block"),we=a("#narrow-range-label"),be=a("#wide-range-label"),s={numParticles:a("#num-particles"),diffusionSd:a("#diffusion-sd"),narrowYMin:a("#narrow-y-min"),narrowYMax:a("#narrow-y-max"),wideYMin:a("#wide-y-min"),wideYMax:a("#wide-y-max"),playbackSpeed:a("#playback-speed"),seed:a("#seed"),totalTime:a("#total-time"),dt:a("#dt"),boxWidth:a("#box-width"),boxHeight:a("#box-height"),wallThickness:a("#wall-thickness"),pointSize:a("#point-size"),targetFps:a("#target-fps")},v={frame:a("#status-frame"),time:a("#status-time"),narrowLeft:a("#status-narrow-left"),narrowRight:a("#status-narrow-right"),wideLeft:a("#status-wide-left"),wideRight:a("#status-wide-right"),dt:a("#status-dt"),stepSd:a("#status-step-sd"),seed:a("#status-seed"),frames:a("#status-frames")},C={togglePlay:a("#toggle-play"),rerun:a("#rerun"),resetDefaults:a("#reset-defaults"),rewind:a("#rewind"),randomSeed:a("#random-seed")};let d={...x},M={...L},g=K(),m=$({...x,channelYMin:x.narrowYMin,channelYMax:x.narrowYMax},g),R=$({...x,channelYMin:x.wideYMin,channelYMax:x.wideYMax},g),D=!0,P=0,G=performance.now();function q(){f(s.numParticles,d.numParticles,0),f(s.diffusionSd,d.diffusionSd,3),f(s.narrowYMin,d.narrowYMin,2),f(s.narrowYMax,d.narrowYMax,2),f(s.wideYMin,d.wideYMin,2),f(s.wideYMax,d.wideYMax,2),f(s.playbackSpeed,M.playbackSpeed,2),f(s.seed,g,0),f(s.totalTime,d.T,0),f(s.dt,d.dt,3),f(s.boxWidth,d.boxWidth,1),f(s.boxHeight,d.boxHeight,1),f(s.wallThickness,d.wallThickness,2),f(s.pointSize,M.pointSize,2),f(s.targetFps,M.targetFps,0)}function xe(){const e=r(Number(s.boxHeight.value)||x.boxHeight,20,500);return{T:r(Number(s.totalTime.value)||x.T,20,2e4),dt:r(Number(s.dt.value)||x.dt,.05,20),numParticles:r(Math.round(Number(s.numParticles.value)||x.numParticles),1,5e3),boxWidth:r(Number(s.boxWidth.value)||x.boxWidth,20,500),boxHeight:e,wallThickness:r(Number(s.wallThickness.value)||x.wallThickness,.5,50),diffusionSd:r(Number(s.diffusionSd.value)||0,0,20),narrowYMin:r(Number(s.narrowYMin.value)||0,-e/2,e/2),narrowYMax:r(Number(s.narrowYMax.value)||0,-e/2,e/2),wideYMin:r(Number(s.wideYMin.value)||0,-e/2,e/2),wideYMax:r(Number(s.wideYMax.value)||0,-e/2,e/2)}}function V(){return{pointSize:r(Number(s.pointSize.value)||L.pointSize,.5,8),playbackSpeed:r(Number(s.playbackSpeed.value)||L.playbackSpeed,.1,8),targetFps:r(Math.round(Number(s.targetFps.value)||L.targetFps),1,120)}}function B(e=!0){d=xe(),M=V(),g=r(Math.floor(Number(s.seed.value)||g),0,4294967295)>>>0,m=$({...d,channelYMin:d.narrowYMin,channelYMax:d.narrowYMax},g),R=$({...d,channelYMin:d.wideYMin,channelYMax:d.wideYMax},g),d={...d,boxWidth:m.boxWidth,boxHeight:m.boxHeight,wallThickness:m.rightWall-m.leftWall,narrowYMin:m.channelYMin,narrowYMax:m.channelYMax,wideYMin:R.channelYMin,wideYMax:R.channelYMax},e&&(P=0),q(),Z(),X()}function ge(){M=V(),q()}function X(){we.textContent=`[${d.narrowYMin.toFixed(1)}, ${d.narrowYMax.toFixed(1)}]`,be.textContent=`[${d.wideYMin.toFixed(1)}, ${d.wideYMax.toFixed(1)}]`}function Z(){const e=d.diffusionSd*d.dt,t=d.narrowYMax-d.narrowYMin,i=d.wideYMax-d.wideYMin;me.innerHTML=['<span class="accent">Shared Euler diffusion update (both panels)</span>',"x_new = x_old + dxdt · dt","y_new = clamp(y_old + dydt · dt, -H/2, H/2)","dxdt, dydt ~ Normal(0, diffusionSd²)","",'<span class="accent-2">Different only in channel gating window</span>',"Narrow: y_old ∈ [narrow_y_min, narrow_y_max] permits wall crossing","Wide:   y_old ∈ [wide_y_min,   wide_y_max] permits wall crossing","Otherwise x_new := x_old","",`Per-step displacement SD = diffusionSd × dt = ${e.toFixed(3)}`,`Channel widths: narrow = ${t.toFixed(1)}, wide = ${i.toFixed(1)}`].join(`
`)}function Q(e){const t=J(m,e),i=J(R,e);v.frame.textContent=`${e+1}`,v.time.textContent=(e*m.dt).toFixed(1),v.narrowLeft.textContent=`${t.left}`,v.narrowRight.textContent=`${t.right}`,v.wideLeft.textContent=`${i.left}`,v.wideRight.textContent=`${i.right}`,v.dt.textContent=m.dt.toFixed(2),v.stepSd.textContent=(d.diffusionSd*d.dt).toFixed(3),v.seed.textContent=`${g>>>0}`,v.frames.textContent=`${m.frames}`}function I(e){U(he,m,e,M.pointSize,"Narrow Channel"),U(fe,R,e,M.pointSize,"Wide Channel")}function j(e){D=e,C.togglePlay.textContent=D?"Pause":"Play"}q();X();Z();Q(0);I(0);C.togglePlay.addEventListener("click",()=>j(!D));C.rerun.addEventListener("click",()=>B(!0));C.rewind.addEventListener("click",()=>{P=0,Q(0),I(0)});C.randomSeed.addEventListener("click",()=>{g=K(),f(s.seed,g,0),B(!0)});C.resetDefaults.addEventListener("click",()=>{d={...x},M={...L},g=K(),q(),B(!0),j(!0)});const ye=["numParticles","diffusionSd","narrowYMin","narrowYMax","wideYMin","wideYMax","seed","totalTime","dt","boxWidth","boxHeight","wallThickness"];for(const e of ye)s[e].addEventListener("change",()=>B(e!=="seed"));for(const e of["playbackSpeed","pointSize","targetFps"])s[e].addEventListener("change",()=>ge());window.addEventListener("resize",()=>{I(Math.floor(P))});function ee(e){const t=(e-G)/1e3;G=e,D&&m.frames>0&&(P+=t*M.targetFps*M.playbackSpeed,P>=m.frames&&(P%=m.frames));const i=r(Math.floor(P),0,Math.max(0,m.frames-1));Q(i),I(i),requestAnimationFrame(ee)}requestAnimationFrame(e=>{G=e,ee(e)});
