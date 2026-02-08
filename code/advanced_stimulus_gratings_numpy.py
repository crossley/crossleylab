import pygame
import numpy as np


def create_gabor_patch(size, lambda_, theta, psi, sigma, gamma):
    """Generate a Gabor patch using NumPy."""
    # Create a grid of (x, y) coordinates at which to evaluate the Gabor function
    x = np.linspace(-size / 2, size / 2, size)
    y = np.linspace(-size / 2, size / 2, size)
    x, y = np.meshgrid(x, y)

    # Rotation
    x_theta = x * np.cos(theta) + y * np.sin(theta)
    y_theta = -x * np.sin(theta) + y * np.cos(theta)

    # Gabor patch formula

    # Gaussian mask
    # mask = np.exp(-0.5 * (x_theta**2 + gamma**2 * y_theta**2) / sigma**2)

    # # Circular mask
    radius = size / 2
    mask = (x**2 + y**2) <= radius**2

    # sine-wave grating
    grating = np.cos(2 * np.pi * x_theta / lambda_ + psi)

    gb = mask * grating

    return gb


def gabor_to_surface(gabor_patch):
    """Convert a Gabor patch to a Pygame surface."""
    # Normalize to 0-255
    normalized_patch = (gabor_patch + 1) / 2 * 255
    # Convert to unsigned 8-bit integer
    uint8_patch = normalized_patch.astype(np.uint8)
    # Create an empty Pygame surface
    surface = pygame.Surface((gabor_patch.shape[0], gabor_patch.shape[1]))
    # Populate the surface with Gabor patch data
    pygame.surfarray.blit_array(surface,
                                np.dstack([uint8_patch] * 3))  # Convert to RGB
    return surface


# Initialize Pygame
pygame.init()

# Window dimensions
screen_width, screen_height = 640, 480
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption('Gabor Patch - NumPy')

# Gabor patch parameters
size = 300  # Size of the Gabor patch
lambda_ = 20.0  # Wavelength of the sinusoidal component
theta = np.pi / 4  # Orientation of the Gabor patch in radians (45 degrees)
psi = 0.0  # Phase offset
sigma = 50.0  # Standard deviation of the Gaussian envelope
gamma = 1.0  # Spatial aspect ratio

# Generate Gabor patch
gabor_patch = create_gabor_patch(size, lambda_, theta, psi, sigma, gamma)

# Convert to Pygame surface
gabor_surface = gabor_to_surface(gabor_patch)

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
    # Blit the Gabor surface onto the screen
    screen.blit(gabor_surface,
                (screen_width / 2 - size / 2, screen_height / 2 - size / 2))
    pygame.display.flip()

# Quit Pygame
pygame.quit()
