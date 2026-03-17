import React, { useState } from 'react';
import { Heart, Edit2 } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { useViewportWidth, getCategoryTone, getLogoFallbackColor, getDomain, formatDate, recordResourceVisit } from '../utils/helpers';
import { getTheme } from '../utils/theme';
import { TooltipIconButton } from '../components/TooltipIconButton';

function ResourceCard({ resource, onEdit, featured = false, compact = false }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { request } = useApi();
  const viewportWidth = useViewportWidth();
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [heartScale, setHeartScale] = useState(1);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const currentUser = state?.currentUser;
  const theme = state?.theme || getTheme() || 'system';
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLightTheme = !isDarkTheme;
  const mobileLayout = viewportWidth < 760;
  const isFavorited = state?.favorites?.some((item) => item.id === resource.id) ?? resource.isFavorited ?? false;
  const canEdit = currentUser && (currentUser.id === resource.ownerId || currentUser.role === 'admin');

  const category = resource.category || (resource.categoryName ? { name: resource.categoryName, color: resource.categoryColor } : null);
  const categoryTone = category ? getCategoryTone(category, resource.id || resource.name) : null;
  const fallbackColor = getLogoFallbackColor(resource.name, category);
  const domain = getDomain(resource.url);
  const updatedLabel = formatDate(resource.updatedAt || resource.createdAt) || '刚刚更新';
  const hasDescription = Boolean(resource.description && resource.description.trim());
  const featuredCompact = featured && !hasDescription;
  const resultCompact = !featured && compact;
  const displayTags = resource.tags?.slice(0, featured ? (featuredCompact ? 2 : 3) : resultCompact ? 1 : 2) || [];
  const extraTags = (resource.tags?.length || 0) - displayTags.length;
  const hasVisibleTags = displayTags.length > 0 || extraTags > 0;
  const compactCard = !featured && !hasDescription;
  const cardGap = featured ? (featuredCompact ? '7px' : '10px') : resultCompact ? (hasDescription ? '4px' : '3px') : compactCard ? '5px' : '7px';
  const cardMinHeight = featured
    ? (featuredCompact ? (hasVisibleTags ? '158px' : '146px') : '188px')
    : resultCompact
      ? (hasDescription ? (hasVisibleTags ? '124px' : '118px') : (hasVisibleTags ? '114px' : '108px'))
    : compactCard
      ? (hasVisibleTags ? '138px' : '130px')
      : '150px';
  const cardPadding = featured ? (featuredCompact ? '12px' : '14px') : resultCompact ? '9px' : '10px';
  const mediaSize = featured ? (featuredCompact ? '40px' : '46px') : resultCompact ? '36px' : '40px';
  const mediaRadius = featured ? (featuredCompact ? '12px' : '14px') : resultCompact ? '10px' : '12px';
  const headerGap = resultCompact ? '6px' : compactCard ? '6px' : featured ? (featuredCompact ? '6px' : '8px') : '7px';
  const leadGap = resultCompact ? '7px' : compactCard ? '8px' : featured ? (featuredCompact ? '8px' : '10px') : '8px';
  const contentGap = resultCompact ? '3px' : compactCard ? '4px' : featured ? (featuredCompact ? '3px' : '5px') : '4px';
  const titleSize = featured ? (featuredCompact ? '16px' : '18px') : resultCompact ? '13px' : '14px';
  const titleLineClamp = featured ? 2 : 1;
  const domainSize = featured ? (featuredCompact ? '9px' : '11px') : resultCompact ? '8px' : '9px';
  const actionButtonSize = featured ? (featuredCompact ? '30px' : '34px') : resultCompact ? '30px' : '34px';
  const actionIconSize = featured ? (featuredCompact ? 14 : 16) : resultCompact ? 14 : 15;
  const actionRailWidth = featured ? (featuredCompact ? '32px' : '38px') : resultCompact ? '32px' : '36px';
  const tagGap = resultCompact ? '4px' : compactCard ? '4px' : featured ? (featuredCompact ? '4px' : '5px') : '5px';
  const metaFontSize = featured ? (featuredCompact ? '9px' : '10px') : resultCompact ? '8px' : '9px';
  const metaTextColor = featured
    ? 'var(--text-secondary)'
    : resultCompact
      ? 'var(--text-tertiary)'
      : 'var(--text-secondary)';
  const metaDividerColor = featured
    ? 'color-mix(in srgb, var(--text-tertiary) 72%, transparent)'
    : resultCompact
      ? 'color-mix(in srgb, var(--text-tertiary) 58%, transparent)'
      : 'color-mix(in srgb, var(--text-tertiary) 64%, transparent)';
  const badgePadding = resultCompact ? '1px 6px' : featuredCompact ? '2px 6px' : '2px 7px';
  const badgeFontSize = resultCompact ? '9px' : featuredCompact ? '9px' : '10px';
  const alwaysShowActions = mobileLayout && !featured;
  const showFavoriteAction = alwaysShowActions || isFavorited || isHovered || favoriteLoading;
  const showEditAction = alwaysShowActions || isHovered;
  const resultCardBorder = isLightTheme
    ? 'var(--border)'
    : 'color-mix(in srgb, var(--outline-strong) 52%, var(--border))';
  const overviewCardBorder = isLightTheme
    ? 'color-mix(in srgb, var(--control-border) 76%, transparent)'
    : 'color-mix(in srgb, var(--outline-strong) 40%, var(--border))';
  const resultCardBackground = isLightTheme
    ? 'var(--surface-elevated)'
    : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))';
  const overviewCardBackground = isLightTheme
    ? 'var(--surface-elevated)'
    : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))';

  const handleCardClick = (e) => {
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
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    setHeartScale(1.18);
    setTimeout(() => setHeartScale(1), 180);
    try {
      const { ok } = await request(`/api/resources/${resource.id}/favorite`, { method: 'POST' });
      if (ok) {
        dispatch({ type: 'TOGGLE_FAVORITE', resource });
        dispatch({ type: 'UPDATE_RESOURCE', resource: { ...resource, isFavorited: !isFavorited } });
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const actionButtonStyle = (active = false, visible = true) => ({
    width: actionButtonSize,
    height: actionButtonSize,
    borderRadius: '12px',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--danger) 34%, var(--control-border))' : 'var(--control-border)'}`,
    background: active
      ? 'color-mix(in srgb, var(--danger) 12%, var(--control-bg))'
      : isLightTheme
        ? 'var(--surface-elevated)'
        : 'color-mix(in srgb, var(--surface-elevated) 86%, var(--control-bg-muted))',
    color: active ? 'var(--danger)' : 'var(--text-secondary)',
    cursor: visible ? 'pointer' : 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 150ms, opacity 150ms, border-color 150ms, background 150ms, box-shadow 150ms',
    transform: `${visible ? 'translateY(0)' : 'translateY(-3px)'} scale(${active ? heartScale : 1})`,
    opacity: visible ? (favoriteLoading && active ? 0.7 : 1) : 0,
    flexShrink: 0,
    pointerEvents: visible ? 'auto' : 'none',
    boxShadow: visible
      ? active
        ? '0 8px 14px color-mix(in srgb, var(--danger) 12%, transparent)'
        : featured
          ? '0 8px 16px color-mix(in srgb, var(--text-primary) 4%, transparent)'
          : 'var(--shadow-control)'
      : 'none',
  });

  const tagStyle = {
    padding: featured ? (featuredCompact ? '2px 7px' : '3px 8px') : resultCompact ? '1px 6px' : '2px 7px',
    borderRadius: '999px',
    background: isLightTheme
      ? 'color-mix(in srgb, var(--surface-muted) 82%, var(--surface-elevated))'
      : 'color-mix(in srgb, var(--surface-muted) 74%, var(--surface-elevated))',
    color: 'var(--text-secondary)',
    fontSize: featured ? (featuredCompact ? '9px' : '10px') : resultCompact ? '8px' : '9px',
    border: '1px solid color-mix(in srgb, var(--control-border) 52%, transparent)',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      data-rh-resource-card-compact={compactCard ? 'true' : 'false'}
      data-rh-resource-card-featured-compact={featuredCompact ? 'true' : 'false'}
      data-rh-resource-card-result-compact={resultCompact ? 'true' : 'false'}
      data-rh-resource-card-mode={featured ? 'overview' : 'result'}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: cardGap,
        minHeight: cardMinHeight,
        height: '100%',
        padding: cardPadding,
        borderRadius: featured ? '20px' : resultCompact ? '13px' : '14px',
        border: `1px solid ${isHovered
          ? isLightTheme
            ? 'color-mix(in srgb, var(--brand) 24%, var(--border))'
            : 'color-mix(in srgb, var(--brand) 24%, var(--border))'
          : featured
            ? overviewCardBorder
            : resultCardBorder}`,
        background: isHovered
          ? featured
            ? (isLightTheme
              ? 'var(--surface-elevated)'
              : 'color-mix(in srgb, var(--surface-elevated) 90%, var(--surface-tint))')
            : resultCardBackground
          : featured
            ? overviewCardBackground
            : resultCardBackground,
        cursor: 'pointer',
        boxShadow: isHovered
          ? isLightTheme
            ? 'var(--shadow-card-hover)'
            : 'var(--shadow-dropdown)'
          : featured
            ? isLightTheme
              ? 'var(--shadow-card)'
              : '0 14px 28px color-mix(in srgb, var(--bg-primary) 20%, transparent)'
            : isLightTheme
              ? 'var(--shadow-card)'
              : 'var(--shadow-card)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 160ms, border-color 160ms, background 160ms, box-shadow 160ms',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: headerGap,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', gap: leadGap, minWidth: 0, alignItems: 'flex-start' }}>
          {resource.logoUrl && !imgError ? (
            <img
              src={resource.logoUrl}
              onError={() => setImgError(true)}
              style={{
                width: mediaSize,
                height: mediaSize,
                borderRadius: mediaRadius,
                objectFit: 'contain',
                flexShrink: 0,
                background: 'var(--surface-muted)',
                border: '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
              }}
            />
          ) : (
            <div
              style={{
                width: mediaSize,
                height: mediaSize,
                borderRadius: mediaRadius,
                background: categoryTone?.accent || fallbackColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: featured ? (featuredCompact ? '16px' : '17px') : resultCompact ? '13px' : '14px',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 6px 14px color-mix(in srgb, var(--text-primary) 8%, transparent)',
              }}
            >
              {(resource.name || '?')[0].toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1, display: 'grid', gap: contentGap }}>
            <div style={{ display: 'grid', gap: resultCompact ? '1px' : compactCard ? '1px' : '2px', minWidth: 0 }}>
              <div
                style={{
                  fontSize: titleSize,
                  lineHeight: 1.22,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: featured ? '-0.02em' : '-0.01em',
                  display: '-webkit-box',
                  WebkitLineClamp: titleLineClamp,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                {resource.name}
              </div>
              <div
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  fontSize: domainSize,
                  color: isHovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '0.01em',
                }}
              >
                {domain}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: resultCompact ? '3px' : compactCard ? '3px' : '4px', alignItems: 'center' }}>
              {category && (
                <span
                  style={{
                    padding: badgePadding,
                    borderRadius: '999px',
                    background: categoryTone
                      ? categoryTone.soft
                      : 'var(--surface-muted)',
                    color: categoryTone?.accent || 'var(--text-primary)',
                    fontSize: badgeFontSize,
                    fontWeight: featured ? 800 : 700,
                    border: categoryTone
                      ? `1px solid ${categoryTone.border}`
                      : '1px solid color-mix(in srgb, var(--control-border) 52%, transparent)',
                  }}
                >
                  {category.name}
                </span>
              )}
              <span
                style={{
                  padding: badgePadding,
                  borderRadius: '999px',
                background: resource.visibility === 'private'
                  ? 'color-mix(in srgb, var(--danger) 14%, var(--surface-elevated))'
                  : isLightTheme
                    ? 'var(--surface-muted)'
                    : 'color-mix(in srgb, var(--surface-muted) 72%, var(--surface-elevated))',
                  color: resource.visibility === 'private' ? 'var(--danger)' : 'var(--text-secondary)',
                  fontSize: badgeFontSize,
                  fontWeight: 600,
                border: resource.visibility === 'private'
                  ? '1px solid color-mix(in srgb, var(--danger) 22%, var(--outline-strong))'
                  : '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
                }}
              >
                {resource.visibility === 'private' ? '私有' : '公开'}
              </span>
            </div>

            {(hasDescription || (featured && domain)) ? (
              <div
                style={{
                  fontSize: resultCompact ? '10px' : featuredCompact ? '10px' : '11px',
                  lineHeight: resultCompact ? 1.4 : 1.45,
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: resultCompact ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: featured ? (featuredCompact ? '26px' : '34px') : resultCompact ? '14px' : '26px',
                }}
              >
                {hasDescription ? resource.description : domain || '暂无描述'}
              </div>
            ) : null}
          </div>
        </div>

        <div
        style={{
          display: 'grid',
          gap: resultCompact ? '4px' : compactCard ? '4px' : featuredCompact ? '4px' : '5px',
          justifyItems: 'end',
          alignContent: 'start',
          minWidth: actionRailWidth,
          }}
        >
          <TooltipIconButton
            label={isFavorited ? '取消收藏' : '收藏资源'}
            placement="left"
            data-rh-resource-favorite
            data-active={isFavorited ? 'true' : 'false'}
            onClick={handleFavorite}
            buttonStyle={actionButtonStyle(isFavorited, showFavoriteAction)}
          >
            <Heart
              size={actionIconSize}
              fill={isFavorited ? 'var(--danger)' : 'none'}
              style={{ color: isFavorited ? 'var(--danger)' : 'var(--text-secondary)' }}
            />
          </TooltipIconButton>
          {canEdit && onEdit && (
            <TooltipIconButton
              label="编辑资源"
              placement="left"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(resource);
              }}
              buttonStyle={actionButtonStyle(false, showEditAction)}
            >
              <Edit2 size={actionIconSize} />
            </TooltipIconButton>
          )}
        </div>
        </div>

      {hasVisibleTags ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: tagGap, alignContent: 'flex-start' }}>
          {displayTags.map((tag) => (
            <span key={tag} style={tagStyle}>
              #{tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span style={tagStyle}>
              +{extraTags}
            </span>
          )}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: resultCompact ? '6px' : '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          paddingTop: hasVisibleTags ? (resultCompact ? 0 : compactCard ? 0 : featured ? (featuredCompact ? '3px' : '6px') : '1px') : 0,
          borderTop: featured && hasVisibleTags
            ? '1px solid color-mix(in srgb, var(--outline-strong) 12%, transparent)'
            : 'none',
        }}
      >
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: resultCompact ? '4px' : '5px', minWidth: 0, alignItems: 'center' }}>
          <span style={{ fontSize: metaFontSize, color: metaTextColor, whiteSpace: 'nowrap' }}>
            更新于 {updatedLabel}
          </span>
          <span style={{ fontSize: metaFontSize, color: metaDividerColor }}>•</span>
          <span style={{ fontSize: metaFontSize, color: metaTextColor, whiteSpace: 'nowrap' }}>
            访问 {resource.visitCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export { ResourceCard };
