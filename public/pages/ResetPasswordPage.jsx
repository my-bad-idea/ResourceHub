function ResetPasswordPage() {
  const dispatch = window.useAppDispatch();
  const { route, navigate } = window.useRouter();
  const { request } = window.useApi();
  const { Loader, Eye, EyeOff } = lucide;

  const token = route.params.token || '';
  const [form, setForm] = React.useState({ password: '', confirmPassword: '' });
  const [resetIdentifier] = React.useState(() => window.sessionStorage?.getItem('rh_reset_identifier') || '');
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [tokenInvalid, setTokenInvalid] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const [showCPw, setShowCPw] = React.useState(false);

  const validate = () => {
    const errs = {};
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
      const { ok, data } = await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      if (ok) {
        window.sessionStorage?.removeItem('rh_reset_identifier');
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '密码已重置，请登录' });
        navigate('#/login');
      } else {
        if (['RESET_TOKEN_INVALID', 'RESET_TOKEN_EXPIRED', 'RESET_TOKEN_USED'].includes(data.code)) {
          setTokenInvalid(true);
        } else if (data.code === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        }
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '重置失败' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '9px 40px 9px 12px',
    border: `1px solid ${errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '8px', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  });

  if (!token || tokenInvalid) {
    return (
      <window.AuthLayout>
        <div style={{ width: '400px', maxWidth: '100%' }}>
          <div style={{
            background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))', border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
            borderRadius: '24px', padding: '36px', textAlign: 'center',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <p style={{ fontSize: '15px', color: 'var(--danger)', marginBottom: '8px', fontWeight: 500 }}>链接已失效或过期</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>请重新发送密码重置链接</p>
            <button onClick={() => navigate('#/forgot-password')} style={{
              padding: '9px 24px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>重新发送重置链接</button>
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
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '10px' }}>
            重置密码
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>设置新密码</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={resetIdentifier}
              readOnly
              tabIndex={-1}
              style={{
                position: 'absolute',
                opacity: 0,
                pointerEvents: 'none',
                width: '1px',
                height: '1px',
              }}
            />
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>新密码</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="rh-auth-input"
                  type={showPw ? 'text' : 'password'} name="new-password" value={form.password}
                  autoComplete="new-password"
                  placeholder="至少8位，含字母和数字"
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  onBlur={() => { const errs = validate(); setErrors(prev => ({ ...prev, password: errs.password })); }}
                  style={inputStyle('password')} disabled={loading}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <window.PasswordStrength password={form.password} />
              {errors.password && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.password}</div>}
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>确认新密码</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="rh-auth-input"
                  type={showCPw ? 'text' : 'password'} name="confirm-password" value={form.confirmPassword}
                  autoComplete="new-password"
                  placeholder="再次输入新密码"
                  onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  onBlur={() => { const errs = validate(); setErrors(prev => ({ ...prev, confirmPassword: errs.confirmPassword })); }}
                  style={inputStyle('confirmPassword')} disabled={loading}
                />
                <button type="button" onClick={() => setShowCPw(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              重置密码
            </button>
          </form>
        </div>
      </div>
    </window.AuthLayout>
  );
}

window.ResetPasswordPage = ResetPasswordPage;
