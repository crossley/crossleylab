const STORAGE_KEY = 'theme';

/** Apply the stored theme immediately — call before app content is rendered. */
export function applyStoredTheme(): void {
  if (localStorage.getItem(STORAGE_KEY) === 'light') {
    document.documentElement.classList.add('light');
  }
}

/** Wire up the toggle button: set its initial icon and save preference on click. */
export function initThemeToggle(btn: HTMLButtonElement): void {
  btn.textContent = document.documentElement.classList.contains('light') ? '☽' : '☀';
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
    btn.textContent = isLight ? '☽' : '☀';
  });
}
