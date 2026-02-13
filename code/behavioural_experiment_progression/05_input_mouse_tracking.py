"""
This script shows how to track mouse position. However,
since Pygame requires a window to be created with in order
to track mouse events and positions properly, we also create
a winow.
"""

import pygame

# Initialize Pygame
pygame.init()

# Set up the display
screen = pygame.display.set_mode((640, 480))

# begin iterating through the experiment loop
keep_running = True
while keep_running:

    # Get and print the current mouse position
    mouse_pos = pygame.mouse.get_pos()
    print(f"Mouse Position: {mouse_pos}")

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False

# Quit Pygame
pygame.quit()
