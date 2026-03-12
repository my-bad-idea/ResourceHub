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
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.08em',
    padding: isStacked ? '0 8px 8px' : '8px 8px 10px',
  };

  const navButtonStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '42px',
    width: '100%',
    borderRadius: '12px',
    padding: '0 12px 0 10px',
    margin: 0,
    border: isSelected
      ? '1px solid color-mix(in srgb, var(--brand) 18%, var(--control-border))'
      : '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    background: isSelected ? 'color-mix(in srgb, var(--brand-soft) 88%, var(--surface-elevated))' : 'transparent',
    color: isSelected ? 'var(--brand-strong)' : 'var(--text-primary)',
    fontWeight: isSelected ? 700 : 600,
    boxShadow: isSelected ? '0 4px 12px color-mix(in srgb, var(--brand) 10%, transparent)' : 'none',
    transition: 'background 150ms, border-color 150ms, color 150ms, box-shadow 150ms',
  });

  const pageBackground = 'var(--bg-primary)';
  return (
    <div style={{ minHeight: '100vh', background: pageBackground }}>
      <window.Header showSearch={false} />
      <div style={{ display: 'flex', flexDirection: isStacked ? 'column' : 'row', minHeight: 'calc(100vh - 72px)' }}>
        <div style={{
          width: isStacked ? '100%' : '200px',
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
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
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '10px 12px',
                borderRadius: '10px',
                marginBottom: '8px',
                width: '100%',
                textAlign: 'left',
                transition: 'background 150ms, border-color 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-elevated)';
                e.currentTarget.style.borderColor = 'var(--control-border)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
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
            padding: isStacked ? '0 8px 12px' : '0 8px 12px',
          }}>
            {navItems.map(({ key, label, Icon }) => {
              const isSelected = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => navigate('#/admin/' + key)}
                  style={navButtonStyle(isSelected)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                      e.currentTarget.style.borderColor = 'var(--control-border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? 'color-mix(in srgb, var(--brand-soft) 88%, var(--surface-elevated))' : 'transparent';
                    e.currentTarget.style.borderColor = isSelected ? 'color-mix(in srgb, var(--brand) 18%, var(--control-border))' : 'transparent';
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: '2px',
                        height: '16px',
                        borderRadius: '999px',
                        background: isSelected ? 'var(--brand)' : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                    <Icon size={15} style={{ color: isSelected ? 'var(--brand-strong)' : 'var(--text-secondary)' }} />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </span>
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
