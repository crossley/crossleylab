import pygame

pygame.init()

# Set up the display
screen_width, screen_height = 640, 480
screen = pygame.display.set_mode((screen_width, screen_height))

center_x = screen_width // 2
center_y = screen_height // 2

# Define colors
black = (0, 0, 0)
white = (255, 255, 255)
cyan = (0, 255, 255)
magenta = (255, 0, 255)
yellow = (255, 255, 0)
green = (0, 255, 0)

# initial state
state_init = "state_init"
state_finished = "state_finished"
state_stim = "state_stim"
state_feedback = "state_feedback"
state_iti = "state_iti"

# specify a maximum amount of time for each state
t_init = -1
t_finished = -1
t_stim = 3000
t_feedback = 1000
t_iti = 750

# create clocks to keep time
clock_state = pygame.time.Clock()
clock_exp = pygame.time.Clock()

time_state = 0.0
time_exp = 0.0

# set the current state to the initial state
state_current = state_init

# behavioural measurements
resp = -1
rt = -1

# set the experiment to begin running
keep_running = True

# begin iterating through the experiment loop
while keep_running:

    time_exp += clock_exp.tick()

    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                keep_running = False
            else:
                resp = event.key

    if state_current == "state_init":
        time_state += clock_state.tick()
        if resp == pygame.K_SPACE:
            time_state = 0
            resp = -1
            state_current = "state_iti"

    if state_current == "state_finished":
        time_state += clock_state.tick()

    if state_current == "state_stim":
        time_state += clock_state.tick()
        pygame.draw.circle(screen, cyan, (320, 240), 50)
        if (resp == pygame.K_d) or (resp == pygame.K_k):
            time_state = 0
            state_current = "state_feedback"

    if state_current == "state_feedback":
        time_state += clock_state.tick()
        if resp == pygame.K_d:
            pygame.draw.circle(screen, magenta, (320, 240), 60, 4)
            pygame.draw.circle(screen, cyan, (320, 240), 50)
        elif resp == pygame.K_k:
            pygame.draw.circle(screen, yellow, (320, 240), 60, 4)
            pygame.draw.circle(screen, cyan, (320, 240), 50)
        if time_state > t_feedback:
            time_state = 0
            state_current = "state_iti"

    if state_current == "state_iti":
        time_state += clock_state.tick()
        screen.fill(black)
        pygame.draw.line(screen, white, (center_x, center_y - 10), (center_x, center_y + 10), 4)
        pygame.draw.line(screen, white, (center_x - 10, center_y), (center_x + 10, center_y), 4)
        if time_state > t_iti:
            resp = -1
            rt = -1
            time_state = 0
            state_current = "state_stim"

    pygame.display.flip()

pygame.quit()
