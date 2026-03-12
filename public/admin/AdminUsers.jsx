function AdminUsers() {
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { Plus, Edit2, Trash2, Key, Loader } = lucide;

  const [users, setUsers] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // Create/Edit modal state
  const [showModal, setShowModal] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null);
  const [form, setForm] = React.useState({ username: '', displayName: '', email: '', password: '', role: 'user', enabled: true });
  const [formErrors, setFormErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = React.useState(null);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetError, setResetError] = React.useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { ok, data } = await request('/api/users');
      if (ok) setUsers(data.data || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  React.useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ username: '', displayName: '', email: '', password: '', role: 'user', enabled: true });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setForm({ username: user.username, displayName: user.displayName, email: user.email, password: '', role: user.role, enabled: user.status === 'active' });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!editTarget) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username) || /^\d+$/.test(form.username))
        errs.username = '用户名3-20位，仅字母数字下划线，不能纯数字';
      if (!form.password || form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
        errs.password = '密码至少8位，需包含字母和数字';
    }
    if (!form.displayName || form.displayName.length > 30) errs.displayName = '显示名称不能为空（最多30字符）';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = '请输入有效的邮箱地址';
    return errs;
  };

  const handleSave = async () => {
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const body = { displayName: form.displayName, email: form.email, role: form.role, status: form.enabled ? 'active' : 'disabled' };
        const { ok, data } = await request(`/api/users/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(body) });
        if (ok) {
          setUsers(prev => prev.map(u => u.id === editTarget.id ? data.data : u));
          dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '用户已更新' });
          setShowModal(false);
        } else {
          setFormErrors({ general: data.error || '更新失败' });
        }
      } else {
        const body = { username: form.username, displayName: form.displayName, email: form.email, password: form.password, role: form.role };
        const { ok, data } = await request('/api/users', { method: 'POST', body: JSON.stringify(body) });
        if (ok) {
          setUsers(prev => [...prev, data.data]);
          dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '用户已创建' });
          if (data.emailPreview) dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: data.emailPreview });
          setShowModal(false);
        } else {
          setFormErrors({ general: data.error || '创建失败' });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    try {
      const { ok, data } = await request(`/api/users/${resetTarget.id}/reset-password`, { method: 'POST' });
      if (ok) {
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: `已重置 ${resetTarget.displayName} 的密码，临时密码已发送至邮箱` });
        if (data.emailPreview) dispatch({ type: 'SET_EMAIL_PREVIEW', emailPreview: data.emailPreview });
        setResetTarget(null);
        setResetError('');
      } else {
        setResetError(data.error || '重置失败');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { ok, data } = await request(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '用户已删除' });
        setDeleteTarget(null);
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '删除失败' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const pageData = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    padding: '0 16px',
    background: 'var(--brand)',
    color: '#fff',
    border: '1px solid var(--brand)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    boxShadow: '0 10px 20px color-mix(in srgb, var(--brand) 16%, transparent)',
  };
  const secondaryButtonStyle = {
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
  const tableShellStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    overflowX: 'auto',
    boxShadow: 'var(--shadow-card)',
  };
  const thStyle = { padding: '0 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.02em' };
  const tdStyle = { padding: '0 18px', fontSize: '14px', color: 'var(--text-primary)' };
  const iconButtonStyle = (tone = 'neutral') => ({
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    border: `1px solid ${tone === 'danger' ? 'color-mix(in srgb, var(--danger) 20%, var(--control-border))' : 'var(--control-border)'}`,
    background: tone === 'danger'
      ? 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))'
      : 'var(--surface-elevated)',
    color: tone === 'danger' ? 'var(--danger)' : 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-control)',
  });
  const pagerButtonStyle = (disabled) => ({
    width: '36px',
    height: '36px',
    border: '1px solid var(--control-border)',
    background: 'var(--surface-elevated)',
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    boxShadow: 'var(--shadow-control)',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  const inputStyle = (field) => ({
    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
    border: `1px solid ${formErrors[field] ? 'var(--danger)' : 'var(--control-border)'}`,
    borderRadius: '10px', background: 'var(--surface-elevated)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none',
  });
  const labelStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' };

  return (
    <div>
      <div style={headerPanelStyle}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>用户管理</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>管理账号、角色与状态，确保后台操作语义清晰而克制。</div>
        </div>
        <button onClick={openCreate} style={primaryButtonStyle}>
          <Plus size={15} /> 新增用户
        </button>
      </div>

      {loadingUsers ? (
        <window.Skeleton rows={5} type="row" />
      ) : (
        <div style={tableShellStyle}>
          <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', height: '46px' }}>
                <th style={thStyle}>显示名称</th>
                <th style={thStyle}>用户名</th>
                <th style={thStyle}>邮箱</th>
                <th style={thStyle}>角色</th>
                <th style={thStyle}>状态</th>
                <th style={{ ...thStyle, width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', height: '88px', color: 'var(--text-secondary)' }}>暂无用户</td></tr>
              ) : pageData.map(user => (
                <tr
                  key={user.id}
                  style={{ height: '56px', borderTop: '1px solid color-mix(in srgb, var(--border) 86%, transparent)', background: 'var(--surface-elevated)', transition: 'background 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-elevated)'; }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{user.displayName}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px' }}>{user.username}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: '13px' }}>{user.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '28px',
                      padding: '0 10px',
                      borderRadius: '999px',
                      border: user.role === 'admin'
                        ? '1px solid color-mix(in srgb, var(--brand) 18%, var(--control-border))'
                        : '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
                      background: user.role === 'admin' ? 'var(--brand-soft)' : 'var(--surface-muted)',
                      color: user.role === 'admin' ? 'var(--brand-strong)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: user.role === 'admin' ? 700 : 600,
                    }}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '28px',
                      padding: '0 10px',
                      borderRadius: '999px',
                      border: user.status === 'active'
                        ? '1px solid color-mix(in srgb, var(--success) 20%, var(--control-border))'
                        : '1px solid color-mix(in srgb, var(--danger) 20%, var(--control-border))',
                      background: user.status === 'active'
                        ? 'color-mix(in srgb, var(--success) 10%, var(--surface-elevated))'
                        : 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))',
                      color: user.status === 'active' ? 'var(--success)' : 'var(--danger)',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {user.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEdit(user)} title="编辑" style={iconButtonStyle('neutral')}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { setResetTarget(user); setResetError(''); }} title="重置密码" style={iconButtonStyle('neutral')}>
                        <Key size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(user)} title="删除" style={iconButtonStyle('danger')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={pagerButtonStyle(page === 1)}>
            <lucide.ChevronLeft size={14} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--text-secondary)', minWidth: '72px', textAlign: 'center' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={pagerButtonStyle(page === totalPages)}>
            <lucide.ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <window.Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? '编辑用户' : '新增用户'} width="480px">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {formErrors.general && (
            <div style={{ background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))', border: '1px solid color-mix(in srgb, var(--danger) 22%, var(--control-border))', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--danger)' }}>
              {formErrors.general}
            </div>
          )}
          {!editTarget && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>用户名</label>
              <input value={form.username} disabled={saving}
                name="username"
                autoComplete="username"
                onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setFormErrors(p => ({ ...p, username: null })); }}
                style={inputStyle('username')} placeholder="仅字母数字下划线，3-20位" />
              {formErrors.username && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formErrors.username}</div>}
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>显示名称</label>
            <input value={form.displayName} disabled={saving}
              name="displayName"
              autoComplete="name"
              onChange={e => { setForm(f => ({ ...f, displayName: e.target.value })); setFormErrors(p => ({ ...p, displayName: null })); }}
              style={inputStyle('displayName')} placeholder="用户的显示名称" />
            {formErrors.displayName && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formErrors.displayName}</div>}
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>邮箱</label>
            <input value={form.email} disabled={saving} type="email" name="email"
              autoComplete="email"
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(p => ({ ...p, email: null })); }}
                style={inputStyle('email')} placeholder="user@example.com" />
            {formErrors.email && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formErrors.email}</div>}
          </div>
          {!editTarget && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>初始密码</label>
              <input value={form.password} type="password" name="new-password" autoComplete="new-password" disabled={saving}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFormErrors(p => ({ ...p, password: null })); }}
                style={inputStyle('password')} placeholder="至少8位，含字母和数字" />
              {formErrors.password && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formErrors.password}</div>}
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>角色</label>
            <window.DropdownSelect
              value={form.role}
              onChange={(value) => setForm(f => ({ ...f, role: value }))}
              disabled={saving}
              ariaLabel="用户角色"
              options={[
                { value: 'user', label: '普通用户' },
                { value: 'admin', label: '管理员' },
              ]}
            />
          </div>
          {editTarget && (
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>账号状态</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: form.enabled ? 'var(--brand)' : 'var(--bg-tertiary)',
                  position: 'relative', transition: 'background 200ms',
                }}>
                <div style={{
                  position: 'absolute', top: '2px', width: '20px', height: '20px',
                  borderRadius: '50%', background: '#fff',
                  left: form.enabled ? '22px' : '2px', transition: 'left 200ms',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{form.enabled ? '启用' : '禁用'}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setShowModal(false)} disabled={saving} style={secondaryButtonStyle}>取消</button>
            <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving && <Loader size={14} />} 保存
            </button>
          </div>
        </form>
      </window.Modal>

      {/* Reset Password Modal */}
      <window.Modal isOpen={!!resetTarget} onClose={() => { setResetTarget(null); setResetError(''); }}
        title={`重置密码 — ${resetTarget?.displayName || ''}`} width="400px">
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            系统将自动生成临时密码并发送至用户邮箱，用户可凭临时密码登录后自行修改。
          </p>
          {resetError && <div style={{ background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))', border: '1px solid color-mix(in srgb, var(--danger) 22%, var(--control-border))', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--danger)' }}>{resetError}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setResetTarget(null); setResetError(''); }} disabled={resetLoading} style={secondaryButtonStyle}>取消</button>
            <button onClick={handleResetPassword} disabled={resetLoading} style={{ ...primaryButtonStyle, opacity: resetLoading ? 0.8 : 1, cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
              {resetLoading && <Loader size={14} />} 确认重置
            </button>
          </div>
        </div>
      </window.Modal>

      {/* Delete Confirm */}
      <window.ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除用户"
        message={`确认删除用户「${deleteTarget?.displayName}」？该操作不可撤销，其名下资源将转移给当前管理员。`}
        confirmText="确认删除"
        loading={deleting}
      />
    </div>
  );
}

window.AdminUsers = AdminUsers;
