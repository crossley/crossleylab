"""
This script shows how to use pygame to collect and process
keyboard button presses.
"""

import pygame

pygame.init()

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False
            # Otherwise just print the name of the key pressed
            else:
                key_pressed = pygame.key.name(event.key)
                print("Key pressed: ", key_pressed)

# Quit Pygame
pygame.quit()
