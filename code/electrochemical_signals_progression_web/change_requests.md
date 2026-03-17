Below I give ubllets to add / revise. Please make the
requested changes but revise my wording to be clear and
concise. 

# Free Diffusion

Add the following bullets to the top of the page

- Diffusion SD controls the standard deviation of the random
  movement at each time step. 

- Try a few different values of Diffusion SD to get a feel.

# Diffusion Through a Membrane Pore

Add:

- Try a few different values of Diffusion SD. What does it
  do the rate of equilibrium approach? 

- What does Channel width do the rate equilibrium is
  reached?

# Pore Permeability

Add:

- Play with Diffusion SD and pore widths to control how
  quickly each system approaches equilibrium.

- You ought to see that the larger you makek Diffusion SD
  and the wider you make the pore, the faster the system
  reaches equilibrium.

# Selective Permeability

Add:

- Play with Diffusion SD and pore widths to control how
  quickly the concetration of each ion equalises across the
  membrane.

- You ought to see that equal concentration is reached for
  the wider pore but that equal concetration is eventuall
  reached for both. This is equilibrium.

# Selective Permeability by Probabilistic Gating

Replace:

- Ion A and Ion B have the same diffusion dynamics.
- Each ion crosses only through its own pore.
- Higher open probability means higher permeability for that ion.
- Higher permeability leads to faster approach to equilibrium.

with:

- Pore width was really just a teaching tool to understand permeability.
- In mass ensemble pore permeability is just the probability
  that the pore lets an ion trying to cross successful cross
  over.
- Higher open probability means higher permeability for that ion.
- Higher permeability leads to faster approach to equilibrium.
- Play with Ion A pore permeability and Ion B pore permeability to 
  decide for yourself if pore width was a good simplifcation
  or not.

# Free Diffusion with Electrical Attraction

Add:

- Play with the values of each electrical field source until
  you understand the behaviour of attaraction and repulsion.

# What Is a Membrane Potential?

Add:

- Play with the numer of particles of positive or negative
  charge on each side of the membrane. 

- Find a few distinct methods of getting a negative memrbane
  potential. 

- Find a few distinct methods of getting a positive membrane
  potential.

# Nernst Equation (One Ion)

Add:

- Does the Nernst potential depend on Channel permeability?
- Does the Nernst potential depend on Diffusion SD?
- Does the Nernst potential depend on Electric strength?

# Two-Ion Selective Channels

Add:

- Set pore permeabilities so that one is big and the other
  is small. What effect does this have on equilibrium
  concentration gradients?

- Persuade yourself that different permeabilities is
  sufficient for the each ion species to approach equal
  concentration at different rates, it is not sufficient to
  maintin stable concentration gradients. 

# Na/K Pump Establishes Gradients

Add:

- Try a few different values of the NA / K pump. How does it
  effect equilibrium concentration gradients?

- The Na / K pump is an active transporter and it is largely
  how cells maintain their concetration gradients.

# Goldman Equation from Fixed Intracellular Anions (2 ions)

Replace:

- Resting voltage reflects diffusion, field effects, and selective permeability together.
- Resting potential is closer to the Nernst potential of the ion with the higher permeability

With:

- Without a NA / K pump the cell cannot maintain
  concentration gradients. Can you show this using the
  simulation?

- With the Na / K pump operational, the cell maintains
  concetration gradidents. 

- WIth conentration gradients in place, ions flow according
  to their selective channel permability, with more
  permeable ions flowing faster.

- This causes the cells requilibrium potential to align more
  closely with the Nernst potential of the ion species with
  the greatest permeability.

- Find parameter settings that demonstrate all of this.

# Na/K Pump with Many Stochastic Channels

Replace:

- Na+ and K+ pass through many fixed channel locations across the membrane.
- Each channel switches open/closed with Markov dynamics (no voltage gating yet).
- Open-probability targets set average channel availability while diffusion still governs encounters.

With:

- Real neurons have many channels distributed across their membranes.
- Each channel stochastically switches between open and closed states.
- The average open probability of each channel type controls the overall permeability for that ion species
- Diffusion governs how often ions encounter open channels.
- Play with open probabilities to see how they control permeability and how that in turn controls the rate at which the system approaches equilibrium.

# Na/K Pump with Dynamic Charge-Separation Field

Replace:

- Na+ and K+ pass through many fixed channel locations across the membrane.
- Each channel switches open/closed with Markov dynamics (no voltage gating yet).
- Inside vs outside cation imbalance adds a dynamic field term to the immobile-anion field.

With: 

- Up to this point the only source of electric force has
  been the fixed large anions shown on the inide of the cell
  in red. 

- In real neurons the charge imbalance of mobile ions across
  the membrane is another source of electric force.

- That is modelled here. 

# Dynamic Charge-Separation Field + Vm Trace

Replace:

- Na+ and K+ pass through many fixed channel locations across the membrane.
- Each channel switches open/closed with Markov dynamics (no voltage gating yet).
- Inside vs outside cation imbalance adds a dynamic field term to the immobile-anion field.

With: 

- This is the same as the previous simulation but with a Vm
  trace added to the right.

- From here, play with the idea that an action potential is
  a sudden transient increase in the permeability of Na+
  channels, followed by a more gradual  increase in the
  permeability of K+ channels.

- Play with Na and K channel open probabilities to see how
  they control the shape of the Vm trace. Can you get
  anything remotely close to an action potential to happen?

# Voltage-Gated Na/K Channels with External Current

