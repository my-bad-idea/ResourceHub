function PasswordField({ field, label, showKey, placeholder, autoComplete, value, showPassword, error, onChange, onToggleShow, onKeyDown, disabled }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
        display: 'block', marginBottom: '6px',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          name={field}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={{
            width: '100%', padding: '8px 40px 8px 12px',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: '8px', background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontSize: '14px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          }}
        >
          {showPassword ? <lucide.EyeOff size={16} /> : <lucide.Eye size={16} />}
        </button>
      </div>
      {field === 'newPassword' && (
        <window.PasswordStrength password={value} />
      )}
      {error && (
        <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{error}</div>
      )}
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const currentUser = state?.currentUser;

  const [form, setForm] = React.useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [showFields, setShowFields] = React.useState({ current: false, new: false, confirm: false });

  React.useEffect(() => {
    if (isOpen) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      setShowFields({ current: false, new: false, confirm: false });
    }
  }, [isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.currentPassword)
      errs.currentPassword = '请输入当前密码';
    if (form.newPassword.length < 8 || !/[a-zA-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword))
      errs.newPassword = '新密码至少8位，需包含字母和数字';
    else if (form.newPassword === form.currentPassword)
      errs.newPassword = '新密码不能与当前密码相同';
    if (form.newPassword !== form.confirmPassword)
      errs.confirmPassword = '两次密码不一致';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { passwordEnc: currentPasswordEnc, ts } = await window.security.encryptPasswordWithTs(form.currentPassword);
      const { passwordEnc: newPasswordEnc } = await window.security.encryptPasswordWithTs(form.newPassword);
      const { ok, data } = await request('/api/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPasswordEnc,
          newPasswordEnc,
          ts,
        }),
      });
      if (ok) {
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '密码已修改' });
        onClose();
      } else {
        if (data.code === 'WRONG_PASSWORD') {
          setErrors({ currentPassword: '当前密码错误' });
        } else if (data.code === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        }
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '修改失败' });
      }
    } catch (err) {
      console.error('[ChangePassword] Error:', err);
      const msg = (err?.message || '').toLowerCase();
      const isCryptoError = msg.includes('crypto') || msg.includes('forge') || msg.includes('importkey');
      dispatch({
        type: 'ADD_TOAST',
        toastType: 'error',
        message: isCryptoError
          ? '当前浏览器环境不支持安全加密，请使用 HTTPS 或 localhost 访问'
          : '操作过程中发生错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const handleToggleShow = (showKey) => () => setShowFields(s => ({ ...s, [showKey]: !s[showKey] }));
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <window.Modal isOpen={isOpen} onClose={onClose} title="修改密码" width="440px" closeOnBackdrop={false} closeOnEscape>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={currentUser?.username || currentUser?.email || ''}
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
        <PasswordField
          field="currentPassword"
          label="当前密码"
          showKey="current"
          placeholder="请输入当前密码"
          autoComplete="current-password"
          value={form.currentPassword}
          showPassword={showFields.current}
          error={errors.currentPassword}
          onChange={handleFieldChange('currentPassword')}
          onToggleShow={handleToggleShow('current')}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <PasswordField
          field="newPassword"
          label="新密码"
          showKey="new"
          placeholder="至少8位，含字母和数字"
          autoComplete="new-password"
          value={form.newPassword}
          showPassword={showFields.new}
          error={errors.newPassword}
          onChange={handleFieldChange('newPassword')}
          onToggleShow={handleToggleShow('new')}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <PasswordField
          field="confirmPassword"
          label="确认新密码"
          showKey="confirm"
          placeholder="再次输入新密码"
          autoComplete="new-password"
          value={form.confirmPassword}
          showPassword={showFields.confirm}
          error={errors.confirmPassword}
          onChange={handleFieldChange('confirmPassword')}
          onToggleShow={handleToggleShow('confirm')}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'flex-end',
          marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 20px', border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 20px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 500, opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {loading && <lucide.Loader size={14} />}
            确认修改
          </button>
        </div>
      </form>
    </window.Modal>
  );
}

window.ChangePasswordModal = ChangePasswordModal;
