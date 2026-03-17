import React from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { getCategoryTone } from '../utils/helpers';
import { Plus, Edit2, Trash2, Loader, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const PRESET_COLORS = ['#4F46E5', '#8B5CF6', '#14B8A6', '#F59E0B', '#F43F5E', '#2563EB', '#0EA5E9', '#64748B'];

function AdminCategories() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();

  const categories = state?.categories || [];
  const [showModal, setShowModal] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null); // null = create
  const [form, setForm] = React.useState({ name: '', color: '#4F46E5' });
  const [formError, setFormError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;

  const openCreate = () => { setEditTarget(null); setForm({ name: '', color: '#4F46E5' }); setFormError(''); setShowModal(true); };
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
  const thStyle = {
    padding: '0 18px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  };
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
  const modalLabelStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' };
  const modalInputStyle = (error = false) => ({
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--control-border)'}`,
    borderRadius: '10px',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  });

  return (
    <div>
      <div style={headerPanelStyle}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>类别管理</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>管理资源分类名称与配色，保持后台和结果页的类别语义一致。</div>
        </div>
        <button onClick={openCreate} style={primaryButtonStyle}>
          <Plus size={15} /> 新增类别
        </button>
      </div>

      <div style={tableShellStyle}>
        <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted)', height: '46px' }}>
              <th style={thStyle}>名称</th>
              <th style={thStyle}>颜色</th>
              <th style={thStyle}>资源数</th>
              <th style={{ ...thStyle, width: '120px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', height: '88px', color: 'var(--text-secondary)' }}>暂无类别</td></tr>
            ) : pageData.map(cat => (
              <tr
                key={cat.id}
                style={{ height: '56px', borderTop: '1px solid color-mix(in srgb, var(--border) 86%, transparent)', background: 'var(--surface-elevated)', transition: 'background 150ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-elevated)'; }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{cat.name}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        minHeight: '30px',
                        padding: '0 10px',
                        borderRadius: '999px',
                        background: getCategoryTone(cat, cat.id).soft,
                        border: `1px solid ${getCategoryTone(cat, cat.id).border}`,
                      }}
                    >
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{cat.color}</span>
                    </span>
                  </div>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{cat.resourceCount ?? 0}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(cat)} style={iconButtonStyle('neutral')}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(cat)} style={iconButtonStyle('danger')}>
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
            style={pagerButtonStyle(page === 1)}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--text-secondary)', minWidth: '72px', textAlign: 'center' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={pagerButtonStyle(page === totalPages)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? '编辑类别' : '新增类别'}
        width="480px"
        closeOnBackdrop={false}
      >
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={modalLabelStyle}>类别名称</label>
            <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
              style={modalInputStyle(Boolean(formError))} placeholder="输入类别名称" disabled={saving} />
            {formError && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{formError}</div>}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={modalLabelStyle}>颜色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: '30px', height: '30px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
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
                style={{ width: '38px', height: '32px', border: '1px solid var(--control-border)', borderRadius: '8px', cursor: 'pointer', padding: '0', background: 'var(--surface-elevated)' }} />
              <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ ...modalInputStyle(false), flex: 1, padding: '8px 10px', fontFamily: 'monospace' }} placeholder="#4F46E5" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowModal(false)} disabled={saving} style={secondaryButtonStyle}>取消</button>
            <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving && <Loader size={14} />} 保存
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
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

export { AdminCategories };
