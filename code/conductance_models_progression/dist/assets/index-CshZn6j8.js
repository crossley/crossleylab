import{a,i as n}from"./theme-QM3r6btK.js";const s=[{id:"inspect_passive_k",title:"Passive Potassium Dynamics",description:"A single passive potassium current relaxes the membrane back toward E_K after current injection.",htmlPath:"inspect_passive_k.html",tsEntry:"src/pages/inspect_passive_k.ts",arc:"conductance_models",status:"active"},{id:"inspect_passive_two_ion",title:"Passive Na + K Dynamics",description:"Constant Na and K conductances pull voltage toward a weighted balance between E_Na and E_K.",htmlPath:"inspect_passive_two_ion.html",tsEntry:"src/pages/inspect_passive_two_ion.ts",arc:"conductance_models",status:"active"},{id:"inspect_smooth_na_conductance",title:"Smooth Voltage-Dependent Na Conductance",description:"Na conductance rises smoothly with depolarization, sharpening the response to stronger inputs.",htmlPath:"inspect_smooth_na_conductance.html",tsEntry:"src/pages/inspect_smooth_na_conductance.ts",arc:"conductance_models",status:"active"},{id:"inspect_active_na_conductance",title:"Na Activation + Inactivation",description:"Sodium activation m and inactivation h create a transient inward current during sustained stimulation.",htmlPath:"inspect_active_na_conductance.html",tsEntry:"src/pages/inspect_active_na_conductance.ts",arc:"conductance_models",status:"active"},{id:"inspect_active_na_k_conductance",title:"Active Na + K Conductance",description:"Add delayed potassium activation n to create a more spike-like interaction between inward and outward currents.",htmlPath:"inspect_active_na_k_conductance.html",tsEntry:"src/pages/inspect_active_na_k_conductance.ts",arc:"conductance_models",status:"active"},{id:"inspect_active_na_k_leak_conductance",title:"Na + K + Leak Conductance",description:"A simplified Hodgkin-Huxley-style model with Na, K, and leak conductances produces full action-potential dynamics.",htmlPath:"inspect_active_na_k_leak_conductance.html",tsEntry:"src/pages/inspect_active_na_k_leak_conductance.ts",arc:"conductance_models",status:"active"}],i=s;a();const e=document.querySelector("#app");if(!e)throw new Error("Missing #app root");const c=i.filter(t=>t.status==="active").map(t=>`
      <a class="link-card ready" href="./${t.htmlPath}">
        <strong>${t.title}</strong>
        <span>${t.description}</span>
      </a>`).join("");e.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>

    <header class="page-head">
      <p class="teaching-label">COGS3020 Week 06</p>
      <h1 class="landing-title">Conductance Models Progression</h1>
      <p class="eyebrow">
        A browser-based progression from passive membrane dynamics to a simplified
        Hodgkin-Huxley-style action potential. Each lesson keeps the same Euler-method
        simulation frame while adding one new biophysical idea.
      </p>
      <ul class="key-points">
        <li>Start with a single passive potassium current and external input.</li>
        <li>Add sodium, then voltage-dependent sodium activation, then sodium inactivation.</li>
        <li>Finish with delayed potassium activation and leak current to recover full spike dynamics.</li>
      </ul>
    </header>

    <section class="panel lesson-group">
      <h2 class="section-title">Arc 1 — From Passive Membranes to Spiking Conductances</h2>
      <p class="arc-description">
        The model family is intentionally pedagogical. Each page mirrors the Week 06 lecture
        progression and preserves its simplified assumptions rather than jumping straight to a
        fully canonical Hodgkin-Huxley implementation.
      </p>
      <div class="link-list">${c}</div>
    </section>
  </div>
`;n(document.querySelector("#theme-toggle"));
