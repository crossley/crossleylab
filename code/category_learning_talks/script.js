const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const responseLabel = (response) => (response === 'A' ? 'F' : 'J');

function drawAxesBox(ctx, padding, plotWidth, plotHeight) {
  ctx.strokeStyle = 'rgba(167, 196, 255, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padding.left, padding.top, plotWidth, plotHeight);
}

function drawGrating(canvas, spatialFrequency = 40, orientation = 45) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;
  const theta = (orientation * Math.PI) / 180;
  const freq = 0.018 + (spatialFrequency / 100) * 0.06;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const xr = dx * Math.cos(theta) + dy * Math.sin(theta);
      const inside = dx * dx + dy * dy <= radius * radius;
      const wave = Math.sin(2 * Math.PI * freq * xr);
      const value = Math.round(128 + 115 * wave);
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = inside ? 255 : 0;
    }
  }

  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(image, 0, 0);
}

function sampleStimulus() {
  return {
    x: Math.round(10 + Math.random() * 80),
    y: Math.round(10 + Math.random() * 80),
  };
}

const taskConfigs = {
  demo: {
    title: 'Demo sorting task',
    classify: ({ x }) => (x < 50 ? 'A' : 'B'),
    feedback(correctLabel) {
      return `The correct answer was ${correctLabel}. Keep sorting and look for a pattern.`;
    },
  },
  rbx: {
    title: 'Uni-x task',
    classify: ({ x }) => (x < 50 ? 'A' : 'B'),
    feedback(correctLabel) {
      return `The correct answer was ${correctLabel}. In this structure, one x-based split is enough.`;
    },
  },
  rby: {
    title: 'Uni-y task',
    classify: ({ y }) => (y < 50 ? 'A' : 'B'),
    feedback(correctLabel) {
      return `The correct answer was ${correctLabel}. This time, a y-based split is what matters.`;
    },
  },
  ii: {
    title: 'II task',
    classify: ({ x, y }) => (x > y ? 'B' : 'A'),
    feedback(correctLabel) {
      return `The correct answer was ${correctLabel}. Here both dimensions matter together.`;
    },
  },
};

function setFrameMode(frame, mode, outcome = '') {
  frame.classList.remove('show-fixation', 'show-stimulus', 'feedback-correct', 'feedback-wrong');
  if (mode === 'fixation') {
    frame.classList.add('show-fixation');
  }
  if (mode === 'stimulus' || mode === 'feedback') {
    frame.classList.add('show-stimulus');
  }
  if (mode === 'feedback' && outcome) {
    frame.classList.add(outcome === 'correct' ? 'feedback-correct' : 'feedback-wrong');
  }
}

function flashKey(keys, response) {
  keys.forEach((key) => key.classList.remove('active', 'inactive'));
  if (!response) return;
  const className = response === 'A' ? 'key-f' : 'key-j';
  keys.forEach((key) => {
    key.classList.add(key.classList.contains(className) ? 'active' : 'inactive');
  });
}

function createTaskInstance(root) {
  const taskKey = root.dataset.task;
  const boundary = root.dataset.boundary ?? 'none';
  const config = taskConfigs[taskKey];
  const frame = root.querySelector('.task-frame');
  const canvas = root.querySelector('.task-grating');
  const feedback = root.querySelector('.task-feedback');
  const trialCount = root.querySelector('.trial-count');
  const meterFill = root.querySelector('.meter-fill');
  const meterText = root.querySelector('.meter-text');
  const buttons = [...root.querySelectorAll('.response-button')];
  const resetButton = root.querySelector('.reset-task');
  const keys = [...root.querySelectorAll('.key-button')];
  const spaceCanvas = root.querySelector('.task-space');

  const state = {
    streak: 0,
    trial: 1,
    history: [],
    stimulus: sampleStimulus(),
    responseOpen: false,
    boundary,
    taskKey,
  };

  const inView = () => {
    const rect = root.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewportHeight * 0.75 && rect.bottom > viewportHeight * 0.25;
  };

  const toStatus = (message, color = '#aebdd8') => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.style.color = color;
  };

  const updateMeter = () => {
    meterFill.style.width = `${(state.streak / 5) * 100}%`;
    meterText.textContent = `${state.streak} correct in a row`;
    trialCount.textContent = `Trial ${state.trial} of 20`;
    const finished = state.streak >= 5 || state.history.length >= 20;
    buttons.forEach((button) => {
      button.disabled = finished || !state.responseOpen;
      button.setAttribute('aria-disabled', String(finished || !state.responseOpen));
    });
  };

  const drawSpace = () => {
    if (!spaceCanvas) return;
    const ctx = spaceCanvas.getContext('2d');
    const { width, height } = spaceCanvas;
    const padding = { top: 28, right: 26, bottom: 50, left: 62 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const toX = (value) => padding.left + (value / 100) * plotWidth;
    const toY = (value) => padding.top + plotHeight - (value / 100) * plotHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d182b';
    ctx.fillRect(0, 0, width, height);
    drawAxesBox(ctx, padding, plotWidth, plotHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    if (boundary === 'vertical') {
      ctx.beginPath();
      ctx.moveTo(toX(50), padding.top);
      ctx.lineTo(toX(50), padding.top + plotHeight);
      ctx.stroke();
    }
    if (boundary === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(padding.left, toY(50));
      ctx.lineTo(padding.left + plotWidth, toY(50));
      ctx.stroke();
    }
    if (boundary === 'diagonal') {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(0));
      ctx.lineTo(toX(100), toY(100));
      ctx.stroke();
    }

    state.history.forEach((entry) => {
      const x = toX(entry.x);
      const y = toY(entry.y);
      ctx.strokeStyle = entry.response === 'A' ? '#7db2ff' : '#f0b36c';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      if (entry.correct) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 6);
        ctx.lineTo(x + 6, y + 6);
        ctx.moveTo(x + 6, y - 6);
        ctx.lineTo(x - 6, y + 6);
        ctx.stroke();
      }
    });

    ctx.fillStyle = '#aebdd8';
    ctx.font = '14px Inter';
    ctx.fillText('Spatial frequency', width / 2 - 46, height - 14);
    ctx.save();
    ctx.translate(20, height / 2 + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Orientation', 0, 0);
    ctx.restore();
  };

  const showStimulus = () => {
    state.responseOpen = true;
    drawGrating(canvas, state.stimulus.x, state.stimulus.y);
    setFrameMode(frame, 'stimulus');
    flashKey(keys, '');
    toStatus('Press F or J.', '#edf3ff');
    updateMeter();
  };

  const beginTrial = () => {
    state.responseOpen = false;
    state.stimulus = sampleStimulus();
    setFrameMode(frame, 'fixation');
    toStatus('Fixate, then get ready to respond.', '#aebdd8');
    flashKey(keys, '');
    drawSpace();
    updateMeter();
    window.setTimeout(showStimulus, 900);
  };

  const finishRun = () => {
    const learned = state.streak >= 5;
    toStatus(
      learned
        ? 'Green ring means a good guess. You reached five correct in a row.'
        : spaceCanvas
          ? 'You completed twenty trials. Green ring means good guess; red ring means incorrect.'
          : 'You completed twenty trials. Green ring means good guess; red ring means incorrect.',
      learned ? '#7df7c7' : '#edf3ff',
    );
    updateMeter();
  };

  const respond = (response) => {
    if (!state.responseOpen) return;
    state.responseOpen = false;
    const correctLabel = config.classify(state.stimulus);
    const correct = response === correctLabel;
    state.history.push({ ...state.stimulus, response, correct });
    state.streak = correct ? clamp(state.streak + 1, 0, 5) : 0;
    setFrameMode(frame, 'feedback', correct ? 'correct' : 'wrong');
    flashKey(keys, response);
    toStatus(
      correct
        ? `Good guess. ${responseLabel(response)} was correct, and the green ring confirms it.`
        : `${responseLabel(response)} was not correct. The red ring shows that this guess was wrong.`,
      correct ? '#7df7c7' : '#ff7e88',
    );
    drawSpace();
    updateMeter();

    const finished = state.streak >= 5 || state.history.length >= 20;
    if (finished) {
      window.setTimeout(finishRun, 800);
      return;
    }

    state.trial += 1;
    window.setTimeout(beginTrial, 1600);
  };

  const reset = () => {
    state.streak = 0;
    state.trial = 1;
    state.history = [];
    state.stimulus = sampleStimulus();
    drawSpace();
    beginTrial();
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => respond(button.dataset.response));
  });
  resetButton.addEventListener('click', reset);
  window.addEventListener('keydown', (event) => {
    if (!inView() || !state.responseOpen) return;
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      respond('A');
    }
    if (event.key === 'j' || event.key === 'J') {
      event.preventDefault();
      respond('B');
    }
  });

  reset();
  return { reset };
}

function drawGenericSpace(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const padding = { top: 28, right: 28, bottom: 50, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const toX = (value) => padding.left + (value / 100) * plotWidth;
  const toY = (value) => padding.top + plotHeight - (value / 100) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d182b';
  ctx.fillRect(0, 0, width, height);
  drawAxesBox(ctx, padding, plotWidth, plotHeight);

  const points = [];
  for (let x = 12; x <= 88; x += 12) {
    for (let y = 12; y <= 88; y += 12) {
      points.push({ x, y, px: toX(x), py: toY(y) });
    }
  }

  ctx.fillStyle = 'rgba(237, 243, 255, 0.88)';
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.px, point.py, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#aebdd8';
  ctx.font = '14px Inter';
  ctx.fillText('Spatial frequency', width / 2 - 46, height - 14);
  ctx.save();
  ctx.translate(20, height / 2 + 40);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Orientation', 0, 0);
  ctx.restore();

  canvas._points = points;
}

function installGenericInspector() {
  const canvas = document.getElementById('space-generic');
  const inspector = document.getElementById('space-inspector');
  drawGenericSpace(canvas);
  drawGrating(inspector, 42, 42);

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    const nearest = (canvas._points || []).reduce((best, point) => {
      const distance = Math.hypot(point.px - mouseX, point.py - mouseY);
      if (!best || distance < best.distance) return { point, distance };
      return best;
    }, null);

    if (nearest && nearest.distance < 18) {
      drawGrating(inspector, nearest.point.x, nearest.point.y);
    }
  });
}

function installPrimerDemo() {
  const frame = document.getElementById('primer-frame');
  const canvas = document.getElementById('primer-grating');
  const status = document.getElementById('primer-status');
  const buttons = [...document.querySelectorAll('.primer-response')];
  const restart = document.getElementById('primer-restart');
  drawGrating(canvas, 34, 58);
  const primerTrials = [
    { x: 34, y: 58, response: 'A', correct: true },
    { x: 68, y: 26, response: 'B', correct: true },
    { x: 26, y: 72, response: 'B', correct: false },
    { x: 76, y: 52, response: 'A', correct: false },
    { x: 42, y: 40, response: 'A', correct: true },
  ];
  let timeouts = [];

  const clearPrimerRun = () => {
    timeouts.forEach((timeout) => window.clearTimeout(timeout));
    timeouts = [];
    flashKey(buttons, '');
    setFrameMode(frame, 'fixation');
  };

  const schedule = (fn, delay) => {
    timeouts.push(window.setTimeout(fn, delay));
  };

  const runPrimer = () => {
    clearPrimerRun();
    restart.hidden = true;
    status.textContent = 'Press F or J.';

    primerTrials.forEach((trial, index) => {
      const start = index * 4500;
      schedule(() => {
        drawGrating(canvas, trial.x, trial.y);
        flashKey(buttons, '');
        setFrameMode(frame, 'fixation');
        status.textContent = 'Fixate, then prepare to respond.';
      }, start);
      schedule(() => {
        setFrameMode(frame, 'stimulus');
        status.textContent = `Press ${responseLabel(trial.response)} for this example.`;
      }, start + 1500);
      schedule(() => {
        flashKey(buttons, trial.response);
        setFrameMode(frame, 'feedback', trial.correct ? 'correct' : 'wrong');
        status.textContent = trial.correct
          ? `${responseLabel(trial.response)} was correct, so the ring turns green.`
          : `${responseLabel(trial.response)} was incorrect, so the ring turns red.`;
      }, start + 3000);
    });

    schedule(() => {
      flashKey(buttons, '');
      status.textContent = 'Five example trials complete. Restart the sequence to watch it again.';
      restart.hidden = false;
    }, primerTrials.length * 4500);
  };

  runPrimer();

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const response = button.dataset.response;
      setFrameMode(frame, 'feedback', response === 'A' ? 'correct' : 'wrong');
      flashKey(buttons, response);
      status.textContent = response === 'A'
        ? 'F is highlighted, and the green ring shows correct feedback.'
        : 'J is highlighted, and the red ring shows incorrect feedback.';
    });
  });
  restart.addEventListener('click', runPrimer);
}

function installSlideNavigation() {
  const slides = [...document.querySelectorAll('[data-slide-label]')];
  const prev = document.getElementById('prev-slide');
  const next = document.getElementById('next-slide');
  const indicator = document.getElementById('slide-indicator');
  let currentIndex = 0;

  const update = (index) => {
    currentIndex = index;
    indicator.textContent = `${index + 1} / ${slides.length}`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  };

  const scrollToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  prev.addEventListener('click', () => scrollToSlide(currentIndex - 1));
  next.addEventListener('click', () => scrollToSlide(currentIndex + 1));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') scrollToSlide(currentIndex - 1);
    if (event.key === 'ArrowRight') scrollToSlide(currentIndex + 1);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = slides.indexOf(entry.target);
          if (index >= 0) update(index);
        }
      });
    },
    { threshold: 0.55 },
  );

  slides.forEach((slide) => observer.observe(slide));
  update(0);
}

function init() {
  drawGrating(document.getElementById('hero-grating'), 62, 36);
  installPrimerDemo();
  installGenericInspector();
  document.querySelectorAll('[data-task-root]').forEach((root) => createTaskInstance(root));
  installSlideNavigation();
}

window.addEventListener('DOMContentLoaded', init);
