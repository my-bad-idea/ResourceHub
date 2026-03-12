// Theme utilities
function applyTheme(theme) {
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  window.__rhActiveThemeSetting = theme;
  document.documentElement.classList.toggle('dark', isDark);
}

function getTheme() {
  if (window.__rhActiveThemeSetting) return window.__rhActiveThemeSetting;
  if (window.uiPreferences?.getGuestPreferences) {
    return window.uiPreferences.getGuestPreferences().theme;
  }
  return localStorage.getItem('rh_theme') || 'system';
}

// Listen for system theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const theme = getTheme();
  if (theme === 'system') applyTheme('system');
});

window.applyTheme = applyTheme;
window.getTheme = getTheme;
