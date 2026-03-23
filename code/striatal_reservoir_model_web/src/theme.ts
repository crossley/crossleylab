const THEME_KEY = 'striatal-theme';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function setStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getActiveTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function updateThemeToggleLabels(): void {
  const active = getActiveTheme();
  const stored = getStoredTheme();
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  for (const button of buttons) {
    button.textContent = active === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-pressed', String(active === 'dark'));
    button.title = stored ? `Saved preference: ${stored}` : 'Following system preference';
  }
}

function attachToggleHandler(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next: Theme = getActiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      setStoredTheme(next);
      updateThemeToggleLabels();
    });
  }
}

export function initializeTheme(): void {
  const stored = getStoredTheme();
  applyTheme(stored ?? getSystemTheme());

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (!getStoredTheme()) {
      applyTheme(getSystemTheme());
      updateThemeToggleLabels();
    }
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onSystemChange);
  } else {
    media.addListener(onSystemChange);
  }

  attachToggleHandler();
  updateThemeToggleLabels();
}
