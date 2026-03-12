const PRESET_COLORS = ['#0071E3','#34C759','#FF3B30','#FF9500','#AF52DE','#FF2D55','#5856D6','#00C7BE','#30B0C7','#32ADE6','#FF6961','#6E6E73'];

function AdminCategories() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { Plus, Edit2, Trash2, Loader, Check } = lucide;

  const categories = state?.categories || [];
  const [showModal, setShowModal] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null); // null = create
  const [form, setForm] = React.useState({ name: '', color: '#0071E3' });
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  const openCreate = () => { setEditTarget(null); setForm({ name: '', color: '#0071E3' }); setFormError(''); setShowModal(true); };
  const openEdit = (cat) => { setEditTarget(cat); setForm({ name: cat.name, color: cat.color }); setFormError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('类别名称不能为空'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const { ok, data } = await request(`/api/categories/${editTarget.id}`, {
          method: 'PUT', body: JSON.stringify({ name: form.name.trim(), color: form.color }),
        });
        if (ok) {
          dispatch({ type: 'UPDATE_CATEGORY', category: data.data });
          dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '类别已更新' });
          setShowModal(false);
        } else {
          setFormError(data.error || '更新失败');
        }
      } else {
        const { ok, data } = await request('/api/categories', {
          method: 'POST', body: JSON.stringify({ name: form.name.trim(), color: form.color }),
        });
        if (ok) {
          dispatch({ type: 'ADD_CATEGORY', category: data.data });
          dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '类别已创建' });
          setShowModal(false);
        } else {
          setFormError(data.error || '创建失败');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { ok, data } = await request(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' });
      if (ok) {
        dispatch({ type: 'DELETE_CATEGORY', id: deleteTarget.id });
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '类别已删除' });
        setDeleteTarget(null);
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '删除失败' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(categories.length / PAGE_SIZE);
  const pageData = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thStyle = { padding: '0 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' };
  const tdStyle = { padding: '0 16px', fontSize: '14px', color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>类别管理</h2>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: 'var(--brand)', color: '#fff',
          border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
        }}>
          <Plus size={15} /> 新增类别
        </button>
      </div>

      <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 1px 4px rgba(18,32,57,0.08)' }}>
        <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted)', height: '44px' }}>
              <th style={thStyle}>名称</th>
              <th style={thStyle}>颜色</th>
              <th style={thStyle}>资源数</th>
              <th style={{ ...thStyle, width: '120px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', height: '80px', color: 'var(--text-secondary)' }}>暂无类别</td></tr>
            ) : pageData.map(cat => (
              <tr key={cat.id} style={{ height: '52px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', transition: 'background 150ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 10%, var(--bg-secondary))'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}>
                <td style={tdStyle}>{cat.name}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{cat.color}</span>
                  </div>
                </td>
                <td style={tdStyle}>{cat.resourceCount ?? 0}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg-primary)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <lucide.ChevronLeft size={14} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg-primary)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <lucide.ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <window.Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? '编辑类别' : '新增类别'} width="480px">
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>类别名称</label>
            <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
              style={{
                width: '100%', padding: '8px 12px',
                border: `1px solid ${formError ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }} placeholder="输入类别名称" disabled={saving} />
            {formError && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formError}</div>}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>颜色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                  outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: '2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {form.color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: '36px', height: '28px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '0' }} />
              <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{
                  flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '8px',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', fontFamily: 'monospace',
                }} placeholder="#0071E3" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowModal(false)} disabled={saving} style={{
              padding: '8px 20px', border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>取消</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '8px 20px', background: 'var(--brand)', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px',
              opacity: saving ? 0.8 : 1, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {saving && <Loader size={14} />} 保存
            </button>
          </div>
        </div>
      </window.Modal>

      {/* Delete confirm */}
      <window.ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除类别"
        message={`确认删除类别「${deleteTarget?.name}」？${deleteTarget?.resourceCount > 0 ? `关联的 ${deleteTarget.resourceCount} 个资源将失去类别归属。` : ''}删除后不可恢复。`}
        loading={deleting}
      />
    </div>
  );
}

window.AdminCategories = AdminCategories;

