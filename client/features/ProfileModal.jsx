import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/helpers';
import { Modal } from '../components/Modal';

function ProfileModal({ isOpen, onClose }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();

  const currentUser = state?.currentUser;
  const [form, setForm] = useState({ displayName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setForm({
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
      });
      setErrors({});
    }
  }, [isOpen, currentUser?.id]);

  const validate = () => {
    const errs = {};
    if (!form.displayName || form.displayName.trim().length === 0 || form.displayName.length > 30)
      errs.displayName = '显示名称不能为空（最多30字符）';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = '请输入有效的邮箱地址';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { ok, data } = await request('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ displayName: form.displayName.trim(), email: form.email.trim() }),
      });
      if (ok) {
        dispatch({ type: 'SET_CURRENT_USER', user: { ...currentUser, ...data.data } });
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '保存成功' });
        onClose();
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '保存失败' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const inputStyle = (field) => ({
    width: '100%', padding: '8px 12px',
    border: `1px solid ${(errors && errors[field]) ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '8px', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  });

  const readOnlyStyle = {
    width: '100%', padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'not-allowed',
  };

  const labelStyle = {
    fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
    display: 'block', marginBottom: '6px',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="个人信息" width="480px" closeOnBackdrop={false} closeOnEscape>
      <div>
        {/* Read-only fields */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>用户名</label>
          <input value={currentUser.username || ''} readOnly style={readOnlyStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>角色</label>
          <input
            value={currentUser.role === 'admin' ? '管理员' : '普通用户'}
            readOnly
            style={readOnlyStyle}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>注册时间</label>
          <input value={formatDate(currentUser.createdAt)} readOnly style={readOnlyStyle} />
        </div>

        {/* Editable: displayName */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>显示名称</label>
          <input
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            style={inputStyle('displayName')}
            disabled={loading}
            maxLength={30}
            placeholder="请输入显示名称"
          />
          {errors.displayName && (
            <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.displayName}</div>
          )}
        </div>

        {/* Editable: email */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>邮箱</label>
          <input
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inputStyle('email')}
            disabled={loading}
            type="email"
            placeholder="请输入邮箱地址"
          />
          {errors.email && (
            <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.email}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'flex-end',
          marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', border: '1px solid var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            关闭
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '8px 20px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 500, opacity: loading ? 0.8 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {loading && <Loader size={14} />}
            保存修改
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { ProfileModal };
