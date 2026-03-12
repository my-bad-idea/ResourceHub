function ResourceRow({ resource, onEdit, isLast = false }) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const viewportWidth = window.useViewportWidth();
  const [imgError, setImgError] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [heartScale, setHeartScale] = React.useState(1);

  const { getCategoryTone, getLogoFallbackColor, getDomain, formatDate, recordResourceVisit } = window.helpers;
  const currentUser = state?.currentUser;
  const theme = state?.theme || window.getTheme?.() || 'system';
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLightTheme = !isDarkTheme;
  const isFavorited = state?.favorites?.some(f => f.id === resource.id) ?? false;
  const canEdit = currentUser && (currentUser.id === resource.ownerId || currentUser.role === 'admin');
  const category = resource.category || (resource.categoryName ? { name: resource.categoryName, color: resource.categoryColor } : null);
  const categoryTone = category ? getCategoryTone(category, resource.id || resource.name) : null;
  const fallbackColor = getLogoFallbackColor(resource.name, category);
  const domain = getDomain(resource.url);
  const updatedLabel = formatDate(resource.updatedAt || resource.createdAt) || '刚刚更新';
  const compactLayout = viewportWidth < 1120;
  const mobileLayout = viewportWidth < 760;

  const handleRowClick = (e) => {
    if (e.target.closest('button')) return;
    recordResourceVisit({ resource, request, dispatch });
    window.open(resource.url, '_blank', 'noopener');
  };

  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      dispatch({ type: 'ADD_TOAST', toastType: 'info', message: '请登录后操作' });
      return;
    }
    setHeartScale(1.3);
    setTimeout(() => setHeartScale(1), 200);
    const { ok } = await request(`/api/resources/${resource.id}/favorite`, { method: 'POST' });
    if (ok) dispatch({ type: 'TOGGLE_FAVORITE', resource });
  };

  const displayTags = resource.tags?.slice(0, compactLayout ? 2 : 3) || [];
  const extraTags = (resource.tags?.length || 0) - displayTags.length;
  const showFavoriteAction = isFavorited || isHovered || mobileLayout;
  const showEditAction = canEdit && (isHovered || mobileLayout);
  const rowDividerColor = isLightTheme
    ? '1px solid color-mix(in srgb, var(--control-border) 62%, transparent)'
    : '1px solid color-mix(in srgb, var(--outline-strong) 16%, transparent)';
  const rowHoverBackground = isLightTheme
    ? 'var(--surface-hover)'
    : 'color-mix(in srgb, var(--surface-elevated) 82%, var(--control-bg-muted))';
  const rowActionButtonStyle = (active = false, visible = true) => ({
    width: '32px',
    height: '32px',
    borderRadius: '11px',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--danger) 30%, var(--control-border))' : 'color-mix(in srgb, var(--control-border) 64%, transparent)'}`,
    background: active
      ? 'color-mix(in srgb, var(--danger) 12%, var(--control-bg))'
      : isLightTheme
        ? 'var(--surface-elevated)'
        : 'color-mix(in srgb, var(--surface-elevated) 82%, var(--control-bg-muted))',
    color: active ? 'var(--danger)' : 'var(--text-secondary)',
    cursor: visible ? 'pointer' : 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transform: `scale(${active ? heartScale : 1})`,
    boxShadow: active ? '0 8px 14px color-mix(in srgb, var(--danger) 10%, transparent)' : 'none',
    transition: 'transform 180ms, opacity 150ms, border-color 150ms, background 150ms, box-shadow 150ms',
  });
  const infoPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '22px',
    padding: '0 7px',
    borderRadius: '999px',
    border: '1px solid color-mix(in srgb, var(--control-border) 54%, transparent)',
    background: isLightTheme
      ? 'var(--surface-muted)'
      : 'color-mix(in srgb, var(--surface-elevated) 76%, var(--surface-muted))',
    color: 'var(--text-secondary)',
    fontSize: '10px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      data-rh-resource-row
      data-rh-resource-row-compact={compactLayout ? 'true' : 'false'}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: mobileLayout ? 'minmax(0, 1fr) auto' : compactLayout ? 'minmax(0, 1.2fr) minmax(0, 0.95fr) auto' : 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.9fr) auto',
        gap: mobileLayout ? '12px' : '16px',
        alignItems: 'center',
        minHeight: mobileLayout ? '78px' : '72px',
        padding: mobileLayout ? '12px 14px' : '12px 16px',
        borderBottom: isLast ? 'none' : rowDividerColor,
        background: isHovered ? rowHoverBackground : 'transparent',
        cursor: 'pointer',
        transition: 'background 150ms, box-shadow 150ms',
        boxShadow: isHovered ? 'inset 0 1px 0 color-mix(in srgb, var(--surface-elevated) 42%, transparent)' : 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', minWidth: 0, alignItems: 'flex-start' }}>
        {resource.logoUrl && !imgError ? (
          <img
            src={resource.logoUrl}
            onError={() => setImgError(true)}
            style={{
              width: mobileLayout ? '36px' : '38px',
              height: mobileLayout ? '36px' : '38px',
              borderRadius: '11px',
              objectFit: 'contain',
              flexShrink: 0,
              background: 'var(--surface-muted)',
              border: '1px solid color-mix(in srgb, var(--control-border) 70%, transparent)',
            }}
          />
        ) : (
          <div
            style={{
              width: mobileLayout ? '36px' : '38px',
              height: mobileLayout ? '36px' : '38px',
              borderRadius: '11px',
              background: categoryTone?.accent || fallbackColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: mobileLayout ? '13px' : '14px',
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 6px 14px color-mix(in srgb, var(--text-primary) 8%, transparent)',
            }}
          >
            {(resource.name || '?')[0].toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1, display: 'grid', gap: '6px' }}>
          <div style={{ display: 'grid', gap: '3px', minWidth: 0 }}>
            <div
              style={{
                fontSize: '14px',
                lineHeight: 1.3,
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {resource.name}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: isHovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {domain}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
            {category && (
              <span
                style={{
                  ...infoPillStyle,
                  background: categoryTone
                    ? categoryTone.soft
                    : infoPillStyle.background,
                  color: categoryTone?.accent || 'var(--text-secondary)',
                  border: categoryTone
                    ? `1px solid ${categoryTone.border}`
                    : infoPillStyle.border,
                }}
              >
                {category.name}
              </span>
            )}
            <span
              style={{
                ...infoPillStyle,
                background: resource.visibility === 'private'
                  ? 'color-mix(in srgb, var(--danger) 14%, var(--surface-elevated))'
                  : 'var(--surface-muted)',
                color: resource.visibility === 'private' ? 'var(--danger)' : 'var(--text-secondary)',
                border: resource.visibility === 'private'
                  ? '1px solid color-mix(in srgb, var(--danger) 24%, var(--outline-strong))'
                  : '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
              }}
            >
              {resource.visibility === 'private' ? '私有' : '公开'}
            </span>
          </div>
        </div>
      </div>

      {!mobileLayout && (
        <div style={{ minWidth: 0, display: 'grid', gap: '6px' }}>
          <div
            style={{
              fontSize: '12px',
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {resource.description || '暂无描述'}
          </div>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '5px', minWidth: 0, alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              更新于 {updatedLabel}
            </span>
            <span style={{ fontSize: '10px', color: 'color-mix(in srgb, var(--text-tertiary) 58%, transparent)' }}>•</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              访问 {resource.visitCount || 0}
            </span>
          </div>
        </div>
      )}

      {!compactLayout && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignContent: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          {displayTags.map((tag) => (
            <span
              key={tag}
              style={{
                ...infoPillStyle,
                background: isLightTheme
                  ? 'color-mix(in srgb, var(--surface-muted) 82%, var(--surface-elevated))'
                  : 'color-mix(in srgb, var(--surface-elevated) 72%, var(--surface-muted))',
              }}
            >
              #{tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span style={{ ...infoPillStyle, color: 'var(--text-secondary)' }}>
              +{extraTags}
            </span>
          )}
        </div>
      )}

      <div style={{ width: mobileLayout ? '68px' : '76px', display: 'flex', gap: '6px', justifyContent: 'flex-end', flexShrink: 0, alignItems: 'center' }}>
        <window.TooltipIconButton
          label={isFavorited ? '取消收藏' : '收藏资源'}
          data-rh-resource-favorite
          data-active={isFavorited ? 'true' : 'false'}
          onClick={handleFavorite}
          buttonStyle={rowActionButtonStyle(isFavorited, showFavoriteAction)}
        >
          <lucide.Heart
            size={15}
            fill={isFavorited ? 'var(--danger)' : 'none'}
            style={{ color: isFavorited ? 'var(--danger)' : 'var(--text-secondary)' }}
          />
        </window.TooltipIconButton>
        {showEditAction ? (
          <window.TooltipIconButton
            label="编辑资源"
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(resource); }}
            buttonStyle={rowActionButtonStyle(false, true)}
          >
            <lucide.Edit2 size={15} style={{ color: 'var(--text-secondary)' }} />
          </window.TooltipIconButton>
        ) : null}
      </div>
    </div>
  );
}

window.ResourceRow = ResourceRow;
