"""
This script demonstrates how to use a state machine in which
transitions between states are triggered by moving the mouse
to specific locations on the screen.

We create two "zones":
- a LEFT zone that moves you back one state
- a RIGHT zone that moves you forward one state

We use a small amount of logic to ensure that a transition
happens only when the mouse ENTERS a zone (rather than
transitioning continuously while the mouse remains there).
"""

import pygame

# Initialize Pygame
pygame.init()

# Set up the display
screen = pygame.display.set_mode((640, 480))

clock = pygame.time.Clock()

# define an initial state
state_init = 0

# set the current state to the initial state
state_current = state_init

# keep track of the previous state so that we can detect when
# a new state has been entered (useful for printing messages
# only once per state entry)
state_prev = None

# define rectangles for mouse-trigger zones
rect_left = pygame.Rect(40, 190, 160, 100)
rect_right = pygame.Rect(440, 190, 160, 100)

# keep track of whether the mouse was inside a zone on the
# previous frame so that we can detect zone entry
in_zone_prev = False

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    clock.tick()

    # if we have just entered a new state, print a message
    if state_current != state_prev:
        print("Entered state: ", state_current)
        state_prev = state_current

    # draw the two trigger zones (just for demonstration)
    screen.fill((0, 0, 0))
    pygame.draw.rect(screen, (255, 255, 255), rect_left, 2)
    pygame.draw.rect(screen, (255, 255, 255), rect_right, 2)
    pygame.display.flip()

    # Get the current mouse position
    mouse_pos = pygame.mouse.get_pos()

    # Determine whether mouse is inside either zone
    in_left = rect_left.collidepoint(mouse_pos)
    in_right = rect_right.collidepoint(mouse_pos)
    in_zone = in_left or in_right

    # Trigger a transition only when the mouse ENTERS a zone
    if in_zone and (not in_zone_prev):

        # go back one state when entering left zone
        if in_left:
            state_current -= 1
            if state_current < 0:
                state_current = 2

        # go forward one state when entering right zone
        if in_right:
            state_current += 1
            if state_current > 2:
                state_current = 0

    # update the "previous frame" zone status
    in_zone_prev = in_zone

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False

# Quit Pygame
pygame.quit()

