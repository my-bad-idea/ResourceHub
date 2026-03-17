import React from 'react';
import { useAppDispatch } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { useApi } from '../hooks/useApi';
import { Loader, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../layout/AuthLayout';

function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const { navigate } = useRouter();
  const { request } = useApi();

  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入有效的邮箱地址';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setEmailError(err); return; }
    setLoading(true);
    try {
      window.sessionStorage?.setItem('rh_reset_identifier', email.trim());
      const { data } = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dispatch({ type: 'ADD_TOAST', toastType: 'info', message: '若该邮箱已注册，重置链接已发送，请查收' });
      if (data.emailPreview) dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: data.emailPreview });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ width: '400px', maxWidth: '100%' }}>
        <div style={{
          background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))', border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
          borderRadius: '24px', padding: '36px', boxShadow: 'var(--shadow-modal)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: '10px' }}>
            账号恢复
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>忘记密码</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: '1.5' }}>
            输入注册邮箱，系统将发送密码重置链接
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>邮箱</label>
              <input
                className="rh-auth-input"
                type="email" value={email} placeholder="your@example.com"
                name="email"
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                onBlur={() => setEmailError(validate())}
                disabled={loading}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: `1px solid ${emailError ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: '8px', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {emailError && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{emailError}</div>}
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px',
              background: 'var(--brand)', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, marginBottom: '16px',
              opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading && <Loader size={15} />}
              发送重置链接
            </button>
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => navigate('#/login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={13} /> 返回登录
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

export { ForgotPasswordPage };
