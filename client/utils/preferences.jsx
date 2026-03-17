import { detectBrowserLocale } from './i18n';

const UI_PREFERENCES_KEY = 'rh_ui_preferences_v1';
const LEGACY_THEME_KEY = 'rh_theme';

const DEFAULT_UI_PREFERENCES = Object.freeze({
  locale: 'zh-Hans',
  theme: 'system',
  viewMode: 'card',
  sortBy: 'hot',
  quickAccessFilter: null,
});

const VALID_LOCALES = new Set(['zh-Hans', 'zh-Hant', 'en', 'ja']);
const VALID_THEMES = new Set(['light', 'dark', 'system']);
const VALID_VIEW_MODES = new Set(['card', 'list', 'timeline']);
const VALID_SORTS = new Set(['hot', 'created', 'updated']);
const VALID_QUICK_ACCESS = new Set(['favorites', 'history', 'mine']);

function getDefaultLocale() {
  return detectBrowserLocale() || DEFAULT_UI_PREFERENCES.locale;
}

function cloneDefaultUiPreferences() {
  return {
    locale: getDefaultLocale(),
    theme: DEFAULT_UI_PREFERENCES.theme,
    viewMode: DEFAULT_UI_PREFERENCES.viewMode,
    sortBy: DEFAULT_UI_PREFERENCES.sortBy,
    quickAccessFilter: DEFAULT_UI_PREFERENCES.quickAccessFilter,
  };
}

function sanitizeLocale(locale, fallback = getDefaultLocale()) {
  return VALID_LOCALES.has(locale) ? locale : fallback;
}

function sanitizeTheme(theme, fallback = DEFAULT_UI_PREFERENCES.theme) {
  return VALID_THEMES.has(theme) ? theme : fallback;
}

function sanitizeViewMode(viewMode, fallback = DEFAULT_UI_PREFERENCES.viewMode) {
  return VALID_VIEW_MODES.has(viewMode) ? viewMode : fallback;
}

function sanitizeSortBy(sortBy, fallback = DEFAULT_UI_PREFERENCES.sortBy) {
  return VALID_SORTS.has(sortBy) ? sortBy : fallback;
}

function sanitizeQuickAccessFilter(quickAccessFilter, allowQuickAccess, fallback = null) {
  if (!allowQuickAccess) return null;
  if (quickAccessFilter === null || quickAccessFilter === undefined || quickAccessFilter === '') return null;
  return VALID_QUICK_ACCESS.has(quickAccessFilter) ? quickAccessFilter : fallback;
}

function sanitizePreferenceRecord(record = {}, options = {}) {
  const fallback = options.fallback || cloneDefaultUiPreferences();
  const allowQuickAccess = Boolean(options.allowQuickAccess);
  return {
    locale: sanitizeLocale(record.locale, fallback.locale),
    theme: sanitizeTheme(record.theme, fallback.theme),
    viewMode: sanitizeViewMode(record.viewMode, fallback.viewMode),
    sortBy: sanitizeSortBy(record.sortBy, fallback.sortBy),
    quickAccessFilter: sanitizeQuickAccessFilter(record.quickAccessFilter, allowQuickAccess, allowQuickAccess ? fallback.quickAccessFilter : null),
  };
}

function buildEmptyPreferenceStore() {
  return {
    guest: cloneDefaultUiPreferences(),
    users: {},
  };
}

function safeReadLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeWriteLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore quota / privacy mode failures. The app should remain usable.
  }
}

function readLegacyTheme() {
  const legacyTheme = safeReadLocalStorage(LEGACY_THEME_KEY);
  return sanitizeTheme(legacyTheme, null);
}

function readRawPreferenceStore() {
  const raw = safeReadLocalStorage(UI_PREFERENCES_KEY);
  if (!raw) return { raw: null, hasStored: false };
  try {
    return { raw: JSON.parse(raw), hasStored: true };
  } catch (_error) {
    return { raw: null, hasStored: true };
  }
}

function normalizePreferenceStore(rawStore, hasStored) {
  const store = buildEmptyPreferenceStore();
  const legacyTheme = readLegacyTheme();
  const source = rawStore && typeof rawStore === 'object' && !Array.isArray(rawStore) ? rawStore : {};
  const guestFallback = cloneDefaultUiPreferences();

  if (legacyTheme) guestFallback.theme = legacyTheme;

  store.guest = sanitizePreferenceRecord(source.guest || guestFallback, {
    allowQuickAccess: false,
    fallback: guestFallback,
  });

  const users = source.users && typeof source.users === 'object' && !Array.isArray(source.users) ? source.users : {};
  Object.keys(users).forEach((userId) => {
    if (!userId) return;
    store.users[userId] = sanitizePreferenceRecord(users[userId], {
      allowQuickAccess: true,
      fallback: { ...store.guest, quickAccessFilter: null },
    });
  });

  const serializedStore = JSON.stringify(store);
  const shouldPersist =
    !hasStored ||
    Boolean(legacyTheme) ||
    serializedStore !== JSON.stringify(source || {});

  return { store, shouldPersist };
}

function ensurePreferenceStore() {
  const { raw, hasStored } = readRawPreferenceStore();
  const { store, shouldPersist } = normalizePreferenceStore(raw, hasStored);
  if (shouldPersist) safeWriteLocalStorage(UI_PREFERENCES_KEY, JSON.stringify(store));
  return store;
}

function getGuestPreferences() {
  const store = ensurePreferenceStore();
  return { ...store.guest };
}

function getUserPreferences(userId) {
  const store = ensurePreferenceStore();
  const guestPreferences = { ...store.guest, quickAccessFilter: null };
  if (userId === null || userId === undefined || userId === '') return guestPreferences;
  const storedUserPreferences = store.users[String(userId)];
  if (!storedUserPreferences) return guestPreferences;
  return sanitizePreferenceRecord(storedUserPreferences, {
    allowQuickAccess: true,
    fallback: guestPreferences,
  });
}

function getPreferencesForActor(user) {
  if (user && user.id !== null && user.id !== undefined) {
    return getUserPreferences(user.id);
  }
  return getGuestPreferences();
}

function sanitizePreferencesForActor(user, preferences, fallback = null) {
  const actorFallback = fallback || getPreferencesForActor(user);
  return sanitizePreferenceRecord({ ...actorFallback, ...(preferences || {}) }, {
    allowQuickAccess: Boolean(user && user.id !== null && user.id !== undefined),
    fallback: actorFallback,
  });
}

function savePreferencesForActor(user, preferences) {
  const store = ensurePreferenceStore();
  const isUserScoped = Boolean(user && user.id !== null && user.id !== undefined);
  const nextPreferences = sanitizePreferencesForActor(user, preferences);

  if (isUserScoped) {
    store.users[String(user.id)] = nextPreferences;
  } else {
    store.guest = sanitizePreferenceRecord(nextPreferences, {
      allowQuickAccess: false,
      fallback: cloneDefaultUiPreferences(),
    });
  }

  safeWriteLocalStorage(UI_PREFERENCES_KEY, JSON.stringify(store));
  return isUserScoped ? { ...store.users[String(user.id)] } : { ...store.guest };
}

function extractPreferencesFromState(state) {
  return sanitizePreferenceRecord({
    locale: state?.locale,
    theme: state?.theme,
    viewMode: state?.viewMode,
    sortBy: state?.sortBy,
    quickAccessFilter: state?.quickAccessFilter,
  }, {
    allowQuickAccess: Boolean(state?.currentUser && state.currentUser.id !== null && state.currentUser.id !== undefined),
    fallback: getPreferencesForActor(state?.currentUser || null),
  });
}

function getInitialUiState() {
  return getGuestPreferences();
}

export {
  UI_PREFERENCES_KEY,
  LEGACY_THEME_KEY,
  DEFAULT_UI_PREFERENCES,
  getInitialUiState,
  getGuestPreferences,
  getUserPreferences,
  getPreferencesForActor,
  sanitizePreferencesForActor,
  savePreferencesForActor,
  extractPreferencesFromState,
};
