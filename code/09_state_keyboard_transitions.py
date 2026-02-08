"""
This script demonstrates how to use a state machine in which
transitions between states are triggered by key presses.

We implement a small set of states (0, 1, 2) and allow the
user to advance (or go back) using the keyboard.

Keys:
- SPACE: advance to next state
- b: go back one state
- r: reset to state 0
- ESC: quit
"""

import pygame

pygame.init()

# define an initial state
state_init = 0

# set the current state to the initial state
state_current = state_init

# keep track of the previous state so that we can detect when
# a new state has been entered (useful for printing messages
# only once per state entry)
state_prev = None

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    # if we have just entered a new state, print a message
    if state_current != state_prev:
        print("Entered state: ", state_current)
        state_prev = state_current

    # implement things you want to happen when
    # `state_current==0`.
    if state_current == 0:

        # TODO: put code here for what should happen in state 0
        # e.g., show instructions, draw a fixation cross, etc.
        pass

    # implement things you want to happen when
    # `state_current==1`.
    if state_current == 1:

        # TODO: put code here for what should happen in state 1
        # e.g., show a stimulus, play a sound, etc.
        pass

    # implement things you want to happen when
    # `state_current==2`.
    if state_current == 2:

        # TODO: put code here for what should happen in state 2
        # e.g., collect a response, provide feedback, etc.
        pass

    # Event handling loop
    for event in pygame.event.get():

        # detect key presses
        if event.type == pygame.KEYDOWN:

            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False

            # reset to state 0
            if event.key == pygame.K_r:
                state_current = 0

            # go to the next state
            if event.key == pygame.K_SPACE:
                state_current += 1
                if state_current > 2:
                    state_current = 0

            # go back one state
            if event.key == pygame.K_b:
                state_current -= 1
                if state_current < 0:
                    state_current = 2

# Quit Pygame
pygame.quit()

