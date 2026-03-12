function LoginPage() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { navigate } = window.useRouter();
  const { request } = window.useApi();
  const { Eye, EyeOff, Loader } = lucide;

  const [form, setForm] = React.useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const config = state?.config;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('请填写用户名和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const { ok, data } = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      if (ok) {
        dispatch({ type: 'LOGIN', user: data.data.user, token: data.data.token });
        navigate('#/');
      } else {
        setError('用户名或密码错误');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(e); };

  return (
    <window.AuthLayout>
      <div style={{ width: '400px', maxWidth: '100%' }}>
        <div style={{
          background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
          border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: 'var(--shadow-modal)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '10px' }}>
              统一访问入口
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'var(--brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, margin: '0 auto 16px',
            }}>R</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              {config?.siteTitle || '资源导航系统'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              {config?.siteSubtitle || '登录以访问企业资源导航'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>用户名</label>
              <input
                type="text" value={form.username}
                name="username"
                autoComplete="username"
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="请输入用户名"
                disabled={loading}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>密码</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={form.password}
                  name="password"
                  autoComplete="current-password"
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入密码"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '9px 40px 9px 12px',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '12px' }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px',
              background: 'var(--brand)', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, marginBottom: '16px',
              opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading && <Loader size={15} />}
              登录
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {config?.enableRegister ? (
                <button type="button" onClick={() => navigate('#/register')}
                  style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '13px' }}>
                  注册账号
                </button>
              ) : <span />}
              <button type="button" onClick={() => navigate('#/forgot-password')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                忘记密码？
              </button>
            </div>
          </form>
        </div>
      </div>
    </window.AuthLayout>
  );
}

window.LoginPage = LoginPage;
