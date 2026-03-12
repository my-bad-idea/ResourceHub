const normalizeLabel = (value) => (value || '').trim().toLowerCase();

function useFloatingPosition(anchorRef, isVisible) {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  React.useEffect(() => {
    if (!isVisible || !anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isVisible, anchorRef]);
  return pos;
}

function FloatingPanel({ anchorRef, isVisible, children }) {
  const pos = useFloatingPosition(anchorRef, isVisible);
  if (!isVisible) return null;
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        padding: '8px',
        borderRadius: '10px',
        border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
        background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
        boxShadow: 'var(--shadow-dropdown)',
        maxHeight: '220px',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function BatchResourceModal({ isOpen, onClose }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const categories = state?.categories || [];

  const allTags = React.useMemo(() => {
    const explicitTags = state?.tags || [];
    const derivedTags = (state?.resources || []).flatMap((item) => item.tags || []);
    const source = explicitTags.length > 0 ? explicitTags : derivedTags;
    return [...new Set(source.map((tag) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean))];
  }, [state?.resources, state?.tags]);

  const emptyRow = () => ({
    name: '',
    url: '',
    categoryValue: '',
    visibility: 'public',
    enabled: true,
    description: '',
    tags: [],
  });

  const [rows, setRows] = React.useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = React.useState(false);
  const [rowErrors, setRowErrors] = React.useState({});

  const [activeTagRow, setActiveTagRow] = React.useState(null);
  const [tagInputValue, setTagInputValue] = React.useState('');
  const tagAnchorRefs = React.useRef({});
  const tagPanelRef = React.useRef(null);

  const [activeCategoryRow, setActiveCategoryRow] = React.useState(null);
  const categoryAnchorRefs = React.useRef({});
  const categoryPanelRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    setRowErrors({});
    setActiveTagRow(null);
    setTagInputValue('');
    setActiveCategoryRow(null);
    tagAnchorRefs.current = {};
    categoryAnchorRefs.current = {};
  }, [isOpen]);

  React.useEffect(() => {
    if (activeTagRow === null) return;
    const handleMouseDown = (e) => {
      if (tagPanelRef.current?.contains(e.target)) return;
      const anchor = tagAnchorRefs.current[activeTagRow];
      if (anchor?.contains(e.target)) return;
      setActiveTagRow(null);
      setTagInputValue('');
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [activeTagRow]);

  React.useEffect(() => {
    if (activeCategoryRow === null) return;
    const handleMouseDown = (e) => {
      if (categoryPanelRef.current?.contains(e.target)) return;
      const anchor = categoryAnchorRefs.current[activeCategoryRow];
      if (anchor?.contains(e.target)) return;
      setActiveCategoryRow(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [activeCategoryRow]);

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    setRowErrors((prev) => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index][field];
        if (Object.keys(next[index]).length === 0) delete next[index];
      }
      return next;
    });
  };

  const addTagToRow = (index, tag) => {
    const trimmed = (typeof tag === 'string' ? tag : '').trim();
    if (!trimmed || trimmed.length > 20) return;
    setRows((prev) => {
      const row = prev[index];
      const normalized = normalizeLabel(trimmed);
      if (row.tags.length >= 10 || row.tags.some((t) => normalizeLabel(t) === normalized)) return prev;
      return prev.map((r, i) => (i === index ? { ...r, tags: [...r.tags, trimmed] } : r));
    });
    if (activeTagRow === index) setTagInputValue('');
  };

  const removeTagFromRow = (index, tag) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, tags: r.tags.filter((t) => t !== tag) } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    if (activeTagRow === index) { setActiveTagRow(null); setTagInputValue(''); }
    else if (activeTagRow != null && activeTagRow > index) setActiveTagRow(activeTagRow - 1);
    if (activeCategoryRow === index) setActiveCategoryRow(null);
    else if (activeCategoryRow != null && activeCategoryRow > index) setActiveCategoryRow(activeCategoryRow - 1);
    setRowErrors((prev) => {
      const next = {};
      Object.keys(prev).forEach((i) => {
        const idx = Number(i);
        if (idx < index) next[idx] = prev[i];
        else if (idx > index) next[idx - 1] = prev[i];
      });
      return next;
    });
  };

  const validate = () => {
    const errs = {};
    rows.forEach((row, i) => {
      const name = (row.name || '').trim();
      const url = (row.url || '').trim();
      if (!name || name.length > 50) errs[i] = { ...(errs[i] || {}), name: '名称必填，最多50字符' };
      if (!url || !/^https?:\/\//.test(url)) errs[i] = { ...(errs[i] || {}), url: 'URL需以 http:// 或 https:// 开头' };
      if (row.description && row.description.length > 200) errs[i] = { ...(errs[i] || {}), description: '描述最多200字符' };
      if (Array.isArray(row.tags) && row.tags.length > 10) errs[i] = { ...(errs[i] || {}), tags: '最多10个标签' };
    });
    setRowErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const categoryNameToId = new Map();
    (categories || []).forEach((cat) => categoryNameToId.set(normalizeLabel(cat.name), cat.id));

    const pendingRows = rows.map((r) => ({
      name: (r.name || '').trim(),
      url: (r.url || '').trim(),
      categoryName: (r.categoryValue || '').trim(),
      visibility: r.visibility === 'private' ? 'private' : 'public',
      enabled: r.enabled !== false,
      description: (r.description || '').trim().slice(0, 200),
      tags: Array.isArray(r.tags) ? r.tags.slice(0, 10) : [],
    }));

    const newCategoryNames = [];
    pendingRows.forEach((row) => {
      if (!row.categoryName) return;
      const key = normalizeLabel(row.categoryName);
      if (!key || categoryNameToId.has(key)) return;
      categoryNameToId.set(key, null);
      newCategoryNames.push({ key, name: row.categoryName });
    });

    if (newCategoryNames.length > 0) {
      for (const item of newCategoryNames) {
        try {
          const { ok, data } = await request('/api/categories', {
            method: 'POST',
            body: JSON.stringify({ name: item.name }),
          });
          if (ok && data?.data) {
            categoryNameToId.set(item.key, data.data.id);
            dispatch({ type: 'ADD_CATEGORY', category: data.data });
          } else if (data?.code === 'CATEGORY_NAME_TAKEN') {
            const fallback = (state?.categories || []).find((c) => normalizeLabel(c.name) === item.key);
            if (fallback) categoryNameToId.set(item.key, fallback.id);
          }
        } catch (_) { /* skip */ }
      }
    }

    const toCreate = pendingRows
      .map((row) => ({
        name: row.name,
        url: row.url,
        categoryId: row.categoryName ? categoryNameToId.get(normalizeLabel(row.categoryName)) || null : null,
        visibility: row.visibility,
        enabled: row.enabled,
        description: row.description,
        tags: row.tags,
      }))
      .filter((r) => r.name && r.url);
    if (toCreate.length === 0) return;
    setLoading(true);
    let successCount = 0;
    const created = [];
    for (const body of toCreate) {
      const { ok, data } = await request('/api/resources', {
        method: 'POST',
        body: JSON.stringify({
          name: body.name, url: body.url, categoryId: body.categoryId,
          visibility: body.visibility, logoUrl: '', description: body.description,
          tags: body.tags, enabled: body.enabled,
        }),
      });
      if (ok) {
        successCount += 1;
        const saved = data.data;
        const category = categories.find((c) => c.id === saved.categoryId) || null;
        created.push({ ...saved, category, tags: saved.tags || body.tags });
      }
    }
    setLoading(false);
    created.forEach((resource) => dispatch({ type: 'ADD_RESOURCE', resource }));
    if (created.length > 0) {
      dispatch({ type: 'SET_MINE', mine: [...created, ...(state?.mine || [])] });
    }
    if (successCount === toCreate.length) {
      dispatch({ type: 'ADD_TOAST', toastType: 'success', message: `成功添加 ${successCount} 条资源` });
    } else if (successCount > 0) {
      dispatch({ type: 'ADD_TOAST', toastType: 'error', message: `成功 ${successCount} 条，失败 ${toCreate.length - successCount} 条` });
    } else {
      dispatch({ type: 'ADD_TOAST', toastType: 'error', message: '批量添加失败' });
    }
    onClose();
  };

  const filteredCategorySuggestions = React.useMemo(() => {
    const keyword = activeCategoryRow == null ? '' : (rows[activeCategoryRow]?.categoryValue || '').trim().toLowerCase();
    return categories.filter((c) => !keyword || c.name.toLowerCase().includes(keyword)).slice(0, 8);
  }, [activeCategoryRow, categories, rows]);

  const inputCellStyle = (hasError) => ({
    width: '100%', padding: '6px 8px',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '6px', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  });
  const thStyle = {
    textAlign: 'left', padding: '10px 8px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap',
  };
  const tdStyle = { padding: '6px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };
  const tagChipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: 'color-mix(in srgb, var(--brand-soft) 72%, var(--bg-secondary))',
    color: 'var(--brand-strong)',
    border: '1px solid color-mix(in srgb, var(--brand) 24%, var(--border))',
    borderRadius: '999px', padding: '2px 6px', fontSize: '12px', lineHeight: 1,
  };
  const tagInputShellStyle = (isActive) => ({
    minHeight: '32px', padding: '4px 6px', borderRadius: '6px',
    border: `1px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
    background: 'var(--bg-secondary)',
    boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--brand) 16%, transparent)' : 'none',
    display: 'flex', flexWrap: 'wrap', gap: '4px',
    alignItems: 'center', cursor: 'text', boxSizing: 'border-box',
  });
  const suggestionBtnStyle = {
    display: 'block', width: '100%', padding: '6px 10px',
    textAlign: 'left', border: 'none', borderRadius: '8px',
    background: 'transparent', color: 'var(--text-primary)',
    fontSize: '13px', cursor: 'pointer',
  };

  if (!isOpen) return null;

  const categoryDropdownVisible = activeCategoryRow != null && filteredCategorySuggestions.length > 0;
  const catAnchorRef = { current: categoryAnchorRefs.current[activeCategoryRow] || null };

  const tagSuggestions = (() => {
    if (activeTagRow == null) return [];
    const row = rows[activeTagRow];
    if (!row) return [];
    const keyword = tagInputValue.trim().toLowerCase();
    const selectedSet = new Set((row.tags || []).map(normalizeLabel));
    return allTags
      .filter((t) => !selectedSet.has(normalizeLabel(t)))
      .filter((t) => !keyword || (typeof t === 'string' ? t : '').toLowerCase().includes(keyword))
      .slice(0, 8);
  })();
  const tagDropdownVisible = activeTagRow != null && tagSuggestions.length > 0;
  const tagAnchorRef = { current: tagAnchorRefs.current[activeTagRow] || null };

  return (
    <>
      <window.Modal
        isOpen={isOpen}
        onClose={onClose}
        title="批量录入资源"
        width="100%"
        closeOnBackdrop={false}
        closeOnEscape
        fullScreen
      >
        <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          每行一条资源，名称与 URL 必填；类别、访问权限、启用状态可选；标签可输入并从已有标签联想选择，最多 10 个。
        </div>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '14%' }}>名称 <span style={{ color: 'var(--danger)' }}>*</span></th>
                <th style={{ ...thStyle, width: '18%' }}>URL <span style={{ color: 'var(--danger)' }}>*</span></th>
                <th style={{ ...thStyle, width: '15%' }}>类别</th>
                <th style={{ ...thStyle, width: '10%' }}>访问权限</th>
                <th style={{ ...thStyle, width: '5%', textAlign: 'center' }}>启用</th>
                <th style={{ ...thStyle, width: '12%' }}>描述</th>
                <th style={{ ...thStyle, width: '18%' }}>标签</th>
                <th style={{ ...thStyle, width: '40px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td style={tdStyle}>
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      placeholder="资源名称"
                      style={inputCellStyle(!!rowErrors[index]?.name)}
                      disabled={loading}
                      maxLength={50}
                    />
                    {rowErrors[index]?.name && (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>{rowErrors[index].name}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={row.url}
                      onChange={(e) => updateRow(index, 'url', e.target.value)}
                      placeholder="https://..."
                      style={inputCellStyle(!!rowErrors[index]?.url)}
                      disabled={loading}
                    />
                    {rowErrors[index]?.url && (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>{rowErrors[index].url}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div ref={(el) => { categoryAnchorRefs.current[index] = el; }}>
                      <input
                        value={row.categoryValue}
                        onChange={(e) => {
                          updateRow(index, 'categoryValue', e.target.value);
                          setActiveCategoryRow(index);
                        }}
                        onFocus={() => setActiveCategoryRow(index)}
                        placeholder="输入或选择类别"
                        style={inputCellStyle(false)}
                        disabled={loading}
                      />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={row.visibility}
                      onChange={(e) => updateRow(index, 'visibility', e.target.value)}
                      style={inputCellStyle(false)}
                      disabled={loading}
                    >
                      <option value="public">公开</option>
                      <option value="private">私有</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateRow(index, 'enabled', e.target.checked)}
                        disabled={loading}
                      />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(index, 'description', e.target.value)}
                      placeholder="可选"
                      style={inputCellStyle(!!rowErrors[index]?.description)}
                      disabled={loading}
                      maxLength={200}
                    />
                    {rowErrors[index]?.description && (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>{rowErrors[index].description}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div ref={(el) => { tagAnchorRefs.current[index] = el; }}>
                      <div
                        style={tagInputShellStyle(activeTagRow === index)}
                        onClick={() => { if (row.tags?.length < 10) setActiveTagRow(index); }}
                      >
                        {(row.tags || []).map((tag) => (
                          <span key={tag} style={tagChipStyle}>
                            {tag}
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => removeTagFromRow(index, tag)}
                              disabled={loading}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', color: 'inherit' }}
                            >
                              <lucide.X size={10} />
                            </button>
                          </span>
                        ))}
                        {row.tags?.length < 10 && (
                          <input
                            value={activeTagRow === index ? tagInputValue : ''}
                            onChange={(e) => { setActiveTagRow(index); setTagInputValue(e.target.value); }}
                            onFocus={() => { setActiveTagRow(index); setTagInputValue(activeTagRow === index ? tagInputValue : ''); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const v = (activeTagRow === index ? tagInputValue : '').trim();
                                if (v) addTagToRow(index, v);
                              }
                              if (e.key === 'Backspace' && !(activeTagRow === index ? tagInputValue : '').trim() && row.tags?.length > 0) {
                                e.preventDefault();
                                removeTagFromRow(index, row.tags[row.tags.length - 1]);
                              }
                            }}
                            placeholder={row.tags?.length === 0 ? '输入选择标签' : ''}
                            style={{
                              flex: '1 0 72px', minWidth: '72px', padding: '2px 0',
                              border: 0, background: 'transparent', color: 'var(--text-primary)',
                              fontSize: '13px', outline: 'none', boxSizing: 'border-box', boxShadow: 'none',
                            }}
                            disabled={loading}
                          />
                        )}
                      </div>
                    </div>
                    {rowErrors[index]?.tags && (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>{rowErrors[index].tags}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={loading || rows.length <= 1}
                      style={{
                        padding: '4px 8px', border: 'none', background: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: rows.length <= 1 || loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px', opacity: rows.length <= 1 ? 0.5 : 1,
                      }}
                      title="删除此行"
                    >
                      <lucide.Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={addRow}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', border: '1px dashed var(--border)',
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              borderRadius: '8px', fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <lucide.Plus size={14} /> 添加一行
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button
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
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '8px 20px', background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {loading && <lucide.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            批量保存
          </button>
        </div>
      </window.Modal>

      <FloatingPanel anchorRef={catAnchorRef} isVisible={categoryDropdownVisible}>
        <div ref={categoryPanelRef}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {(rows[activeCategoryRow]?.categoryValue || '').trim() ? '匹配类别' : '已有类别'}
          </div>
          <div style={{ display: 'grid', gap: '2px' }}>
            {filteredCategorySuggestions.map((category) => (
              <button
                key={category.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  updateRow(activeCategoryRow, 'categoryValue', category.name);
                  setActiveCategoryRow(null);
                }}
                style={suggestionBtnStyle}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </FloatingPanel>

      <FloatingPanel anchorRef={tagAnchorRef} isVisible={tagDropdownVisible}>
        <div ref={tagPanelRef}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {tagInputValue.trim() ? '匹配标签' : '已有标签'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tagSuggestions.map((tag) => {
              const label = typeof tag === 'string' ? tag : tag.name;
              return (
                <button
                  key={label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTagToRow(activeTagRow, label)}
                  style={{
                    fontSize: '12px', padding: '5px 10px',
                    border: '1px solid color-mix(in srgb, var(--outline-strong) 82%, var(--border))',
                    borderRadius: '999px', cursor: 'pointer',
                    background: 'color-mix(in srgb, var(--surface-elevated) 84%, var(--surface-muted))',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </FloatingPanel>
    </>
  );
}

window.BatchResourceModal = BatchResourceModal;
