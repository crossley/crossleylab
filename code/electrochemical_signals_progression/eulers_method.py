import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# Define the step size
dx = 1

# define the end x
xf = 5.0

# define the number of steps
n = int(xf/dx)

# define the x array
x = np.linspace(0, xf, n)

# Create an array to store estimated fx values
fx = np.zeros(x.shape)

# Create an array to store estimated dffx values
dfdx = np.zeros(x.shape)

# Set the initial conditions
fx[0] = 1.0

# Use Euler's method to solve the differential equation
for i in range(1, n):
    # rate of change of f(x) is defined by the differential
    # equation
    dfdx[i-1] = fx[i-1]

    # The next value of f(x) is estimated to be the previous
    # value + the rate of change * the step size
    fx[i] = fx[i-1] + dfdx[i-1] * dx

# Set the last value of dfdx to the last value of fx
dfdx[-1] = fx[-1]

# set the exact solution
fx_exact = np.exp(x)

# Create a figure and axis
fig, ax = plt.subplots(1, 2, squeeze=False, figsize=(8, 5))
ax = ax.T
ax[0, 0].plot(x, dfdx)
ax[1, 0].plot(x, fx, label='Euler Method Estimate')
ax[1, 0].plot(x, fx_exact, label='Exact Solution')
ax[0, 0].set_ylabel('df/dx')
ax[1, 0].set_ylabel('f(x)')
ax[0, 0].set_xlabel('x')
ax[1, 0].set_xlabel('x')
ax[1, 0].legend()
plt.tight_layout()
plt.show()
