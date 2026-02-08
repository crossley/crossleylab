import numpy as np
import pygame

pygame.init()

# Set up the display
screen = pygame.display.set_mode((640, 480))

# Hide the mouse cursor
pygame.mouse.set_visible(False)

# Define colors
black = (0, 0, 0)
white = (255, 255, 255)
cyan = (0, 255, 255)
magenta = (255, 0, 255)
yellow = (255, 255, 0)
green = (0, 255, 0)
red = (255, 0, 0)
blue = (0, 0, 255)

# initial state
state_searching = "state_searching"
state_ready = "state_ready"
state_moving = "state_moving"
state_feedback_ep = "state_feedback_ep"

# specify time-sensitive states
t_ready = 500
t_feedback = 1000

# cursor circle radius
cursor_radius = 10
start_radius = 15
target_radius = 15

# relevatn coords
center_x = screen.get_width() // 2
center_y = screen.get_height() // 2

start_pos = (center_x, center_y + 100)
target_pos = (center_x, center_y - 100)

# create clocks to keep time
clock_state = pygame.time.Clock()
clock_exp = pygame.time.Clock()

t_state = 0.0
time_exp = 0.0

# initial state
state_init = "state_searching"

# set the current state to the initial state
state_current = state_init

# behavioural measurements
rt = -1
mt = -1
ep = -1

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    time_exp += clock_exp.tick()
    screen.fill((0, 0, 0))
    mouse_pos = pygame.mouse.get_pos()

    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                keep_running = False

    if state_current == "state_searching":
        t_state += clock_state.tick()

        pygame.draw.circle(screen, blue, start_pos, start_radius)

        r = np.sqrt((mouse_pos[0] - start_pos[0])**2 +
                    (mouse_pos[1] - start_pos[1])**2)

        pygame.draw.circle(screen, white, start_pos, r, 2)

        if np.sqrt((mouse_pos[0] - start_pos[0])**2 +
                   (mouse_pos[1] - start_pos[1])**2) < start_radius:

            t_state = 0
            state_current = "state_ready"

    if state_current == "state_ready":
        t_state += clock_state.tick()

        pygame.draw.circle(screen, blue, start_pos, start_radius)
        pygame.draw.circle(screen, green, target_pos, target_radius)

        if t_state > t_ready:
            rt = t_state
            t_state = 0
            state_current = "state_moving"

    if state_current == "state_moving":
        t_state += clock_state.tick()

        pygame.draw.circle(screen, blue, start_pos, start_radius)
        pygame.draw.circle(screen, green, target_pos, target_radius)
        pygame.draw.circle(screen, white, mouse_pos, cursor_radius)

        r = np.sqrt((mouse_pos[0] - start_pos[0])**2 +
                    (mouse_pos[1] - start_pos[1])**2)

        r_target = np.sqrt((target_pos[0] - start_pos[0])**2 +
                           (target_pos[1] - start_pos[1])**2)

        if r >= r_target:
            ep = mouse_pos

            ep_theta = np.arctan2(ep[1] - start_pos[1], ep[0] - start_pos[0])
            ep_target = (r_target * np.cos(ep_theta) + start_pos[0],
                         r_target * np.sin(ep_theta) + start_pos[1])

            mt = t_state
            t_state = 0
            state_current = "state_feedback_ep"

    if state_current == "state_feedback_ep":
        t_state += clock_state.tick()

        pygame.draw.circle(screen, blue, start_pos, start_radius)
        pygame.draw.circle(screen, green, target_pos, target_radius)
        pygame.draw.circle(screen, white, ep_target, cursor_radius)

        if t_state > t_feedback:
            t_state = 0
            state_current = "state_searching"

    pygame.display.flip()

pygame.quit()
