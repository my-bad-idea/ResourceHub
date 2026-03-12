// AppLayout.jsx
function AppLayout({ children, showSidebar = true, contentPaddingTop = null, headerVariant = 'default', showHeaderSearch = true }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const activeModal = state?.activeModal;
  const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });
  const viewportWidth = window.useViewportWidth();
  const isStacked = viewportWidth < 960;
  const isHomeHeader = headerVariant === 'home';
  const headerShellRef = React.useRef(null);
  const [headerHeight, setHeaderHeight] = React.useState(isHomeHeader ? 72 : 72);
  const layoutDirection = showSidebar && !isStacked ? 'row' : 'column';

  React.useLayoutEffect(() => {
    const headerShell = headerShellRef.current;
    if (!headerShell) return undefined;

    const syncHeaderHeight = () => {
      const nextHeight = Math.max(Math.round(headerShell.getBoundingClientRect().height || 0), 1);
      setHeaderHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    syncHeaderHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeaderHeight);
      return () => window.removeEventListener('resize', syncHeaderHeight);
    }

    const resizeObserver = new ResizeObserver(() => syncHeaderHeight());
    resizeObserver.observe(headerShell);
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, [isHomeHeader, showHeaderSearch, viewportWidth]);

  const layoutBody = (
    <>
      <div
        ref={headerShellRef}
        data-rh-layout-header-shell
        style={{
          position: 'fixed',
          inset: '0 0 auto 0',
          zIndex: 120,
        }}
      >
        <window.Header variant={headerVariant} showSearch={showHeaderSearch} />
        <div
          data-rh-layout-divider
          style={{
            width: '100%',
            height: '1px',
            background: 'color-mix(in srgb, var(--border-strong) 34%, transparent)',
            opacity: 0.9,
          }}
        />
      </div>
      <div aria-hidden="true" style={{ height: 'var(--app-header-height, 73px)' }} />
      <div style={{ display: 'flex', flexDirection: layoutDirection, minHeight: 'calc(100vh - var(--app-header-height, 73px))' }}>
        {showSidebar && (
          <window.Sidebar isCompact={isStacked} />
        )}
        <main style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          paddingTop: contentPaddingTop ?? (viewportWidth < 640 ? '16px' : '24px'),
          paddingRight: viewportWidth < 640 ? '16px' : '24px',
          paddingBottom: viewportWidth < 640 ? '16px' : '24px',
          paddingLeft: viewportWidth < 640 ? '16px' : '24px',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>
    </>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        '--app-header-height': `${headerHeight}px`,
      }}
    >
      {isHomeHeader ? (
        <div
          data-rh-home-top-surface
          style={{
            minHeight: '100vh',
            background: `
              linear-gradient(
                180deg,
                color-mix(in srgb, var(--surface-tint) 16%, var(--surface-elevated)) 0%,
                color-mix(in srgb, var(--surface-tint) 10%, var(--surface-elevated)) 72px,
                color-mix(in srgb, var(--surface-muted) 8%, var(--bg-primary)) 132px,
                var(--bg-primary) 220px
              )
            `,
          }}
        >
          {layoutBody}
        </div>
      ) : layoutBody}
      <window.ToastContainer />
      <window.EmailPreviewModal />
      <window.ProfileModal isOpen={activeModal === 'profile'} onClose={closeModal} />
      <window.ChangePasswordModal isOpen={activeModal === 'changePassword'} onClose={closeModal} />
    </div>
  );
}

window.AppLayout = AppLayout;
