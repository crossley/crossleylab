import{a as s,i as o}from"./theme-BJJ86vkc.js";const r=[{id:"inspect_diffusion_free",title:"Free Diffusion",description:"Particles spread randomly through an open chamber — no membrane, no forces",htmlPath:"inspect_diffusion_free.html",tsEntry:"src/pages/inspect_diffusion_free.ts",arc:"diffusion",status:"active"},{id:"inspect_diffusion_pore",title:"Diffusion Through a Membrane Pore",description:"A membrane divides the chamber; particles cross only through a single pore",htmlPath:"inspect_diffusion_pore.html",tsEntry:"src/pages/inspect_diffusion_pore.ts",arc:"diffusion",status:"active"},{id:"inspect_diffusion_permeability_rate",title:"Permeability as Probability",description:"The pore geometry is fixed; crossing probability controls how often the channel is open",htmlPath:"inspect_diffusion_selective_permeability_rate.html",tsEntry:"src/pages/inspect_diffusion_selective_permeability_rate.ts",arc:"diffusion",status:"active"},{id:"inspect_diffusion_selective",title:"Selective Permeability",description:"Na⁺ and K⁺ analogs each cross only through their own channel type",htmlPath:"inspect_diffusion_selective.html",tsEntry:"src/pages/inspect_diffusion_selective.ts",arc:"diffusion",status:"active"},{id:"inspect_diffusion_biological_ic",title:"Na⁺ and K⁺ at Biological Concentrations",description:"Start with Na⁺ mostly outside and K⁺ mostly inside — the system returns to equal concentrations. How do real cells maintain these gradients?",htmlPath:"inspect_diffusion_biological_ic.html",tsEntry:"src/pages/inspect_diffusion_biological_ic.ts",arc:"diffusion",status:"draft"},{id:"inspect_field_attraction",title:"Electrical Field Attraction",description:"A single point charge biases particle positions; diffusion and electrical force act in opposition",htmlPath:"inspect_emergent_field_attraction.html",tsEntry:"src/pages/inspect_emergent_field_attraction.ts",arc:"concentration_gradients",status:"active"},{id:"inspect_anions_one_ion",title:"Anions in the Cell",description:"Fixed negative anions inside the cell attract positive ions, creating a biased equilibrium",htmlPath:"inspect_anions_one_ion.html",tsEntry:"src/pages/inspect_anions_one_ion.ts",arc:"concentration_gradients",status:"draft"},{id:"inspect_anions_two_ion",title:"Na⁺ and K⁺ with Anions — Still No Gradient",description:"Adding Na⁺ and K⁺ channels to the anion model: both ions are attracted inside, but the biological gradient is not established",htmlPath:"inspect_emergent_two_ion_selective_channels.html",tsEntry:"src/pages/inspect_emergent_two_ion_selective_channels.ts",arc:"concentration_gradients",status:"active"},{id:"inspect_nak_pump",title:"Na/K Pump",description:"Active transport moves Na⁺ out and K⁺ in against concentration gradients, establishing the biological distribution",htmlPath:"inspect_emergent_nak_pump_gradients.html",tsEntry:"src/pages/inspect_emergent_nak_pump_gradients.ts",arc:"concentration_gradients",status:"active"},{id:"inspect_voltage_concept",title:"Voltage as Charge Separation",description:"No diffusion, no channels — adjust the number of positive and negative ions on each side and watch the membrane potential respond",htmlPath:"inspect_emergent_membrane_potential_intro.html",tsEntry:"src/pages/inspect_emergent_membrane_potential_intro.ts",arc:"resting_potential",status:"active"},{id:"inspect_nernst_one_ion",title:"Nernst Equation",description:"With a maintained concentration gradient, one ion equilibrates at the voltage where diffusion and electrical force exactly balance",htmlPath:"inspect_emergent_nernst_one_ion.html",tsEntry:"src/pages/inspect_emergent_nernst_one_ion.ts",arc:"resting_potential",status:"active"},{id:"inspect_goldman",title:"Goldman Equation",description:"With two ions, the resting potential sits between their Nernst potentials, closest to the most permeable ion",htmlPath:"inspect_emergent_resting_potential_fixed_anions.html",tsEntry:"src/pages/inspect_emergent_resting_potential_fixed_anions.ts",arc:"resting_potential",status:"active"},{id:"inspect_reversal_potential",title:"Reversal Potential",description:"An electrode shifts the membrane potential above or below the Nernst potential — the direction of ion flow reverses. Ion flow is electric current.",htmlPath:"inspect_reversal_potential.html",tsEntry:"src/pages/inspect_reversal_potential.ts",arc:"voltage_and_current",status:"draft"},{id:"inspect_goldman_revisited",title:"Goldman Equation Revisited",description:"With two ions and an electrode, explore how permeability determines which ion’s reversal potential dominates Vₘ",htmlPath:"inspect_goldman_revisited.html",tsEntry:"src/pages/inspect_goldman_revisited.ts",arc:"voltage_and_current",status:"draft"},{id:"inspect_macro_micro_currents",title:"Macro vs Micro Currents",description:"Many channels each stochastically gate open and closed; the macroscopic current is the sum of many microscopic single-channel events",htmlPath:"inspect_emergent_nak_discrete_markov_channels.html",tsEntry:"src/pages/inspect_emergent_nak_discrete_markov_channels.ts",arc:"voltage_and_current",status:"active"},{id:"inspect_voltage_clamp",title:"Voltage Clamp",description:"A feedback circuit holds membrane potential at a commanded value while measuring the resulting current",htmlPath:"inspect_voltage_clamp.html",tsEntry:"src/pages/inspect_voltage_clamp.ts",arc:"voltage_and_current",status:"future"},{id:"inspect_voltage_dependent_conductances",title:"Voltage-Dependent Conductances",description:"Channel open probability depends on membrane potential: Na⁺ channels activate fast and inactivate; K⁺ channels activate slowly and sustain",htmlPath:"inspect_voltage_dependent_conductances.html",tsEntry:"src/pages/inspect_voltage_dependent_conductances.ts",arc:"voltage_and_current",status:"future"},{id:"inspect_action_potential",title:"Action Potential",description:"Voltage-gated Na⁺ and K⁺ channels with HH-style kinetics produce an all-or-nothing spike in response to a depolarising current pulse",htmlPath:"inspect_ap_voltage_gated_current_input.html",tsEntry:"src/pages/inspect_ap_voltage_gated_current_input.ts",arc:"action_potential",status:"rebuild"}],c=r;s();const i=document.querySelector("#app");if(!i)throw new Error("Missing #app root");const l=["diffusion","concentration_gradients","resting_potential","voltage_and_current","action_potential"],d={diffusion:"Arc 1 — Diffusion and the Concentration Gradient Problem",concentration_gradients:"Arc 2 — Electricity and the Concentration Gradient",resting_potential:"Arc 3 — The Resting Potential",voltage_and_current:"Arc 4 — Voltage and Current",action_potential:"Arc 5 — The Action Potential"},p={diffusion:"Particles spread by random Brownian motion. A membrane and selective channels are introduced one step at a time.",concentration_gradients:"Electrical forces combine with diffusion. The Na/K pump establishes the biological ion distributions.",resting_potential:"Charge separation creates a voltage across the membrane. The Nernst and Goldman equations emerge from the simulation.",voltage_and_current:"Channels that open and close stochastically produce measurable currents. Voltage controls gating.",action_potential:"Voltage-gated Na⁺ and K⁺ channels combine to produce an all-or-nothing spike."};function h(t){return t.status==="active"?`
      <a class="link-card ready" href="./${t.htmlPath}">
        <strong>${t.title}</strong>
        <span>${t.description}</span>
      </a>`:t.status==="draft"||t.status==="rebuild"?`
      <div class="link-card draft">
        <strong>${t.title} <em class="badge">Coming soon</em></strong>
        <span>${t.description}</span>
      </div>`:""}const _=l.map(t=>{const e=c.filter(n=>n.arc===t&&n.status!=="future"&&n.status!=="archived");if(e.length===0)return"";const a=e.map(h).join("");return`
      <section class="panel lesson-group">
        <h2 class="section-title">${d[t]}</h2>
        <p class="arc-description">${p[t]}</p>
        <div class="link-list">${a}
        </div>
      </section>`}).join("");i.innerHTML=`
  <div class="site-shell">
    <div class="nav-line">
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>
    <header class="page-head">
      <h1 class="landing-title">Electrochemical Signals in Nerve Cells</h1>
      <p class="eyebrow">A step-by-step journey from Brownian motion through the action potential. Each simulation is interactive — pause, adjust parameters, and explore.</p>
    </header>

    ${_}

    <section class="panel lesson-group">
      <h2 class="section-title">Python Lab Guides</h2>
      <p class="arc-description">Step-by-step worksheets that pair with the Python scripts. Work through these if you are building the simulations yourself rather than just running them.</p>
      <div class="link-list">
        <a class="link-card ready" href="./guide_lesson_01.html">
          <strong>Lesson 1 — Free Diffusion and Euler's Method</strong>
          <span>Write the core position-update rule, discover why the anchor matters, and meet Euler's method</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_02.html">
          <strong>Lesson 2 — Diffusion Through a Membrane Channel</strong>
          <span>Add a wall and a gap; learn boolean arrays and logical indexing to enforce who may cross</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_03.html">
          <strong>Lesson 3 — Permeability as Probability</strong>
          <span>Real channels are open or closed, not partially open — model permeability as a crossing probability and write your first function</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_04.html">
          <strong>Lesson 4 — Selective Permeability</strong>
          <span>Two ion types, two dedicated channels — only Na⁺ can use the Na⁺ gap; introduce type arrays and per-type boolean indexing</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_05.html">
          <strong>Lesson 5 — Electrical Field Attraction</strong>
          <span>Add a deterministic drift term to the random walk and watch diffusion compete with electrical attraction around a fixed charge source</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_06.html">
          <strong>Lesson 6 — Na⁺ and K⁺ with Anions</strong>
          <span>Fixed negative anions attract both ion types inward — explore why anions alone cannot explain the biological concentration gradient</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_07.html">
          <strong>Lesson 7 — Na/K Pump</strong>
          <span>Add active transport to the simulation — the pump moves Na⁺ out and K⁺ in against concentration gradients, maintaining the biological distribution</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_08.html">
          <strong>Lesson 8 — Voltage as Charge Separation</strong>
          <span>Membrane potential is just a charge imbalance — explore the static relationship between ion counts and voltage before adding dynamics</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_09.html">
          <strong>Lesson 9 — Nernst Equation</strong>
          <span>Derive E_K = (RT/zF) ln([K⁺]_out/[K⁺]_in) — the voltage at which diffusion and electrical attraction exactly balance for one ion</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_10.html">
          <strong>Lesson 10 — Goldman Equation</strong>
          <span>With two ions, V_m settles between their Nernst potentials — the most permeable ion wins; derive the Goldman equation and connect it to the action potential</span>
        </a>
        <a class="link-card ready" href="./guide_lesson_11.html">
          <strong>Lesson 11 — Macro vs Micro Currents</strong>
          <span>Individual channels gate stochastically (Markov); smooth macroscopic currents emerge from summing many independent binary switches</span>
        </a>
      </div>
    </section>
  </div>
`;o(document.querySelector("#theme-toggle"));
