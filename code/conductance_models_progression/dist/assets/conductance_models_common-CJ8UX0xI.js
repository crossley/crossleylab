import{a as ee,i as te}from"./theme-QM3r6btK.js";const W={T:1e4,dt:1,KIn:140,KOut:5,NaIn:15,NaOut:145,tau:10,gK:.3,gNa:.1,gKMax:10,gNaMax:15,gL:.1,EL:-65,vHalfNa:-40,slopeNa:6,pulseWidthFrac:1/3,pulseStartFrac:1/3},G=["#ff6f8f","#42c8ff","#9fff6a","#ffd166","#c792ff","#ff9f43","#5eead4"],E=176,H=880,ne=1e4,j=[{id:"input",title:"External Input",yLabel:"Input",seriesForTrace:e=>({label:"I_ext",color:"#ff9f43",values:e.input})},{id:"voltage",title:"Membrane Potential",yLabel:"mV",seriesForTrace:e=>({label:"V",color:"#42c8ff",values:e.voltage})},{id:"ik",title:"Potassium Current",yLabel:"Current",seriesForTrace:e=>({label:"I_K",color:"#9fff6a",values:e.IK})},{id:"ina",title:"Sodium Current",yLabel:"Current",seriesForTrace:e=>({label:"I_Na",color:"#ff6f8f",values:e.INa})},{id:"il",title:"Leak Current",yLabel:"Current",seriesForTrace:e=>({label:"I_L",color:"#ffd166",values:e.IL})},{id:"gk",title:"Potassium Conductance",yLabel:"g",seriesForTrace:e=>({label:"g_K",color:"#9fff6a",values:e.gK})},{id:"gna",title:"Sodium Conductance",yLabel:"g",seriesForTrace:e=>({label:"g_Na",color:"#ff6f8f",values:e.gNa})},{id:"m",title:"Na Activation Gate",yLabel:"m",seriesForTrace:e=>({label:"m",color:"#f472b6",values:e.m})},{id:"h",title:"Na Inactivation Gate",yLabel:"h",seriesForTrace:e=>({label:"h",color:"#60a5fa",values:e.h})},{id:"n",title:"K Activation Gate",yLabel:"n",seriesForTrace:e=>({label:"n",color:"#34d399",values:e.n})}],P={passive_k:{plotIds:["input","voltage","ik"]},passive_two_ion:{plotIds:["input","voltage","ik","ina"]},smooth_na:{plotIds:["input","voltage","ik","ina","gna"]},active_na:{plotIds:["input","voltage","ik","ina","gna","m","h"]},active_na_k:{plotIds:["input","voltage","ik","ina","gk","gna","m","h","n"]},active_na_k_leak:{plotIds:["input","voltage","ik","ina","il","gk","gna","m","h","n"]}};function A(e,t,a){return Math.min(a,Math.max(t,e))}function N(e,t=2){return Number.isInteger(e)?String(e):e.toFixed(t)}function Q(e){return Math.log10(Math.max(e,Number.EPSILON))}function U(e,t,a){return 1/(1+Math.exp(-(e-t)/a))}function O(e){const t=e+40,a=1-Math.exp(-t/10);return Math.abs(a)<1e-6?1:.1*t/a}function X(e){return 4*Math.exp(-(e+65)/18)}function R(e){return .07*Math.exp(-(e+65)/20)}function Y(e){return 1/(1+Math.exp(-(e+35)/10))}function B(e){const t=e+55,a=1-Math.exp(-t/10);return Math.abs(a)<1e-6?.1:.01*t/a}function z(e){return .125*Math.exp(-(e+65)/80)}function ae(e){return(e.gK*C(e)+e.gNa*q(e))/(e.gK+e.gNa)}function C(e){return 61*Q(e.KOut/e.KIn)}function q(e){return 61*Q(e.NaOut/e.NaIn)}function le(e,t,a){const l=e.length,r=new Array(l).fill(0),c=Math.floor(l*a.pulseStartFrac),o=Math.floor(l*a.pulseWidthFrac),f=Math.min(l,c+o);for(let n=c;n<f;n+=1)r[n]=t;return r}function oe(e,t){const a=C(e),l=q(e);if(t==="passive_k")return a;if(t==="passive_two_ion")return ae(e);if(t==="smooth_na"){const r=e.gNaMax*U(-65,e.vHalfNa,e.slopeNa);return(e.gK*a+r*l)/(e.gK+r)}return-65}function se(e,t,a){const l=Math.max(2,Math.floor(e.T/e.dt)),r=Array.from({length:l},(b,g)=>g*e.dt),c=le(r,a,e),o=new Array(l).fill(0),f=new Array(l).fill(0),n=new Array(l).fill(0),u=new Array(l).fill(0),h=new Array(l).fill(0),i=new Array(l).fill(0),s=new Array(l).fill(0),d=new Array(l).fill(1),p=new Array(l).fill(0);return o[0]=oe(e,t),(t==="active_na"||t==="active_na_k"||t==="active_na_k_leak")&&(s[0]=O(o[0])/(O(o[0])+X(o[0])),d[0]=R(o[0])/(R(o[0])+Y(o[0]))),(t==="active_na_k"||t==="active_na_k_leak")&&(p[0]=B(o[0])/(B(o[0])+z(o[0]))),{amplitude:a,params:{...e},modelKind:t,totalSteps:l,currentStep:1,time:r,input:c,voltage:o,IK:f,INa:n,IL:u,gK:h,gNa:i,m:s,h:d,n:p}}function ie(e){return e==="passive_k"||e==="passive_two_ion"?.25:.05}function J(e){if(e.currentStep>=e.totalSteps)return!1;const{params:t,modelKind:a}=e,l=e.currentStep,r=C(t),c=q(t),o=Math.max(1,Math.ceil(t.dt/ie(a))),f=t.dt/o;let n=e.voltage[l-1],u=e.m[l-1],h=e.h[l-1],i=e.n[l-1],s=0,d=0,p=0,b=0,g=0;for(let y=0;y<o;y+=1){const M=e.input[l-1];if(a==="passive_k"){s=(r-n)/t.tau,b=1/t.tau,n=n+(s+M)*f;continue}if(a==="passive_two_ion"){s=t.gK*(r-n),d=t.gNa*(c-n),b=t.gK,g=t.gNa,n=n+(s+d+M)*f;continue}if(a==="smooth_na"){g=t.gNaMax*U(n,t.vHalfNa,t.slopeNa),b=t.gK,s=t.gK*(r-n),d=g*(c-n),n=n+(s+d+M)*f;continue}const $=O(n),S=X(n),I=R(n),_=Y(n),x=1/($+S),k=1/(I+_),w=$*x,L=I*k;if(u=u+(w-u)/x*f,h=h+(L-h)/k*f,a==="active_na"){g=t.gNaMax*u**3*h,b=t.gK,s=t.gK*(r-n),d=g*(c-n),n=n+(s+d+M)*f;continue}const m=B(n),v=z(n),T=1/(m+v),K=m*T;if(i=i+(K-i)/T*f,g=t.gNaMax*u**3*h,b=t.gKMax*i**4,a==="active_na_k"){s=b*(r-n),d=g*(c-n),n=n+(s+d+M)*f;continue}s=b*(n-r),d=g*(n-c),p=t.gL*(n-t.EL),n=n+(-(s+d+p)+M)*f}return e.voltage[l]=n,e.IK[l]=s,e.INa[l]=d,e.IL[l]=p,e.gK[l]=b,e.gNa[l]=g,e.m[l]=u,e.h[l]=h,e.n[l]=i,e.currentStep+=1,!0}function Z(e){const t=Math.max(1,e.currentStep);return{time:e.time.slice(0,t),input:e.input.slice(0,t),voltage:e.voltage.slice(0,t),IK:e.IK.slice(0,t),INa:e.INa.slice(0,t),IL:e.IL.slice(0,t),gK:e.gK.slice(0,t),gNa:e.gNa.slice(0,t),m:e.m.slice(0,t),h:e.h.slice(0,t),n:e.n.slice(0,t),amplitude:e.amplitude}}function V(e,t,a){return a.map(l=>se(e,t,l))}function re(e,t,a,l,r,c){const o={top:16,right:16,bottom:28,left:54},f=H-o.left-o.right,n=E-o.top-o.bottom,u=e.flatMap(m=>m.values),h=c?c.min:Math.min(...u),i=c?c.max:Math.max(...u),s=i===h?Math.max(1,Math.abs(i)*.2||1):(i-h)*.12,d=h-s,p=i+s,b=0,g=Math.max(r,t[t.length-1]??0,1),y=m=>o.left+(m-b)/Math.max(1e-9,g-b)*f,M=m=>o.top+n-(m-d)/Math.max(1e-9,p-d)*n,$=Array.from({length:4},(m,v)=>d+(p-d)*v/3),S=Array.from({length:5},(m,v)=>b+(g-b)*v/4),I=e.map(m=>`<path d="${m.values.map((T,K)=>`${K===0?"M":"L"} ${y(t[K]).toFixed(2)} ${M(T).toFixed(2)}`).join(" ")}" fill="none" stroke="${m.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />`).join(""),_=$.map(m=>{const v=M(m).toFixed(2);return`<g>
        <line x1="${o.left}" x2="${H-o.right}" y1="${v}" y2="${v}" class="plot-gridline" />
        <text x="${o.left-8}" y="${Number(v)+4}" class="plot-axis">${N(m,1)}</text>
      </g>`}).join(""),x=S.map(m=>{const v=y(m).toFixed(2);return`<g>
        <line x1="${v}" x2="${v}" y1="${o.top}" y2="${o.top+n}" class="plot-gridline plot-gridline-vert" />
        <text x="${v}" y="${E-8}" text-anchor="middle" class="plot-axis">${N(m,0)}</text>
      </g>`}).join(""),k=e.map((m,v)=>`<g transform="translate(${o.left+v*138}, 14)">
          <line x1="0" x2="16" y1="0" y2="0" stroke="${m.color}" stroke-width="3" />
          <text x="22" y="4" class="plot-legend">${m.label}</text>
        </g>`).join(""),w=t[t.length-1]??0,L=y(w).toFixed(2);return`
    <div class="plot-card">
      <div class="subhead">
        <h3>${a}</h3>
        <span class="tiny">${l}</span>
      </div>
      <svg class="plot-svg" viewBox="0 0 ${H} ${E}" role="img" aria-label="${a}">
        <rect x="${o.left}" y="${o.top}" width="${f}" height="${n}" class="plot-frame"></rect>
        ${_}
        ${x}
        ${I}
        <line x1="${L}" x2="${L}" y1="${o.top}" y2="${o.top+n}" class="plot-cursor" />
        ${k}
        <text x="${o.left}" y="${E-8}" class="plot-axis-label">Time (ms)</text>
        <text x="16" y="${o.top+16}" class="plot-axis-label">${l}</text>
      </svg>
    </div>`}function ce(e){return e.replace(/\n/g,"<br />")}function ue(e){return e.replace(/"/g,"&quot;")}function de(e){return P[e.modelKind].plotIds.map(a=>j.find(l=>l.id===a)).filter(a=>!!a).map(a=>`<div data-plot-id="${a.id}"></div>`).join("")}function pe(e){return e.controls.map(t=>{const a=t.digits??2;return`
        <div class="field">
          <label for="${t.key}">${t.label}</label>
          <input
            id="${t.key}"
            data-control-key="${t.key}"
            type="number"
            min="${t.min}"
            max="${t.max}"
            step="${t.step}"
            data-digits="${a}"
          />
        </div>
        ${t.help?`<p class="field-help">${t.help}</p>`:""}`}).join("")}function me(e){return e.map(t=>`
        <li>
          ${t.prompt}
          <details>
            <summary>Show answer</summary>
            <div class="answer-body"><p>${t.answer}</p></div>
          </details>
        </li>`).join("")}function fe(e){const t=e.pulseAmplitudes.map((a,l)=>`<option value="${l}">${N(a,3)}</option>`).join("");return`
    <div class="site-shell">
      <div class="nav-line">
        <a href="./">← Back to lessons</a>
        <div class="spacer"></div>
        <button id="theme-toggle" class="theme-btn">☀</button>
      </div>

      <header class="page-head">
        <p class="teaching-label">COGS3020 Week 06</p>
        <h1 class="landing-title">${e.title}</h1>
        <p class="eyebrow">${e.eyebrow}</p>
      </header>

      <section class="panel lesson-group">
        <h2 class="section-title">Conceptual Frame</h2>
        <div class="guide-step">
          <p>${e.intro}</p>
          <p><strong>What changed from the previous page?</strong> ${e.previousStep}</p>
        </div>
      </section>

      <section class="panel lesson-group">
        <h2 class="section-title">${e.equationLabel}</h2>
        <div class="equation-card">
          <pre class="equation">${ce(e.equation)}</pre>
        </div>
      </section>

      <section class="sim-layout">
        <div class="controls">
          <div class="panel">
            <div class="group">
              <p class="group-label">Simulation Controls</p>
              <div class="control-grid">
                ${pe(e)}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="group">
              <p class="group-label">Playback</p>
              <div class="field">
                <label for="focus-trace">Highlighted pulse amplitude</label>
                <select id="focus-trace">${t}</select>
              </div>
              <label class="checkbox-field">
                <input id="overlay-traces" type="checkbox" checked />
                <span>Run and show all predefined pulse amplitudes together</span>
              </label>
              <div class="field">
                <label for="playback-speed">Playback speed</label>
                <select id="playback-speed">
                  <option value="0.5">0.5×</option>
                  <option value="1" selected>1×</option>
                  <option value="2">2×</option>
                  <option value="4">4×</option>
                  <option value="8">8×</option>
                </select>
              </div>
              <div class="button-row">
                <button id="run-btn" class="primary">Start simulation</button>
                <button id="pause-btn">Pause</button>
                <button id="reset-btn">Reset defaults</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="group">
              <p class="group-label">Reference Values</p>
              <dl id="metrics" class="status-list"></dl>
            </div>
          </div>
        </div>

        <div class="canvas-panel">
          ${de(e)}
        </div>
      </section>

      <section class="panel lesson-group">
        <h2 class="section-title">Guided Questions</h2>
        <ol class="guided-questions">
          ${me(e.questions)}
        </ol>
      </section>
    </div>`}function ve(e,t){const a={...t};for(const l of e){const r=l.dataset.controlKey;if(!r)continue;const c=Number(l.value);Number.isFinite(c)&&(a[r]=c)}return a}function D(e,t){for(const a of e){const l=a.dataset.controlKey;if(!l)continue;const r=Number(a.dataset.digits??"2");a.value=N(t[l],r)}}function he(e,t){const a=t.voltage[t.voltage.length-1],l=Math.max(...t.voltage);return`
    <dt>E_K</dt><dd>${N(C(e),2)} mV</dd>
    <dt>E_Na</dt><dd>${N(q(e),2)} mV</dd>
    <dt>Current V</dt><dd>${N(a,2)} mV</dd>
    <dt>Peak V</dt><dd>${N(l,2)} mV</dd>
    <dt>Pulse</dt><dd>${N(t.amplitude,3)}</dd>
    <dt>Sim time</dt><dd>${N(t.time[t.time.length-1]??0,1)} ms</dd>`}function ge(e,t,a,l,r,c,o){P[t.modelKind].plotIds.map(n=>j.find(u=>u.id===n)).filter(n=>!!n).forEach((n,u)=>{const i=(r?a:[a[l]]).map((s,d)=>{const p=n.seriesForTrace(s);return p?{label:r?`${p.label} · pulse ${N(s.amplitude,3)}`:p.label,color:r?G[d%G.length]:p.color,values:p.values}:null}).filter(s=>!!s);e[u].innerHTML=re(i,a[l].time,n.title,n.yLabel,c,o.get(n.id))})}function be(e){return{amplitude:e.amplitude,params:{...e.params},modelKind:e.modelKind,totalSteps:e.totalSteps,currentStep:e.currentStep,time:[...e.time],input:[...e.input],voltage:[...e.voltage],IK:[...e.IK],INa:[...e.INa],IL:[...e.IL],gK:[...e.gK],gNa:[...e.gNa],m:[...e.m],h:[...e.h],n:[...e.n]}}function F(e,t,a,l){const r=t.map(u=>be(u));for(const u of r)for(;J(u););const c=r.map(u=>Z(u)),o=a?c:[c[l]],f=P[e.modelKind].plotIds.map(u=>j.find(h=>h.id===u)).filter(u=>!!u),n=new Map;for(const u of f){const h=o.map(p=>u.seriesForTrace(p)).filter(p=>!!p).flatMap(p=>p.values),i=Math.min(...h),s=Math.max(...h),d=s===i?Math.max(1,Math.abs(s)*.2||1):(s-i)*.12;n.set(u.id,{min:i-d,max:s+d})}return n}function ye(e){ee();const t=document.querySelector("#app");if(!t)throw new Error("Missing #app root");t.innerHTML=fe(e),te(document.querySelector("#theme-toggle"));const a=Array.from(document.querySelectorAll("input[data-control-key]")),l=P[e.modelKind].plotIds.map(x=>document.querySelector(`[data-plot-id="${ue(x)}"]`)),r=document.querySelector("#metrics"),c=document.querySelector("#focus-trace"),o=document.querySelector("#overlay-traces"),f=document.querySelector("#playback-speed"),n=document.querySelector("#run-btn"),u=document.querySelector("#pause-btn"),h=document.querySelector("#reset-btn");let i={...W,...e.defaultParams??{}},s=V(i,e.modelKind,e.pulseAmplitudes),d=0,p=0,b=0,g=!1,y=new Map;D(a,i);const M=()=>s.map(x=>Z(x)),$=()=>{const x=M(),k=A(Number(c.value),0,x.length-1);ge(l,e,x,k,o.checked,i.T,y),r.innerHTML=he(i,x[k])},S=()=>{d&&cancelAnimationFrame(d),d=0,g=!1,p=0,b=0,n.textContent="Resume simulation"},I=()=>{i=ve(a,i),s=V(i,e.modelKind,e.pulseAmplitudes),y=F(e,s,o.checked,A(Number(c.value),0,s.length-1)),$()},_=x=>{if(!g)return;p===0&&(p=x);const k=x-p;p=x;const w=Number(f.value)||1,L=i.T/ne*w;b+=k*L;let m=!1;for(;b>=i.dt;){b-=i.dt;let v=!1;const T=o.checked?s:[s[A(Number(c.value),0,s.length-1)]];for(const K of T)v=J(K)||v;if(m=m||v,!v){S();break}}m&&$(),g&&(d=requestAnimationFrame(_))};n.addEventListener("click",()=>{s.every(k=>k.currentStep>=k.totalSteps)&&I(),!g&&(g=!0,n.textContent="Running...",d=requestAnimationFrame(_))}),u.addEventListener("click",()=>{S(),$()}),c.addEventListener("change",()=>{y=F(e,s,o.checked,A(Number(c.value),0,s.length-1)),$()}),o.addEventListener("change",()=>{y=F(e,s,o.checked,A(Number(c.value),0,s.length-1)),$()}),f.addEventListener("change",$),a.forEach(x=>x.addEventListener("change",()=>{S(),I()})),h.addEventListener("click",()=>{S(),i={...W,...e.defaultParams??{}},D(a,i),c.value="0",o.checked=!0,f.value="1",s=V(i,e.modelKind,e.pulseAmplitudes),y=F(e,s,o.checked,0),n.textContent="Start simulation",$()}),y=F(e,s,o.checked,0),$()}export{ye as r};
