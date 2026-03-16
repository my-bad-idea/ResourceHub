// AuthLayout.jsx
const authStyles = {
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'block',
    marginBottom: '8px',
    letterSpacing: '-0.01em',
  },
  field: { marginBottom: '14px' },
  input: (error = false, withTrailingAction = false) => ({
    width: '100%',
    minHeight: '48px',
    padding: withTrailingAction ? '0 52px 0 14px' : '0 14px',
    border: `1px solid ${error ? 'var(--danger)' : 'color-mix(in srgb, var(--control-border-strong) 72%, var(--control-border))'}`,
    borderRadius: '12px',
    background: 'var(--control-bg)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 1px 2px color-mix(in srgb, var(--text-primary) 4%, transparent)',
  }),
  passwordToggle: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    background: 'color-mix(in srgb, var(--brand-soft) 28%, transparent)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 150ms, color 150ms',
  },
  primaryButton: (disabled = false) => ({
    width: '100%',
    minHeight: '50px',
    padding: '0 16px',
    background: 'var(--brand)',
    color: '#fff',
    border: '1px solid var(--brand)',
    borderRadius: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    opacity: disabled ? 0.82 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 14px 30px color-mix(in srgb, var(--brand) 24%, transparent)',
  }),
  secondaryButton: (disabled = false) => ({
    minHeight: '40px',
    padding: '0 18px',
    border: '1px solid var(--control-border)',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-control)',
    opacity: disabled ? 0.72 : 1,
  }),
  inlineLink: (tone = 'muted') => ({
    background: 'none',
    border: 'none',
    padding: 0,
    color: tone === 'brand' ? 'var(--brand-strong)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: tone === 'brand' ? 700 : 600,
  }),
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  footerCenter: {
    textAlign: 'center',
  },
  helperText: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginTop: '8px',
    lineHeight: 1.5,
  },
  errorText: {
    fontSize: '12px',
    color: 'var(--danger)',
    marginTop: '6px',
    lineHeight: 1.5,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--danger)',
    background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))',
    border: '1px solid color-mix(in srgb, var(--danger) 20%, var(--control-border))',
    borderRadius: '12px',
    padding: '11px 12px',
    marginBottom: '14px',
  },
};

function AuthCard({ kicker, title, subtitle, logoLetter = 'R', width = '438px', children }) {
  const viewportWidth = window.useViewportWidth();
  const isCompact = viewportWidth < 640;

  return (
    <div style={{ width: isCompact ? '100%' : width, maxWidth: '100%', position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: isCompact ? '16px 10px 0 10px' : '18px -16px -16px 16px',
          borderRadius: '30px',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand-soft) 56%, transparent) 0%, transparent 82%)',
          opacity: 0.9,
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted)) 0%, var(--surface-elevated) 100%)',
          border: '1px solid color-mix(in srgb, var(--outline-strong) 82%, var(--border))',
          borderRadius: '26px',
          padding: isCompact ? '28px 22px' : '38px 38px 36px',
          boxShadow: '0 24px 54px rgba(19,34,56,0.16)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '28px',
            right: '28px',
            top: 0,
            height: '4px',
            borderRadius: '0 0 999px 999px',
            background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--brand) 72%, #fff) 50%, transparent 100%)',
            opacity: 0.88,
          }}
        />
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {kicker ? (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--brand-strong)',
                marginBottom: '12px',
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'var(--brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              margin: '0 auto 18px',
              boxShadow: '0 14px 24px color-mix(in srgb, var(--brand) 20%, transparent)',
            }}
          >
            {logoLetter}
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 auto',
                maxWidth: '30ch',
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function AuthLayout({ children }) {
  const state = window.useAppState();
  const { locale, setLocale, locales, getNativeLabel, t } = window.useI18n();
  const viewportWidth = window.useViewportWidth();
  const isStacked = viewportWidth < 960;
  const config = state?.config || {};
  const { History, LayoutGrid, ShieldCheck, Languages, ChevronDown } = lucide;
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);
  const languageMenuRef = React.useRef(null);

  React.useEffect(() => {
    const handleMouseDown = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
  const heroLineTwo = locale === 'zh-Hant'
    ? { prefix: '資源', accent: '工作臺' }
    : locale === 'en'
      ? { prefix: 'Resource ', accent: 'Workspace' }
      : locale === 'ja'
        ? { prefix: 'リソース', accent: 'ワークスペース' }
        : { prefix: '资源', accent: '工作台' };
  const capabilityItems = [
    {
      title: '资源管理',
      description: '公开与私有资源统一进入，常用内容不再分散。',
      Icon: LayoutGrid,
    },
    {
      title: '快速切换',
      description: '收藏、最近访问与我创建的内容都能快速回到手边。',
      Icon: History,
    },
    {
      title: '后台配置',
      description: '管理员可直接进入系统配置与邮件服务管理。',
      Icon: ShieldCheck,
    },
  ];
  const introSection = (
    <div
      style={{
        display: 'grid',
        gap: isStacked ? '14px' : '16px',
        padding: isStacked ? '0' : '2px 0',
        maxWidth: isStacked ? '560px' : '396px',
        transform: isStacked ? 'none' : 'translateY(-28px)',
      }}
    >
      <div style={{ display: 'grid', gap: '9px' }}>
        <div style={{ display: 'grid', gap: '7px' }}>
          <div style={{ fontSize: isStacked ? '30px' : '39px', lineHeight: 1.05, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
            <span style={{ display: 'block' }}>{t('更顺手地进入你的')}</span>
            <span style={{ display: 'block' }}>
              {heroLineTwo.prefix}<span style={{ color: 'var(--brand-strong)' }}>{heroLineTwo.accent}</span>
            </span>
          </div>
          <div style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '24ch' }}>
            统一入口与常用访问能力，从这里开始。
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '14px',
          padding: isStacked ? '18px 16px' : '18px',
          borderRadius: '18px',
          border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
          background: 'color-mix(in srgb, var(--surface-elevated) 82%, var(--bg-tertiary))',
          boxShadow: '0 10px 20px color-mix(in srgb, var(--text-primary) 4%, transparent)',
        }}
      >
        <div style={{ display: 'grid', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>常用入口能力</div>
          <strong style={{ fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>登录后可直接访问的核心能力</strong>
        </div>

        <div style={{ display: 'grid' }}>
          {capabilityItems.map(({ title, description, Icon }, index) => (
            <div
              key={title}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '12px',
                alignItems: 'start',
                padding: index === 0 ? '0 0 12px' : '12px 0',
                borderTop: index === 0 ? 'none' : '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'color-mix(in srgb, var(--brand-soft) 64%, var(--surface-elevated))',
                  color: 'var(--brand-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand) 14%, transparent)',
                  flexShrink: 0,
                }}
              >
                <Icon size={17} />
              </div>

              <div style={{ display: 'grid', gap: '3px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const formSection = (
    <div
      style={{
        display: 'flex',
        justifyContent: isStacked ? 'center' : 'flex-end',
        width: '100%',
        transform: isStacked ? 'none' : 'translateY(-10px)',
      }}
    >
      {children}
    </div>
  );

  return (
      <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 74% 34%, color-mix(in srgb, var(--brand-soft) 72%, transparent) 0%, transparent 24%),
          radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--brand-soft) 42%, transparent) 0%, transparent 22%),
          linear-gradient(135deg, color-mix(in srgb, var(--brand-soft) 20%, var(--bg-primary)) 0%, var(--bg-primary) 42%, color-mix(in srgb, var(--surface-tint) 12%, var(--bg-primary)) 100%),
          var(--bg-primary)
        `,
        display: 'flex',
        alignItems: isStacked ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: viewportWidth < 640 ? '20px 16px' : '32px 24px',
        position: 'relative',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(color-mix(in srgb, var(--border) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border) 24%, transparent) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            opacity: 0.06,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: isStacked ? '360px' : '540px',
            height: isStacked ? '360px' : '540px',
            right: isStacked ? '50%' : '8%',
            top: isStacked ? '20%' : '48%',
            transform: isStacked ? 'translate(50%, -50%)' : 'translateY(-50%)',
            background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-soft) 68%, transparent) 0%, transparent 68%)',
            opacity: 0.95,
          }}
        />
      </div>
      <div
        ref={languageMenuRef}
        style={{
          position: 'fixed',
          top: viewportWidth < 640 ? '14px' : '20px',
          right: viewportWidth < 640 ? '14px' : '20px',
          zIndex: 2,
        }}
      >
        <button
          data-rh-auth-language-trigger
          type="button"
          onClick={() => setShowLanguageMenu((value) => !value)}
          style={{
            minHeight: '38px',
            padding: '0 12px',
            borderRadius: '12px',
            border: '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
            background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--surface-muted))',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-control)',
          }}
        >
          <Languages size={15} />
          <span>{getNativeLabel(locale)}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
        {showLanguageMenu && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: '168px',
              background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
              border: '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '4px',
            }}
          >
            {locales.map((item) => (
              <button
                key={item}
                data-rh-auth-language-option={item}
                type="button"
                onClick={() => { setLocale(item); setShowLanguageMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: locale === item ? 'color-mix(in srgb, var(--brand-soft) 82%, var(--control-bg))' : 'transparent',
                  color: locale === item ? 'var(--brand-strong)' : 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: locale === item ? 700 : 500,
                }}
              >
                {getNativeLabel(item)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: isStacked ? '1fr' : 'minmax(320px, 400px) minmax(420px, 500px)',
          alignItems: 'center',
          gap: viewportWidth < 640 ? '24px' : '38px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {isStacked ? formSection : introSection}
        {isStacked ? introSection : formSection}
      </div>
      <window.ToastContainer />
      <window.EmailPreviewModal />
    </div>
  );
}

window.authStyles = authStyles;
window.AuthCard = AuthCard;
window.AuthLayout = AuthLayout;
