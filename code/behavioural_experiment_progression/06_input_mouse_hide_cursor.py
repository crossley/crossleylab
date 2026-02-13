import pygame

# Initialize Pygame
pygame.init()

# Set up the display
screen = pygame.display.set_mode((640, 480))

# Hide the mouse cursor
pygame.mouse.set_visible(False)

# color definition for purple
purple = (128, 0, 128)

# cursor circle radius
radius = 15

# begin iterating through the experiment loop
keep_running = True
while keep_running:

    # Clear the screen with black background on each frame
    screen.fill((0, 0, 0))

    # Get and print the current mouse position
    mouse_pos = pygame.mouse.get_pos()

    # Draw a filled purple circle at the mouse position
    pygame.draw.circle(screen, purple, mouse_pos, radius)

    # Update the display to show the new drawing
    pygame.display.flip()

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False

# Quit Pygame
pygame.quit()
