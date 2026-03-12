// AdminLayout.jsx
function AdminLayout({ children, activeTab }) {
  const { navigate } = window.useRouter();
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const activeModal = state?.activeModal;
  const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });
  const viewportWidth = window.useViewportWidth();
  const isStacked = viewportWidth < 960;
  const { LayoutGrid, Tag, Users, Settings, Mail, ArrowLeft } = lucide;

  const navItems = [
    { key: 'categories', label: '类别管理', Icon: LayoutGrid },
    { key: 'tags', label: '标签管理', Icon: Tag },
    { key: 'users', label: '用户管理', Icon: Users },
    { key: 'config', label: '系统配置', Icon: Settings },
    { key: 'email', label: '邮件服务', Icon: Mail },
  ];

  const sectionTitleStyle = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    padding: isStacked ? '0 8px 8px' : '8px 4px 8px',
  };

  const navButtonStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '36px',
    width: isStacked ? '100%' : 'calc(100% - 16px)',
    borderRadius: '8px',
    padding: '8px 12px',
    margin: isStacked ? 0 : '2px 8px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    background: isSelected ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'none',
    color: isSelected ? 'var(--brand)' : 'var(--text-primary)',
    fontWeight: isSelected ? 600 : 400,
    transition: 'background 150ms',
  });

  const pageBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--surface-tint) 34%, var(--bg-primary)) 0%, var(--bg-primary) 260px), var(--bg-primary)';
  return (
    <div style={{ minHeight: '100vh', background: pageBackground }}>
      <window.Header showSearch={false} />
      <div style={{ display: 'flex', flexDirection: isStacked ? 'column' : 'row', minHeight: 'calc(100vh - 72px)' }}>
        <div style={{
          width: isStacked ? '100%' : '200px',
          flexShrink: 0,
          background: 'transparent',
          borderRight: isStacked ? 'none' : '1px solid var(--border)',
          borderBottom: isStacked ? '1px solid var(--border)' : 'none',
          position: isStacked ? 'static' : 'sticky',
          top: isStacked ? 'auto' : '72px',
          height: isStacked ? 'auto' : 'calc(100vh - 72px)',
          overflowY: 'auto',
        }}>
          <div style={{ padding: isStacked ? '12px 8px 0' : '16px 8px 8px' }}>
            <button
              onClick={() => navigate('#/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                padding: '8px 10px',
                borderRadius: '6px',
                marginBottom: '8px',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <ArrowLeft size={14} />
              返回首页
            </button>
            <div style={sectionTitleStyle}>后台管理</div>
          </div>

          <div style={{
            display: isStacked ? 'grid' : 'block',
            gridTemplateColumns: isStacked ? 'repeat(auto-fit, minmax(160px, 1fr))' : 'none',
            gap: isStacked ? '6px' : 0,
            padding: isStacked ? '0 8px 12px' : 0,
          }}>
            {navItems.map(({ key, label, Icon }) => {
              const isSelected = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => navigate('#/admin/' + key)}
                  style={navButtonStyle(isSelected)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'none'; }}
                >
                  <Icon size={15} style={{ color: isSelected ? 'var(--brand)' : 'var(--text-secondary)' }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <main style={{
          flex: 1,
          minWidth: 0,
          padding: viewportWidth < 640 ? '16px' : '24px',
          overflowX: 'hidden',
          background: 'transparent',
        }}>
          {children}
        </main>
      </div>
      <window.ToastContainer />
      <window.EmailPreviewModal />
      <window.ProfileModal isOpen={activeModal === 'profile'} onClose={closeModal} />
      <window.ChangePasswordModal isOpen={activeModal === 'changePassword'} onClose={closeModal} />
    </div>
  );
}

window.AdminLayout = AdminLayout;
