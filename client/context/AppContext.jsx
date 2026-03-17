// AppContext — global state via useReducer
import React, { createContext, useContext, useReducer } from 'react';
import { getInitialUiState, getGuestPreferences, getUserPreferences, sanitizePreferencesForActor, savePreferencesForActor } from '../utils/preferences';
import { detectBrowserLocale, applyLocale as i18nApplyLocale, _injectContextHooks } from '../utils/i18n';
import { applyTheme } from '../utils/theme';

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

const initialUiPreferences = getInitialUiState() || {
  locale: detectBrowserLocale() || 'zh-Hans',
  theme: localStorage.getItem('rh_theme') || 'system',
  viewMode: 'card',
  sortBy: 'hot',
  quickAccessFilter: null,
};

function persistUiPreferencesForState(state) {
  if (!savePreferencesForActor) return;
  savePreferencesForActor(state.currentUser || null, {
    locale: state.locale,
    theme: state.theme,
    viewMode: state.viewMode,
    sortBy: state.sortBy,
    quickAccessFilter: state.quickAccessFilter,
  });
}

const initialState = {
  currentUser: null,
  token: localStorage.getItem('rh_token'),
  resources: [],
  categories: [],
  tags: [],
  config: null,
  favorites: [],
  history: [],
  mine: [],
  locale: initialUiPreferences.locale,
  theme: initialUiPreferences.theme,
  searchQuery: '',
  selectedCategory: null,
  selectedTags: [],
  quickAccessFilter: initialUiPreferences.quickAccessFilter,
  viewMode: initialUiPreferences.viewMode,
  sortBy: initialUiPreferences.sortBy,
  homeMode: 'overview',
  toasts: [],
  activeModal: null,
  emailPreview: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN': {
      localStorage.setItem('rh_token', action.token);
      const authenticatedPreferences = getUserPreferences(action.user?.id) || initialUiPreferences;
      if (i18nApplyLocale) i18nApplyLocale(authenticatedPreferences.locale);
      if (applyTheme) applyTheme(authenticatedPreferences.theme);
      return {
        ...state,
        currentUser: action.user,
        token: action.token,
        locale: authenticatedPreferences.locale,
        theme: authenticatedPreferences.theme,
        viewMode: authenticatedPreferences.viewMode,
        sortBy: authenticatedPreferences.sortBy,
        quickAccessFilter: null,
        homeMode: 'overview',
      };
    }

    case 'LOGOUT': {
      localStorage.removeItem('rh_token');
      const guestPreferences = getGuestPreferences() || initialUiPreferences;
      if (i18nApplyLocale) i18nApplyLocale(guestPreferences.locale);
      if (applyTheme) applyTheme(guestPreferences.theme);
      return {
        ...state,
        currentUser: null,
        token: null,
        favorites: [],
        history: [],
        mine: [],
        locale: guestPreferences.locale,
        theme: guestPreferences.theme,
        viewMode: guestPreferences.viewMode,
        sortBy: guestPreferences.sortBy,
        quickAccessFilter: guestPreferences.quickAccessFilter,
        homeMode: 'overview',
      };
    }

    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.user };

    case 'SET_RESOURCES':
      return { ...state, resources: action.resources };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };

    case 'SET_TAGS':
      return { ...state, tags: action.tags };

    case 'SET_CONFIG':
      return { ...state, config: action.config };

    case 'SET_FAVORITES':
      return { ...state, favorites: action.favorites };

    case 'SET_HISTORY':
      return { ...state, history: action.history };

    case 'SET_MINE':
      return { ...state, mine: action.mine };

    case 'ADD_RESOURCE':
      return { ...state, resources: [action.resource, ...state.resources] };

    case 'UPDATE_RESOURCE':
      return {
        ...state,
        resources: state.resources.map(r => r.id === action.resource.id ? action.resource : r),
        favorites: state.favorites.map(r => r.id === action.resource.id ? action.resource : r),
        history: state.history.map(r => r.id === action.resource.id ? action.resource : r),
        mine: state.mine.map(r => r.id === action.resource.id ? action.resource : r),
      };

    case 'SET_RESOURCE_VISIT_COUNT': {
      const applyVisitCount = (resource) => (
        resource.id === action.id
          ? { ...resource, visitCount: action.visitCount }
          : resource
      );
      return {
        ...state,
        resources: state.resources.map(applyVisitCount),
        favorites: state.favorites.map(applyVisitCount),
        history: state.history.map(applyVisitCount),
        mine: state.mine.map(applyVisitCount),
      };
    }

    case 'DELETE_RESOURCE':
      return {
        ...state,
        resources: state.resources.filter(r => r.id !== action.id),
        favorites: state.favorites.filter(r => r.id !== action.id),
        history: state.history.filter(r => r.id !== action.id),
        mine: state.mine.filter(r => r.id !== action.id),
      };

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.category.id ? action.category : c),
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.id),
      };

    case 'TOGGLE_FAVORITE': {
      const exists = state.favorites.some(r => r.id === action.resource.id);
      return {
        ...state,
        favorites: exists
          ? state.favorites.filter(r => r.id !== action.resource.id)
          : [action.resource, ...state.favorites],
      };
    }

    case 'SET_THEME': {
      if (applyTheme) applyTheme(action.theme);
      const nextThemeState = { ...state, theme: action.theme };
      persistUiPreferencesForState(nextThemeState);
      return nextThemeState;
    }

    case 'SET_LOCALE': {
      if (i18nApplyLocale) i18nApplyLocale(action.locale);
      const nextLocaleState = { ...state, locale: action.locale };
      persistUiPreferencesForState(nextLocaleState);
      return nextLocaleState;
    }

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };

    case 'SET_CATEGORY': {
      const nextCategoryState = {
        ...state,
        selectedCategory: action.category,
        selectedTags: [],
      };
      persistUiPreferencesForState(nextCategoryState);
      return nextCategoryState;
    }

    case 'TOGGLE_TAG': {
      const tags = state.selectedTags.includes(action.tag)
        ? state.selectedTags.filter(t => t !== action.tag)
        : [...state.selectedTags, action.tag];
      const nextTagState = { ...state, selectedTags: tags };
      persistUiPreferencesForState(nextTagState);
      return nextTagState;
    }

    case 'SET_QUICK_ACCESS_FILTER': {
      const nextQuickAccessState = {
        ...state,
        quickAccessFilter: action.filter,
      };
      persistUiPreferencesForState(nextQuickAccessState);
      return nextQuickAccessState;
    }

    case 'CLEAR_FILTERS': {
      const nextClearState = {
        ...state,
        searchQuery: '',
        selectedCategory: null,
        selectedTags: [],
        quickAccessFilter: null,
      };
      persistUiPreferencesForState(nextClearState);
      return nextClearState;
    }

    case 'SET_VIEW_MODE': {
      const nextViewModeState = { ...state, viewMode: action.viewMode };
      persistUiPreferencesForState(nextViewModeState);
      return nextViewModeState;
    }

    case 'SET_SORT': {
      const nextSortState = { ...state, sortBy: action.sortBy };
      persistUiPreferencesForState(nextSortState);
      return nextSortState;
    }

    case 'SET_HOME_MODE':
      return { ...state, homeMode: action.mode };

    case 'HYDRATE_UI_PREFERENCES': {
      const basePreferences = {
        locale: state.locale,
        theme: state.theme,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        quickAccessFilter: state.quickAccessFilter,
      };
      const nextHydratedPreferences = sanitizePreferencesForActor?.(
        Object.prototype.hasOwnProperty.call(action, 'user') ? action.user : state.currentUser,
        { ...basePreferences, ...(action.preferences || {}) },
        basePreferences,
      ) || { ...basePreferences, ...(action.preferences || {}) };
      if (i18nApplyLocale) i18nApplyLocale(nextHydratedPreferences.locale);
      if (applyTheme) applyTheme(nextHydratedPreferences.theme);
      return {
        ...state,
        locale: nextHydratedPreferences.locale,
        theme: nextHydratedPreferences.theme,
        viewMode: nextHydratedPreferences.viewMode,
        sortBy: nextHydratedPreferences.sortBy,
        quickAccessFilter: nextHydratedPreferences.quickAccessFilter,
      };
    }

    case 'ADD_TOAST': {
      const toast = { id: Date.now() + Math.random(), type: action.toastType || 'info', message: action.message };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    case 'OPEN_MODAL':
      return { ...state, activeModal: action.modal };

    case 'CLOSE_MODAL':
      return { ...state, activeModal: null };

    case 'SET_EMAIL_PREVIEW':
      return { ...state, emailPreview: action.emailPreview };

    default:
      return state;
  }
}

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return React.createElement(
    AppStateContext.Provider,
    { value: state },
    React.createElement(AppDispatchContext.Provider, { value: dispatch }, children)
  );
}

function useAppState() {
  return useContext(AppStateContext);
}

function useAppDispatch() {
  return useContext(AppDispatchContext);
}

_injectContextHooks(useAppState, useAppDispatch);

export { AppProvider, useAppState, useAppDispatch };
