var tt=Object.defineProperty;var et=(t,e,i)=>e in t?tt(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var F=(t,e,i)=>et(t,typeof e!="symbol"?e+"":e,i);import{a as nt,i as it}from"./theme-BJJ86vkc.js";import{D as ot,g as j,d as st,S as D,M as L}from"./sim_shared-BWgPgds5.js";nt();class q{constructor(e){F(this,"state");F(this,"spare",null);this.state=e>>>0||1}next(){let e=this.state;return e^=e<<13,e^=e>>>17,e^=e<<5,this.state=e>>>0,this.state/4294967296}uniform(e,i){return e+(i-e)*this.next()}normal(e=0,i=1){if(this.spare!==null){const a=this.spare;return this.spare=null,e+i*a}let o=0,s=0;for(;o<=Number.EPSILON;)o=this.next();for(;s<=Number.EPSILON;)s=this.next();const n=Math.sqrt(-2*Math.log(o)),l=n*Math.cos(2*Math.PI*s),c=n*Math.sin(2*Math.PI*s);return this.spare=c,e+i*l}}const B={dt:1,boxWidth:120,boxHeight:90,diffusionSd:ot,posLeft:1e3,posRight:1e3,negLeft:1e3,negRight:1e3},G={pointSize:2.1,playbackSpeed:1,targetFps:30,traceWindowMs:2200};function y(t,e,i){return Math.min(i,Math.max(e,t))}function $(t,e,i){let o=t;for(;o<e||o>i;)o<e&&(o=e+(e-o)),o>i&&(o=i-(o-i));return y(o,e,i)}function m(t){const e=document.querySelector(t);if(!e)throw new Error(`Missing element: ${t}`);return e}function N(t,e,i=2){t.value=Number.isInteger(e)?String(e):Number(e.toFixed(i)).toString()}function K(t){const e=window.devicePixelRatio||1,i=t.getBoundingClientRect(),o=Math.max(1,Math.round(i.width*e)),s=Math.max(1,Math.round(i.height*e));(t.width!==o||t.height!==s)&&(t.width=o,t.height=s)}function lt(t){const e=y(Math.round(t.posLeft),0,L),i=y(Math.round(t.posRight),0,L),o=y(Math.round(t.negLeft),0,L),s=y(Math.round(t.negRight),0,L),n=e+i+o+s,l=n>L?L/n:1;return{dt:y(t.dt,.05,20),boxWidth:y(t.boxWidth,60,220),boxHeight:y(t.boxHeight,50,180),diffusionSd:y(t.diffusionSd,0,8),posLeft:Math.round(e*l),posRight:Math.round(i*l),negLeft:Math.round(o*l),negRight:Math.round(s*l)}}function O(t){const e=new q(1),i=t.posLeft+t.posRight+t.negLeft+t.negRight,o=new Float32Array(i),s=new Float32Array(i),n=new Int8Array(i),l=new Uint8Array(i),c=new Int8Array(i),a=t.boxWidth/2,g=t.boxHeight/2,T=-2,v=2;let b=0;const x=(w,r,f,p)=>{const H=p<0?-a+1:v+1,C=p<0?T-1:a-1;for(let P=0;P<w;P+=1)o[b]=e.uniform(H,C),s[b]=e.uniform(-g+1,g-1),n[b]=f,l[b]=r,c[b]=p,b+=1};return x(t.posLeft,0,1,-1),x(t.posRight,0,1,1),x(t.negLeft,1,-1,-1),x(t.negRight,1,-1,1),{x:o,y:s,charges:n,types:l,side:c,numParticles:i,stepCount:0,simTime:0}}function A(t){let e=0,i=0;for(let o=0;o<t.numParticles;o+=1)t.side[o]<0?e+=t.charges[o]:i+=t.charges[o];return i-e}function at(t,e,i){const o=e.boxWidth/2,s=e.boxHeight/2;for(let n=0;n<t.numParticles;n+=1){const l=t.x[n],c=t.y[n],a=t.side[n]<0?-o:2,g=t.side[n]<0?-2:o;t.x[n]=$(l+i.normal(0,e.diffusionSd)*e.dt,a,g),t.y[n]=$(c+i.normal(0,e.diffusionSd)*e.dt,-s,s)}t.stepCount+=1,t.simTime=t.stepCount*e.dt}function Q(t,e,i,o){t.times.push(i),t.values.push(e);const s=Math.max(0,i-o);for(;t.times.length>1&&t.times[0]<s;)t.times.shift(),t.values.shift()}function rt(t,e,i,o){const s=j();K(t);const n=t.getContext("2d");if(!n)return;const l=t.width,c=t.height,a=window.devicePixelRatio||1,g=i.boxWidth/2,T=i.boxHeight/2,v=(r,f)=>[(r+g)/i.boxWidth*l,c-(f+T)/i.boxHeight*c];n.clearRect(0,0,l,c),n.strokeStyle=s.gridA,n.lineWidth=1;for(let r=1;r<10;r+=1){const f=l*r/10,p=c*r/10;n.beginPath(),n.moveTo(f,0),n.lineTo(f,c),n.stroke(),n.beginPath(),n.moveTo(0,p),n.lineTo(l,p),n.stroke()}const[b]=v(-2,0),[x]=v(2,0);st(n,{leftX:b,rightX:x,height:c,dpr:a});const w=Math.max(.8,o.pointSize)*a;for(let r=0;r<e.numParticles;r+=1){const[f,p]=v(e.x[r],e.y[r]);n.fillStyle=e.types[r]===0?D.ionA:D.ionB,n.beginPath(),n.arc(f,p,w,0,Math.PI*2),n.fill()}n.fillStyle=s.ink,n.font=`${12*a}px Avenir Next, Segoe UI, sans-serif`}function ct(t,e,i,o){const s=j();K(t);const n=t.getContext("2d");if(!n)return;const l=t.width,c=t.height,a=window.devicePixelRatio||1;n.clearRect(0,0,l,c);const g=36*a,T=10*a,v=18*a,b=18*a,x=Math.max(1,l-g-T),w=Math.max(1,c-v-b),r=Math.max(0,i-o);let f=1;for(let d=0;d<e.times.length;d+=1)e.times[d]>=r&&(f=Math.max(f,Math.abs(e.values[d])));const p=Math.max(1,f*1.15),H=d=>g+(d-r)/Math.max(1,o)*x,C=d=>v+(1-(d+p)/(2*p))*w;n.strokeStyle=s.gridB,n.lineWidth=1*a,n.strokeRect(g,v,x,w),n.beginPath(),n.moveTo(g,C(0)),n.lineTo(g+x,C(0)),n.stroke(),n.save(),n.fillStyle=s.ink,n.font=`${11*a}px Avenir Next, Segoe UI, sans-serif`,n.translate(12*a,v+w/2),n.rotate(-Math.PI/2),n.textAlign="center",n.fillText("Net Charge Difference = Net Charge Right - Net Charge Left",0,0),n.restore(),n.strokeStyle=D.totalTrace,n.lineWidth=1.8*a,n.beginPath();let P=!1;for(let d=0;d<e.times.length;d+=1){if(e.times[d]<r)continue;const X=H(e.times[d]),_=C(e.values[d]);P?n.lineTo(X,_):(n.moveTo(X,_),P=!0)}P&&n.stroke(),n.fillStyle=s.ink}const ht=m("#app");ht.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">← Back</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>
    <header class="page-head">
      
      <h1>Voltage as Charge Separation</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>Membrane potential is the net charge difference across the membrane.</li>
        <li>More positive charge on one side = positive voltage on that side.</li>
        <li>Equal charges on both sides = zero voltage.</li>
        <li>Voltage is a property of the imbalance, not the absolute number of ions.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>What combination gives the largest positive voltage?</li>
        <li>Can you produce a negative voltage?</li>
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
              <div class="field"><label for="pos-left">Positive ions on left</label><input id="pos-left" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="pos-right">Positive ions on right</label><input id="pos-right" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="neg-left">Negative ions on left</label><input id="neg-left" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="neg-right">Negative ions on right</label><input id="neg-right" type="number" min="0" max="5000" step="1" /></div>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <canvas id="particle-canvas"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas"></canvas>
          </div>
        </div>
      </section>
    </div>
  </div>
`;const dt=m("#particle-canvas"),ut=m("#trace-canvas"),M={posLeft:m("#pos-left"),posRight:m("#pos-right"),negLeft:m("#neg-left"),negRight:m("#neg-right")},I={togglePlay:m("#toggle-play"),rerun:m("#rerun"),resetDefaults:m("#reset-defaults")};let u={...B},S={...G},J=new q(1),h=O(u),E={times:[0],values:[A(h)]},W=!0,z=performance.now(),k=0;function U(){N(M.posLeft,u.posLeft,0),N(M.posRight,u.posRight,0),N(M.negLeft,u.negLeft,0),N(M.negRight,u.negRight,0)}function V(){return lt({...u,posLeft:Number(M.posLeft.value)||0,posRight:Number(M.posRight.value)||0,negLeft:Number(M.negLeft.value)||0,negRight:Number(M.negRight.value)||0,diffusionSd:B.diffusionSd})}function Y(){u=V(),J=new q(1),h=O(u),E={times:[0],values:[A(h)]},k=0,U()}function gt(){const t=V(),e=h.simTime,i=h.stepCount;u=t,h=O(u),h.simTime=e,h.stepCount=i,Q(E,A(h),h.simTime,S.traceWindowMs),U()}function R(){rt(dt,h,u,S),ct(ut,E,h.simTime,S.traceWindowMs)}U();R();I.togglePlay.addEventListener("click",()=>{W=!W,I.togglePlay.textContent=W?"Pause":"Play"});I.rerun.addEventListener("click",()=>{Y(),R()});I.resetDefaults.addEventListener("click",()=>{u={...B},S={...G},Y(),W=!0,I.togglePlay.textContent="Pause",R()});for(const t of Object.values(M))t.addEventListener("change",()=>{gt(),R()});window.addEventListener("resize",()=>R());it(m("#theme-toggle"));function Z(t){const e=Math.max(0,(t-z)/1e3);if(z=t,W){k+=e*S.targetFps*S.playbackSpeed;const i=Math.min(120,Math.floor(k));if(i>0){k-=i;for(let o=0;o<i;o+=1)at(h,u,J),Q(E,A(h),h.simTime,S.traceWindowMs)}}R(),requestAnimationFrame(Z)}requestAnimationFrame(t=>{z=t,Z(t)});
