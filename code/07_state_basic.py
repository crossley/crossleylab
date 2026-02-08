"""
This script demonstrates the basic layout and logic of using
a state-machine to implement a simple game or experiment.
We define only two states -- state 0 and state 1 -- and
transition between them by counting steps and moving from
state to the other after a certain amount of steps (i.e.,
iterations through a while loop) have occurred.
"""

# initial state
state_init = 0

# specify a maximum amount of time (or step counts in this
# case) for each state. These will be large numbers because 
# each step represents a single iteration through the while
# loop below, and these iterations will be very fast.
count_max_state_0 = 1e7
count_max_state_1 = 2e7

# specify a maximum amount o time (step count in this case)
# for the entire experiment
count_max_exp = 6e7

# set the current state to the initial state
state_current = state_init

# we will use `counter_state` to keep track of how long we
# have been in a particular state.
counter_state = 0

# we will use `counter_exp` to keep track of how long we
# have been the running the entire experiment.
counter_exp = 0

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    counter_exp += 1

    # implement things you want to happen when
    # `state_current==0`.
    if state_current == 0:

        # we update `counter_state` on each iteration
        # through the experiment loop to keep track of how
        # long -- or rather, how many iterations -- we have
        # spent in this state
        counter_state += 1

        # TODO: do things here that you want to happen in
        # state 0. E.g., print a statement to the screen
        # portraying how excited you are to be in state 0.
        # Bonus --- make this statement print only once
        # every time this state is entered.

        # we must always implement code that exits the current
        # state under some specific set of conditions
        if counter_state > count_max_state_0:

            print("Exiting state 0 at step: ", counter_state)

            # reset `counter_state` so that we start
            # counting fresh in the next state
            counter_state = 0

            # set `state_current` to the next state you wish
            # to occupy
            state_current = 1

    # implement things you want to happen when
    # `state_current==1`.
    if state_current == 1:

        # same timing / counting logic as above
        counter_state += 1

        # TODO: do things here that you want to happen in
        # state 1. E.g., print a statement to the screen
        # protraying how bored you are in state 1 and how
        # you can't wait to get back to state 0.
        # Bonus --- make this statement print only once
        # every time this state is entered.

        # implement state-transition logic
        if counter_state > count_max_state_1:

            print("Exiting state 1 at step: ", counter_state)

            # reset `counter_state` so that we start
            # counting fresh in the next state
            counter_state = 0

            # set `state_current` to the next state you wish
            # to occupy
            state_current = 0

    # implement exp-wide stopping rule
    if counter_exp > count_max_exp:
        print("Finished Experiment!")
        keep_running = False
