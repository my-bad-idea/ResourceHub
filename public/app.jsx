// app.jsx — Entry point: initialization + routing

function App() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { route, navigate } = window.useRouter();
  const [initializing, setInitializing] = React.useState(true);

  // Extract route info at top level (needed for useEffect below)
  const { path } = route;
  const isAdmin = !!(state && state.currentUser && state.currentUser.role === 'admin');
  const currentToken = state ? state.token : null;
  const currentUserId = state?.currentUser?.id ?? null;

  const hydrateAuthenticatedPreferences = React.useCallback((user) => {
    if (!user || !window.uiPreferences?.getUserPreferences) return;
    dispatch({
      type: 'HYDRATE_UI_PREFERENCES',
      user,
      preferences: window.uiPreferences.getUserPreferences(user.id),
    });
  }, [dispatch]);

  // 1. App initialization (runs once on mount)
  React.useEffect(() => {
    const theme = state?.theme || window.uiPreferences?.getGuestPreferences?.().theme || 'system';
    if (window.applyTheme) window.applyTheme(theme);

    async function init() {
      try {
        // Check init status
        const initRes = await request('/api/auth/init-status');
        if (!initRes.ok || !initRes.data.data.initialized) {
          setInitializing(false);
          if (window.location.hash !== '#/setup') navigate('#/setup');
          return;
        }

        // Load public config
        const cfgRes = await request('/api/config/system');
        if (cfgRes.ok) dispatch({ type: 'SET_CONFIG', config: cfgRes.data.data });

        // Load categories + tags in parallel
        const [catsRes, tagsRes] = await Promise.allSettled([
          request('/api/categories'),
          request('/api/tags'),
        ]);
        if (catsRes.status === 'fulfilled' && catsRes.value.ok)
          dispatch({ type: 'SET_CATEGORIES', categories: catsRes.value.data.data || [] });
        if (tagsRes.status === 'fulfilled' && tagsRes.value.ok)
          dispatch({ type: 'SET_TAGS', tags: (tagsRes.value.data.data || []).map(t => t.tag || t) });

        // Restore session
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

  // 2. Reload user data when token changes (after login/logout)
  React.useEffect(() => {
    if (initializing) return;
    if (currentToken && currentUserId) {
      // Logged in: reload resources + user-specific lists in parallel
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
      // Logged out: reload public resources only; LOGOUT reducer clears favorites/history/mine
      request('/api/resources').then(res => {
        if (res.ok) dispatch({ type: 'SET_RESOURCES', resources: res.data.data || [] });
      }).catch(() => {});
    }
  }, [currentToken, currentUserId, hydrateAuthenticatedPreferences, initializing]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Admin route guard
  React.useEffect(() => {
    if (!initializing && path === '/admin' && !isAdmin) {
      navigate('#/');
    }
  }, [initializing, path, isAdmin]);

  React.useEffect(() => {
    if (!initializing && path === '/login' && currentToken && currentUserId) {
      navigate('#/');
    }
  }, [initializing, path, currentToken, currentUserId, navigate]);

  // Loading screen
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

  // Router
  if (path === '/setup') return <window.SetupPage />;
  if (path === '/login') {
    if (currentToken && currentUserId) return null;
    return <window.LoginPage />;
  }
  if (path === '/register') return <window.RegisterPage />;
  if (path === '/forgot-password') return <window.ForgotPasswordPage />;
  if (path === '/reset-password') return <window.ResetPasswordPage />;
  if (path === '/admin') {
    if (!isAdmin) return null;
    return <window.AdminPage />;
  }
  if (path === '/resources') return <window.HomePage pageType="results" />;

  return <window.HomePage pageType="overview" />;
}

// Mount React root
const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(
  <window.AppProvider>
    <App />
  </window.AppProvider>
);
