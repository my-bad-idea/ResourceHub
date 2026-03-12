function RegisterPage() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { navigate } = window.useRouter();
  const { request } = window.useApi();
  const { Loader } = lucide;

  const [form, setForm] = React.useState({ username: '', displayName: '', email: '' });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const config = state?.config;

  const validate = () => {
    const errs = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username) || /^\d+$/.test(form.username))
      errs.username = '用户名3-20位，仅字母数字下划线，不能纯数字';
    if (!form.displayName || form.displayName.length > 30)
      errs.displayName = '显示名称不能为空（最多30字符）';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = '请输入有效的邮箱地址';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { ok, data } = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, displayName: form.displayName, email: form.email }),
      });
      if (ok) {
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '注册成功！初始密码已发送至邮箱' });
        if (data.emailPreview) dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: data.emailPreview });
        setTimeout(() => navigate('#/login'), 3000);
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '注册失败' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '8px', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  });

  if (config && config.enableRegister === false) {
    return (
      <window.AuthLayout>
        <div style={{ width: '400px', maxWidth: '100%' }}>
          <div style={{
            background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))', border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
            borderRadius: '24px', padding: '36px', textAlign: 'center',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '20px' }}>注册功能暂未开放</p>
            <button onClick={() => navigate('#/login')} style={{
              padding: '9px 24px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>去登录</button>
          </div>
        </div>
      </window.AuthLayout>
    );
  }

  return (
    <window.AuthLayout>
      <div style={{ width: '400px', maxWidth: '100%' }}>
        <div style={{
          background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))', border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
          borderRadius: '24px', padding: '36px', boxShadow: 'var(--shadow-modal)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '10px' }}>
              邀请与注册
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'var(--brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, margin: '0 auto 16px',
            }}>R</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>注册账号</h1>
          </div>
          <form onSubmit={handleSubmit}>
            {[
              { key: 'username', label: '用户名', type: 'text', placeholder: '仅字母数字下划线，3-20位', autoComplete: 'username' },
              { key: 'displayName', label: '显示名称', type: 'text', placeholder: '显示给其他用户的名称', autoComplete: 'name' },
              { key: 'email', label: '邮箱', type: 'email', placeholder: 'your@example.com', autoComplete: 'email' },
            ].map(({ key, label, type, placeholder, autoComplete }) => (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>{label}</label>
                <input
                  type={type} name={key} value={form[key]} placeholder={placeholder}
                  autoComplete={autoComplete}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  onBlur={() => { const errs = validate(); setErrors(prev => ({ ...prev, [key]: errs[key] })); }}
                  style={inputStyle(key)} disabled={loading}
                />
                {errors[key] && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors[key]}</div>}
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px',
              background: 'var(--brand)', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, marginTop: '8px', marginBottom: '16px',
              opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading && <Loader size={15} />}
              注册
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => navigate('#/login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                已有账号？<span style={{ color: 'var(--brand)' }}>去登录</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </window.AuthLayout>
  );
}

window.RegisterPage = RegisterPage;
