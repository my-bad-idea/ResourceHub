function LoginPage() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { navigate } = window.useRouter();
  const { request } = window.useApi();
  const { AlertCircle, Eye, EyeOff, Loader, ShieldCheck } = lucide;

  const [form, setForm] = React.useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState({ username: '', password: '', form: '' });
  const [loading, setLoading] = React.useState(false);

  const config = state?.config || {};
  const siteTitle = config.siteTitle || 'ResourceHub';
  const logoLetter = (siteTitle.trim().charAt(0) || 'R').toUpperCase();
  const authStyles = window.authStyles;

  const validateField = React.useCallback((field, value) => {
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (field === 'username') return normalized ? '' : '请输入用户名';
    if (field === 'password') return value ? '' : '请输入密码';
    return '';
  }, []);

  const validateForm = React.useCallback(() => ({
    username: validateField('username', form.username),
    password: validateField('password', form.password),
  }), [form.password, form.username, validateField]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: prev[field] ? validateField(field, value) : '',
      form: '',
    }));
  };

  const handleFieldBlur = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, form[field]),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm();
    if (nextErrors.username || nextErrors.password) {
      setErrors({ ...nextErrors, form: '' });
      return;
    }
    setLoading(true);
    setErrors((prev) => ({ ...prev, form: '' }));
    try {
      const { ok, data } = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      if (ok) {
        dispatch({ type: 'LOGIN', user: data.data.user, token: data.data.token });
        navigate('#/');
      } else {
        setErrors((prev) => ({ ...prev, form: '用户名或密码错误，请重新输入' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <window.AuthLayout>
      <window.AuthCard
        width="452px"
        kicker="统一访问入口"
        title="登录账号"
        subtitle={config.siteSubtitle || '统一管理与访问你的资源'}
        logoLetter={logoLetter}
      >
          <form onSubmit={handleSubmit}>
            <div style={authStyles.field}>
              <label style={authStyles.label}>用户名</label>
              <input
                className="rh-auth-input"
                type="text"
                value={form.username}
                name="username"
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.username}
                onChange={(e) => updateField('username', e.target.value)}
                onBlur={() => handleFieldBlur('username')}
                placeholder="请输入用户名"
                disabled={loading}
                style={authStyles.input(!!errors.username)}
              />
              {errors.username ? <div style={authStyles.errorText}>{errors.username}</div> : null}
            </div>

            <div style={{ ...authStyles.field, marginBottom: errors.password ? '14px' : '12px' }}>
              <label style={authStyles.label}>密码</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="rh-auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  name="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  placeholder="请输入密码"
                  disabled={loading}
                  style={authStyles.input(!!errors.password, true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={loading}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  style={{
                    ...authStyles.passwordToggle,
                    color: showPassword ? 'var(--brand-strong)' : authStyles.passwordToggle.color,
                    background: showPassword
                      ? 'color-mix(in srgb, var(--brand-soft) 72%, transparent)'
                      : authStyles.passwordToggle.background,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? <div style={authStyles.errorText}>{errors.password}</div> : null}
            </div>

            {errors.form && (
              <div role="alert" aria-live="polite" style={authStyles.errorBanner}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errors.form}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              style={{ ...authStyles.primaryButton(loading), marginBottom: '12px' }}
            >
              {loading && <Loader size={16} />}
              {loading ? '登录中...' : '登录'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'color-mix(in srgb, var(--brand-soft) 54%, var(--surface-elevated))',
                border: '1px solid color-mix(in srgb, var(--brand) 16%, var(--border))',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                lineHeight: 1.6,
                marginBottom: '18px',
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--brand-strong)' }} />
              <span>如无法登录或注册，请联系管理员确认账号与注册策略。</span>
            </div>

            <div style={{ ...authStyles.footerRow, justifyContent: config.enableRegister ? 'space-between' : 'flex-start', gap: '14px', alignItems: 'center' }}>
              <a href="#/forgot-password" className="rh-auth-text-link">
                忘记密码？
              </a>
              {config.enableRegister ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>没有账号？</span>
                  <a href="#/register" className="rh-auth-text-link rh-auth-text-link--strong">
                    注册账号
                  </a>
                </div>
              ) : null}
            </div>
          </form>
      </window.AuthCard>
    </window.AuthLayout>
  );
}

window.LoginPage = LoginPage;
