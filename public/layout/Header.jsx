const { useState, useEffect, useRef } = React;
const { Search, Sun, Moon, Monitor, User, LogOut, Settings, Shield, ChevronDown } = lucide;

function Header({ variant = 'default', showSearch = true }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { navigate } = window.useRouter();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const themeMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const viewportWidth = window.useViewportWidth();
  const isTablet = viewportWidth < 1100;
  const isMobile = viewportWidth < 720;

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) setShowThemeMenu(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!state) return null;
  const { currentUser, theme, config, searchQuery } = state;
  const isHomeVariant = variant === 'home';
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const baseControlBorderColor = isHomeVariant
    ? 'color-mix(in srgb, var(--control-border) 82%, transparent)'
    : 'var(--control-border)';
  const baseControlBackground = isHomeVariant
    ? 'color-mix(in srgb, var(--control-bg) 82%, transparent)'
    : 'color-mix(in srgb, var(--control-bg) 94%, var(--control-bg-muted))';
  const baseControlShadow = isHomeVariant
    ? 'var(--shadow-control)'
    : 'var(--shadow-control)';
  const menuSurface = 'color-mix(in srgb, var(--surface-elevated) 94%, var(--control-bg-muted))';
  const menuOptionHover = 'color-mix(in srgb, var(--surface-tint) 62%, var(--control-bg))';
  const menuOptionActive = 'color-mix(in srgb, var(--brand-soft) 82%, var(--control-bg))';
  const searchFieldBackground = isHomeVariant
    ? isDarkTheme
      ? 'color-mix(in srgb, var(--surface-elevated) 82%, var(--control-bg-muted))'
      : 'var(--surface-elevated)'
    : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--control-bg-muted))';
  const searchFieldFocusBackground = isHomeVariant
    ? isDarkTheme
      ? 'color-mix(in srgb, var(--surface-elevated) 90%, var(--control-bg))'
      : 'var(--surface-elevated)'
    : 'color-mix(in srgb, var(--surface-elevated) 96%, var(--control-bg))';

  const themeOptions = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ];

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const logoInitial = (config?.siteTitle || '资')[0];
  const baseControlButtonStyle = {
    background: baseControlBackground,
    border: `1px solid ${baseControlBorderColor}`,
    borderRadius: '12px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'background 150ms, border-color 150ms, box-shadow 150ms',
    boxShadow: baseControlShadow,
  };

  const searchField = showSearch ? (
    <div style={{
      width: '100%',
      maxWidth: isTablet ? '100%' : '600px',
      minWidth: 0,
      position: 'relative',
      justifySelf: isTablet ? 'stretch' : 'center',
    }}>
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <Search size={16} />
      </div>
      <input
        ref={searchRef}
        data-rh-global-search
        type="text"
        value={searchQuery || ''}
        onChange={(e) => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
        placeholder={isMobile ? '搜索资源...' : '搜索资源名称、描述、标签... (Ctrl+K)'}
        style={{
          width: '100%',
          minHeight: isMobile ? '38px' : '40px',
          padding: '9px 14px 9px 40px',
          background: searchFieldBackground,
          border: `1px solid ${baseControlBorderColor}`,
          borderRadius: '15px',
          fontSize: '14px',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
          boxShadow: 'var(--shadow-control)',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--brand)';
          e.target.style.background = searchFieldFocusBackground;
          e.target.style.boxShadow = isHomeVariant
            ? '0 0 0 1px color-mix(in srgb, var(--brand) 24%, transparent), 0 0 0 6px color-mix(in srgb, var(--brand) 10%, transparent), var(--shadow-control-hover)'
            : '0 0 0 1px color-mix(in srgb, var(--brand) 24%, transparent), 0 0 0 6px color-mix(in srgb, var(--brand) 10%, transparent), var(--shadow-control-hover)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = baseControlBorderColor;
          e.target.style.background = searchFieldBackground;
          e.target.style.boxShadow = 'var(--shadow-control)';
        }}
      />
    </div>
  ) : null;

  const brand = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        minWidth: 0,
        justifySelf: 'start',
      }}
      onClick={() => navigate('#/')}
    >
      {config?.logoUrl ? (
        <img src={config.logoUrl} style={{ width: '34px', height: '34px', borderRadius: '10px', objectFit: 'contain', border: '1px solid color-mix(in srgb, var(--border-strong) 82%, var(--border))', background: 'var(--surface-elevated)', boxShadow: 'var(--shadow-card)' }} />
      ) : (
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: 'var(--brand)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          boxShadow: isHomeVariant ? '0 0 0 1px color-mix(in srgb, white 12%, transparent)' : 'none',
        }}>{logoInitial}</div>
      )}
      {!isMobile && (
        <span data-rh-header-title style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
          {config?.siteTitle || '资源导航系统'}
        </span>
      )}
    </div>
  );

  const actions = (
    <div data-rh-header-actions style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'end', justifyContent: 'flex-end' }}>
      <div ref={themeMenuRef} style={{ position: 'relative' }}>
        <button
          data-rh-theme-trigger
          onClick={() => setShowThemeMenu((value) => !value)}
          style={{
            ...baseControlButtonStyle,
            width: '38px',
            height: '38px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--brand-soft) 54%, var(--surface-elevated))';
            e.currentTarget.style.borderColor = 'var(--brand)';
            e.currentTarget.style.boxShadow = 'var(--shadow-control-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = baseControlButtonStyle.background;
            e.currentTarget.style.borderColor = baseControlBorderColor;
            e.currentTarget.style.boxShadow = baseControlShadow;
          }}
        >
          <ThemeIcon size={18} />
        </button>

        {showThemeMenu && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: '160px',
            background: menuSurface,
            border: '1px solid var(--control-border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-dropdown)',
            padding: '4px',
            zIndex: 200,
          }}>
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                data-rh-theme-option={opt.value}
                onClick={() => { dispatch({ type: 'SET_THEME', theme: opt.value }); setShowThemeMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '0 10px',
                  height: '36px',
                  background: theme === opt.value ? menuOptionActive : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme === opt.value ? 'var(--brand-strong)' : 'var(--text-primary)',
                  fontSize: '14px',
                  borderRadius: '8px',
                  fontWeight: theme === opt.value ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (theme !== opt.value) e.currentTarget.style.background = menuOptionHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = theme === opt.value ? menuOptionActive : 'transparent'; }}
              >
                <opt.icon size={15} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentUser ? (
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            data-rh-user-trigger
            onClick={() => setShowUserMenu((value) => !value)}
            style={{
              ...baseControlButtonStyle,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              padding: isMobile ? '4px 10px 4px 6px' : '4px 12px 4px 6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--brand-soft) 52%, var(--surface-elevated))';
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.boxShadow = 'var(--shadow-control-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = baseControlButtonStyle.background;
              e.currentTarget.style.borderColor = baseControlBorderColor;
              e.currentTarget.style.boxShadow = baseControlShadow;
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {(currentUser.displayName || currentUser.username || 'U')[0].toUpperCase()}
            </div>
            {!isMobile && (
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.displayName || currentUser.username}
              </span>
            )}
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: '180px',
              background: menuSurface,
              border: '1px solid var(--control-border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '4px',
              zIndex: 200,
            }}>
              {[
                { label: '个人信息', icon: User, action: () => { dispatch({ type: 'OPEN_MODAL', modal: 'profile' }); setShowUserMenu(false); } },
                { label: '修改密码', icon: Settings, action: () => { dispatch({ type: 'OPEN_MODAL', modal: 'changePassword' }); setShowUserMenu(false); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '0 10px',
                    height: '36px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    borderRadius: '8px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = menuOptionHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <item.icon size={14} style={{ color: 'var(--text-secondary)' }} />
                  {item.label}
                </button>
              ))}

              <div style={{ height: '1px', background: 'color-mix(in srgb, var(--control-border) 72%, transparent)', margin: '4px 8px' }} />

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => { navigate('#/admin'); setShowUserMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '0 10px',
                    height: '36px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    borderRadius: '8px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = menuOptionHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Shield size={14} style={{ color: 'var(--text-secondary)' }} />
                  后台管理
                </button>
              )}

              {currentUser.role === 'admin' && (
                <div style={{ height: '1px', background: 'color-mix(in srgb, var(--control-border) 72%, transparent)', margin: '4px 8px' }} />
              )}

              <button
                data-rh-logout-trigger
                onClick={() => { dispatch({ type: 'LOGOUT' }); setShowUserMenu(false); navigate('#/'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '0 10px',
                  height: '36px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  fontSize: '14px',
                  borderRadius: '8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 10%, var(--control-bg))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={14} />
                注销登录
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate('#/login')}
          style={{
            ...baseControlButtonStyle,
            minHeight: '38px',
            padding: isMobile ? '0 14px' : '0 16px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--brand-soft) 52%, var(--surface-elevated))';
            e.currentTarget.style.borderColor = 'var(--brand)';
            e.currentTarget.style.boxShadow = 'var(--shadow-control-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = baseControlButtonStyle.background;
            e.currentTarget.style.borderColor = baseControlBorderColor;
            e.currentTarget.style.boxShadow = baseControlShadow;
          }}
        >
          登录
        </button>
      )}
    </div>
  );

  return (
    <header style={{
      minHeight: isTablet ? 'auto' : '72px',
      position: 'relative',
      top: 'auto',
      zIndex: 1,
      background: isHomeVariant
        ? 'color-mix(in srgb, var(--surface-elevated) 46%, transparent)'
        : 'color-mix(in srgb, var(--surface-elevated) 88%, transparent)',
      borderBottom: isHomeVariant
        ? 'none'
        : '1px solid color-mix(in srgb, var(--border-strong) 72%, transparent)',
      display: isTablet ? 'flex' : 'grid',
      gridTemplateColumns: isTablet
        ? undefined
        : showSearch
          ? 'minmax(220px, 1fr) minmax(420px, 620px) minmax(220px, 1fr)'
          : 'minmax(220px, 1fr) minmax(220px, auto)',
      alignItems: 'center',
      flexWrap: isTablet ? 'wrap' : 'nowrap',
      padding: isMobile ? '10px 16px' : '12px 24px',
      gap: isTablet ? '10px' : '16px',
      backdropFilter: 'blur(16px)',
      boxShadow: isHomeVariant
        ? 'none'
        : '0 8px 24px color-mix(in srgb, black 6%, transparent)',
    }}>
      {brand}
      {!isTablet && searchField}
      {actions}
      {isTablet && searchField}
    </header>
  );
}

window.Header = Header;
