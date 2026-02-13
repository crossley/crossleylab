from imports import *
from util_func import *

# set subject number
s = 1
f_name = f"sub_{s}_data.csv"

if os.path.exists(f_name):
    print(f"File {f_name} already exists. Aborting.")
    sys.exit()

ds = make_stim_cats()

# # plot the stimuli coloured by label
# fig, ax = plt.subplots(1, 2, squeeze=False, figsize=(12, 6))
# sns.scatterplot(data=ds, x="x", y="y", hue="cat", alpha=0.5, ax=ax[0, 0])
# sns.scatterplot(data=ds, x="xt", y="yt", hue="cat", alpha=0.5, ax=ax[0, 1])
# ax[0, 0].plot([0, 100], [0, 100], 'k--')
# ax[0, 1].plot([0, 5], [0, np.pi / 2], 'k--')
# plt.show()

# plot_stim_space_examples(ds)

# set useful parameters
screen_width, screen_height = 800, 600
center_x = screen_width // 2
center_y = screen_height // 2

pixels_per_inch = 227 / 2
px_per_cm = pixels_per_inch / 2.54
size_cm = 3
size_px = int(size_cm * px_per_cm)

# Initialize Pygame
pygame.init()
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption('Simple Category Learning')

# Set up fonts
font = pygame.font.Font(None, 36)

# Define colors
black = (0, 0, 0)
white = (255, 255, 255)
grey = (126, 126, 126)
green = (0, 255, 0)
red = (255, 0, 0)

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

# trial counter
trial = -1
n_trial = ds.shape[0]

# record keeping
trial_data = {
    'subject': [],
    'trial': [],
    'cat': [],
    'x': [],
    'y': [],
    'resp': [],
    'rt': []
}

running = True
while running:

    time_exp += clock_exp.tick()

    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                keep_running = False
                pygame.quit()
            else:
                resp = event.key

    if state_current == "state_init":
        time_state += clock_state.tick()
        text = font.render("Please press the space bar to begin", True,
                           (255, 255, 255))
        text_rect = text.get_rect(center=(screen_width / 2, screen_height / 2))
        screen.fill(grey)
        screen.blit(text, text_rect)
        if resp == pygame.K_SPACE:
            time_state = 0
            resp = -1
            state_current = "state_iti"

    if state_current == "state_finished":
        time_state += clock_state.tick()
        text = font.render("You finished! Thank you for being awesome!", True,
                           (255, 255, 255))
        text_rect = text.get_rect(center=(screen_width / 2, screen_height / 2))
        screen.fill(grey)
        screen.blit(text, text_rect)

    if state_current == "state_iti":
        time_state += clock_state.tick()
        screen.fill(grey)
        pygame.draw.line(screen, white, (center_x, center_y - 10),
                         (center_x, center_y + 10), 4)
        pygame.draw.line(screen, white, (center_x - 10, center_y),
                         (center_x + 10, center_y), 4)
        if time_state > 1000:
            resp = -1
            rt = -1
            time_state = 0
            trial += 1
            if trial == n_trial:
                state_current = "state_finished"
            else:
                sf = ds['xt'].iloc[trial] * px_per_cm**-1
                ori = ds['yt'].iloc[trial]
                cat = ds['cat'].iloc[trial]
                state_current = "state_stim"

    if state_current == "state_stim":
        time_state += clock_state.tick()
        screen.fill(grey)
        grating_patch = create_grating_patch(size_px, sf, ori)
        grating_surface = grating_to_surface(grating_patch)
        screen.blit(grating_surface,
                    (center_x - size_px / 2, center_y - size_px / 2))
        if (resp == pygame.K_d) or (resp == pygame.K_k):
            rt = time_state

            if resp == pygame.K_d:
                resp = "A"
                if cat == "A":
                    fb = "Correct"
                else:
                    fb = "Incorrect"

            elif resp == pygame.K_k:
                resp = "B"
                if cat == "B":
                    fb = "Correct"
                else:
                    fb = "Incorrect"

            time_state = 0
            state_current = "state_feedback"

    if state_current == "state_feedback":
        time_state += clock_state.tick()

        if fb == "Correct":
            pygame.draw.circle(screen, green, (center_x, center_y),
                               size_px / 2 + 10, 5)

        elif fb == "Incorrect":
            pygame.draw.circle(screen, red, (center_x, center_y),
                               size_px / 2 + 10, 5)

        if time_state > 1000:
            trial_data['subject'].append(s)
            trial_data['trial'].append(trial)
            trial_data['cat'].append(cat)
            trial_data['x'].append(np.round(sf, 2))
            trial_data['y'].append(np.round(ori, 2))
            trial_data['resp'].append(resp)
            trial_data['rt'].append(rt)
            pd.DataFrame(trial_data).to_csv(f_name, index=False)
            time_state = 0
            state_current = "state_iti"

    pygame.display.flip()
