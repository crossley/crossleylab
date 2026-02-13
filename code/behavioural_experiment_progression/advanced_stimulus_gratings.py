import pygame
import numpy as np

# Initialize Pygame
pygame.init()

# Screen dimensions
screen_width, screen_height = 640, 480
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption('Gabor Patch')

# Gabor parameters
sigma = 50.0  # Standard deviation of the Gaussian envelope
theta = np.pi / 4 # Orientation of the Gabor patch in radians
lambda_ = 20.0  # Wavelength of the sinusoidal component
psi = 0.0  # Phase offset
gamma = 1.0  # Spatial aspect ratio


# Calculate the Gabor patch
def gabor(x, y, lambda_, theta, psi, sigma, gamma):
    x_theta = x * np.cos(theta) + y * np.sin(theta)
    y_theta = -x * np.sin(theta) + y * np.cos(theta)
    return np.exp(-0.5 * (x_theta**2 + gamma**2 * y_theta**2) /
                  sigma**2) * np.cos(2 * np.pi * x_theta / lambda_ + psi)


# Main loop
keep_running = True
while keep_running:

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False

    screen.fill((0, 0, 0))

    # Draw the Gabor patch
    for x in range(screen_width):
        for y in range(screen_height):
            # Center the patch on the screen
            x_adjusted = x - screen_width / 2
            y_adjusted = y - screen_height / 2
            value = gabor(x_adjusted, y_adjusted, lambda_, theta, psi, sigma,
                          gamma)
            color = int((value + 1) * 127.5)  # Scale to 0-255
            screen.set_at((x, y), (color, color, color))

    pygame.display.flip()

# Quit Pygame
pygame.quit()
