import numpy as np
import matplotlib.pyplot as plt

#############################
# THE BIG PICTURE
# SPEED is a model that proposes that the development of automaticity is driven
# by the gradual transfer of performance control from subcortical basal ganglia
# circuits to direct cortical pathways. Learning at cortico-striatal synapses is
# mediated by 3-factor reinforcement learning rules, while learning at
# cortical-cortical synapses is mediated by 2-factor Hebbian learning.
#############################

#############################
# Simulation time, samples, trials
#############################
T = 3000
dt = 0.1
t = np.arange(0, T, dt)
n = t.shape[0]
n_trl = 500

#############################
# Neurotransmitter / PSP parameters
#############################
psp_amp = 3e5  # post-synaptic potential amplitude
psp_decay = 100  # post-synaptic potential decay time constant

#############################
# Visual cortex
#############################

# We need a special model for visual cortex (because 
# category learning stimuli are fancy)
vis_dim = 100 # number of visual units along each stimulus dimension
vis_amp = 2  # visual cortex activity amplitude
vis_width = 10  # visual cortex activity width

vis_act = np.zeros((vis_dim, vis_dim))

# subcortical pathway
w_vis_msn_A = np.random.uniform(0.2, 0.4, (vis_dim, vis_dim))
w_vis_msn_B = np.random.uniform(0.2, 0.4, (vis_dim, vis_dim))

# cortical pathway
w_vis_pm_A = np.random.uniform(0.2, 0.4, (vis_dim, vis_dim))
w_vis_pm_B = np.random.uniform(0.2, 0.4, (vis_dim, vis_dim))

#############################
# Network weights
#############################
w_msn_msn = -0.5
w_msn_gpi = -1.0
w_gpi_thl = -1000.0
w_thl_pm = 1.0

#############################
# A PATHWAY
#############################

#############################
# MSN
v_msn_A = np.zeros(n)
u_msn_A = np.zeros(n)
g_msn_A = np.zeros(n)
spike_msn_A = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [50, -80, -25, 40, 0.01, -20, -55, 150, 1, 0]

# initial conditions
v_msn_A[0] = vr  # resting potential
u_msn_A[0] = b * vr  # initial recovery variable
g_msn_A[0] = 0  # initial synaptic conductance

#############################
# GPi
v_gpi_A = np.zeros(n)
u_gpi_A = np.zeros(n)
g_gpi_A = np.zeros(n)
spike_gpi_A = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]

# initial conditions
v_gpi_A[0] = vr  # resting potential
u_gpi_A[0] = b * vr  # initial recovery variable
g_gpi_A[0] = 0  # initial synaptic conductance

#############################
# Thal
v_thl_A = np.zeros(n)
u_thl_A = np.zeros(n)
g_thl_A = np.zeros(n)
spike_thl_A = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 10]

# initial conditions
v_thl_A[0] = vr  # resting potential
u_thl_A[0] = b * vr  # initial recovery variable
g_thl_A[0] = 0  # initial synaptic conductance

#############################
# premotor
v_pm_A = np.zeros(n)
u_pm_A = np.zeros(n)
g_pm_A = np.zeros(n)
spike_pm_A = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]

# initial conditions
v_pm_A[0] = vr  # resting potential
u_pm_A[0] = b * vr  # initial recovery variable
g_pm_A[0] = 0  # initial synaptic conductance

#############################
# B PATHWAY
#############################

#############################
# MSN
v_msn_B = np.zeros(n)
u_msn_B = np.zeros(n)
g_msn_B = np.zeros(n)
spike_msn_B = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [50, -80, -25, 40, 0.01, -20, -55, 150, 1, 0]

# initial conditions
v_msn_B[0] = vr  # resting potential
u_msn_B[0] = b * vr  # initial recovery variable
g_msn_B[0] = 0  # initial synaptic conductance

#############################
# GPi
v_gpi_B = np.zeros(n)
u_gpi_B = np.zeros(n)
g_gpi_B = np.zeros(n)
spike_gpi_B = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]

# initial conditions
v_gpi_B[0] = vr  # resting potential
u_gpi_B[0] = b * vr  # initial recovery variable
g_gpi_B[0] = 0  # initial synaptic conductance

#############################
# Thal
v_thl_B = np.zeros(n)
u_thl_B = np.zeros(n)
g_thl_B = np.zeros(n)
spike_thl_B = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 10]

# initial conditions
v_thl_B[0] = vr  # resting potential
u_thl_B[0] = b * vr  # initial recovery variable
g_thl_B[0] = 0  # initial synaptic conductance

#############################
# premotor
v_pm_B = np.zeros(n)
u_pm_B = np.zeros(n)
g_pm_B = np.zeros(n)
spike_pm_B = np.zeros(n)

C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]

# initial conditions
v_pm_B[0] = vr  # resting potential
u_pm_B[0] = b * vr  # initial recovery variable
g_pm_B[0] = 0  # initial synaptic conductance

#############################
# CRITIC
#############################
r = np.zeros(n_trl)
p = np.zeros(n_trl)
rpe = np.zeros(n_trl)
alpha_critic = 0.01

p[0] = 0.5 # r is 0 or 1 so nuetral is 0.5

# subcortical learning rates
alpha_w = 5e-2
beta_w = 5e-2
gamma_w = 1e-2
theta = 0.1
lamb = 1e-5

# cortical-cortical learning rates
alpha_w_2 = 2e-2
beta_w_2 = 2e-2

#############################
# RESPONSE VARIABLES 
#############################
resp = np.zeros(n_trl)
cat = np.zeros(n_trl)
rt = np.zeros(n_trl)
resp_thresh = 1e10


#############################
# BEGIN SIMULATION
#############################
for trl in range(n_trl - 1):

    # select stimulus (x, y) by sampling from a uniform distribution in [0, 100]
    x = np.random.uniform(0, 100)
    y = np.random.uniform(0, 100)

    # assign category label
    if x > y:
        cat[trl] = 1
    else:
        cat[trl] = 2

    # compute visual response to stimulus vis_act as a 2D Gaussian
    x_grid, y_grid = np.meshgrid(np.arange(vis_dim), np.arange(vis_dim))
    vis_act = np.exp(-((x_grid - x)**2 + (y_grid - y)**2) / (2 * vis_width**2))
    vis_act *= vis_amp

    # reset things that need resetting after each trial
    v_msn_A.fill(0)
    u_msn_A.fill(0)
    g_msn_A.fill(0)
    spike_msn_A.fill(0)

    v_gpi_A.fill(0)
    u_gpi_A.fill(0)
    g_gpi_A.fill(0)
    spike_gpi_A.fill(0)

    v_thl_A.fill(0)
    u_thl_A.fill(0)
    g_thl_A.fill(0)
    spike_thl_A.fill(0)

    v_pm_A.fill(0)
    u_pm_A.fill(0)
    g_pm_A.fill(0)
    spike_pm_A.fill(0)

    v_msn_B.fill(0)
    u_msn_B.fill(0)
    g_msn_B.fill(0)
    spike_msn_B.fill(0)

    v_gpi_B.fill(0)
    u_gpi_B.fill(0)
    g_gpi_B.fill(0)
    spike_gpi_B.fill(0)

    v_thl_B.fill(0)
    u_thl_B.fill(0)
    g_thl_B.fill(0)
    spike_thl_B.fill(0)

    v_pm_B.fill(0)
    u_pm_B.fill(0)
    g_pm_B.fill(0)
    spike_pm_B.fill(0)

    for i in range(1, n):  # iterate over time steps

        # visual input to the network
        if i > n // 3:
            # Add visual input to msn neurons as the dot product of vis_act with w_vis_msn
            I_vis_msn_A = np.dot(vis_act.flatten(), w_vis_msn_A.flatten())
            I_vis_msn_B = np.dot(vis_act.flatten(), w_vis_msn_B.flatten())
            I_vis_pm_A = np.dot(vis_act.flatten(), w_vis_pm_A.flatten())
            I_vis_pm_B = np.dot(vis_act.flatten(), w_vis_pm_B.flatten())
        else:
            I_vis_msn_A = 0
            I_vis_msn_B = 0
            I_vis_pm_A = 0
            I_vis_pm_B = 0

        # msn A
        C, vr, vt, vpeak, a, b, c, d, k, E =  [50, -80, -25, 40, 0.01, -20, -55, 150, 1, 0]
        dvdt_msn_A = (k * (v_msn_A[i - 1] - vr) * (v_msn_A[i - 1] - vt) - u_msn_A[i - 1] + E + I_vis_msn_A + w_msn_msn * g_msn_B[i-1]) / C
        dudt_msn_A = a * (b * (v_msn_A[i - 1] - vr) - u_msn_A[i - 1])
        dgdt_msn_A = (-g_msn_A[i - 1] + psp_amp * spike_msn_A[i - 1]) / psp_decay

        v_msn_A[i] = v_msn_A[i - 1] + dvdt_msn_A * dt
        u_msn_A[i] = u_msn_A[i - 1] + dudt_msn_A * dt
        g_msn_A[i] = g_msn_A[i - 1] + dgdt_msn_A * dt

        if v_msn_A[i] >= vpeak:
            v_msn_A[i - 1] = vpeak
            v_msn_A[i] = c
            u_msn_A[i] += d
            spike_msn_A[i] = 1

        # msn B
        C, vr, vt, vpeak, a, b, c, d, k, E =  [50, -80, -25, 40, 0.01, -20, -55, 150, 1, 0]
        dvdt_msn_B = (k * (v_msn_B[i - 1] - vr) * (v_msn_B[i - 1] - vt) - u_msn_B[i - 1] + E + I_vis_msn_B + w_msn_msn * g_msn_A[i-1]) / C
        dudt_msn_B = a * (b * (v_msn_B[i - 1] - vr) - u_msn_B[i - 1])
        dgdt_msn_B = (-g_msn_B[i - 1] + psp_amp * spike_msn_B[i - 1]) / psp_decay

        v_msn_B[i] = v_msn_B[i - 1] + dvdt_msn_B * dt
        u_msn_B[i] = u_msn_B[i - 1] + dudt_msn_B * dt
        g_msn_B[i] = g_msn_B[i - 1] + dgdt_msn_B * dt

        if v_msn_B[i] >= vpeak:
            v_msn_B[i - 1] = vpeak
            v_msn_B[i] = c
            u_msn_B[i] += d
            spike_msn_B[i] = 1

        # gpi A
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]
        dvdt_gpi_A = (k * (v_gpi_A[i - 1] - vr) * (v_gpi_A[i - 1] - vt) - u_gpi_A[i - 1] + E + w_msn_gpi * g_msn_A[i-1]) / C
        dudt_gpi_A = a * (b * (v_gpi_A[i - 1] - vr) - u_gpi_A[i - 1])
        dgdt_gpi_A = (-g_gpi_A[i - 1] + psp_amp * spike_gpi_A[i - 1]) / psp_decay

        v_gpi_A[i] = v_gpi_A[i - 1] + dvdt_gpi_A * dt
        u_gpi_A[i] = u_gpi_A[i - 1] + dudt_gpi_A * dt
        g_gpi_A[i] = g_gpi_A[i - 1] + dgdt_gpi_A * dt

        if v_gpi_A[i] >= vpeak:
            v_gpi_A[i - 1] = vpeak
            v_gpi_A[i] = c
            u_gpi_A[i] += d
            spike_gpi_A[i] = 1

        # gpi B
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]
        dvdt_gpi_B = (k * (v_gpi_B[i - 1] - vr) * (v_gpi_B[i - 1] - vt) - u_gpi_B[i - 1] + E + w_msn_gpi * g_msn_B[i-1]) / C
        dudt_gpi_B = a * (b * (v_gpi_B[i - 1] - vr) - u_gpi_B[i - 1])
        dgdt_gpi_B = (-g_gpi_B[i - 1] + psp_amp * spike_gpi_B[i - 1]) / psp_decay

        v_gpi_B[i] = v_gpi_B[i - 1] + dvdt_gpi_B * dt
        u_gpi_B[i] = u_gpi_B[i - 1] + dudt_gpi_B * dt
        g_gpi_B[i] = g_gpi_B[i - 1] + dgdt_gpi_B * dt

        if v_gpi_B[i] >= vpeak:
            v_gpi_B[i - 1] = vpeak
            v_gpi_B[i] = c
            u_gpi_B[i] += d
            spike_gpi_B[i] = 1

        # thal A
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]
        dvdt_thl_A = (k * (v_thl_A[i - 1] - vr) * (v_thl_A[i - 1] - vt) - u_thl_A[i - 1] + E + w_gpi_thl * g_gpi_A[i-1]) / C
        dudt_thl_A = a * (b * (v_thl_A[i - 1] - vr) - u_thl_A[i - 1])
        dgdt_thl_A = (-g_thl_A[i - 1] + psp_amp * spike_thl_A[i - 1]) / psp_decay

        v_thl_A[i] = v_thl_A[i - 1] + dvdt_thl_A * dt
        u_thl_A[i] = u_thl_A[i - 1] + dudt_thl_A * dt
        g_thl_A[i] = g_thl_A[i - 1] + dgdt_thl_A * dt

        if v_thl_A[i] >= vpeak:
            v_thl_A[i - 1] = vpeak
            v_thl_A[i] = c
            u_thl_A[i] += d
            spike_thl_A[i] = 1

        # thl B
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 100]
        dvdt_thl_B = (k * (v_thl_B[i - 1] - vr) * (v_thl_B[i - 1] - vt) - u_thl_B[i - 1] + E + w_gpi_thl * g_gpi_B[i-1]) / C
        dudt_thl_B = a * (b * (v_thl_B[i - 1] - vr) - u_thl_B[i - 1])
        dgdt_thl_B = (-g_thl_B[i - 1] + psp_amp * spike_thl_B[i - 1]) / psp_decay

        v_thl_B[i] = v_thl_B[i - 1] + dvdt_thl_B * dt
        u_thl_B[i] = u_thl_B[i - 1] + dudt_thl_B * dt
        g_thl_B[i] = g_thl_B[i - 1] + dgdt_thl_B * dt

        if v_thl_B[i] >= vpeak:
            v_thl_B[i - 1] = vpeak
            v_thl_B[i] = c
            u_thl_B[i] += d
            spike_thl_B[i] = 1

        # pm A
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 0]
        dvdt_pm_A = (k * (v_pm_A[i - 1] - vr) * (v_pm_A[i - 1] - vt) - u_pm_A[i - 1] + E + w_thl_pm * g_thl_A[i-1] + I_vis_pm_A) / C
        dudt_pm_A = a * (b * (v_pm_A[i - 1] - vr) - u_pm_A[i - 1])
        dgdt_pm_A = (-g_pm_A[i - 1] + psp_amp * spike_pm_A[i - 1]) / psp_decay

        v_pm_A[i] = v_pm_A[i - 1] + dvdt_pm_A * dt
        u_pm_A[i] = u_pm_A[i - 1] + dudt_pm_A * dt
        g_pm_A[i] = g_pm_A[i - 1] + dgdt_pm_A * dt

        if v_pm_A[i] >= vpeak:
            v_pm_A[i - 1] = vpeak
            v_pm_A[i] = c
            u_pm_A[i] += d
            spike_pm_A[i] = 1

        # pm B
        C, vr, vt, vpeak, a, b, c, d, k, E =  [100, -60, -40, 35, 0.03, -2, -50, 100, 0.7, 0]
        dvdt_pm_B = (k * (v_pm_B[i - 1] - vr) * (v_pm_B[i - 1] - vt) - u_pm_B[i - 1] + E + w_thl_pm * g_thl_B[i-1] + I_vis_pm_B) / C
        dudt_pm_B = a * (b * (v_pm_B[i - 1] - vr) - u_pm_B[i - 1])
        dgdt_pm_B = (-g_pm_B[i - 1] + psp_amp * spike_pm_B[i - 1]) / psp_decay

        v_pm_B[i] = v_pm_B[i - 1] + dvdt_pm_B * dt
        u_pm_B[i] = u_pm_B[i - 1] + dudt_pm_B * dt
        g_pm_B[i] = g_pm_B[i - 1] + dgdt_pm_B * dt

        if v_pm_B[i] >= vpeak:
            v_pm_B[i - 1] = vpeak
            v_pm_B[i] = c
            u_pm_B[i] += d
            spike_pm_B[i] = 1

        # NOTE The following code implements a response selection mechanism that
        # occurs at each time step. This would in principle model an experiment in
        # which the agent (e.g., human participant) is allowed to respond at any
        # time during the trial, and the stimulus presentation is terminated at
        # the time of the response (i.e., response-terminated stim). It is
        # commented out here only because I found it simpler to find parameters
        # that allowed the model to behave in the way I wanted by forcing the
        # trial to run to completion. Your decision on how to handle this should
        # be based on the details in the paper you are assigned for your final
        # project.
#        #############################
#        # ACTOR (response selection)
#        #############################
#        if (g_pm_A[i] - g_pm_B[i]) > resp_thresh:
#            resp[trl] = 1
#            rt[trl] = i
#            break
#        if (g_pm_B[i] - g_pm_A[i]) > resp_thresh:
#            resp[trl] = 2
#            rt[trl] = i
#            break


    #############################
    # ACTOR (response selection)
    # NOTE: Since response selection is occurring after simulation of the entire trial, we are in
    # essence modeling an experiment in which the agent (e.g., human participant) is not allowed to
    # response until the end of the trial. If you want to model the more typical response-terminated
    # stimulus presentation of most human experiments, you will need to modify the code to allow for
    # response selection at each time step. See comments above for an example of
    # how you might do this.
    #############################
    resp[trl] = np.argmax((g_pm_A[i], g_pm_B[i])) + 1

    #############################
    # FEEDBACK dervied from response accuracy
    #############################
    if cat[trl] == resp[trl]:
        r[trl] = 1
    else:
        r[trl] = 0

    #############################
    # CRTIC
    #############################

    # reward prediction error
    rpe[trl] = r[trl] - p[trl]

    # update the reward prediction
    p[trl + 1] = p[trl] + alpha_critic * rpe[trl]

    #############################
    # WEIGHT UPDATE:
    # Update visual-msn weights via 3-factor RL rule
    #############################

    post_A = g_msn_A.sum()
    post_B = g_msn_B.sum()

    # implement / force hard laterial inhibition
    if resp[trl] == 1:
        post_B = 0
    elif resp[trl] == 2:
        post_A = 0

    post_ltp_1_A = np.heaviside(post_A - theta, 0)
    post_ltd_1_A = np.heaviside(theta - post_A, 0)

    post_ltp_1_B = np.heaviside(post_B - theta, 0)
    post_ltd_1_B = np.heaviside(theta - post_B, 0)

    # NOTE: This is a simplifying hack. The biologically plausible Hebbian and RL learning rules we
    # covered in lecture use an exponential function of post synaptic activity. I originally
    # included this term, but it was leading to numerical instability. So I just set it to 1 for
    # now.  For best results on your final project you should try your best ot use what's reported
    # in the paper you are assigned. What I do here is just a broad stroke demonstration of some
    # core ideas.
    post_ltp_2_A = 1
    post_ltd_2_A = 1

    post_ltp_2_B = 1
    post_ltd_2_B = 1

    # Iterate over all visual units (i.e., all pre-synaptic units)
    for ii in range(vis_dim):
        for jj in range(vis_dim):
            pre = vis_act[ii, jj]

            if rpe[trl] > 0:
                # LTP caused by strong post-synaptic activity and positive reward prediction error
                dw_A = alpha_w * pre * post_ltp_1_A * post_ltp_2_A * (1 - w_vis_msn_A[ii, jj]) * rpe[trl]
                dw_B = alpha_w * pre * post_ltp_1_B * post_ltp_2_B * (1 - w_vis_msn_B[ii, jj]) * rpe[trl]
            else:
                # LTD caused by strong post-synaptic activity and negative reward prediction error
                dw_A = beta_w * pre * post_ltp_1_A * post_ltp_2_A * w_vis_msn_A[ii, jj] * rpe[trl]
                dw_B = beta_w * pre * post_ltp_1_B * post_ltp_2_B * w_vis_msn_B[ii, jj] * rpe[trl]

            # NOTE: LTD is also caused by weak post-synaptic activity but for simplicity we do not
            # model that here. You should attempt to implement whatever learning rule is specified
            # in the paper you are assigned for your final project. What I do here is just a broad
            # stoke demonstration of some key ideas.
            #
            # NOTE: Please also note that while we do not include LTD driven by
            # weak post-synaptic activity at cortical-striatal synapses, we do
            # inlcude this term below when modeling the cortical-cortical
            # synapses.
            # Apply the total weight change

            w_vis_msn_A[ii, jj] += dw_A
            w_vis_msn_B[ii, jj] += dw_B


    #############################
    # Update visual-pm weights via 2-factor Hebbian rule
    #############################

    post_A = g_pm_A.sum()
    post_B = g_pm_B.sum()

    # implement / force hard laterial inhibition
    if resp[trl] == 1:
        post_B = 0
    elif resp[trl] == 2:
        post_A = 0

    post_ltp_1_A = np.heaviside(post_A - theta, 0)
    post_ltd_1_A = np.heaviside(theta - post_A, 0)

    post_ltp_1_B = np.heaviside(post_B - theta, 0)
    post_ltd_1_B = np.heaviside(theta - post_B, 0)

    # NOTE: This is a simplifying hack. The biologically plausible Hebbian and RL learning rules we
    # covered in lecture use an exponential function of post synaptic activity. I originally
    # included this term, but it was leading to numerical instability. So I just set it to 1 for
    # now.  For best results on your final project you should try your best ot use what's reported
    # in the paper you are assigned. What I do here is just a broad stroke demonstration of some
    # core ideas.
    post_ltp_2_A = 1
    post_ltd_2_A = 1

    post_ltp_2_B = 1
    post_ltd_2_B = 1

    # Iterate over all visual units (i.e., all pre-synaptic units)
    for ii in range(vis_dim):
        for jj in range(vis_dim):
            pre = vis_act[ii, jj]

            # LTP caused by strong post-synaptic activity
            dw_1A = alpha_w_2 * pre * post_ltp_1_A * post_ltp_2_A * (1 - w_vis_pm_A[ii, jj])
            dw_1B = alpha_w_2 * pre * post_ltp_1_B * post_ltp_2_B * (1 - w_vis_pm_B[ii, jj])

            # LTD caused by weak post-synaptic activity
            dw_2A = beta_w_2 * pre * post_ltd_1_A * post_ltd_2_A * w_vis_pm_A[ii, jj]
            dw_2B = beta_w_2 * pre * post_ltd_1_B * post_ltd_2_B * w_vis_pm_B[ii, jj]

            # Apply the total weight change
            dwA = dw_1A + dw_2A
            dwB = dw_1B + dw_2B

            w_vis_pm_A[ii, jj] += dwA
            w_vis_pm_B[ii, jj] += dwB


# plot network activity per trial for diagnostic purposes
fig, ax = plt.subplots(2, 7, squeeze=False, figsize=(12, 4))

# control space between subplots
plt.subplots_adjust(wspace=0.5)

ax[0, 0].imshow(vis_act)
ax[1, 0].imshow(vis_act)

ax[0, 1].imshow(w_vis_msn_A, vmin=0, vmax=1)
ax[1, 1].imshow(w_vis_msn_B, vmin=0, vmax=1)

ax[0, 2].imshow(w_vis_pm_A, vmin=0, vmax=1)
ax[1, 2].imshow(w_vis_pm_B, vmin=0, vmax=1)

v = np.array([v_msn_A, v_msn_B, v_gpi_A, v_gpi_B, v_thl_A, v_thl_B,  v_pm_A, v_pm_B])
g = np.array([g_msn_A, g_msn_B, g_gpi_A, g_gpi_B, g_thl_A, g_thl_B,  g_pm_A, g_pm_B])

axx = ax[0, 3]
axx.plot(t, v[0, :], label='str_d1 A')
axx2 = axx.twinx()
axx2.plot(t, g[0, :], color='C1')
ax[0, 3].legend()

axx = ax[1, 3]
axx.plot(t, v[1, :], label='str_d1 B')
axx2 = axx.twinx()
axx2.plot(t, g[1, :], color='C1')
ax[1, 3].legend()

axx = ax[0, 4]
axx.plot(t, v[2, :], label='gpi A')
axx2 = axx.twinx()
axx2.plot(t, g[2, :], color='C1')
ax[0, 4].legend()

axx = ax[1, 4]
axx.plot(t, v[3, :], label='gpi B')
axx2 = axx.twinx()
axx2.plot(t, g[3, :], color='C1')
ax[1, 4].legend()

axx = ax[0, 5]
axx.plot(t, v[4, :], label='thl A')
axx2 = axx.twinx()
axx2.plot(t, g[4, :], color='C1')
ax[0, 5].legend()

axx = ax[1, 5]
axx.plot(t, v[5, :], label='thl B')
axx2 = axx.twinx()
axx2.plot(t, g[5, :], color='C1')
ax[1, 5].legend()

axx = ax[0, 6]
axx.plot(t, v[6, :], label='ctx A')
axx2 = axx.twinx()
axx2.plot(t, g[6, :], color='C1')
ax[0, 6].legend()

axx = ax[1, 6]
axx.plot(t, v[7, :], label='ctx B')
axx2 = axx.twinx()
axx2.plot(t, g[7, :], color='C1')
ax[1, 6].legend()

plt.show()

# plot learning across trials
fig, ax = plt.subplots(1, 1, squeeze=False, figsize=(10, 10))
ax[0, 0].plot(np.arange(0, n_trl-1), r[:-1], color='C0', label='Obtained Reward')
ax[0, 0].plot(np.arange(0, n_trl-1), p[:-1], color='C1', label='Predicted Reward')
ax[0, 0].plot(np.arange(0, n_trl-1), rpe[:-1], color='C2', label='RPE')
ax[0, 0].legend()
plt.show()
