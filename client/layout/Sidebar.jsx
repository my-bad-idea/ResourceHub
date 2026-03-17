import React, { useState } from 'react';
import { Heart, Clock, FileText } from 'lucide-react';
import { useAppState, useAppDispatch } from '../context/AppContext';

function Sidebar({ isCompact = false }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [showAllTags, setShowAllTags] = useState(false);

  if (!state) return null;
  const { categories, tags, selectedCategory, selectedTags, quickAccessFilter, currentUser } = state;
  const displayedTags = showAllTags ? tags : tags.slice(0, 20);

  const navItemStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '36px',
    borderRadius: '8px',
    padding: '8px 12px',
    margin: isCompact ? 0 : '2px 8px',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    background: isSelected ? 'rgba(0,113,227,0.10)' : 'none',
    color: isSelected ? 'var(--brand)' : 'var(--text-primary)',
    fontWeight: isSelected ? 600 : 400,
    transition: 'background 150ms',
  });

  const sectionTitleStyle = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    padding: isCompact ? '12px 12px 8px' : '16px 12px 8px',
  };

  const quickItems = [
    { key: 'favorites', label: '我的收藏', Icon: Heart },
    { key: 'history', label: '最近访问', Icon: Clock },
    { key: 'mine', label: '我创建的', Icon: FileText },
  ];

  const totalCount = (categories || []).reduce((sum, category) => sum + (category.resourceCount || 0), 0);
  const allCategory = { id: null, name: '全部', color: null, resourceCount: totalCount };
  const categoryList = [allCategory, ...(categories || [])];
  const listLayoutStyle = {
    display: 'grid',
    gridTemplateColumns: isCompact ? 'repeat(auto-fit, minmax(140px, 1fr))' : '1fr',
    gap: isCompact ? '6px' : 0,
    padding: isCompact ? '0 8px 8px' : 0,
  };

  return (
    <div style={{
      width: isCompact ? '100%' : '220px',
      flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: isCompact ? 'none' : '1px solid var(--border)',
      borderBottom: isCompact ? '1px solid var(--border)' : 'none',
      position: isCompact ? 'static' : 'sticky',
      top: isCompact ? 'auto' : '72px',
      height: isCompact ? 'auto' : 'calc(100vh - 72px)',
      overflowY: 'auto',
    }}>
      <div style={sectionTitleStyle}>类别</div>
      <div style={listLayoutStyle}>
        {categoryList.map((cat) => {
          const isSelected = selectedCategory === cat.id && !quickAccessFilter;
          return (
            <button
              key={cat.id || 'all'}
              style={navItemStyle(isSelected)}
              onClick={() => dispatch({ type: 'SET_CATEGORY', category: cat.id })}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(0,113,227,0.10)' : 'none'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat.name}
              </span>
              {cat.resourceCount !== undefined && (
                <span style={{
                  fontSize: '11px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  flexShrink: 0,
                  marginLeft: '4px',
                  color: 'var(--text-secondary)',
                }}>
                  {cat.resourceCount > 99 ? '99+' : cat.resourceCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

      <div style={sectionTitleStyle}>标签</div>
      <div style={{ padding: '0 8px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {displayedTags.map((tag) => {
          const isTagSelected = (selectedTags || []).includes(tag);
          return (
            <button
              key={tag}
              onClick={() => dispatch({ type: 'TOGGLE_TAG', tag })}
              style={{
                fontSize: '12px',
                borderRadius: '4px',
                padding: '4px 8px',
                border: 'none',
                cursor: 'pointer',
                background: isTagSelected ? 'rgba(0,113,227,0.10)' : 'var(--bg-tertiary)',
                color: isTagSelected ? 'var(--brand)' : 'var(--text-secondary)',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { if (!isTagSelected) e.currentTarget.style.background = 'var(--bg-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isTagSelected ? 'rgba(0,113,227,0.10)' : 'var(--bg-tertiary)'; }}
            >
              {tag}
            </button>
          );
        })}

        {(tags || []).length > 20 && (
          <button
            onClick={() => setShowAllTags((value) => !value)}
            style={{
              fontSize: '12px',
              color: 'var(--brand)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            {showAllTags ? '收起' : `展开更多 (${tags.length - 20})`}
          </button>
        )}
      </div>

      {currentUser && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
          <div style={sectionTitleStyle}>快速访问</div>
          <div style={listLayoutStyle}>
            {quickItems.map(({ key, label, Icon }) => {
              const isSelected = quickAccessFilter === key;
              return (
                <button
                  key={key}
                  style={navItemStyle(isSelected)}
                  onClick={() => dispatch({ type: 'SET_QUICK_ACCESS_FILTER', filter: isSelected ? null : key })}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(0,113,227,0.10)' : 'none'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={14} style={{ color: isSelected ? 'var(--brand)' : 'var(--text-secondary)' }} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { Sidebar };
