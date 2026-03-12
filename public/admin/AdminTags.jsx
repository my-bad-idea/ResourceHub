function AdminTags() {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const { Trash2, Loader } = lucide;

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

  const thStyle = { padding: '0 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' };
  const tdStyle = { padding: '0 16px', fontSize: '14px', color: 'var(--text-primary)' };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>标签管理</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {checked.size > 0 && (
            <button onClick={() => setShowBatchConfirm(true)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', border: '1px solid var(--danger)', background: 'rgba(255,59,48,0.08)',
              color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}>
              <Trash2 size={14} /> 批量删除 ({checked.size})
            </button>
          )}
          <button onClick={loadTags} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', border: '1px solid var(--border)', background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
          }}>
            <lucide.RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {loadingTags ? (
        <window.Skeleton rows={5} type="row" />
      ) : (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 1px 4px rgba(18,32,57,0.08)' }}>
          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', height: '44px' }}>
                <th style={{ ...thStyle, width: '44px' }}>
                  <input type="checkbox" checked={allPageChecked} onChange={toggleAll}
                    style={{ cursor: 'pointer' }} />
                </th>
                <th style={thStyle}>标签名</th>
                <th style={thStyle}>使用次数</th>
                <th style={{ ...thStyle, width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', height: '80px', color: 'var(--text-secondary)' }}>暂无标签</td></tr>
              ) : pageData.map(item => (
                <tr key={item.tag} style={{ height: '52px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', transition: 'background 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 10%, var(--bg-secondary))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}>
                  <td style={{ ...tdStyle, width: '44px' }}>
                    <input type="checkbox" checked={checked.has(item.tag)}
                      onChange={() => setChecked(prev => { const s = new Set(prev); s.has(item.tag) ? s.delete(item.tag) : s.add(item.tag); return s; })}
                      style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                      borderRadius: '4px', padding: '3px 8px', fontSize: '13px',
                    }}>{item.tag}</span>
                  </td>
                  <td style={tdStyle}>{item.count}</td>
                  <td style={tdStyle}>
                    <button onClick={() => setDeleteTarget(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
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

      <window.ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除标签"
        message={`确认删除标签「${deleteTarget?.tag}」？该标签将从所有资源中移除。`}
        confirmText="确认删除"
        loading={deleting}
      />

      <window.ConfirmDialog
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

window.AdminTags = AdminTags;

