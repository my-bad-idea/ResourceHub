function AdminConfig() {
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { t } = window.useI18n();
  const { Save, Loader } = lucide;

  const [form, setForm] = React.useState({
    siteTitle: '',
    siteSubtitle: '',
    logoUrl: '',
    tokenExpiry: 60,
    resetTokenExpiry: 60,
    enableRegister: true,
    restrictEmailDomain: false,
    emailDomainWhitelist: '',
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const localizableConfigValues = new Set(['资源导航系统', '统一管理与访问你的资源', '登录以访问全部资源导航']);
  const getLocalizedConfigValue = (value) => (localizableConfigValues.has(value) ? t(value) : value);

  React.useEffect(() => {
    async function load() {
      const { ok, data } = await request('/api/config/system/full');
      if (ok && data.data) {
        const cfg = data.data;
        setForm({
          siteTitle: cfg.siteTitle || '',
          siteSubtitle: cfg.siteSubtitle || '',
          logoUrl: cfg.logoUrl || '',
          tokenExpiry: cfg.tokenExpiry ?? 60,
          resetTokenExpiry: cfg.resetTokenExpiry ?? 60,
          enableRegister: cfg.enableRegister !== false,
          restrictEmailDomain: cfg.restrictEmailDomain === true,
          emailDomainWhitelist: cfg.emailDomainWhitelist || '',
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
      const payload = {
        siteTitle: form.siteTitle,
        siteSubtitle: form.siteSubtitle,
        logoUrl: form.logoUrl,
        tokenExpiry: Number(form.tokenExpiry),
        resetTokenExpiry: Number(form.resetTokenExpiry),
        enableRegister: form.enableRegister,
        restrictEmailDomain: form.restrictEmailDomain,
        emailDomainWhitelist: form.restrictEmailDomain ? form.emailDomainWhitelist : '',
      };

      const { ok, data } = await request('/api/config/system', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (ok) {
        dispatch({
          type: 'SET_CONFIG',
          config: {
            siteTitle: data.data.siteTitle,
            siteSubtitle: data.data.siteSubtitle,
            logoUrl: data.data.logoUrl,
            enableRegister: data.data.enableRegister,
          },
        });
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '系统配置已保存' });
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
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '18px',
    padding: '18px 20px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    boxShadow: 'var(--shadow-card)',
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
    maxWidth: '680px',
    boxShadow: 'var(--shadow-card)',
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>系统配置</h2>
        <window.Skeleton rows={6} type="form" />
      </div>
    );
  }

  return (
    <div>
      <div style={headerPanelStyle}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>系统配置</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>维护站点基础信息、注册策略与安全有效期配置。</div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? <Loader size={15} /> : <Save size={15} />}
          保存配置
        </button>
      </div>

      <div style={panelStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>站点标题</label>
          <input value={getLocalizedConfigValue(form.siteTitle)} onChange={e => setForm(f => ({ ...f, siteTitle: e.target.value }))}
            className="rh-admin-input" style={inputStyle('siteTitle')} placeholder="资源导航系统" disabled={saving} />
          {errors.siteTitle && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.siteTitle}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>站点副标题</label>
          <input value={getLocalizedConfigValue(form.siteSubtitle)} onChange={e => setForm(f => ({ ...f, siteSubtitle: e.target.value }))}
            className="rh-admin-input" style={inputStyle('siteSubtitle')} placeholder="统一管理与访问你的资源" disabled={saving} />
          {errors.siteSubtitle && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.siteSubtitle}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>站点 Logo URL</label>
          <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
            className="rh-admin-input" style={inputStyle('logoUrl')} placeholder="留空则使用默认图标" disabled={saving} />
          {errors.logoUrl && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.logoUrl}</div>}
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>留空时显示品牌色首字母图标</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', ...fieldStyle }}>
          <div>
            <label style={labelStyle}>Token 有效期（分钟）</label>
            <input type="number" value={form.tokenExpiry} min={5} max={43200}
              onChange={e => setForm(f => ({ ...f, tokenExpiry: e.target.value }))}
              className="rh-admin-input" style={inputStyle('tokenExpiry')} placeholder="60" disabled={saving} />
            {errors.tokenExpiry && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.tokenExpiry}</div>}
          </div>
          <div>
            <label style={labelStyle}>重置链接有效期（分钟）</label>
            <input type="number" value={form.resetTokenExpiry} min={5} max={43200}
              onChange={e => setForm(f => ({ ...f, resetTokenExpiry: e.target.value }))}
              className="rh-admin-input" style={inputStyle('resetTokenExpiry')} placeholder="60" disabled={saving} />
            {errors.resetTokenExpiry && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.resetTokenExpiry}</div>}
          </div>
        </div>

        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>开放注册</label>
          <button
            onClick={() => setForm(f => ({ ...f, enableRegister: !f.enableRegister }))}
            disabled={saving}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: form.enableRegister ? 'var(--brand)' : 'var(--bg-tertiary)',
              position: 'relative', transition: 'background 200ms', flexShrink: 0,
            }}>
            <div style={{
              position: 'absolute', top: '2px', width: '20px', height: '20px',
              borderRadius: '50%', background: '#fff',
              left: form.enableRegister ? '22px' : '2px', transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>
            {form.enableRegister ? '已开启' : '已关闭'}
          </span>
        </div>

        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>限制注册邮箱域名</label>
          <button
            onClick={() => setForm(f => ({ ...f, restrictEmailDomain: !f.restrictEmailDomain }))}
            disabled={saving}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: form.restrictEmailDomain ? 'var(--brand)' : 'var(--bg-tertiary)',
              position: 'relative', transition: 'background 200ms', flexShrink: 0,
            }}>
            <div style={{
              position: 'absolute', top: '2px', width: '20px', height: '20px',
              borderRadius: '50%', background: '#fff',
              left: form.restrictEmailDomain ? '22px' : '2px', transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>
            {form.restrictEmailDomain ? '已开启' : '已关闭'}
          </span>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>邮箱域名白名单</label>
          <input value={form.emailDomainWhitelist}
            onChange={e => setForm(f => ({ ...f, emailDomainWhitelist: e.target.value }))}
            className="rh-admin-input" style={inputStyle('emailDomainWhitelist')} placeholder="example.com,corp.com" disabled={saving || !form.restrictEmailDomain} />
          {errors.emailDomainWhitelist && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.emailDomainWhitelist}</div>}
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>多个域名用英文逗号分隔，留空则不限制</div>
        </div>
      </div>
    </div>
  );
}

window.AdminConfig = AdminConfig;
