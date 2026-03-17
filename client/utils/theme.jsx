import { getGuestPreferences } from './preferences';

let activeThemeSetting = null;

function applyTheme(theme) {
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  activeThemeSetting = theme;
  document.documentElement.classList.toggle('dark', isDark);
}

function getTheme() {
  if (activeThemeSetting) return activeThemeSetting;
  return getGuestPreferences().theme;
}

// Listen for system theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const theme = getTheme();
  if (theme === 'system') applyTheme('system');
});

export { applyTheme, getTheme };
