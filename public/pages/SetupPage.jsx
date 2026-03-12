function SetupPage() {
  const dispatch = window.useAppDispatch();
  const { navigate } = window.useRouter();
  const { request } = window.useApi();
  const { Loader } = lucide;

  const [form, setForm] = React.useState({ username: '', displayName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  const validate = () => {
    const errs = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username) || /^\d+$/.test(form.username))
      errs.username = '用户名3-20位，仅字母数字下划线，不能纯数字';
    if (!form.displayName || form.displayName.length > 30)
      errs.displayName = '显示名称不能为空（最多30字符）';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = '请输入有效的邮箱地址';
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      errs.password = '密码至少8位，需包含字母和数字';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = '两次密码不一致';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { ok, data } = await request('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      if (ok) {
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '初始化成功！请登录' });
        window.location.hash = '#/login';
        window.location.reload();
      } else {
        if (data.code === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        }
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '初始化失败' });
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

  const labelStyle = { fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' };

  return (
    <window.AuthLayout>
      <div style={{ width: '480px', maxWidth: '100%' }}>
        <div style={{
          background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
          border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: 'var(--shadow-modal)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '10px' }}>
              首次初始化
            </div>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'var(--brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700,
              margin: '0 auto 16px',
            }}>R</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              欢迎使用资源导航系统
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              请先完成初始化，创建管理员账号
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            {[
              { key: 'username', label: '管理员用户名', type: 'text', placeholder: '仅字母数字下划线，3-20位', autoComplete: 'username' },
              { key: 'displayName', label: '管理员显示名称', type: 'text', placeholder: '显示给其他用户的名称', autoComplete: 'name' },
              { key: 'email', label: '管理员邮箱', type: 'email', placeholder: 'admin@example.com', autoComplete: 'email' },
            ].map(({ key, label, type, placeholder, autoComplete }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{label}</label>
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
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>管理员密码</label>
              <input
                type="password" name="new-password" value={form.password} placeholder="至少8位，含字母和数字"
                autoComplete="new-password"
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                onBlur={() => { const errs = validate(); setErrors(prev => ({ ...prev, password: errs.password })); }}
                style={inputStyle('password')} disabled={loading}
              />
              <window.PasswordStrength password={form.password} />
              {errors.password && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.password}</div>}
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>确认密码</label>
              <input
                type="password" name="confirm-password" value={form.confirmPassword} placeholder="再次输入密码"
                autoComplete="new-password"
                onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onBlur={() => { const errs = validate(); setErrors(prev => ({ ...prev, confirmPassword: errs.confirmPassword })); }}
                style={inputStyle('confirmPassword')} disabled={loading}
              />
              {errors.confirmPassword && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.confirmPassword}</div>}
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px',
              background: 'var(--brand)', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600,
              opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading && <Loader size={15} />}
              完成初始化
            </button>
          </form>
        </div>
      </div>
    </window.AuthLayout>
  );
}

window.SetupPage = SetupPage;
