'''
This script demonstrates the basic layout and logic of using
a clock to keep track of time in a simple game or experiment.
'''


import pygame

pygame.init()

clock = pygame.time.Clock()
time = 0.0
time_max = 5000

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    # keep track of time
    time += clock.tick()

    # TODO: print the current time to the screen once every second.

    # implement exp-wide stopping rule
    if time > time_max:
        print("Finished Experiment!")
        keep_running = False

pygame.quit()
