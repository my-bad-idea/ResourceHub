import React from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { Trash2, Loader, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ConfirmDialog';

function AdminTags() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();

  const [tags, setTags] = React.useState([]); // { tag, count }[]
  const [loadingTags, setLoadingTags] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 20;
  const [checked, setChecked] = React.useState(new Set()); // selected tag names for batch delete
  const [batchDeleting, setBatchDeleting] = React.useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = React.useState(false);

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const { ok, data } = await request('/api/tags');
      if (ok) setTags(data.data || []);
    } finally {
      setLoadingTags(false);
    }
  };

  React.useEffect(() => { loadTags(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { ok, data } = await request(`/api/tags/${encodeURIComponent(deleteTarget.tag)}`, { method: 'DELETE' });
      if (ok) {
        setTags(prev => prev.filter(t => t.tag !== deleteTarget.tag));
        setChecked(prev => { const s = new Set(prev); s.delete(deleteTarget.tag); return s; });
        dispatch({ type: 'SET_TAGS', tags: state.tags.filter(t => t !== deleteTarget.tag) });
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: `标签「${deleteTarget.tag}」已删除` });
        setDeleteTarget(null);
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '删除失败' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    const toDelete = [...checked];
    let successCount = 0;
    for (const tag of toDelete) {
      const { ok } = await request(`/api/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
      if (ok) successCount++;
    }
    setTags(prev => prev.filter(t => !checked.has(t.tag)));
    dispatch({ type: 'SET_TAGS', tags: state.tags.filter(t => !checked.has(t)) });
    setChecked(new Set());
    setShowBatchConfirm(false);
    setBatchDeleting(false);
    dispatch({ type: 'ADD_TOAST', toastType: 'success', message: `已删除 ${successCount} 个标签` });
  };

  const totalPages = Math.ceil(tags.length / PAGE_SIZE);
  const pageData = tags.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
  const secondaryButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '38px',
    padding: '0 14px',
    border: '1px solid var(--control-border)',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: 'var(--shadow-control)',
  };
  const dangerButtonStyle = {
    ...secondaryButtonStyle,
    border: '1px solid color-mix(in srgb, var(--danger) 20%, var(--control-border))',
    background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-elevated))',
    color: 'var(--danger)',
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

  const allPageChecked = pageData.length > 0 && pageData.every(item => checked.has(item.tag));

  const toggleAll = () => {
    if (allPageChecked) {
      setChecked(prev => { const s = new Set(prev); pageData.forEach(item => s.delete(item.tag)); return s; });
    } else {
      setChecked(prev => { const s = new Set(prev); pageData.forEach(item => s.add(item.tag)); return s; });
    }
  };

  return (
    <div>
      <div style={headerPanelStyle}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>标签管理</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>集中管理资源标签，保持筛选体系简洁、可读且一致。</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {checked.size > 0 && (
            <button onClick={() => setShowBatchConfirm(true)} style={dangerButtonStyle}>
              <Trash2 size={14} /> 批量删除 ({checked.size})
            </button>
          )}
          <button onClick={loadTags} style={secondaryButtonStyle}>
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {loadingTags ? (
        <Skeleton rows={5} type="row" />
      ) : (
        <div style={tableShellStyle}>
          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', height: '46px' }}>
                <th style={{ ...thStyle, width: '44px' }}>
                  <input type="checkbox" checked={allPageChecked} onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: 'var(--brand)' }} />
                </th>
                <th style={thStyle}>标签名</th>
                <th style={thStyle}>使用次数</th>
                <th style={{ ...thStyle, width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', height: '88px', color: 'var(--text-secondary)' }}>暂无标签</td></tr>
              ) : pageData.map(item => (
                <tr
                  key={item.tag}
                  style={{ height: '56px', borderTop: '1px solid color-mix(in srgb, var(--border) 86%, transparent)', background: 'var(--surface-elevated)', transition: 'background 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-elevated)'; }}
                >
                  <td style={{ ...tdStyle, width: '44px' }}>
                    <input type="checkbox" checked={checked.has(item.tag)}
                      onChange={() => setChecked(prev => { const s = new Set(prev); s.has(item.tag) ? s.delete(item.tag) : s.add(item.tag); return s; })}
                      style={{ cursor: 'pointer', accentColor: 'var(--brand)' }} />
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '28px',
                      background: 'var(--surface-muted)',
                      color: 'var(--text-secondary)',
                      border: '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
                      borderRadius: '999px',
                      padding: '0 10px',
                      fontSize: '13px',
                    }}>{item.tag}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{item.count}</td>
                  <td style={tdStyle}>
                    <button onClick={() => setDeleteTarget(item)} style={iconButtonStyle('danger')}>
                      <Trash2 size={14} />
                    </button>
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
            <ChevronLeft size={14} />
          </button>
          <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--text-secondary)', minWidth: '72px', textAlign: 'center' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={pagerButtonStyle(page === totalPages)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除标签"
        message={`确认删除标签「${deleteTarget?.tag}」？该标签将从所有资源中移除。`}
        confirmText="确认删除"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={showBatchConfirm}
        onClose={() => setShowBatchConfirm(false)}
        onConfirm={handleBatchDelete}
        title="批量删除标签"
        message={`确认删除选中的 ${checked.size} 个标签？这些标签将从所有资源中移除。`}
        confirmText="确认删除"
        loading={batchDeleting}
      />
    </div>
  );
}

export { AdminTags };
