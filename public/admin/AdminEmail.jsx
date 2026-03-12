function AdminEmail() {
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { Save, Loader, Send, Eye, EyeOff } = lucide;

  const [form, setForm] = React.useState({
    smtpHost: '',
    smtpPort: 465,
    encryption: 'ssl',
    smtpUser: '',
    smtpPassword: '***',
    fromName: '',
    fromEmail: '',
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const { ok, data } = await request('/api/config/email');
      if (ok && data.data) {
        const cfg = data.data;
        setForm({
          smtpHost: cfg.smtpHost || '',
          smtpPort: cfg.smtpPort ?? 465,
          encryption: cfg.encryption || 'ssl',
          smtpUser: cfg.smtpUser || '',
          smtpPassword: cfg.smtpPassword || '***',
          fromName: cfg.fromName || '',
          fromEmail: cfg.fromEmail || '',
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { ok, data } = await request('/api/config/email', {
        method: 'PUT',
        body: JSON.stringify({
          smtpHost: form.smtpHost,
          smtpPort: Number(form.smtpPort),
          encryption: form.encryption,
          smtpUser: form.smtpUser,
          smtpPassword: form.smtpPassword,
          fromName: form.fromName,
          fromEmail: form.fromEmail,
        }),
      });
      if (ok) {
        setForm(f => ({ ...f, smtpPassword: '***' }));
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '邮件配置已保存' });
      } else {
        if (data.code === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        }
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '保存失败' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { ok, data } = await request('/api/config/email/test', { method: 'POST' });
      if (ok) {
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '测试邮件已发送' });
        if (data.emailPreview) dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: data.emailPreview });
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '发送失败' });
      }
    } finally {
      setTesting(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    border: `1px solid ${errors[field] ? 'var(--danger)' : 'var(--control-border)'}`,
    borderRadius: '10px',
    background: 'var(--surface-elevated)',
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none',
  });
  const labelStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' };
  const fieldStyle = { marginBottom: '20px' };
  const headerPanelStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '18px 20px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    boxShadow: 'var(--shadow-card)',
  };
  const secondaryButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '38px',
    padding: '0 16px',
    border: '1px solid var(--control-border)',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-control)',
  };
  const primaryButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '38px',
    padding: '0 18px',
    background: 'var(--brand)',
    color: '#fff',
    border: '1px solid var(--brand)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    boxShadow: '0 10px 20px color-mix(in srgb, var(--brand) 16%, transparent)',
  };
  const panelStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    padding: '24px',
    maxWidth: '720px',
    boxShadow: 'var(--shadow-card)',
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>邮件服务</h2>
        <window.Skeleton rows={6} type="form" />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div style={headerPanelStyle}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>邮件服务</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>管理 SMTP 连接与发件人信息，保持后台配置区的层级和交互一致。</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleTest} disabled={testing || saving} style={{ ...secondaryButtonStyle, opacity: (testing || saving) ? 0.7 : 1, cursor: (testing || saving) ? 'not-allowed' : 'pointer' }}>
            {testing ? <Loader size={15} /> : <Send size={15} />}
            测试连接
          </button>
          <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader size={15} /> : <Save size={15} />}
            保存配置
          </button>
        </div>
      </div>

      {!form.smtpHost && (
        <div style={{
          background: 'color-mix(in srgb, var(--brand-soft) 78%, var(--surface-elevated))',
          border: '1px solid color-mix(in srgb, var(--brand) 16%, var(--control-border))',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '18px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-control)',
        }}>
          SMTP 主机为空时，系统使用模拟邮件模式：邮件不会真实发送，仅在前端弹窗预览。
        </div>
      )}

      <div style={panelStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>SMTP 主机</label>
          <input className="rh-admin-input" value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))}
            style={inputStyle('smtpHost')} placeholder="smtp.example.com（留空使用模拟模式）" disabled={saving} />
          {errors.smtpHost && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.smtpHost}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', ...fieldStyle }}>
          <div>
            <label style={labelStyle}>SMTP 端口</label>
            <input className="rh-admin-input" type="number" value={form.smtpPort} min={1} max={65535}
              onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))}
              style={inputStyle('smtpPort')} placeholder="465" disabled={saving} />
            {errors.smtpPort && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.smtpPort}</div>}
          </div>
          <div>
            <label style={labelStyle}>加密方式</label>
            <window.DropdownSelect
              value={form.encryption}
              onChange={(value) => setForm(f => ({ ...f, encryption: value }))}
              disabled={saving}
              ariaLabel="加密方式"
              options={[
                { value: 'ssl', label: 'SSL' },
                { value: 'tls', label: 'TLS' },
                { value: 'none', label: '无加密' },
              ]}
            />
            {errors.encryption && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.encryption}</div>}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>SMTP 用户名</label>
          <input className="rh-admin-input" value={form.smtpUser} onChange={e => setForm(f => ({ ...f, smtpUser: e.target.value }))}
            style={inputStyle('smtpUser')} placeholder="your@email.com" disabled={saving} />
          {errors.smtpUser && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.smtpUser}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>SMTP 密码</label>
          <div style={{ position: 'relative' }}>
            <input
              className="rh-admin-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              value={form.smtpPassword}
              onChange={e => setForm(f => ({ ...f, smtpPassword: e.target.value }))}
              style={{ ...inputStyle('smtpPassword'), paddingRight: '40px' }}
              placeholder="保持 *** 则不更改当前密码"
              disabled={saving}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.smtpPassword && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.smtpPassword}</div>}
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>填写 `***` 表示不修改当前已保存的密码</div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '16px' }}>发件人信息</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>发件人名称</label>
              <input className="rh-admin-input" value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
                style={inputStyle('fromName')} placeholder="资源导航系统" disabled={saving} />
              {errors.fromName && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.fromName}</div>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>发件人邮箱</label>
              <input className="rh-admin-input" value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
                style={inputStyle('fromEmail')} placeholder="noreply@example.com" disabled={saving} />
              {errors.fromEmail && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.fromEmail}</div>}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

window.AdminEmail = AdminEmail;
