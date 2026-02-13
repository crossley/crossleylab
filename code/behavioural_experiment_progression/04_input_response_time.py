import pygame

pygame.init()

clock = pygame.time.Clock()
time_max = 5000

time_current = 0.0
time_last = 0.0

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    clock.tick()

    time_current += clock.get_time()

    # Event handling loop
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            # Quit if if the Esc key is pressed
            if event.key == pygame.K_ESCAPE:
                keep_running = False
            # Otherwise just print the name of the key pressed
            else:
                response_time = time_current - time_last
                time_last = time_current
                key_pressed = pygame.key.name(event.key)
                print("Key pressed: ", key_pressed)
                print("Response time: ", response_time)

# Quit Pygame
pygame.quit()
