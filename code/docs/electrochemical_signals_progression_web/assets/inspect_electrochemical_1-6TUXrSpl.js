var fe=Object.defineProperty;var me=(t,e,i)=>e in t?fe(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var Q=(t,e,i)=>me(t,typeof e!="symbol"?e+"":e,i);import"./style-WLU6Igt5.js";class be{constructor(e){Q(this,"state");Q(this,"spare",null);this.state=e>>>0||1}next(){let e=this.state;return e^=e<<13,e^=e>>>17,e^=e<<5,this.state=e>>>0,this.state/4294967296}uniform(e,i){return e+(i-e)*this.next()}normal(e=0,i=1){if(this.spare!==null){const m=this.spare;return this.spare=null,e+i*m}let u=0,c=0;for(;u<=Number.EPSILON;)u=this.next();for(;c<=Number.EPSILON;)c=this.next();const n=Math.sqrt(-2*Math.log(u)),r=n*Math.cos(2*Math.PI*c),d=n*Math.sin(2*Math.PI*c);return this.spare=d,e+i*r}}const w={T:1e3,dt:1,numParticles:100,boxWidth:100,boxHeight:60,wallThickness:4,diffusionSd:.5,channelYMin:-10,channelYMax:10,negX:-45,negY:0,weakStrength:.001,strongStrength:.1},H={pointSize:2.4,playbackSpeed:1,targetFps:30};function o(t,e,i){return Math.min(i,Math.max(e,t))}function xe(t,e,i){const u=i/2,c=o(Math.min(t,e),-u,u),n=o(Math.max(t,e),-u,u);return n-c<.5?[c,Math.min(u,c+.5)]:[c,n]}function J(){return Math.random()*4294967295>>>0}function s(t){const e=document.querySelector(t);if(!e)throw new Error(`Missing element: ${t}`);return e}function h(t,e,i=3){t.value=Number.isInteger(e)?String(e):Number(e.toFixed(i)).toString()}function q(t,e,i){const u=o(Math.round(t.T),20,2e4),c=o(t.dt,.05,20),n=o(Math.round(t.numParticles),1,5e3),r=o(t.boxWidth,20,500),d=o(t.boxHeight,20,500),m=o(t.wallThickness,.5,Math.min(50,r-2)),M=o(t.diffusionSd,0,20),[N,C]=xe(t.channelYMin,t.channelYMax,d),L=-m/2,P=m/2,z=o(t.negX,-r/2,r/2),_=o(t.negY,-d/2,d/2),Y=Math.max(2,Math.floor(u/c)),p=new Float32Array(Y*n),f=new Float32Array(Y*n),b=new be(i);for(let x=0;x<n;x+=1)p[x]=b.uniform(P+1,r/2-1),f[x]=b.uniform(-d/2+1,d/2-1);for(let x=1;x<Y;x+=1){const R=(x-1)*n,X=x*n;for(let W=0;W<n;W+=1){const oe=b.normal(0,M),de=b.normal(0,M),E=p[R+W],$=f[R+W],O=z-E,K=_-$,j=Math.sqrt(O*O+K*K)+.001,re=e*O/j,ce=e*K/j;let I=E+(oe+re)*c;const ue=o($+(de+ce)*c,-d/2,d/2),he=E>P&&I<=P,ge=E<L&&I>=L,pe=$>=N&&$<=C;(he||ge)&&!pe&&(I=E),p[X+W]=I,f[X+W]=ue}}return{x:p,y:f,frames:Y,numParticles:n,dt:c,boxWidth:r,boxHeight:d,leftWall:L,rightWall:P,channelYMin:N,channelYMax:C,negX:z,negY:_}}function ve(t){const e=window.devicePixelRatio||1,i=t.getBoundingClientRect(),u=Math.max(1,Math.round(i.width*e)),c=Math.max(1,Math.round(i.height*e));(t.width!==u||t.height!==c)&&(t.width=u,t.height=c)}function v(t,e,i,u,c){return[(t+i.boxWidth/2)/i.boxWidth*u,c-(e+i.boxHeight/2)/i.boxHeight*c]}function ee(t,e,i,u,c){ve(t);const n=t.getContext("2d");if(!n)return;const r=t.width,d=t.height,m=window.devicePixelRatio||1;n.clearRect(0,0,r,d),n.fillStyle="#03060b",n.fillRect(0,0,r,d),n.strokeStyle="rgba(120,170,255,0.10)",n.lineWidth=1;for(let p=1;p<10;p+=1){const f=r*p/10,b=d*p/10;n.beginPath(),n.moveTo(f,0),n.lineTo(f,d),n.stroke(),n.beginPath(),n.moveTo(0,b),n.lineTo(r,b),n.stroke()}const[M]=v(e.leftWall,0,e,r,d),[N]=v(e.rightWall,0,e,r,d),[,C]=v(0,e.channelYMax,e,r,d),[,L]=v(0,e.channelYMin,e,r,d);n.fillStyle="rgba(200,220,255,0.08)",n.fillRect(M,0,N-M,d),n.fillStyle="rgba(159,255,106,0.10)",n.fillRect(M,C,N-M,L-C),n.strokeStyle="rgba(190,225,255,0.45)",n.lineWidth=1.5*m;for(const p of[e.leftWall,e.rightWall]){const[f]=v(p,0,e,r,d),[,b]=v(0,e.boxHeight/2,e,r,d),[,x]=v(0,e.channelYMax,e,r,d),[,R]=v(0,e.channelYMin,e,r,d),[,X]=v(0,-e.boxHeight/2,e,r,d);n.beginPath(),n.moveTo(f,b),n.lineTo(f,x),n.moveTo(f,R),n.lineTo(f,X),n.stroke()}const[P,z]=v(e.negX,e.negY,e,r,d);n.fillStyle="rgba(66,200,255,0.95)",n.beginPath(),n.arc(P,z,4*m,0,Math.PI*2),n.fill(),n.strokeStyle="rgba(66,200,255,0.4)",n.beginPath(),n.arc(P,z,10*m,0,Math.PI*2),n.stroke();const _=o(i,0,e.frames-1)*e.numParticles,Y=Math.max(.8,u)*m;n.fillStyle="rgba(245, 178, 72, 0.92)";for(let p=0;p<e.numParticles;p+=1){const[f,b]=v(e.x[_+p],e.y[_+p],e,r,d);n.beginPath(),n.arc(f,b,Y,0,Math.PI*2),n.fill()}n.fillStyle="rgba(232,243,255,0.92)",n.font=`${12*m}px Avenir Next, Segoe UI, sans-serif`,n.fillText(c,12*m,20*m)}function te(t,e){const i=o(e,0,t.frames-1)*t.numParticles;let u=0,c=0;for(let n=0;n<t.numParticles;n+=1){const r=t.x[i+n];r<t.leftWall?u+=1:r>t.rightWall&&(c+=1)}return{left:u,right:c}}const ye=s("#app");ye.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_electrochemical_1</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Adding Electrical and Interaction Forces</p>
      <h1>inspect_electrochemical_1</h1>
      <p class="subtitle">
        Side-by-side comparison of weak vs strong electrical attraction superimposed on diffusion through a single channel.
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
              <div class="field"><label for="weak-strength">Weak field strength</label><input id="weak-strength" type="number" min="0" max="5" step="0.001" /></div>
              <div class="field"><label for="strong-strength">Strong field strength</label><input id="strong-strength" type="number" min="0" max="5" step="0.001" /></div>
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
                <div class="field"><label for="neg-x">Neg charge x</label><input id="neg-x" type="number" step="1" /></div>
                <div class="field"><label for="neg-y">Neg charge y</label><input id="neg-y" type="number" step="1" /></div>
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
              <dt>Weak Left</dt><dd id="status-weak-left">0</dd>
              <dt>Strong Left</dt><dd id="status-strong-left">0</dd>
              <dt>Weak Right</dt><dd id="status-weak-right">0</dd>
              <dt>Strong Right</dt><dd id="status-strong-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Drift Term</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> controls the Brownian random-rate term; the electric field adds a distance-normalized drift toward the negative attractor.
              </p>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Weak vs Strong Electrical Gradient</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_electrochemical_1.py</code></span>
        </div>
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Weak Field</h3><span class="tiny" id="weak-label"></span></div>
            <canvas id="weak-canvas" aria-label="Weak electrical gradient simulation"></canvas>
          </div>
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Strong Field</h3><span class="tiny" id="strong-label"></span></div>
            <canvas id="strong-canvas" aria-label="Strong electrical gradient simulation"></canvas>
          </div>
        </div>
        <div class="legend">
          <span><span class="swatch" style="background: #f5b248"></span>Particles</span>
          <span><span class="swatch" style="background: #42c8ff"></span>Negative attractor</span>
          <span><span class="swatch" style="background: #9fff6a"></span>Open channel</span>
        </div>
      </section>
    </div>
  </div>
`;const Se=s("#weak-canvas"),we=s("#strong-canvas"),ke=s("#equation-block"),Me=s("#weak-label"),Pe=s("#strong-label"),a={numParticles:s("#num-particles"),diffusionSd:s("#diffusion-sd"),weakStrength:s("#weak-strength"),strongStrength:s("#strong-strength"),channelYMin:s("#channel-y-min"),channelYMax:s("#channel-y-max"),playbackSpeed:s("#playback-speed"),seed:s("#seed"),totalTime:s("#total-time"),dt:s("#dt"),boxWidth:s("#box-width"),boxHeight:s("#box-height"),wallThickness:s("#wall-thickness"),negX:s("#neg-x"),negY:s("#neg-y"),pointSize:s("#point-size"),targetFps:s("#target-fps")},S={frame:s("#status-frame"),time:s("#status-time"),weakLeft:s("#status-weak-left"),weakRight:s("#status-weak-right"),strongLeft:s("#status-strong-left"),strongRight:s("#status-strong-right"),dt:s("#status-dt"),stepSd:s("#status-step-sd"),seed:s("#status-seed"),frames:s("#status-frames")},F={togglePlay:s("#toggle-play"),rerun:s("#rerun"),resetDefaults:s("#reset-defaults"),rewind:s("#rewind"),randomSeed:s("#random-seed")};let l={...w},k={...H},y=J(),g=q(l,l.weakStrength,y),V=q(l,l.strongStrength,y),D=!0,T=0,U=performance.now();function B(){h(a.numParticles,l.numParticles,0),h(a.diffusionSd,l.diffusionSd,3),h(a.weakStrength,l.weakStrength,3),h(a.strongStrength,l.strongStrength,3),h(a.channelYMin,l.channelYMin,2),h(a.channelYMax,l.channelYMax,2),h(a.playbackSpeed,k.playbackSpeed,2),h(a.seed,y,0),h(a.totalTime,l.T,0),h(a.dt,l.dt,3),h(a.boxWidth,l.boxWidth,1),h(a.boxHeight,l.boxHeight,1),h(a.wallThickness,l.wallThickness,2),h(a.negX,l.negX,1),h(a.negY,l.negY,1),h(a.pointSize,k.pointSize,2),h(a.targetFps,k.targetFps,0)}function Te(){const t=o(Number(a.boxHeight.value)||w.boxHeight,20,500),e=o(Number(a.boxWidth.value)||w.boxWidth,20,500);return{T:o(Number(a.totalTime.value)||w.T,20,2e4),dt:o(Number(a.dt.value)||w.dt,.05,20),numParticles:o(Math.round(Number(a.numParticles.value)||w.numParticles),1,5e3),boxWidth:e,boxHeight:t,wallThickness:o(Number(a.wallThickness.value)||w.wallThickness,.5,50),diffusionSd:o(Number(a.diffusionSd.value)||0,0,20),channelYMin:o(Number(a.channelYMin.value)||0,-t/2,t/2),channelYMax:o(Number(a.channelYMax.value)||0,-t/2,t/2),negX:o(Number(a.negX.value)||w.negX,-e/2,e/2),negY:o(Number(a.negY.value)||w.negY,-t/2,t/2),weakStrength:o(Number(a.weakStrength.value)||0,0,5),strongStrength:o(Number(a.strongStrength.value)||0,0,5)}}function ne(){return{pointSize:o(Number(a.pointSize.value)||H.pointSize,.5,8),playbackSpeed:o(Number(a.playbackSpeed.value)||H.playbackSpeed,.1,8),targetFps:o(Math.round(Number(a.targetFps.value)||H.targetFps),1,120)}}function se(){Me.textContent=`strength = ${l.weakStrength.toFixed(3)}`,Pe.textContent=`strength = ${l.strongStrength.toFixed(3)}`}function ae(){const t=l.diffusionSd*l.dt;ke.innerHTML=['<span class="accent">Euler update with electrical drift</span>',"diff = (neg_pos - pos)","force = electric_strength · diff / (||diff|| + ε)","x_new = x_old + (dxdt + force_x) · dt","y_new = clamp(y_old + (dydt + force_y) · dt, -H/2, H/2)","dxdt, dydt ~ Normal(0, diffusionSd²)","",'<span class="accent-2">Shared channel rule (both panels)</span>',"Wall crossing allowed only if y_old ∈ [channel_y_min, channel_y_max] ; else x_new := x_old","",`Per-step Brownian displacement SD = diffusionSd × dt = ${t.toFixed(3)}`,`Weak/strong strengths = ${l.weakStrength.toFixed(3)} / ${l.strongStrength.toFixed(3)}`].join(`
`)}function Z(t){const e=te(g,t),i=te(V,t);S.frame.textContent=`${t+1}`,S.time.textContent=(t*g.dt).toFixed(1),S.weakLeft.textContent=`${e.left}`,S.weakRight.textContent=`${e.right}`,S.strongLeft.textContent=`${i.left}`,S.strongRight.textContent=`${i.right}`,S.dt.textContent=g.dt.toFixed(2),S.stepSd.textContent=(l.diffusionSd*l.dt).toFixed(3),S.seed.textContent=`${y>>>0}`,S.frames.textContent=`${g.frames}`}function A(t){ee(Se,g,t,k.pointSize,"Weak Electrical Gradient"),ee(we,V,t,k.pointSize,"Strong Electrical Gradient")}function G(t=!0){l=Te(),k=ne(),y=o(Math.floor(Number(a.seed.value)||y),0,4294967295)>>>0,g=q(l,l.weakStrength,y),V=q(l,l.strongStrength,y),l={...l,boxWidth:g.boxWidth,boxHeight:g.boxHeight,wallThickness:g.rightWall-g.leftWall,channelYMin:g.channelYMin,channelYMax:g.channelYMax,negX:g.negX,negY:g.negY},t&&(T=0),B(),se(),ae()}function Ye(){k=ne(),B()}function ie(t){D=t,F.togglePlay.textContent=D?"Pause":"Play"}B();se();ae();Z(0);A(0);F.togglePlay.addEventListener("click",()=>ie(!D));F.rerun.addEventListener("click",()=>G(!0));F.rewind.addEventListener("click",()=>{T=0,Z(0),A(0)});F.randomSeed.addEventListener("click",()=>{y=J(),h(a.seed,y,0),G(!0)});F.resetDefaults.addEventListener("click",()=>{l={...w},k={...H},y=J(),B(),G(!0),ie(!0)});const We=["numParticles","diffusionSd","weakStrength","strongStrength","channelYMin","channelYMax","seed","totalTime","dt","boxWidth","boxHeight","wallThickness","negX","negY"];for(const t of We)a[t].addEventListener("change",()=>G(t!=="seed"));for(const t of["playbackSpeed","pointSize","targetFps"])a[t].addEventListener("change",()=>Ye());window.addEventListener("resize",()=>A(Math.floor(T)));function le(t){const e=(t-U)/1e3;U=t,D&&g.frames>0&&(T+=e*k.targetFps*k.playbackSpeed,T>=g.frames&&(T%=g.frames));const i=o(Math.floor(T),0,Math.max(0,g.frames-1));Z(i),A(i),requestAnimationFrame(le)}requestAnimationFrame(t=>{U=t,le(t)});
