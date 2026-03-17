import React, { useState, useMemo } from 'react';
import { Heart, Edit2 } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { useViewportWidth, getCategoryTone, getLogoFallbackColor, getDomain, formatDate, formatMonth, recordResourceVisit } from '../utils/helpers';
import { getTheme } from '../utils/theme';
import { TooltipIconButton } from '../components/TooltipIconButton';
import { EmptyState } from '../components/EmptyState';

function ResourceTimeline({ resources, onEdit }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();
  const viewportWidth = useViewportWidth();

  const currentUser = state?.currentUser;
  const favorites = state?.favorites || [];
  const theme = state?.theme || getTheme() || 'system';
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLightTheme = !isDarkTheme;
  const mobileLayout = viewportWidth < 760;
  const compactLayout = viewportWidth < 1120;

  const groups = useMemo(() => {
    const map = {};

    (resources || []).forEach((resource) => {
      const anchorTimestamp = resource.createdAt || resource.updatedAt || 0;
      const date = anchorTimestamp ? new Date(anchorTimestamp * 1000) : new Date();
      const year = date.getFullYear();
      const month = date.getMonth();
      const sortKey = year * 100 + month;

      if (!map[sortKey]) {
        map[sortKey] = {
          key: `${year}-${month + 1}`,
          sortKey,
          label: formatMonth(anchorTimestamp) || `${year}年${month + 1}月`,
          items: [],
        };
      }

      map[sortKey].items.push(resource);
    });

    return Object.values(map)
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0)),
      }))
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [formatMonth, resources]);

  if (!resources || resources.length === 0) {
    return <EmptyState icon="Clock" title="暂无资源" description="还没有任何资源记录" />;
  }

  const monthBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '30px',
    padding: mobileLayout ? '0 10px' : '0 12px',
    borderRadius: '999px',
    border: isLightTheme
      ? '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)'
      : '1px solid color-mix(in srgb, var(--outline-strong) 24%, transparent)',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 82%, var(--surface-tint))',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.01em',
  };
  const monthMetaStyle = {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  };
  const timelineRailStyle = {
    position: 'absolute',
    left: mobileLayout ? '7px' : '9px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    borderRadius: '999px',
    background: isLightTheme
      ? 'linear-gradient(180deg, color-mix(in srgb, var(--brand) 26%, transparent) 0%, color-mix(in srgb, var(--control-border) 44%, transparent) 100%)'
      : 'linear-gradient(180deg, color-mix(in srgb, var(--brand) 30%, transparent) 0%, color-mix(in srgb, var(--outline-strong) 28%, transparent) 100%)',
  };

  return (
    <div data-rh-resource-timeline style={{ display: 'grid', gap: mobileLayout ? '18px' : '22px' }}>
      {groups.map((group) => (
        <section key={group.key} style={{ display: 'grid', gap: mobileLayout ? '10px' : '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              paddingLeft: mobileLayout ? '2px' : '4px',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={monthBadgeStyle}>{group.label}</span>
              <span style={monthMetaStyle}>{`${group.items.length} 条记录`}</span>
            </div>
            {!mobileLayout && (
              <span style={monthMetaStyle}>
                按创建时间归档
              </span>
            )}
          </div>

          <div style={{ position: 'relative', paddingLeft: mobileLayout ? '18px' : '24px' }}>
            <div style={timelineRailStyle} />
            <div style={{ display: 'grid', gap: mobileLayout ? '10px' : '12px' }}>
              {group.items.map((resource) => (
                <TimelineItem
                  key={resource.id}
                  resource={resource}
                  currentUser={currentUser}
                  favorites={favorites}
                  dispatch={dispatch}
                  request={request}
                  onEdit={onEdit}
                  isLightTheme={isLightTheme}
                  mobileLayout={mobileLayout}
                  compactLayout={compactLayout}
                  recordResourceVisit={recordResourceVisit}
                  getCategoryTone={getCategoryTone}
                  getLogoFallbackColor={getLogoFallbackColor}
                  getDomain={getDomain}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function TimelineItem({
  resource,
  currentUser,
  favorites,
  dispatch,
  request,
  onEdit,
  isLightTheme,
  mobileLayout,
  compactLayout,
  recordResourceVisit,
  getCategoryTone,
  getLogoFallbackColor,
  getDomain,
  formatDate,
}) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [heartScale, setHeartScale] = useState(1);

  const isFavorited = favorites.some((item) => item.id === resource.id);
  const category = resource.category || (resource.categoryName ? { name: resource.categoryName, color: resource.categoryColor } : null);
  const categoryTone = category ? getCategoryTone(category, resource.id || resource.name) : null;
  const fallbackColor = getLogoFallbackColor(resource.name, category);
  const canEdit = currentUser && (currentUser.id === resource.ownerId || currentUser.role === 'admin');
  const domain = getDomain(resource.url);
  const hasDescription = Boolean(resource.description && resource.description.trim());
  const summaryDate = formatDate(resource.updatedAt || resource.createdAt) || '刚刚更新';
  const summaryPrefix = resource.updatedAt && resource.createdAt && resource.updatedAt !== resource.createdAt ? '更新于' : '创建于';
  const displayTags = (resource.tags || []).slice(0, compactLayout ? 1 : 2);
  const extraTags = Math.max((resource.tags || []).length - displayTags.length, 0);
  const showFavoriteAction = isFavorited || isHovered || mobileLayout;
  const showEditAction = canEdit && (isHovered || mobileLayout);
  const actionButtonStyle = (active = false, visible = true) => ({
    width: mobileLayout ? '30px' : '32px',
    height: mobileLayout ? '30px' : '32px',
    borderRadius: mobileLayout ? '10px' : '11px',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--danger) 30%, var(--control-border))' : 'color-mix(in srgb, var(--control-border) 62%, transparent)'}`,
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
  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '22px',
    padding: '0 7px',
    borderRadius: '999px',
    border: '1px solid color-mix(in srgb, var(--control-border) 54%, transparent)',
    background: isLightTheme
      ? 'var(--surface-muted)'
      : 'color-mix(in srgb, var(--surface-elevated) 74%, var(--surface-muted))',
    color: 'var(--text-secondary)',
    fontSize: '10px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  const handleVisit = (e) => {
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

  return (
    <article
      data-rh-resource-timeline-item
      onClick={handleVisit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: mobileLayout
          ? 'minmax(0, 1fr) auto'
          : compactLayout
            ? 'minmax(0, 1fr) auto'
            : 'minmax(0, 1.1fr) minmax(0, 0.8fr) auto',
        gap: mobileLayout ? '12px' : '14px',
        alignItems: 'center',
        minHeight: mobileLayout ? '84px' : '88px',
        padding: mobileLayout ? '12px 12px 12px 14px' : '14px 16px',
        borderRadius: mobileLayout ? '16px' : '18px',
        border: isLightTheme
          ? (isHovered
            ? '1px solid color-mix(in srgb, var(--brand) 24%, var(--border))'
            : '1px solid var(--border)')
          : '1px solid color-mix(in srgb, var(--outline-strong) 24%, transparent)',
        background: isHovered
          ? (isLightTheme
            ? 'var(--surface-elevated)'
            : 'color-mix(in srgb, var(--surface-elevated) 88%, var(--surface-tint))')
          : (isLightTheme
            ? 'var(--surface-elevated)'
            : 'color-mix(in srgb, var(--surface-elevated) 90%, var(--surface-tint))'),
        boxShadow: isHovered
          ? (isLightTheme
            ? 'var(--shadow-card-hover)'
            : '0 14px 24px color-mix(in srgb, var(--bg-primary) 16%, transparent), inset 0 1px 0 color-mix(in srgb, var(--surface-elevated) 18%, transparent)')
          : (isLightTheme ? 'var(--shadow-card)' : 'none'),
        cursor: 'pointer',
        transition: 'background 150ms, border-color 150ms, box-shadow 150ms, transform 150ms',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: mobileLayout ? '-16px' : '-20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: mobileLayout ? '10px' : '12px',
          height: mobileLayout ? '10px' : '12px',
          borderRadius: '50%',
          background: 'var(--brand)',
          border: isLightTheme
            ? '3px solid color-mix(in srgb, var(--surface-elevated) 96%, var(--surface-tint))'
            : '3px solid color-mix(in srgb, var(--surface-elevated) 90%, var(--surface-tint))',
          boxShadow: '0 0 0 1px color-mix(in srgb, var(--brand) 14%, transparent)',
        }}
      />

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
                fontSize: mobileLayout ? '14px' : '15px',
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
                  ...pillStyle,
                  background: categoryTone
                    ? categoryTone.soft
                    : pillStyle.background,
                  color: categoryTone?.accent || 'var(--text-secondary)',
                  border: categoryTone
                    ? `1px solid ${categoryTone.border}`
                    : pillStyle.border,
                }}
              >
                {category.name}
              </span>
            )}
            <span
              style={{
                ...pillStyle,
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
            {!mobileLayout && displayTags.map((tag) => (
              <span key={tag} style={pillStyle}>#{tag}</span>
            ))}
            {!mobileLayout && extraTags > 0 && (
              <span style={pillStyle}>+{extraTags}</span>
            )}
          </div>
        </div>
      </div>

      {!mobileLayout && (
        <div style={{ minWidth: 0, display: 'grid', gap: '6px' }}>
          {hasDescription ? (
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
              {resource.description}
            </div>
          ) : (
            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.45,
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {domain}
            </div>
          )}

          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', minWidth: 0, alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {summaryPrefix} {summaryDate}
            </span>
            <span style={{ fontSize: '10px', color: 'color-mix(in srgb, var(--text-tertiary) 58%, transparent)' }}>•</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              访问 {resource.visitCount || 0}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          width: mobileLayout ? '68px' : '76px',
          display: 'flex',
          gap: '6px',
          justifyContent: 'flex-end',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        <TooltipIconButton
          label={isFavorited ? '取消收藏' : '收藏资源'}
          placement="left"
          onClick={handleFavorite}
          buttonStyle={actionButtonStyle(isFavorited, showFavoriteAction)}
        >
          <Heart
            size={15}
            fill={isFavorited ? 'var(--danger)' : 'none'}
            style={{ color: isFavorited ? 'var(--danger)' : 'var(--text-secondary)' }}
          />
        </TooltipIconButton>
        {showEditAction ? (
          <TooltipIconButton
            label="编辑资源"
            placement="left"
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit(resource);
            }}
            buttonStyle={actionButtonStyle(false, true)}
          >
            <Edit2 size={15} style={{ color: 'var(--text-secondary)' }} />
          </TooltipIconButton>
        ) : null}
      </div>
    </article>
  );
}

export { ResourceTimeline };
