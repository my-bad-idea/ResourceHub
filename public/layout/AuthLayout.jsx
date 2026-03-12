// AuthLayout.jsx
function AuthLayout({ children }) {
  const state = window.useAppState();
  const viewportWidth = window.useViewportWidth();
  const isStacked = viewportWidth < 960;
  const config = state?.config || {};
  const siteTitle = config.siteTitle || 'ResourceHub';
  const siteSubtitle = config.siteSubtitle || '登录以访问企业资源导航';

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, color-mix(in srgb, var(--brand-soft) 72%, transparent), transparent 42%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--surface-tint) 52%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, var(--surface-tint) 22%, var(--bg-primary)), var(--bg-primary) 260px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: viewportWidth < 640 ? '20px 16px' : '32px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(color-mix(in srgb, var(--border) 28%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 28%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: 0.28,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '1120px',
          display: 'grid',
          gridTemplateColumns: isStacked ? '1fr' : 'minmax(320px, 420px) minmax(360px, 520px)',
          alignItems: 'center',
          gap: viewportWidth < 640 ? '20px' : '36px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '18px',
            padding: isStacked ? '0' : '12px 8px 12px 0',
            maxWidth: isStacked ? '560px' : '420px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              width: 'fit-content',
              padding: '8px 12px',
              borderRadius: '999px',
              border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
              background: 'color-mix(in srgb, var(--surface-elevated) 84%, var(--surface-muted))',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: 800,
              }}
            >
              {(siteTitle || 'R')[0].toUpperCase()}
            </div>
            <div style={{ display: 'grid', gap: '2px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{siteTitle}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>企业资源导航与权限访问入口</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ fontSize: isStacked ? '32px' : '42px', lineHeight: 1.05, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
              更顺手地进入你的资源工作台
            </div>
            <div style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '44ch' }}>
              {siteSubtitle}。统一访问入口、个人收藏、最近访问与后台管理，都从这里开始。
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '10px',
              padding: '16px 18px',
              borderRadius: '20px',
              border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
              background: 'color-mix(in srgb, var(--surface-elevated) 90%, var(--surface-muted))',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {[
              '统一管理公开资源与私有资源',
              '支持收藏、最近访问与我创建的快速切换',
              '管理员可直接进入后台配置系统和邮件服务',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    boxShadow: '0 0 0 6px color-mix(in srgb, var(--brand-soft) 72%, transparent)',
                    flexShrink: 0,
                  }}
                />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {children}
        </div>
      </div>
      <window.ToastContainer />
      <window.EmailPreviewModal />
    </div>
  );
}

window.AuthLayout = AuthLayout;
