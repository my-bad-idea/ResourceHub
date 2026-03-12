function ResourceFormModal({ isOpen, onClose, resource }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const isEdit = !!resource;

  const getInitial = () => ({
    name: resource?.name || '',
    url: resource?.url || '',
    categoryId: resource?.categoryId || '',
    visibility: resource?.visibility || 'public',
    logoUrl: resource?.logoUrl || '',
    description: resource?.description || '',
    tags: resource?.tags ? [...resource.tags] : [],
    enabled: resource?.enabled !== false,
  });

  const categories = state?.categories || [];
  const normalizeLabel = (value) => (value || '').trim().toLowerCase();

  const [form, setForm] = React.useState(getInitial);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');
  const [categoryInput, setCategoryInput] = React.useState('');
  const [addingCatLoading, setAddingCatLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = React.useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = React.useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = React.useState(null);
  const tagPanelRef = React.useRef(null);
  const tagInputRef = React.useRef(null);
  const categoryPanelRef = React.useRef(null);
  const categoryInputRef = React.useRef(null);

  const selectedCategory = React.useMemo(
    () => categories.find((category) => category.id === form.categoryId) || null,
    [categories, form.categoryId]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const initial = getInitial();
    const initialCategoryName = resource?.category?.name
      || categories.find((category) => category.id === initial.categoryId)?.name
      || '';
    setForm(initial);
    setErrors({});
    setTagInput('');
    setCategoryInput(initialCategoryName);
    setShowTagSuggestions(false);
    setShowCategorySuggestions(false);
    setHoveredCategoryId(null);
  }, [isOpen, resource?.id]);

  const allTags = React.useMemo(() => {
    const explicitTags = state?.tags || [];
    const derivedTags = (state?.resources || []).flatMap((item) => item.tags || []);
    const source = explicitTags.length > 0 ? explicitTags : derivedTags;
    return [...new Set(source.map((tag) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean))];
  }, [state?.resources, state?.tags]);

  const selectedTagSet = React.useMemo(
    () => new Set(form.tags.map((tag) => normalizeLabel(tag))),
    [form.tags]
  );

  const filteredCategorySuggestions = React.useMemo(() => {
    const keyword = categoryInput.trim().toLowerCase();
    return categories
      .filter((category) => !keyword || category.name.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [categories, categoryInput]);

  const filteredTagSuggestions = React.useMemo(() => {
    const keyword = tagInput.trim().toLowerCase();
    return allTags
      .filter((tag) => !selectedTagSet.has(normalizeLabel(tag)))
      .filter((tag) => !keyword || tag.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [allTags, selectedTagSet, tagInput]);

  const categorySuggestionsVisible = showCategorySuggestions && filteredCategorySuggestions.length > 0;
  const tagSuggestionsVisible = showTagSuggestions && filteredTagSuggestions.length > 0;
  const categorySuggestionHeading = categoryInput.trim() ? '匹配类别' : '已有类别';
  const tagSuggestionHeading = tagInput.trim() ? '匹配标签' : '已有标签';

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.trim().length === 0 || form.name.length > 50) {
      errs.name = '资源名称不能为空（最多50字符）';
    }
    if (!form.url || !/^https?:\/\//.test(form.url)) {
      errs.url = 'URL需以 http:// 或 https:// 开头';
    }
    if (form.logoUrl && !/^https?:\/\//.test(form.logoUrl)) {
      errs.logoUrl = 'Logo URL格式不正确';
    }
    if (form.description && form.description.length > 200) {
      errs.description = '描述最多200字符';
    }
    if (form.tags.length > 10) {
      errs.tags = '最多添加10个标签';
    }
    return errs;
  };

  const handleCategorySelect = React.useCallback((category) => {
    setForm((prev) => ({ ...prev, categoryId: category.id }));
    setCategoryInput(category.name);
    setShowCategorySuggestions(false);
    setHoveredCategoryId(null);
  }, []);

  const handleCreateCategory = React.useCallback(async (rawValue) => {
    const trimmedValue = (rawValue || '').trim();
    const normalizedCategoryName = normalizeLabel(trimmedValue);
    if (!normalizedCategoryName) return false;

    const existingCategory = categories.find(
      (category) => normalizeLabel(category.name) === normalizedCategoryName
    );
    if (existingCategory) {
      handleCategorySelect(existingCategory);
      return true;
    }

    setAddingCatLoading(true);
    try {
      const { ok, data } = await request('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmedValue }),
      });
      if (ok) {
        const category = data.data;
        dispatch({ type: 'ADD_CATEGORY', category });
        handleCategorySelect(category);
        return true;
      }
      if (data.code === 'CATEGORY_NAME_TAKEN') {
        const fallbackCategory = categories.find(
          (category) => normalizeLabel(category.name) === normalizedCategoryName
        );
        if (fallbackCategory) {
          handleCategorySelect(fallbackCategory);
          return true;
        }
      }
      dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '创建类别失败' });
      return false;
    } finally {
      setAddingCatLoading(false);
    }
  }, [categories, dispatch, handleCategorySelect, request]);

  const commitCategoryInput = React.useCallback(() => {
    const trimmedValue = categoryInput.trim();
    if (!trimmedValue) {
      setForm((prev) => ({ ...prev, categoryId: '' }));
      setCategoryInput('');
      return;
    }

    const exactCategory = categories.find(
      (category) => normalizeLabel(category.name) === normalizeLabel(trimmedValue)
    );
    if (exactCategory) {
      setForm((prev) => ({ ...prev, categoryId: exactCategory.id }));
      setCategoryInput(exactCategory.name);
      return;
    }

    setCategoryInput(selectedCategory?.name || '');
    if (!selectedCategory) {
      setForm((prev) => ({ ...prev, categoryId: '' }));
    }
  }, [categories, categoryInput, selectedCategory]);

  React.useEffect(() => {
    if (!showCategorySuggestions) return undefined;
    const handleMouseDown = (event) => {
      if (categoryPanelRef.current?.contains(event.target)) return;
      commitCategoryInput();
      setShowCategorySuggestions(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [commitCategoryInput, showCategorySuggestions]);

  React.useEffect(() => {
    if (!showTagSuggestions) return undefined;
    const handleMouseDown = (event) => {
      if (tagPanelRef.current?.contains(event.target)) return;
      setShowTagSuggestions(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showTagSuggestions]);

  const resolveTagValue = (rawTag) => {
    const trimmedTag = rawTag.trim();
    if (!trimmedTag) return '';
    const matchedTag = allTags.find((tag) => normalizeLabel(tag) === normalizeLabel(trimmedTag));
    return matchedTag || trimmedTag;
  };

  const handleAddTag = (rawValue = tagInput) => {
    const resolvedTag = resolveTagValue(rawValue);
    if (!resolvedTag || resolvedTag.length > 20 || selectedTagSet.has(normalizeLabel(resolvedTag)) || form.tags.length >= 10) {
      return false;
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, resolvedTag] }));
    setTagInput('');
    window.requestAnimationFrame(() => {
      tagInputRef.current?.focus();
      setShowTagSuggestions(true);
    });
    return true;
  };

  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowTagSuggestions(false);
      return;
    }
    if (event.key === 'Backspace' && !tagInput.trim() && form.tags.length > 0) {
      event.preventDefault();
      setForm((prev) => ({ ...prev, tags: prev.tags.slice(0, -1) }));
      setShowTagSuggestions(true);
    }
  };

  const handleCategoryKeyDown = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const trimmedValue = categoryInput.trim();
      if (!trimmedValue) {
        setForm((prev) => ({ ...prev, categoryId: '' }));
        setCategoryInput('');
        setShowCategorySuggestions(false);
        return;
      }
      const exactCategory = categories.find(
        (category) => normalizeLabel(category.name) === normalizeLabel(trimmedValue)
      );
      if (exactCategory) {
        handleCategorySelect(exactCategory);
        return;
      }
      await handleCreateCategory(trimmedValue);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setCategoryInput(selectedCategory?.name || '');
      setShowCategorySuggestions(false);
      categoryInputRef.current?.blur();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      setShowCategorySuggestions(true);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { ok, data } = await request(`/api/resources/${resource.id}`, { method: 'DELETE' });
      if (ok) {
        dispatch({ type: 'DELETE_RESOURCE', id: resource.id });
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '资源已删除' });
        setShowDeleteConfirm(false);
        onClose();
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '删除失败' });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        url: form.url.trim(),
        categoryId: form.categoryId || null,
        visibility: form.visibility,
        logoUrl: form.logoUrl.trim(),
        description: form.description,
        tags: form.tags,
        enabled: form.enabled,
      };
      let ok;
      let data;
      if (isEdit) {
        ({ ok, data } = await request(`/api/resources/${resource.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        }));
      } else {
        ({ ok, data } = await request('/api/resources', {
          method: 'POST',
          body: JSON.stringify(body),
        }));
      }
      if (ok) {
        const saved = data.data;
        const category = categories.find((item) => item.id === saved.categoryId) || null;
        const enriched = { ...saved, category, tags: form.tags };
        if (isEdit) {
          dispatch({ type: 'UPDATE_RESOURCE', resource: enriched });
        } else {
          dispatch({ type: 'ADD_RESOURCE', resource: enriched });
          dispatch({ type: 'SET_MINE', mine: [enriched, ...(state?.mine || [])] });
        }
        dispatch({ type: 'ADD_TOAST', toastType: 'success', message: '保存成功' });
        onClose();
      } else {
        dispatch({ type: 'ADD_TOAST', toastType: 'error', message: data.error || '保存失败' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  });
  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    display: 'block',
    marginBottom: '6px',
  };
  const fieldStyle = { marginBottom: '14px' };
  const settingsBlockStyle = {
    ...fieldStyle,
    padding: '0',
    display: 'grid',
    gap: '10px',
  };
  const suggestionPanelStyle = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    padding: '10px',
    borderRadius: '14px',
    border: '1px solid color-mix(in srgb, var(--outline-strong) 84%, var(--border))',
    background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
    boxShadow: 'var(--shadow-dropdown)',
    zIndex: 48,
    display: 'grid',
    gap: '8px',
  };
  const tagInputShellStyle = {
    minHeight: '40px',
    padding: '6px 8px',
    borderRadius: '8px',
    border: showTagSuggestions ? '1px solid var(--brand)' : '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    boxShadow: showTagSuggestions
      ? '0 0 0 3px color-mix(in srgb, var(--brand) 16%, transparent)'
      : 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
    cursor: 'text',
    boxSizing: 'border-box',
  };
  const tagChipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'color-mix(in srgb, var(--brand-soft) 72%, var(--bg-secondary))',
    color: 'var(--brand-strong)',
    border: '1px solid color-mix(in srgb, var(--brand) 24%, var(--border))',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '13px',
    lineHeight: 1,
  };

  return (
    <>
      <window.Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? '编辑资源' : '新增资源'}
        width="520px"
        closeOnBackdrop={false}
        closeOnEscape
      >
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              资源名称 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              data-rh-resource-name-input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              style={inputStyle('name')}
              disabled={loading}
              maxLength={50}
              placeholder="请输入资源名称"
            />
            {errors.name && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.name}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              URL <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              data-rh-resource-url-input
              value={form.url}
              onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              style={inputStyle('url')}
              disabled={loading}
              placeholder="https://example.com"
            />
            {errors.url && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.url}</div>
            )}
          </div>

          <div style={settingsBlockStyle}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>访问权限</label>
            <div style={{ display: 'flex', gap: '16px', minHeight: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              {[{ value: 'public', label: '公开' }, { value: 'private', label: '私有' }].map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={form.visibility === option.value}
                    onChange={() => setForm((prev) => ({ ...prev, visibility: option.value }))}
                    disabled={loading}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>类别</label>
            <div ref={categoryPanelRef} style={{ position: 'relative' }}>
              <input
                ref={categoryInputRef}
                value={categoryInput}
                onChange={(event) => {
                  setCategoryInput(event.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onClick={() => setShowCategorySuggestions(true)}
                onBlur={() => {
                  window.requestAnimationFrame(() => {
                    if (categoryPanelRef.current?.contains(document.activeElement)) return;
                    commitCategoryInput();
                    setShowCategorySuggestions(false);
                  });
                }}
                onKeyDown={handleCategoryKeyDown}
                disabled={loading || addingCatLoading}
                placeholder="选择类别"
                style={{
                  ...inputStyle('category'),
                  paddingRight: '38px',
                }}
              />
              {addingCatLoading ? (
                <lucide.Loader
                  size={16}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    animation: 'spin 1s linear infinite',
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <button
                  type="button"
                  aria-label={showCategorySuggestions ? '收起类别列表' : '展开类别列表'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (loading || addingCatLoading) return;
                    setShowCategorySuggestions((prev) => !prev);
                    if (!showCategorySuggestions) {
                      categoryInputRef.current?.focus();
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <lucide.ChevronDown
                    size={16}
                    style={{
                      transform: `rotate(${showCategorySuggestions ? 180 : 0}deg)`,
                      transition: 'transform 150ms ease',
                    }}
                  />
                </button>
              )}
              {categorySuggestionsVisible && (
                <div style={suggestionPanelStyle}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {categorySuggestionHeading}
                  </div>
                  <div style={{ display: 'grid', gap: '4px', maxHeight: '216px', overflowY: 'auto' }}>
                    {filteredCategorySuggestions.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHoveredCategoryId(category.id)}
                        onMouseLeave={() => setHoveredCategoryId(null)}
                        onClick={() => handleCategorySelect(category)}
                        style={{
                          minHeight: '38px',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: 'none',
                          background: category.id === form.categoryId
                            ? 'color-mix(in srgb, var(--brand-soft) 84%, var(--control-bg))'
                            : hoveredCategoryId === category.id
                              ? 'color-mix(in srgb, var(--surface-tint) 68%, var(--control-bg))'
                            : 'transparent',
                          color: category.id === form.categoryId ? 'var(--brand-strong)' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: category.id === form.categoryId ? 700 : hoveredCategoryId === category.id ? 600 : 500,
                          textAlign: 'left',
                          transition: 'background 120ms ease, color 120ms ease',
                        }}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Logo URL（可选）</label>
            <input
              value={form.logoUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
              style={inputStyle('logoUrl')}
              disabled={loading}
              placeholder="https://example.com/logo.png"
            />
            {errors.logoUrl && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.logoUrl}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>描述（可选，最多200字符）</label>
            <textarea
              data-rh-resource-description-input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              style={{ ...inputStyle('description'), resize: 'vertical', minHeight: '72px' }}
              disabled={loading}
              maxLength={200}
              placeholder="简短描述这个资源…"
            />
            {errors.description && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.description}</div>
            )}
          </div>

          <div style={fieldStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>标签（最多10个，每个最多20字符）</label>
              {form.tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, tags: [] }));
                    setTagInput('');
                    window.requestAnimationFrame(() => {
                      tagInputRef.current?.focus();
                      setShowTagSuggestions(true);
                    });
                  }}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: 0,
                  }}
                >
                  清空标签
                </button>
              )}
            </div>
            <div ref={tagPanelRef} style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  if (loading || form.tags.length >= 10) return;
                  tagInputRef.current?.focus();
                  setShowTagSuggestions(true);
                }}
                style={tagInputShellStyle}
              >
                {form.tags.map((tag) => (
                  <span key={tag} style={tagChipStyle}>
                    {tag}
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
                        window.requestAnimationFrame(() => {
                          tagInputRef.current?.focus();
                          setShowTagSuggestions(true);
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: 'var(--brand-strong)',
                      }}
                    >
                      <lucide.X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  data-rh-tag-input
                  value={tagInput}
                  onChange={(event) => {
                    setTagInput(event.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onClick={() => setShowTagSuggestions(true)}
                  onBlur={() => {
                    window.requestAnimationFrame(() => {
                      if (tagPanelRef.current?.contains(document.activeElement)) return;
                      setShowTagSuggestions(false);
                    });
                  }}
                  onKeyDown={handleTagKeyDown}
                  placeholder={form.tags.length === 0 ? '输入标签后回车添加' : ''}
                  disabled={loading || form.tags.length >= 10}
                  style={{
                    flex: '1 0 140px',
                    minWidth: '120px',
                    padding: '2px 0',
                    border: 0,
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              {tagSuggestionsVisible && (
                <div style={suggestionPanelStyle}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {tagSuggestionHeading}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '108px', overflowY: 'auto', paddingRight: '2px', alignContent: 'flex-start' }}>
                    {filteredTagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          handleAddTag(tag);
                        }}
                        style={{
                          fontSize: '12px',
                          background: 'color-mix(in srgb, var(--surface-elevated) 84%, var(--surface-muted))',
                          color: 'var(--text-secondary)',
                          border: '1px solid color-mix(in srgb, var(--outline-strong) 82%, var(--border))',
                          borderRadius: '999px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.tags && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.tags}</div>
            )}
          </div>

          <div style={settingsBlockStyle}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>启用状态</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {form.enabled ? '资源可正常展示与访问' : '资源将被隐藏并停止对外展示'}
              </div>
              <button
                onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                disabled={loading}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: form.enabled ? 'var(--brand)' : 'var(--bg-tertiary)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: form.enabled ? '23px' : '3px',
                    transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'space-between',
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            {isEdit ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                删除
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || addingCatLoading}
                style={{
                  padding: '8px 20px',
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: loading || addingCatLoading ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {(loading || addingCatLoading) && <lucide.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                保存
              </button>
            </div>
          </div>
        </div>
      </window.Modal>

      <window.ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="删除资源"
        message={`确认删除资源「${resource?.name}」？该操作不可撤销。`}
        confirmText="确认删除"
        loading={deleting}
      />
    </>
  );
}

window.ResourceFormModal = ResourceFormModal;
