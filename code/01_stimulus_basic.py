"""
This script shows how to use pygame to draw stimuli to a
window.
"""

import pygame

# Initialize Pygame
pygame.init()

# Set up the display
screen = pygame.display.set_mode((640, 480))

# Define colors
cyan = (0, 255, 255)
magenta = (255, 0, 255)
yellow = (255, 255, 0)
green = (0, 255, 0)

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

    # Fill the screen with a dark background to clear previous drawings
    screen.fill((30, 30, 30))

    # Draw shapes
    # Draw a cyan circle
    pygame.draw.circle(screen, cyan, (320, 240), 50)

    # Draw a magenta rectangle
    # pygame.Rect(left, top, width, height)
    pygame.draw.rect(screen, magenta, pygame.Rect(50, 50, 100, 50))

    # Draw a yellow ellipse inside a rectangle
    # Note: The ellipse will fill the bounding rectangle defined by the pygame.Rect
    pygame.draw.ellipse(screen, yellow, pygame.Rect(200, 350, 200, 100))

    # Draw a green line
    # pygame.draw.line(Surface, color, start_pos, end_pos, width)
    pygame.draw.line(screen, green, (0, 0), (640, 480), 5)

    # TODO: add whatever shapes and colors you like to make your own 
    # award winning stimulus!

    # Update the display
    pygame.display.flip()

# Quit Pygame
pygame.quit()
