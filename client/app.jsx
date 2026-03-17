import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider, useAppState, useAppDispatch } from './context/AppContext';
import { useApi } from './hooks/useApi';
import { useRouter } from './hooks/useRouter';
import { getCurrentLocale, applyLocale, translateText, initI18nPatch } from './utils/i18n';
import { getUserPreferences, getGuestPreferences } from './utils/preferences';
import { applyTheme } from './utils/theme';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';

initI18nPatch();

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();
  const { route, navigate } = useRouter();
  const [initializing, setInitializing] = React.useState(true);

  const { path } = route;
  const isAdmin = !!(state && state.currentUser && state.currentUser.role === 'admin');
  const currentToken = state ? state.token : null;
  const currentUserId = state?.currentUser?.id ?? null;
  const currentLocale = state?.locale || getCurrentLocale() || 'zh-Hans';

  const hydrateAuthenticatedPreferences = React.useCallback((user) => {
    if (!user) return;
    dispatch({
      type: 'HYDRATE_UI_PREFERENCES',
      user,
      preferences: getUserPreferences(user.id),
    });
  }, [dispatch]);

  React.useEffect(() => {
    applyLocale(currentLocale);
    const theme = state?.theme || getGuestPreferences().theme || 'system';
    applyTheme(theme);

    async function init() {
      try {
        const initRes = await request('/api/auth/init-status');
        if (!initRes.ok || !initRes.data.data.initialized) {
          setInitializing(false);
          if (window.location.hash !== '#/setup') navigate('#/setup');
          return;
        }

        const cfgRes = await request('/api/config/system');
        if (cfgRes.ok) dispatch({ type: 'SET_CONFIG', config: cfgRes.data.data });

        const [catsRes, tagsRes] = await Promise.allSettled([
          request('/api/categories'),
          request('/api/tags'),
        ]);
        if (catsRes.status === 'fulfilled' && catsRes.value.ok)
          dispatch({ type: 'SET_CATEGORIES', categories: catsRes.value.data.data || [] });
        if (tagsRes.status === 'fulfilled' && tagsRes.value.ok)
          dispatch({ type: 'SET_TAGS', tags: (tagsRes.value.data.data || []).map(t => t.tag || t) });

        const token = sessionStorage.getItem('rh_token');
        let restoredAuthenticatedSession = false;
        if (token) {
          const meRes = await request('/api/auth/me');
          if (meRes.ok) {
            dispatch({ type: 'LOGIN', user: meRes.data.data, token });
            restoredAuthenticatedSession = true;
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        }

        if (!restoredAuthenticatedSession) {
          const resourcesRes = await request('/api/resources');
          if (resourcesRes.ok) {
            dispatch({ type: 'SET_RESOURCES', resources: resourcesRes.data.data || [] });
          }
        }

      } catch (e) {
        console.error('[ResourceHub] Init error:', e);
      }
      setInitializing(false);
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    document.title = state?.config?.siteTitle || translateText('资源导航系统') || '资源导航系统';
  }, [currentLocale, state?.config?.siteTitle]);

  React.useEffect(() => {
    if (initializing) return;
    if (currentToken && currentUserId) {
      Promise.allSettled([
        request('/api/resources'),
        request('/api/resources/favorites'),
        request('/api/resources/history'),
        request('/api/resources/mine'),
      ]).then(([resRes, favRes, histRes, mineRes]) => {
        if (resRes.status === 'fulfilled' && resRes.value.ok)
          dispatch({ type: 'SET_RESOURCES', resources: resRes.value.data.data || [] });
        if (favRes.status === 'fulfilled' && favRes.value.ok)
          dispatch({ type: 'SET_FAVORITES', favorites: favRes.value.data.data || [] });
        if (histRes.status === 'fulfilled' && histRes.value.ok)
          dispatch({ type: 'SET_HISTORY', history: histRes.value.data.data || [] });
        if (mineRes.status === 'fulfilled' && mineRes.value.ok)
          dispatch({ type: 'SET_MINE', mine: mineRes.value.data.data || [] });
        hydrateAuthenticatedPreferences({ id: currentUserId });
      }).catch(() => {});
    } else if (currentToken && !currentUserId) {
      return;
    } else {
      request('/api/resources').then(res => {
        if (res.ok) dispatch({ type: 'SET_RESOURCES', resources: res.data.data || [] });
      }).catch(() => {});
    }
  }, [currentToken, currentUserId, hydrateAuthenticatedPreferences, initializing, request]);

  React.useEffect(() => {
    if (!initializing && path.startsWith('/admin') && !isAdmin) {
      navigate('#/');
    }
  }, [initializing, path, isAdmin, navigate]);

  React.useEffect(() => {
    if (!initializing && isAdmin && (path === '/admin' || path === '/admin/')) {
      navigate('#/admin/categories');
    }
  }, [initializing, isAdmin, path, navigate]);

  React.useEffect(() => {
    if (!initializing && path === '/login' && currentToken && currentUserId) {
      navigate('#/');
    }
  }, [initializing, path, currentToken, currentUserId, navigate]);

  if (initializing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'var(--brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, margin: '0 auto 16px',
          }}>R</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>加载中…</p>
        </div>
      </div>
    );
  }

  if (path === '/setup') return <SetupPage />;
  if (path === '/login') {
    if (currentToken && currentUserId) return null;
    return <LoginPage />;
  }
  if (path === '/register') return <RegisterPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;
  if (path.startsWith('/admin')) {
    if (!isAdmin) return null;
    if (path === '/admin' || path === '/admin/') return null;
    return <AdminPage />;
  }
  if (path === '/resources') return <HomePage pageType="results" />;

  return <HomePage pageType="overview" />;
}

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(
  <AppProvider>
    <App />
  </AppProvider>
);
