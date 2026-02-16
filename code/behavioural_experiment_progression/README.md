# State-Driven Experimental Control: Progressive Python Examples

This repository provides a sequence of Python examples
demonstrating how behavioural experiments can be constructed
progressively from basic interactive programs to complete
experimental tasks using a state-driven representation of
experimental control. The files are intended to be read and
executed in order, with each script introducing a small
number of new concepts while retaining the structure
established in earlier examples. Beginning with stimulus
presentation and a continuous experiment loop, the
progression introduces timing, measurement of participant
actions, and explicit control of experimental behaviour
through task states and transition conditions, showing how
complete experimental paradigms emerge naturally from this
structure.

## Accompanying Paper

This repository accompanies the following paper:

*[paper title]*

This paper describes a conceptual framework for representing
behavioural experiments in terms of states and transitions.
The code in this repository provides concrete
implementations of that framework in Python.

The repository therefore serves two purposes:

1. **Pedagogical** — demonstrating how behavioural
   experiments can be built from first principles.

2. **Conceptual** — illustrating the state-driven framework
   for experimental control described in the accompanying
   paper.

---

## Overall Progression

The examples follow a consistent progression:

1. **Stimulus and display**

   * drawing stimuli
   * maintaining a continuous experiment loop

2. **Measurement**

   * measuring elapsed time
   * measuring key press actions
   * measuring mouse movements

3. **State-driven control**

   * introducing explicit task states
   * implementing transitions based on time and events

4. **Complete experiments**

   * reaction time tasks
   * category learning paradigms
   * reaching tasks with continuous movement

---

## File-by-File Overview

### Foundations: Stimulus, Timing, and Input

**01_stimulus_basic.py**
Introduces the experiment loop and stimulus rendering using
pygame.

**02_timing_clocks.py**
Introduces elapsed time measurement and time-based control
of behaviour.

**03_input_keyboard.py**
Detects and processes keyboard events within the experiment
loop.

**04_input_response_time.py**
Combines timing and input to measure response latency.

**05_input_mouse_tracking.py**
Introduces continuous input through mouse tracking.

**06_input_mouse_hide_cursor.py**
Demonstrates custom cursor rendering and continuous visual
updating.

---

### Introducing State-Based Control

**07_state_basic.py**
Introduces explicit task states and transitions between
states.

**08_state_timed_transitions.py**
Transitions driven by elapsed time.

**09_state_keyboard_transitions.py**
Transitions triggered by discrete input events.

**10_state_mouse_transitions.py**
Transitions based on continuously evaluated input
conditions.

These scripts introduce the representation of experimental
behaviour as states together with rules governing
transitions between them.

---

### Complete Experimental Tasks

**11_experiment_action_selection.py**
A minimal complete experiment including stimulus
presentation, response collection, feedback, and
inter-trial structure.

**12_experiment_category_learning.py**
A category learning task with transitions dependent on
trial-specific variables and response correctness.

**13_experiment_reaching.py**
A movement-based experiment in which transitions depend on
continuously evaluated spatial conditions.

---

### Advanced Stimulus Examples

**advanced_stimulus_gratings.py**
**advanced_stimulus_gratings_numpy.py**
**advanced_grating_space.py**

Examples demonstrating more advanced stimulus generation
using NumPy.

---

## Citation

If you use this repository in academic work, please cite:

* *[paper citation]*
* *[Zenodo DOI once released]*

---

## License

MIT License.

