import pygame
import numpy as np


def create_gabor_patch(size, lambda_, theta, psi, sigma, gamma):
    """Generate a Gabor patch with a circular mask using NumPy."""
    x = np.linspace(-size / 2, size / 2, size)
    y = np.linspace(-size / 2, size / 2, size)
    x, y = np.meshgrid(x, y)

    # Rotation
    x_theta = x * np.cos(theta) + y * np.sin(theta)
    y_theta = -x * np.sin(theta) + y * np.cos(theta)

    # Gabor formula
    gb = np.cos(2 * np.pi * x_theta / lambda_ + psi)

    # Circular mask
    radius = size / 2
    circle_mask = (x**2 + y**2) <= radius**2
    gb *= circle_mask

    return gb


def gabor_to_surface(gabor_patch):
    normalized_patch = (gabor_patch + 1) / 2 * 255
    uint8_patch = normalized_patch.astype(np.uint8)
    surface = pygame.Surface((gabor_patch.shape[0], gabor_patch.shape[1]),
                             pygame.SRCALPHA)
    pygame.surfarray.blit_array(surface, np.dstack([uint8_patch] * 3))
    return surface


# Initialize Pygame
pygame.init()

screen_width, screen_height = 800, 600
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption('Gabor Patches in Quadrants')

screen.fill((126, 126, 126))

# Parameters
size = 100  # Gabor patch size
psi = 0.0  # Phase offset
sigma = 50.0  # Gaussian envelope standard deviation
gamma = 1.0  # Spatial aspect ratio

# Spatial frequencies and orientations
lambdas = [45, 30, 15]  # Low and high spatial frequency (wavelength)
thetas = [np.pi / 6, np.pi / 3,
          0]  # Low and high orientation (0 and 45 degrees)

# Generate and blit Gabor patches
for i, lambda_ in enumerate(lambdas):
    for j, theta in enumerate(thetas):
        gabor_patch = create_gabor_patch(size, lambda_, theta, psi, sigma,
                                         gamma)
        gabor_surface = gabor_to_surface(gabor_patch)
        # Position calculation for 3x3 grid
        x = i * (screen_width / 3) + (screen_width / 6) - (size / 2)
        y = j * (screen_height / 3) + (screen_height / 6) - (size / 2)
        screen.blit(gabor_surface, (x, y))

pygame.display.flip()

# Wait until window is closed
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

pygame.quit()
