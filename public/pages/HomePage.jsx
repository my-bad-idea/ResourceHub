
function HomePage({ pageType = 'overview' } = {}) {
  const state = window.useAppState();
  const dispatch = window.useAppDispatch();
  const { request } = window.useApi();
  const i18n = window.useI18n ? window.useI18n() : null;
  const t = i18n?.t || ((text) => text);
  const viewportWidth = window.useViewportWidth();
  const { navigate } = window.useRouter();
  const { LayoutGrid, List, Clock, Plus, ChevronDown, Heart, FileText, Menu, ArrowLeft, X } = lucide;

  const [showResourceModal, setShowResourceModal] = React.useState(false);
  const [showBatchModal, setShowBatchModal] = React.useState(false);
  const [editResource, setEditResource] = React.useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = React.useState(false);
  const [showSortMenu, setShowSortMenu] = React.useState(false);
  const [highlightedSort, setHighlightedSort] = React.useState('hot');
  const [showAllSidebarTags, setShowAllSidebarTags] = React.useState(false);
  const [trafficMetrics, setTrafficMetrics] = React.useState({
    totalVisits: 0,
    monthlyVisits: 0,
    dailyVisits: 0,
  });
  const sortMenuRef = React.useRef(null);
  const sortTriggerRef = React.useRef(null);
  const sortItemRefs = React.useRef({});
  const highlightedSortRef = React.useRef('hot');

  const isDesktop = viewportWidth >= 960;
  const isMobile = viewportWidth < 640;

  React.useEffect(() => {
    if (isDesktop) setShowMobileSidebar(false);
  }, [isDesktop]);

  React.useEffect(() => {
    if (viewportWidth < 640) setShowSortMenu(false);
  }, [viewportWidth]);

  if (!state) return null;

  const {
    resources,
    categories,
    tags,
    selectedCategory,
    selectedTags,
    quickAccessFilter,
    searchQuery,
    sortBy,
    viewMode,
    currentUser,
    favorites,
    history,
    mine,
    homeMode,
    theme,
  } = state;
  const isDarkTheme = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isLightTheme = !isDarkTheme;
  const { getCategoryTone } = window.helpers;

  const baseCardColumns = viewportWidth >= 1280 ? 4 : viewportWidth >= 960 ? 3 : viewportWidth >= 640 ? 2 : 1;
  const categoryCountMap = React.useMemo(() => {
    const counts = {};
    (resources || []).forEach((resource) => {
      if (resource.categoryId === null || resource.categoryId === undefined) return;
      counts[resource.categoryId] = (counts[resource.categoryId] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const tagCountMap = React.useMemo(() => {
    const counts = {};
    (resources || []).forEach((resource) => {
      (resource.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [resources]);

  const orderedTags = React.useMemo(() => {
    const source = Array.isArray(tags) && tags.length > 0 ? tags : Object.keys(tagCountMap);
    return [...source]
      .filter(Boolean)
      .sort((a, b) => (tagCountMap[b] || 0) - (tagCountMap[a] || 0) || a.localeCompare(b, 'zh-CN'));
  }, [tags, tagCountMap]);

  const resolvedCategories = React.useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.map((category) => {
        const tone = getCategoryTone(category, category?.id);
        return {
          ...category,
          color: tone.accent,
          tone,
        };
      });
    }
    const categoryMap = new Map();
    (resources || []).forEach((resource) => {
      if (resource.categoryId === null || resource.categoryId === undefined) return;
      if (categoryMap.has(resource.categoryId)) return;
      const sourceCategory = {
        id: resource.categoryId,
        name: resource.categoryName || resource.category?.name || `分类 ${resource.categoryId}`,
      };
      const tone = getCategoryTone(sourceCategory, resource.categoryId);
      categoryMap.set(resource.categoryId, {
        ...sourceCategory,
        color: tone.accent,
        tone,
      });
    });
    return [...categoryMap.values()].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'));
  }, [categories, resources, getCategoryTone]);

  const categoryList = React.useMemo(() => {
    const totalCategory = { id: null, name: '全部', color: null, resourceCount: resources.length };
    const categoriesWithCounts = resolvedCategories.map((category) => ({
      ...category,
      resourceCount: category.resourceCount ?? categoryCountMap[category.id] ?? 0,
    }));
    return [totalCategory, ...categoriesWithCounts];
  }, [resolvedCategories, categoryCountMap, resources.length]);

  const quickAccessItems = currentUser
    ? [
        { value: 'favorites', key: 'favorites', label: '我的收藏', Icon: Heart },
        { value: 'history', key: 'history', label: '最近访问', Icon: Clock },
        { value: 'mine', key: 'mine', label: '我创建的', Icon: FileText },
      ]
    : [];

  let pool = resources;
  if (quickAccessFilter === 'favorites') pool = favorites;
  else if (quickAccessFilter === 'history') pool = history;
  else if (quickAccessFilter === 'mine') pool = mine;

  if (selectedCategory !== null && selectedCategory !== undefined) {
    pool = pool.filter((resource) => resource.categoryId === selectedCategory);
  }
  if (selectedTags && selectedTags.length > 0) {
    pool = pool.filter((resource) => selectedTags.every((tag) => (resource.tags || []).includes(tag)));
  }

  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    pool = pool.filter((resource) =>
      (resource.name || '').toLowerCase().includes(query) ||
      (resource.description || '').toLowerCase().includes(query) ||
      (resource.url || '').toLowerCase().includes(query) ||
      (resource.tags || []).some((tag) => tag.toLowerCase().includes(query))
    );
  }

  if (viewMode !== 'timeline') {
    pool = [...pool].sort((a, b) => {
      if (sortBy === 'hot') return (b.visitCount || 0) - (a.visitCount || 0);
      if (sortBy === 'updated') return (b.updatedAt || 0) - (a.updatedAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  const hasFilters = Boolean(
    (selectedCategory !== null && selectedCategory !== undefined) ||
    (selectedTags && selectedTags.length > 0) ||
    quickAccessFilter ||
    (searchQuery && searchQuery.trim())
  );
  const selectedCategoryItem = categoryList.find((item) => item.id === selectedCategory) || categoryList[0];
  const selectedCategoryTone = selectedCategoryItem?.id !== null
    ? (selectedCategoryItem?.tone || getCategoryTone(selectedCategoryItem, selectedCategoryItem?.id))
    : null;
  const activeQuickAccess = quickAccessItems.find((item) => item.key === quickAccessFilter) || null;
  const sortOptions = React.useMemo(() => ([
    { value: 'hot', label: '按热度' },
    { value: 'created', label: '按创建时间' },
    { value: 'updated', label: '按更新时间' },
  ]), []);
  const viewLabelMap = { card: '卡片视图', list: '列表视图', timeline: '时间轴视图' };
  const viewOptions = [
    { value: 'card', mode: 'card', label: '卡片视图', shortLabel: '卡片', Icon: LayoutGrid },
    { value: 'list', mode: 'list', label: '列表视图', shortLabel: '列表', Icon: List },
    { value: 'timeline', mode: 'timeline', label: '时间轴视图', shortLabel: '时间轴', Icon: Clock },
  ];
  const resolvedSort = viewMode === 'timeline' ? 'created' : sortBy;
  const resolvedSortLabel = sortOptions.find((option) => option.value === resolvedSort)?.label || '按热度';
  const trimmedQuery = (searchQuery || '').trim();
  const compactQuery = trimmedQuery.length > 16 ? `${trimmedQuery.slice(0, 16)}...` : trimmedQuery;
  const selectedTagsList = selectedTags || [];
  const headingTitleMap = {
    favorites: t('我的收藏'),
    history: t('最近访问'),
    mine: t('我创建的'),
  };
  const totalResourceCount = resources.length;
  const mineResourceCount = currentUser ? mine.length : 0;
  const headingTitle = headingTitleMap[quickAccessFilter]
    || (selectedCategoryItem.id !== null ? selectedCategoryItem.name : '资源导航');
  const activeFilterChips = [];
  const titleMatchesQuickAccess = Boolean(activeQuickAccess && headingTitle === activeQuickAccess.label);
  const titleMatchesCategory = Boolean(selectedCategoryItem.id !== null && headingTitle === selectedCategoryItem.name);
  if (quickAccessFilter && activeQuickAccess && !titleMatchesQuickAccess) {
    activeFilterChips.push({ key: 'quick-access', label: `范围 · ${activeQuickAccess.label}`, tone: 'brand' });
  }
  if (selectedCategoryItem.id !== null && !titleMatchesCategory) {
    activeFilterChips.push({ key: 'category', label: `类别 · ${selectedCategoryItem.name}`, tone: 'category' });
  }
  selectedTagsList.slice(0, 3).forEach((tag) => {
    activeFilterChips.push({ key: `tag-${tag}`, label: `#${tag}`, tone: 'neutral' });
  });
  if (selectedTagsList.length > 3) {
    activeFilterChips.push({ key: 'tag-rest', label: `+${selectedTagsList.length - 3}`, tone: 'neutral' });
  }
  if (compactQuery) {
    activeFilterChips.push({ key: 'query', label: `搜索 · ${compactQuery}`, tone: 'brand' });
  }
  const mergedOrderedTags = React.useMemo(
    () => [...new Set([...(selectedTags || []), ...orderedTags])],
    [orderedTags, selectedTags]
  );
  const visibleSidebarTags = React.useMemo(() => {
    if (showAllSidebarTags) return mergedOrderedTags;
    const selectedSet = new Set(selectedTagsList);
    const selectedFirst = mergedOrderedTags.filter((tag) => selectedSet.has(tag));
    const remaining = mergedOrderedTags.filter((tag) => !selectedSet.has(tag));
    return [...selectedFirst, ...remaining.slice(0, 4)];
  }, [mergedOrderedTags, selectedTagsList, showAllSidebarTags]);
  const hiddenSidebarTagCount = Math.max(mergedOrderedTags.length - visibleSidebarTags.length, 0);
  const isOverviewMode = pageType !== 'results' && homeMode !== 'results';
  const isResultsMode = !isOverviewMode;
  const visibleCategoryCount = resolvedCategories.length;
  const visibleTagCount = orderedTags.length;
  const overviewSummaryText = currentUser
    ? `${totalResourceCount} 个资源可直接访问，覆盖 ${visibleCategoryCount} 个分类`
    : `${totalResourceCount} 个公开资源，覆盖 ${visibleCategoryCount} 个分类`;
  const metricCards = currentUser
    ? [
        { key: 'total', kind: 'summary', label: '可见资源', value: totalResourceCount, note: '当前可访问入口', accent: 'var(--brand)' },
        { key: 'categories', kind: 'summary', label: '资源分类', value: visibleCategoryCount, note: '按主题浏览入口', accent: 'var(--brand)' },
        { key: 'mine', kind: 'summary', label: '我的资源', value: mineResourceCount, note: '我创建与维护的内容', accent: 'var(--brand)' },
      ]
    : [
        { key: 'public', kind: 'summary', label: '公开资源', value: totalResourceCount, note: '无需登录即可访问', accent: 'var(--brand)' },
        { key: 'categories', kind: 'summary', label: '资源分类', value: visibleCategoryCount, note: '按主题浏览入口', accent: 'var(--brand)' },
        { key: 'tags', kind: 'summary', label: '常用标签', value: visibleTagCount, note: '作为补充过滤条件', accent: 'var(--brand)' },
      ];
  const trafficCards = [
    { key: 'visits-total', kind: 'traffic', label: '总访问量', value: trafficMetrics.totalVisits, note: '页面累计访问量', accent: 'var(--brand)' },
    { key: 'visits-month', kind: 'traffic', label: '近30日访问', value: trafficMetrics.monthlyVisits, note: '近 30 天记录', accent: 'var(--brand)' },
    { key: 'visits-day', kind: 'traffic', label: '近24小时访问', value: trafficMetrics.dailyVisits, note: '最近一天活跃', accent: 'var(--brand)' },
  ];
  const categoryHighlights = React.useMemo(() => {
    return resolvedCategories.map((category) => {
      const categoryResources = (resources || []).filter((resource) => resource.categoryId === category.id);
      const previewNames = categoryResources.slice(0, 2).map((resource) => resource.name).filter(Boolean);
      const previewTags = [...new Set(categoryResources.flatMap((resource) => resource.tags || []))].slice(0, 2);
      return {
        ...category,
        resourceCount: category.resourceCount ?? categoryCountMap[category.id] ?? categoryResources.length,
        previewNames,
        previewTags,
      };
    })
      .sort((a, b) => (b.resourceCount || 0) - (a.resourceCount || 0) || (a.name || '').localeCompare(b.name || '', 'zh-CN'))
      .slice(0, 5);
  }, [resolvedCategories, resources, categoryCountMap]);
  const overviewPopularResources = React.useMemo(
    () => [...resources].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 4),
    [resources]
  );
  const overviewRecentResources = React.useMemo(() => {
    const popularIds = new Set(overviewPopularResources.map((resource) => resource.id));
    return [...resources]
      .filter((resource) => !popularIds.has(resource.id))
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [resources, overviewPopularResources]);
  const overviewQuickAccessEntries = currentUser
    ? [
        {
          key: 'favorites',
          label: '我的收藏',
          count: favorites.length,
          note: '快速回到常用资源',
          emptyNote: '还没有收藏资源，先去逛逛并添加常用入口',
          filter: 'favorites',
          accent: 'var(--brand)',
          Icon: Heart,
        },
        {
          key: 'history',
          label: '最近访问',
          count: history.length,
          note: '继续上次浏览路径',
          emptyNote: '还没有访问记录，先随便逛一逛',
          filter: 'history',
          accent: 'var(--brand)',
          Icon: Clock,
        },
        {
          key: 'mine',
          label: '我创建的',
          count: mine.length,
          note: '维护自己的内容',
          emptyNote: '还没有创建内容，可以尝试新增一个资源',
          filter: 'mine',
          accent: 'var(--brand)',
          Icon: FileText,
        },
      ]
    : [];
  const overviewSections = [
    {
      key: 'popular',
      title: '热门资源',
      description: '按访问热度挑选常用入口。',
      resources: overviewPopularResources,
      actionLabel: '查看更多',
      action: () => {
        dispatch({ type: 'CLEAR_FILTERS' });
        dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
        navigate('#/');
      },
    },
    {
      key: 'recent',
      title: '最近更新',
      description: '快速查看最近维护或新增的内容。',
      resources: overviewRecentResources,
      actionLabel: '查看更多',
      action: () => {
        dispatch({ type: 'CLEAR_FILTERS' });
        dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
        navigate('#/');
      },
    },
    ...(currentUser && mine.length > 0
      ? [{
          key: 'mine',
          title: '我的资源',
          description: '继续维护你创建和拥有的资源。',
          resources: mine.slice(0, 4),
          actionLabel: '查看更多',
          action: () => {
            dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
            dispatch({ type: 'SET_QUICK_ACCESS_FILTER', filter: 'mine' });
            navigate('#/');
          },
        }]
      : []),
  ].filter((section) => section.resources.length > 0);
  React.useEffect(() => {
    let cancelled = false;

    const loadTrafficMetrics = () => {
      const maybeRecordVisit = isOverviewMode
        ? request('/api/resources/analytics/visit', { method: 'POST' }).catch(() => null)
        : Promise.resolve(null);

      Promise.resolve(maybeRecordVisit)
        .then(() => request('/api/resources/analytics'))
        .then((response) => {
          if (!response.ok || cancelled) return;
          setTrafficMetrics({
            totalVisits: response.data.data?.totalVisits || 0,
            monthlyVisits: response.data.data?.monthlyVisits || 0,
            dailyVisits: response.data.data?.dailyVisits || 0,
          });
        })
        .catch(() => {});
    };

    const handleAnalyticsInvalidated = () => {
      loadTrafficMetrics();
    };

    loadTrafficMetrics();
    window.addEventListener('rh:analytics-invalidated', handleAnalyticsInvalidated);

    return () => {
      cancelled = true;
      window.removeEventListener('rh:analytics-invalidated', handleAnalyticsInvalidated);
    };
  }, [request, currentUser?.id, isOverviewMode]);
  const overviewCardColumns = viewportWidth >= 1440 ? 5 : viewportWidth >= 1280 ? 4 : viewportWidth >= 960 ? 3 : viewportWidth >= 640 ? 2 : 1;
  const filterSummaryLabel = selectedCategoryItem.id !== null
    ? '类别筛选结果'
    : activeQuickAccess
      ? '范围筛选结果'
      : compactQuery
        ? '搜索结果'
        : selectedTagsList.length > 0
          ? '标签筛选结果'
          : '筛选结果';
  const activeFilterGroupCount = [
    selectedCategoryItem.id !== null,
    Boolean(activeQuickAccess),
    Boolean(compactQuery),
    selectedTagsList.length > 0,
  ].filter(Boolean).length;
  const resultsHeadingTitle = hasFilters ? headingTitle : '全部资源';
  const resultsHeadingSubtitle = `${pool.length} 个结果`;
  const resultsSummaryLabel = hasFilters
    ? filterSummaryLabel
    : currentUser
      ? '全部可见资源'
      : '公开资源浏览';
  const resultsSummaryText = hasFilters
    ? `${resultsSummaryLabel} · 已应用 ${Math.max(activeFilterGroupCount, 1)} 组条件`
    : resultsSummaryLabel;
  const toolbarStickyDesktop = false;
  const cardColumns = viewMode === 'card' && pool.length > 0 && pool.length <= baseCardColumns
    ? pool.length
    : baseCardColumns;
  const compactResultsGrid = isDesktop && viewMode === 'card' && cardColumns < baseCardColumns;
  const filteredGridMaxWidth = compactResultsGrid
    ? `${cardColumns * 350 + Math.max(cardColumns - 1, 0) * 14}px`
    : null;
  const resultsTopPadding = isMobile ? '12px' : '16px';
  const sharedTopPanelStyle = {
    border: isLightTheme
      ? '1px solid var(--border)'
      : '1px solid color-mix(in srgb, var(--border-strong) 72%, var(--border))',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? '0 8px 20px color-mix(in srgb, var(--text-primary) 4%, transparent)'
      : '0 14px 26px color-mix(in srgb, var(--bg-primary) 18%, transparent)',
  };
  const resultsHeadingShellStyle = {
    position: 'relative',
    display: 'grid',
    gap: 0,
    padding: isMobile ? 0 : '10px 12px',
    borderRadius: isMobile ? 0 : '20px',
    ...(isMobile
      ? {
          border: 'none',
          background: 'transparent',
          boxShadow: 'none',
        }
      : sharedTopPanelStyle),
  };
  const resultsContentPanelStyle = {
    border: isLightTheme
      ? '1px solid var(--border)'
      : '1px solid color-mix(in srgb, var(--border-strong) 74%, var(--border))',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? 'var(--shadow-card)'
      : '0 14px 26px color-mix(in srgb, var(--bg-primary) 18%, transparent)',
  };

  React.useEffect(() => {
    if (isOverviewMode) setShowMobileSidebar(false);
  }, [isOverviewMode]);

  const openCreate = () => {
    setEditResource(null);
    setShowResourceModal(true);
  };

  const openBatch = () => {
    setShowResourceModal(false);
    setEditResource(null);
    setShowBatchModal(true);
  };

  React.useEffect(() => {
    if (viewMode === 'timeline') setShowSortMenu(false);
  }, [viewMode]);

  React.useEffect(() => {
    setHighlightedSort(resolvedSort);
  }, [resolvedSort]);

  React.useEffect(() => {
    highlightedSortRef.current = highlightedSort;
  }, [highlightedSort]);

  React.useEffect(() => {
    if (!showSortMenu) return undefined;

    setHighlightedSort(resolvedSort);

    const moveHighlight = (direction) => {
      const currentIndex = Math.max(sortOptions.findIndex((option) => option.value === highlightedSortRef.current), 0);
      const nextIndex = (currentIndex + direction + sortOptions.length) % sortOptions.length;
      setHighlightedSort(sortOptions[nextIndex].value);
    };

    const handleMouseDown = (event) => {
      if (sortMenuRef.current?.contains(event.target)) return;
      if (sortTriggerRef.current?.contains(event.target)) return;
      setShowSortMenu(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowSortMenu(false);
        sortTriggerRef.current?.focus();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dispatch({ type: 'SET_SORT', sortBy: highlightedSortRef.current });
        setShowSortMenu(false);
        sortTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      sortItemRefs.current[resolvedSort]?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [dispatch, resolvedSort, showSortMenu, sortOptions]);

  const openEdit = (resource) => {
    setEditResource(resource);
    setShowResourceModal(true);
  };

  const handleModalClose = async () => {
    setShowResourceModal(false);
    setEditResource(null);
    const [categoriesResponse, tagsResponse] = await Promise.all([
      request('/api/categories'),
      request('/api/tags'),
    ]);
    if (categoriesResponse.ok) {
      dispatch({ type: 'SET_CATEGORIES', categories: categoriesResponse.data.data || [] });
    }
    if (tagsResponse.ok) {
      const nextTags = (tagsResponse.data.data || []).map((item) => (typeof item === 'string' ? item : item.tag)).filter(Boolean);
      dispatch({ type: 'SET_TAGS', tags: nextTags });
    }
  };

  const chipStyle = (active = false, compact = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: compact ? '5px' : '6px',
    minHeight: compact ? '28px' : '32px',
    padding: compact ? '0 10px' : '0 12px',
    borderRadius: '999px',
    border: active
      ? '1px solid color-mix(in srgb, var(--brand) 30%, var(--control-border))'
      : '1px solid color-mix(in srgb, var(--control-border) 82%, transparent)',
    background: active
      ? 'color-mix(in srgb, var(--brand-soft) 72%, var(--control-bg))'
      : 'color-mix(in srgb, var(--control-bg) 88%, transparent)',
    color: active ? 'var(--brand-strong)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: compact ? '12px' : '13px',
    fontWeight: active ? 700 : 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: active ? '0 4px 10px color-mix(in srgb, var(--brand) 8%, transparent)' : 'none',
    transition: 'border-color 150ms, background 150ms, color 150ms, box-shadow 150ms',
  });

  const toolbarButtonStyle = (tone = 'control', compact = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: compact ? '31px' : '36px',
    padding: compact ? '0 12px' : '0 14px',
    borderRadius: '12px',
    border: tone === 'brand'
      ? '1px solid var(--brand)'
      : tone === 'ghost'
        ? '1px solid transparent'
        : '1px solid var(--control-border)',
    background: tone === 'brand'
      ? 'var(--brand)'
      : tone === 'ghost'
        ? 'transparent'
        : 'var(--surface-elevated)',
    color: tone === 'brand' ? '#FFFFFF' : tone === 'ghost' ? 'var(--text-secondary)' : 'var(--text-primary)',
    fontSize: compact ? '12px' : '13px',
    fontWeight: tone === 'brand' ? 700 : 600,
    boxShadow: tone === 'brand' ? '0 10px 20px color-mix(in srgb, var(--brand) 16%, transparent)' : 'var(--shadow-control)',
    transition: 'border-color 150ms, background 150ms, color 150ms, box-shadow 150ms',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    flexShrink: 0,
    cursor: 'pointer',
  });
  const desktopToolbarControlStyle = toolbarButtonStyle('control', false);
  const compactToolbarControlStyle = toolbarButtonStyle('control', true);
  const desktopToolbarClearStyle = toolbarButtonStyle('ghost', false);
  const compactToolbarClearStyle = toolbarButtonStyle('ghost', true);
  const summaryActionButtonStyle = (compact = false) => ({
    ...toolbarButtonStyle('ghost', compact),
    minHeight: compact ? '28px' : '30px',
    padding: compact ? '0 10px' : '0 12px',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    background: 'transparent',
    border: '1px solid transparent',
    fontWeight: 600,
    boxShadow: 'none',
  });
  const desktopViewModeTriggerStyle = {
    ...desktopToolbarControlStyle,
    justifyContent: 'space-between',
    minWidth: '100px',
  };
  const desktopSortTriggerStyle = {
    ...desktopToolbarControlStyle,
    justifyContent: 'space-between',
    minWidth: '104px',
  };
  const activeFilterChipStyle = (tone = 'neutral') => {
    if (tone === 'category' && selectedCategoryTone?.accent) {
      return {
        ...chipStyle(false, true),
        cursor: 'default',
        color: selectedCategoryTone.accent,
        border: `1px solid color-mix(in srgb, ${selectedCategoryTone.accent} 24%, var(--control-border))`,
        background: `color-mix(in srgb, ${selectedCategoryTone.accent} 10%, var(--surface-elevated))`,
        boxShadow: 'none',
      };
    }
    if (tone === 'brand') {
      return {
        ...chipStyle(true, true),
        cursor: 'default',
        boxShadow: 'none',
      };
    }
    return {
      ...chipStyle(false, true),
      cursor: 'default',
      color: 'var(--text-primary)',
      background: 'color-mix(in srgb, var(--control-bg) 88%, transparent)',
      boxShadow: 'none',
    };
  };

  const renderViewModeSelect = (compact = false, triggerStyle = null) => (
    <window.DropdownSelect
      value={viewMode}
      onChange={(mode) => dispatch({ type: 'SET_VIEW_MODE', viewMode: mode })}
      variant="pill"
      ariaLabel="资源显示模式"
      triggerProps={{
        'data-rh-view-mode-trigger': viewMode,
        'data-rh-view-mode-select': 'true',
        ...(triggerStyle ? { style: triggerStyle } : { style: { flexShrink: 0 } }),
      }}
      options={viewOptions.map((option) => ({
        value: option.value,
        label: compact ? option.shortLabel : option.label,
        buttonProps: {
          'data-rh-view-mode-option': option.value,
        },
      }))}
      renderValue={() => compact ? viewOptions.find((option) => option.value === viewMode)?.shortLabel : viewLabelMap[viewMode]}
    />
  );

  const renderSortControl = (compact = false, triggerStyle = null) => {
    const disabled = viewMode === 'timeline';
    const sortLabel = sortOptions.find((option) => option.value === resolvedSort)?.label || '按热度';
    const compactSortLabelMap = { hot: '热度', created: '创建', updated: '更新' };
    const triggerLabel = compact ? compactSortLabelMap[resolvedSort] || '热度' : sortLabel;

    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <button
          ref={sortTriggerRef}
          data-rh-sort-trigger
          type="button"
          aria-haspopup="menu"
          aria-expanded={!disabled && showSortMenu}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setShowSortMenu((value) => !value);
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setHighlightedSort(resolvedSort);
              setShowSortMenu(true);
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: compact ? '32px' : '38px',
            padding: compact ? '0 12px' : '0 14px',
            borderRadius: '11px',
            border: disabled
              ? '1px solid color-mix(in srgb, var(--control-border) 56%, transparent)'
              : showSortMenu
                ? '1px solid var(--brand)'
                : '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)',
            background: disabled
              ? 'color-mix(in srgb, var(--control-bg-muted) 82%, var(--bg-primary))'
              : showSortMenu
                ? 'color-mix(in srgb, var(--brand-soft) 82%, var(--control-bg))'
                : 'color-mix(in srgb, var(--surface-elevated) 88%, var(--control-bg-muted))',
            color: disabled ? 'var(--text-secondary)' : showSortMenu ? 'var(--brand-strong)' : 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.65 : 1,
            fontSize: compact ? '12px' : '13px',
            fontWeight: showSortMenu ? 700 : 600,
            outline: 'none',
            boxShadow: showSortMenu
              ? '0 0 0 1px color-mix(in srgb, var(--brand) 14%, transparent), var(--shadow-control-hover)'
              : 'none',
            transition: 'border-color 150ms, background 150ms, color 150ms, box-shadow 150ms',
            ...(triggerStyle || {}),
          }}
        >
          <span>{triggerLabel}</span>
          <ChevronDown
            size={14}
            style={{
              color: disabled ? 'var(--text-secondary)' : showSortMenu ? 'var(--brand-strong)' : 'var(--text-secondary)',
              transform: showSortMenu ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms, color 150ms',
            }}
          />
        </button>

        {!disabled && showSortMenu && (
          <div
            ref={sortMenuRef}
            data-rh-sort-menu
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: compact ? '148px' : '168px',
              padding: '6px',
              borderRadius: '16px',
              border: '1px solid var(--control-border)',
              background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--control-bg-muted))',
              boxShadow: 'var(--shadow-dropdown)',
              display: 'grid',
              gap: '4px',
              zIndex: 50,
              backdropFilter: 'blur(18px)',
            }}
          >
            {sortOptions.map((option) => {
              const active = option.value === resolvedSort;
              const highlighted = option.value === highlightedSort;
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    if (node) sortItemRefs.current[option.value] = node;
                    else delete sortItemRefs.current[option.value];
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onMouseEnter={() => setHighlightedSort(option.value)}
                  onFocus={() => setHighlightedSort(option.value)}
                  onClick={() => {
                    dispatch({ type: 'SET_SORT', sortBy: option.value });
                    setShowSortMenu(false);
                    sortTriggerRef.current?.focus();
                  }}
                  style={{
                    minHeight: compact ? '34px' : '36px',
                    padding: compact ? '0 10px' : '0 12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active
                      ? 'color-mix(in srgb, var(--brand-soft) 84%, var(--control-bg))'
                      : highlighted
                        ? 'color-mix(in srgb, var(--surface-tint) 68%, var(--control-bg))'
                        : 'transparent',
                    color: active ? 'var(--brand-strong)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: compact ? '12px' : '13px',
                    fontWeight: active ? 700 : highlighted ? 600 : 500,
                    textAlign: 'left',
                    transition: 'background 150ms, color 150ms',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleSummaryActionHover = (event, hovered) => {
    event.currentTarget.style.background = hovered
      ? 'color-mix(in srgb, var(--brand-soft) 78%, var(--surface-elevated))'
      : 'transparent';
    event.currentTarget.style.borderColor = hovered
      ? 'color-mix(in srgb, var(--brand) 18%, var(--control-border))'
      : 'transparent';
    event.currentTarget.style.color = hovered ? 'var(--brand-strong)' : 'var(--text-primary)';
  };

  return (
    <>
      <window.AppLayout
        showSidebar={false}
        contentPaddingTop="0px"
        headerVariant="home"
      >
        <section
          data-rh-resource-browser
          data-rh-home-mode={isOverviewMode ? 'overview' : 'results'}
          style={{
            position: 'relative',
            display: 'grid',
            gap: isMobile ? '10px' : '12px',
            ...(isOverviewMode
              ? { maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' }
              : {}),
            width: '100%',
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: isOverviewMode ? '25px' : resultsTopPadding,
            paddingBottom: isOverviewMode ? '20px' : 40,
            borderRadius: 0,
            border: 'none',
            background: 'transparent',
          }}
        >
          {isOverviewMode ? (
            <HomeOverview
              currentUser={currentUser}
              isLightTheme={isLightTheme}
              title="资源导航"
              subtitle={overviewSummaryText}
              metrics={[...metricCards, ...trafficCards]}
              quickAccessEntries={overviewQuickAccessEntries}
              categoryHighlights={categoryHighlights}
              sections={overviewSections}
              columns={overviewCardColumns}
              stackActions={viewportWidth < 720}
              inlineMetrics={viewportWidth >= 960}
              onBrowseAll={() => {
                dispatch({ type: 'CLEAR_FILTERS' });
                dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
                setShowSortMenu(false);
                navigate('#/');
              }}
              onCreate={currentUser ? openCreate : null}
              onSelectCategory={(categoryId) => {
                dispatch({ type: 'CLEAR_FILTERS' });
                dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
                dispatch({ type: 'SET_CATEGORY', category: categoryId });
                navigate('#/');
              }}
              onSelectQuickAccess={(filter) => {
                dispatch({ type: 'CLEAR_FILTERS' });
                dispatch({ type: 'SET_HOME_MODE', mode: 'results' });
                dispatch({ type: 'SET_QUICK_ACCESS_FILTER', filter });
                navigate('#/');
              }}
            />
          ) : (
            <>
              <div
                data-rh-home-heading-block
                style={resultsHeadingShellStyle}
              >
                <div
                  data-rh-resource-toolbar
                  style={{
                    display: 'grid',
                    gap: isMobile ? '10px' : '8px',
                    width: '100%',
                    position: toolbarStickyDesktop ? 'sticky' : 'relative',
                    top: toolbarStickyDesktop ? 'calc(var(--app-header-height, 72px) + 4px)' : 'auto',
                    zIndex: toolbarStickyDesktop ? 24 : 1,
                    padding: isMobile ? '0 0 10px' : 0,
                    borderRadius: 0,
                    border: 'none',
                    borderBottom: isMobile
                      ? (isLightTheme
                        ? '1px solid color-mix(in srgb, var(--border-strong) 24%, transparent)'
                        : '1px solid color-mix(in srgb, var(--outline-strong) 34%, transparent)')
                      : 'none',
                    background: 'transparent',
                    backdropFilter: 'none',
                    boxShadow: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
                      gap: isMobile ? '10px' : '14px',
                      alignItems: isMobile ? 'stretch' : 'start',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '6px', minWidth: 0, maxWidth: isMobile ? '100%' : '620px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '4px' : '10px', alignItems: 'baseline', minWidth: 0 }}>
                        <div
                          data-rh-home-title
                          style={{
                            fontSize: isMobile ? '21px' : '23px',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.04,
                          }}
                        >
                          {resultsHeadingTitle}
                        </div>
                        <div
                          data-rh-home-subtitle
                          style={{
                            width: isMobile ? '100%' : 'auto',
                            fontSize: isMobile ? '12px' : '13px',
                            lineHeight: 1.35,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {resultsHeadingSubtitle}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        justifyContent: isMobile ? 'flex-start' : 'flex-end',
                        justifySelf: isMobile ? 'stretch' : 'end',
                        flexWrap: 'wrap',
                      }}
                    >
                      {!isMobile ? (
                        <>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {renderViewModeSelect(false, desktopViewModeTriggerStyle)}
                            {renderSortControl(false, desktopSortTriggerStyle)}
                          </div>
                          {currentUser && (
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                              <button data-rh-toolbar-create onClick={openCreate} style={toolbarButtonStyle('brand', false)}>
                                <Plus size={14} /> 新增资源
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {currentUser && (
                            <button data-rh-toolbar-create onClick={openCreate} style={toolbarButtonStyle('brand', true)}>
                              <Plus size={14} /> 新增资源
                            </button>
                          )}
                          {renderViewModeSelect(true, compactToolbarControlStyle)}
                          {renderSortControl(true, compactToolbarControlStyle)}
                          <button
                            data-rh-home-sidebar-trigger
                            data-rh-mobile-filter-trigger
                            onClick={() => {
                              setShowSortMenu(false);
                              setShowMobileSidebar(true);
                            }}
                            style={toolbarButtonStyle('neutral', true)}
                          >
                            <Menu size={14} /> 筛选
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: hasFilters && activeFilterChips.length > 0 ? '6px' : '0' }}>
                    <div
                      data-rh-home-toolbar-summary
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                        }}
                      >
                        {resultsSummaryText}
                      </span>
                      {hasFilters ? (
                        <button
                          data-rh-heading-clear-filters
                          onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}
                          onMouseEnter={(event) => handleSummaryActionHover(event, true)}
                          onMouseLeave={(event) => handleSummaryActionHover(event, false)}
                          style={summaryActionButtonStyle(isMobile)}
                        >
                          <X size={14} />
                          {isMobile ? '清空' : '清空筛选'}
                        </button>
                      ) : (
                        <button
                          data-rh-home-overview-return
                          onClick={() => {
                            dispatch({ type: 'CLEAR_FILTERS' });
                            dispatch({ type: 'SET_HOME_MODE', mode: 'overview' });
                            navigate('#/');
                          }}
                          onMouseEnter={(event) => handleSummaryActionHover(event, true)}
                          onMouseLeave={(event) => handleSummaryActionHover(event, false)}
                          style={summaryActionButtonStyle(isMobile)}
                        >
                          <ArrowLeft size={14} />
                          返回首页概览
                        </button>
                      )}
                    </div>
                    {hasFilters && activeFilterChips.length > 0 && (
                      <div data-rh-home-active-filters style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                        {activeFilterChips.map((chip) => (
                          <span key={chip.key} data-rh-home-active-filter={chip.key} style={activeFilterChipStyle(chip.tone)}>
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isDesktop ? '212px minmax(0, 1fr)' : '1fr',
                  gap: isDesktop ? '16px' : '0',
                  alignItems: 'start',
                }}
              >
                {isDesktop && (
                  <HomeSidebarNav
                    currentUser={currentUser}
                    quickAccessItems={quickAccessItems}
                    quickAccessFilter={quickAccessFilter}
                    categoryList={categoryList}
                    selectedCategory={selectedCategory}
                    selectedTags={selectedTagsList}
                    visibleTags={visibleSidebarTags}
                    hiddenTagCount={hiddenSidebarTagCount}
                    showAllTags={showAllSidebarTags}
                    onToggleShowAllTags={() => setShowAllSidebarTags((value) => !value)}
                    dispatch={dispatch}
                    isLightTheme={isLightTheme}
                    visualMode="results"
                  />
                )}

                <div style={{ minWidth: 0, display: 'grid', gap: isMobile ? '12px' : '10px' }}>
                  {pool.length === 0 ? (
                    <HomeEmptyState
                      title={hasFilters ? '没有匹配的资源结果' : '当前没有可展示的资源'}
                      description={hasFilters
                        ? '可以放宽关键词、切换类别，或直接清空筛选。'
                        : currentUser
                          ? '从资源区右上角新增资源后，这里会立即出现结果。'
                          : '当前仅显示公开资源。若需要完整内容，请使用 Header 中的登录入口。'}
                      primaryAction={hasFilters
                        ? { label: '清空筛选', onClick: () => dispatch({ type: 'CLEAR_FILTERS' }) }
                        : currentUser
                          ? { label: '新增资源', onClick: openCreate }
                          : null}
                      secondaryAction={hasFilters && currentUser ? { label: '新增资源', onClick: openCreate } : null}
                    />
                  ) : viewMode === 'card' ? (
                    <div
                      data-rh-resource-grid
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cardColumns}, minmax(0, 1fr))`,
                        gap: isMobile ? '14px' : '14px',
                        alignItems: 'stretch',
                        width: '100%',
                        maxWidth: filteredGridMaxWidth || 'none',
                        justifySelf: compactResultsGrid ? 'start' : 'stretch',
                      }}
                    >
                      {pool.map((resource) => (
                        <div key={resource.id} data-rh-resource-item>
                          <window.ResourceCard
                            resource={resource}
                            onEdit={openEdit}
                            compact={isDesktop}
                          />
                        </div>
                      ))}
                    </div>
                  ) : viewMode === 'list' ? (
                    <div data-rh-resource-list-shell style={{
                      ...resultsContentPanelStyle,
                      borderRadius: '20px',
                      overflowX: 'auto',
                    }}>
                      {pool.map((resource, index) => (
                        <window.ResourceRow key={resource.id} resource={resource} onEdit={openEdit} isLast={index === pool.length - 1} />
                      ))}
                    </div>
                  ) : (
                    <div
                      data-rh-resource-timeline-shell
                      style={{
                        ...resultsContentPanelStyle,
                        borderRadius: '20px',
                        padding: isMobile ? '14px 14px 6px' : '16px 18px 8px',
                      }}
                    >
                      <window.ResourceTimeline resources={pool} onEdit={openEdit} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </window.AppLayout>

      <window.ResourceFormModal
        isOpen={showResourceModal}
        onClose={handleModalClose}
        resource={editResource}
        onOpenBatch={currentUser ? openBatch : undefined}
      />
      <window.BatchResourceModal
        isOpen={showBatchModal}
        onClose={async () => {
          setShowBatchModal(false);
          const [categoriesResponse, tagsResponse] = await Promise.all([
            request('/api/categories'),
            request('/api/tags'),
          ]);
          if (categoriesResponse.ok) {
            dispatch({ type: 'SET_CATEGORIES', categories: categoriesResponse.data.data || [] });
          }
          if (tagsResponse.ok) {
            const nextTags = (tagsResponse.data.data || []).map((item) => (typeof item === 'string' ? item : item.tag)).filter(Boolean);
            dispatch({ type: 'SET_TAGS', tags: nextTags });
          }
        }}
      />

      {isResultsMode && (
        <HomeSidebarDrawer isOpen={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
          <HomeSidebarNav
            currentUser={currentUser}
            quickAccessItems={quickAccessItems}
            quickAccessFilter={quickAccessFilter}
            categoryList={categoryList}
            selectedCategory={selectedCategory}
            selectedTags={selectedTagsList}
            visibleTags={visibleSidebarTags}
            hiddenTagCount={hiddenSidebarTagCount}
            showAllTags={showAllSidebarTags}
            onToggleShowAllTags={() => setShowAllSidebarTags((value) => !value)}
            dispatch={dispatch}
            isLightTheme={isLightTheme}
            visualMode="results"
            isDrawer={true}
            onNavigate={() => setShowMobileSidebar(false)}
          />
        </HomeSidebarDrawer>
      )}
    </>
  );
}

function HomeOverview({
  currentUser,
  isLightTheme = false,
  title,
  subtitle,
  metrics,
  quickAccessEntries,
  categoryHighlights,
  sections,
  columns,
  stackActions = false,
  inlineMetrics = false,
  onBrowseAll,
  onCreate,
  onSelectCategory,
  onSelectQuickAccess,
}) {
  const surfaceStyle = {
    border: isLightTheme
      ? '1px solid color-mix(in srgb, var(--control-border) 78%, transparent)'
      : '1px solid color-mix(in srgb, var(--border-strong) 42%, var(--border))',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? '0 10px 24px color-mix(in srgb, var(--text-primary) 5%, transparent)'
      : '0 14px 28px color-mix(in srgb, var(--bg-primary) 20%, transparent)',
  };
  const heroSurfaceStyle = {
    ...surfaceStyle,
    border: isLightTheme
      ? '1px solid color-mix(in srgb, var(--control-border) 82%, transparent)'
      : '1px solid color-mix(in srgb, var(--border-strong) 44%, var(--border))',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? '0 12px 28px color-mix(in srgb, var(--text-primary) 5%, transparent)'
      : '0 16px 32px color-mix(in srgb, var(--bg-primary) 22%, transparent)',
  };
  const quickAccessSurfaceStyle = {
    ...surfaceStyle,
    border: isLightTheme
      ? '1px solid color-mix(in srgb, var(--control-border) 82%, transparent)'
      : '1px solid color-mix(in srgb, var(--border-strong) 44%, var(--border))',
    background: isLightTheme
      ? 'var(--surface-elevated)'
      : 'color-mix(in srgb, var(--surface-elevated) 94%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? '0 10px 20px color-mix(in srgb, var(--text-primary) 4%, transparent)'
      : '0 12px 24px color-mix(in srgb, var(--bg-primary) 18%, transparent)',
  };
  const [hoveredQuickAccessKey, setHoveredQuickAccessKey] = React.useState(null);
  const [hoveredCategoryId, setHoveredCategoryId] = React.useState(null);
  const interactiveCardTransition = 'transform 170ms, border-color 170ms, background 170ms, box-shadow 170ms';
  const interactiveCardLift = 'translateY(-2px)';
  const quickAccessEmptySurfaceStyle = {
    border: isLightTheme
      ? '1px solid color-mix(in srgb, var(--control-border) 72%, transparent)'
      : '1px solid color-mix(in srgb, var(--border-strong) 34%, var(--border))',
    background: isLightTheme
      ? 'color-mix(in srgb, var(--surface-elevated) 96%, var(--control-bg-muted))'
      : 'color-mix(in srgb, var(--surface-elevated) 88%, var(--bg-primary))',
    boxShadow: isLightTheme
      ? '0 8px 16px color-mix(in srgb, var(--text-primary) 3%, transparent)'
      : '0 10px 18px color-mix(in srgb, var(--bg-primary) 14%, transparent)',
  };
  const secondaryButtonStyle = {
    minHeight: '36px',
    minWidth: '98px',
    padding: '0 14px',
    borderRadius: '12px',
    border: '1px solid color-mix(in srgb, var(--control-border) 82%, transparent)',
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: '0 1px 2px color-mix(in srgb, var(--text-primary) 3%, transparent)',
  };
  const resultsEntryButtonStyle = {
    minHeight: '32px',
    padding: '0 11px',
    borderRadius: '11px',
    border: '1px solid color-mix(in srgb, var(--control-border) 76%, transparent)',
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: 'none',
  };
  const primaryButtonBorder = '1px solid color-mix(in srgb, var(--brand) 88%, transparent)';
  const primaryButtonBackground = 'var(--brand)';
  const primaryButtonHoverBorder = '1px solid color-mix(in srgb, var(--brand-strong) 92%, transparent)';
  const primaryButtonHoverBackground = 'var(--brand-strong)';
  const primaryButtonShadow = isLightTheme
    ? '0 12px 24px color-mix(in srgb, var(--brand) 26%, transparent)'
    : '0 14px 26px color-mix(in srgb, var(--brand) 18%, transparent)';
  const primaryButtonHoverShadow = isLightTheme
    ? '0 16px 28px color-mix(in srgb, var(--brand) 30%, transparent)'
    : '0 18px 32px color-mix(in srgb, var(--brand) 22%, transparent)';
  const primaryButtonStyle = {
    minHeight: '38px',
    minWidth: '122px',
    padding: '0 16px',
    borderRadius: '13px',
    border: primaryButtonBorder,
    background: primaryButtonBackground,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    boxShadow: primaryButtonShadow,
    transition: 'transform 160ms, border-color 160ms, background 160ms, box-shadow 160ms',
  };
  const handlePrimaryButtonHover = (event, hovered) => {
    event.currentTarget.style.transform = hovered ? 'translateY(-1px)' : 'translateY(0)';
    event.currentTarget.style.border = hovered ? primaryButtonHoverBorder : primaryButtonBorder;
    event.currentTarget.style.background = hovered ? primaryButtonHoverBackground : primaryButtonBackground;
    event.currentTarget.style.boxShadow = hovered ? primaryButtonHoverShadow : primaryButtonShadow;
  };
  const sectionHeaderShellStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  };
  const sectionHeaderBodyStyle = {
    display: 'grid',
    gap: '4px',
    minWidth: 0,
  };
  const sectionHeaderTitleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    minWidth: 0,
  };
  const sectionHeaderTitleStyle = {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  };
  const sectionHeaderCountStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '22px',
    padding: '0 8px',
    borderRadius: '999px',
    border: '1px solid color-mix(in srgb, var(--control-border) 58%, transparent)',
    background: isLightTheme
      ? 'color-mix(in srgb, var(--surface-elevated) 94%, var(--control-bg-muted))'
      : 'color-mix(in srgb, var(--surface-elevated) 84%, var(--surface-tint))',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
  const sectionHeaderDescriptionStyle = {
    fontSize: '12px',
    lineHeight: 1.55,
    color: 'var(--text-secondary)',
  };
  const renderSectionHeader = ({ title: headerTitle, description, count, actionLabel, onAction }) => (
    <div style={sectionHeaderShellStyle}>
      <div style={sectionHeaderBodyStyle}>
        <div style={sectionHeaderTitleRowStyle}>
          <div style={sectionHeaderTitleStyle}>{headerTitle}</div>
          {count ? <span style={sectionHeaderCountStyle}>{count}</span> : null}
        </div>
        {description ? <div style={sectionHeaderDescriptionStyle}>{description}</div> : null}
      </div>
      {actionLabel && onAction ? <button type="button" onClick={onAction} style={resultsEntryButtonStyle}>{actionLabel}</button> : null}
    </div>
  );
  const heroPanelGap = stackActions ? '14px' : '12px';
  const heroPanelPadding = stackActions ? '16px' : '16px 18px';
  const heroHeaderGap = stackActions ? '12px' : '10px';
  const heroTitleGroupGap = '6px';
  const heroMetricsGap = stackActions ? '10px' : '8px';
  const heroMetricMinHeight = stackActions ? '66px' : '62px';
  const heroMetricPadding = stackActions ? '10px 12px' : '10px 12px';

  return (
    <div
      data-rh-home-overview
      style={{
        display: 'grid',
        gap: '16px',
        width: '100%',
      }}
    >
      <div
        data-rh-home-hero
        style={{
          ...heroSurfaceStyle,
          display: 'grid',
          gap: heroPanelGap,
          padding: 0,
          borderRadius: 0,
          border: 'none',
          background: 'transparent',
          boxShadow: 'none',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: stackActions ? '1fr' : 'minmax(0, 1fr) auto',
            gap: heroHeaderGap,
            alignItems: 'start',
            width: '100%',
          }}
        >
          <div style={{ display: 'grid', gap: heroTitleGroupGap, minWidth: 0, maxWidth: stackActions ? '100%' : '760px' }}>
            <div data-rh-home-title style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{title}</div>
            <div data-rh-home-subtitle style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: '720px' }}>{subtitle}</div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: stackActions ? 'flex-start' : 'flex-end',
              alignItems: 'center',
              justifySelf: stackActions ? 'stretch' : 'end',
              flexWrap: stackActions ? 'wrap' : 'nowrap',
            }}
          >
              <button
                data-rh-home-browse-all
                onClick={onBrowseAll}
                onMouseEnter={(event) => handlePrimaryButtonHover(event, true)}
                onMouseLeave={(event) => handlePrimaryButtonHover(event, false)}
                style={primaryButtonStyle}
              >
                浏览全部资源
              </button>
              {currentUser && onCreate && (
                <button data-rh-toolbar-create onClick={onCreate} style={secondaryButtonStyle}>新增资源</button>
              )}
          </div>
        </div>
        <div
          data-rh-home-metrics
          style={{
            display: 'grid',
            gridTemplateColumns: inlineMetrics
              ? `repeat(${Math.max(metrics.length, 1)}, minmax(0, 1fr))`
              : 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: heroMetricsGap,
            alignItems: 'stretch',
            width: '100%',
          }}
        >
          {metrics.map((card, index) => {
            const isZeroMetric = Number(card.value) === 0;
            const displayValue = isZeroMetric ? '暂无数据' : card.value;
            const cardAccent = card.accent || 'var(--brand)';

            return (
              <div
                key={card.key}
                data-rh-home-metric-card={card.kind === 'summary' ? card.key : undefined}
                data-rh-home-traffic-card={card.kind === 'traffic' ? card.key : undefined}
                data-rh-home-metric-zero={isZeroMetric ? 'true' : 'false'}
                style={{
                  display: 'grid',
                  gap: '3px',
                  minWidth: 0,
                  minHeight: heroMetricMinHeight,
                  padding: heroMetricPadding,
                  borderRadius: '16px',
                  borderTop: isZeroMetric
                    ? '2px solid color-mix(in srgb, var(--control-border) 72%, transparent)'
                    : `2px solid ${cardAccent}`,
                  border: isZeroMetric
                    ? '1px solid color-mix(in srgb, var(--control-border) 68%, transparent)'
                    : '1px solid color-mix(in srgb, var(--control-border) 78%, transparent)',
                  background: isZeroMetric
                    ? (isLightTheme
                      ? 'color-mix(in srgb, var(--surface-elevated) 94%, var(--control-bg-muted))'
                      : 'color-mix(in srgb, var(--surface-elevated) 82%, var(--bg-primary))')
                    : (isLightTheme
                      ? 'var(--surface-elevated)'
                      : 'var(--surface-elevated)'),
                  color: 'var(--text-primary)',
                  boxShadow: isZeroMetric
                    ? 'none'
                    : (isLightTheme
                      ? '0 6px 16px color-mix(in srgb, var(--text-primary) 4%, transparent)'
                      : '0 1px 3px color-mix(in srgb, var(--bg-primary) 24%, transparent)'),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      color: isZeroMetric
                        ? 'color-mix(in srgb, var(--text-secondary) 82%, transparent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {card.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: isZeroMetric ? '15px' : '21px',
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: isZeroMetric
                      ? 'color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary))'
                      : 'var(--text-primary)',
                  }}
                >
                  {displayValue}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    lineHeight: 1.4,
                    color: isZeroMetric
                      ? 'color-mix(in srgb, var(--text-secondary) 78%, transparent)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {card.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {currentUser && quickAccessEntries.length > 0 && (
        <div data-rh-home-overview-section="quick-access" style={{ display: 'grid', gap: '10px' }}>
          {renderSectionHeader({
            title: '快捷入口',
            description: '从收藏、历史或我的资源继续浏览和维护内容。',
            count: `${quickAccessEntries.length} 项`,
          })}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(columns, quickAccessEntries.length)}, minmax(0, 1fr))`, gap: '12px' }}>
            {quickAccessEntries.map((entry) => {
              const isEmptyEntry = entry.count === 0;
              return (
                <button
                  key={entry.key}
                  aria-label={entry.label}
                  type="button"
                  data-rh-overview-quick-access={entry.key}
                  data-rh-overview-quick-access-empty={isEmptyEntry ? 'true' : 'false'}
                  onMouseEnter={() => setHoveredQuickAccessKey(entry.key)}
                  onMouseLeave={() => setHoveredQuickAccessKey(null)}
                  onClick={() => onSelectQuickAccess(entry.filter)}
                  style={{
                    minHeight: '88px',
                    padding: '13px',
                    borderRadius: '16px',
                    ...((isEmptyEntry ? quickAccessEmptySurfaceStyle : quickAccessSurfaceStyle)),
                    border: hoveredQuickAccessKey === entry.key
                      ? (isLightTheme
                        ? `1px solid color-mix(in srgb, ${entry.accent || 'var(--brand)'} 42%, var(--control-border))`
                        : `1px solid color-mix(in srgb, ${entry.accent || 'var(--brand)'} 48%, var(--border-strong))`)
                      : isEmptyEntry
                        ? quickAccessEmptySurfaceStyle.border
                        : quickAccessSurfaceStyle.border,
                    background: isEmptyEntry
                      ? quickAccessEmptySurfaceStyle.background
                      : (isLightTheme
                        ? 'var(--surface-elevated)'
                        : 'var(--surface-elevated)'),
                    display: 'grid',
                    gap: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transform: hoveredQuickAccessKey === entry.key ? interactiveCardLift : 'translateY(0)',
                    boxShadow: hoveredQuickAccessKey === entry.key
                      ? (isLightTheme
                        ? `0 14px 26px color-mix(in srgb, ${entry.accent || 'var(--brand)'} 20%, transparent)`
                        : `0 16px 30px color-mix(in srgb, ${entry.accent || 'var(--brand)'} 22%, transparent)`)
                      : (isEmptyEntry ? quickAccessEmptySurfaceStyle.boxShadow : quickAccessSurfaceStyle.boxShadow),
                    transition: interactiveCardTransition,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isEmptyEntry ? 'color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary))' : 'var(--text-primary)',
                      }}
                    >
                      {entry.label}
                    </div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: isEmptyEntry ? 'var(--text-secondary)' : (entry.accent || 'var(--brand-strong)'),
                        opacity: isEmptyEntry ? 0.78 : 1,
                      }}
                    >
                      {entry.count}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: isEmptyEntry
                        ? 'color-mix(in srgb, var(--text-secondary) 92%, transparent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {isEmptyEntry ? entry.emptyNote : entry.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div data-rh-home-overview-categories style={{ display: 'grid', gap: '10px' }}>
        {renderSectionHeader({
          title: '分类入口',
          description: '按主题快速浏览全部资源。',
          count: `${categoryHighlights.length} 个分类`,
        })}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(columns, Math.max(categoryHighlights.length, 1))}, minmax(0, 1fr))`, gap: '12px' }}>
          {categoryHighlights.map((category) => {
            const categoryTone = category.tone || window.helpers.getCategoryTone(category, category.id);

            return (
              <button
                key={category.id}
                type="button"
                data-rh-overview-category-card={String(category.id)}
                aria-label={category.name}
                onMouseEnter={() => setHoveredCategoryId(category.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                onClick={() => onSelectCategory(category.id)}
                style={{
                  position: 'relative',
                  minHeight: '104px',
                  padding: '15px 13px 13px',
                  borderRadius: '16px',
                  ...surfaceStyle,
                  border: isLightTheme
                    ? `1px solid color-mix(in srgb, ${categoryTone.accent} ${hoveredCategoryId === category.id ? 24 : 14}%, var(--control-border))`
                    : `1px solid color-mix(in srgb, ${categoryTone.accent} ${hoveredCategoryId === category.id ? 34 : 20}%, var(--border))`,
                  background: hoveredCategoryId === category.id
                    ? (isLightTheme
                      ? `color-mix(in srgb, ${categoryTone.accent} 6%, var(--surface-elevated))`
                      : `color-mix(in srgb, ${categoryTone.accent} 10%, var(--surface-elevated))`)
                    : surfaceStyle.background,
                  display: 'grid',
                  gap: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transform: hoveredCategoryId === category.id ? interactiveCardLift : 'translateY(0)',
                  boxShadow: hoveredCategoryId === category.id
                    ? (isLightTheme
                      ? '0 14px 28px color-mix(in srgb, var(--text-primary) 8%, transparent)'
                      : '0 16px 30px color-mix(in srgb, var(--bg-primary) 28%, transparent)')
                    : surfaceStyle.boxShadow,
                  transition: interactiveCardTransition,
                  overflow: 'hidden',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: '0 0 auto 0',
                    height: '3px',
                    background: categoryTone.accent,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{category.name}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: categoryTone.accent }}>{category.resourceCount || 0}</div>
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {category.previewNames.length > 0
                    ? category.previewNames.join(' · ')
                    : category.previewTags.length > 0
                      ? category.previewTags.map((tag) => `#${tag}`).join(' ')
                      : '点击进入该分类结果页'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {sections.map((section) => {
        const sectionColumns = Math.min(columns, section.resources.length);
        return (
          <div key={section.key} data-rh-home-overview-section={section.key} style={{ display: 'grid', gap: '10px' }}>
            {renderSectionHeader({
              title: section.title,
              description: section.description,
              count: `${section.resources.length} 项`,
              actionLabel: section.actionLabel,
              onAction: section.action,
            })}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sectionColumns}, minmax(0, 1fr))`, gap: '10px' }}>
              {section.resources.map((resource) => (
                <div key={resource.id} data-rh-resource-item>
                  <window.ResourceCard resource={resource} featured={true} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HomeSidebarNav({
  currentUser,
  quickAccessItems,
  quickAccessFilter,
  categoryList,
  selectedCategory,
  selectedTags,
  visibleTags,
  hiddenTagCount,
  showAllTags,
  onToggleShowAllTags,
  dispatch,
  isLightTheme = false,
  visualMode = 'results',
  isDrawer = false,
  onNavigate,
}) {
  const { Heart, Clock, FileText, Tags } = lucide;
  const quietResults = visualMode === 'results' && !isDrawer;
  const sidebarShellSurfaceStyle = isDrawer
    ? {
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
      }
    : quietResults
      ? {
          border: isLightTheme
            ? '1px solid var(--border)'
            : '1px solid color-mix(in srgb, var(--border-strong) 72%, var(--border))',
          background: isLightTheme
            ? 'var(--bg-tertiary)'
            : 'color-mix(in srgb, var(--surface-elevated) 88%, var(--bg-primary))',
          boxShadow: isLightTheme
            ? '0 6px 16px color-mix(in srgb, var(--text-primary) 4%, transparent)'
            : '0 12px 22px color-mix(in srgb, var(--bg-primary) 14%, transparent)',
        }
      : {
          border: isLightTheme
            ? '1px solid color-mix(in srgb, var(--control-border) 18%, transparent)'
            : '1px solid color-mix(in srgb, var(--border-strong) 22%, var(--border))',
          background: isLightTheme
            ? 'color-mix(in srgb, var(--surface-elevated) 92%, var(--surface-tint))'
            : 'color-mix(in srgb, var(--surface-elevated) 88%, var(--bg-primary))',
          boxShadow: '0 3px 10px color-mix(in srgb, var(--text-primary) 2%, transparent)',
        };
  const sectionTitleStyle = {
    fontSize: '10px',
    fontWeight: 800,
    color: quietResults
      ? isLightTheme
        ? 'color-mix(in srgb, var(--text-secondary) 92%, transparent)'
        : 'color-mix(in srgb, var(--text-secondary) 94%, transparent)'
      : isLightTheme
        ? 'color-mix(in srgb, var(--text-secondary) 72%, transparent)'
        : 'var(--text-secondary)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
  const sidebarSectionGap = quietResults ? '7px' : '8px';
  const sidebarSectionPaddingTop = quietResults ? '8px' : '10px';
  const sidebarSectionItemGap = quietResults ? '3px' : '4px';
  const sidebarActionGap = quietResults ? '5px' : '6px';
  const sidebarMenuMinHeight = quietResults ? '30px' : '32px';
  const sidebarMenuRadius = quietResults ? '10px' : '11px';
  const sidebarChipMinHeight = quietResults ? '21px' : '23px';
  const sidebarChipPadding = quietResults ? '0 6px' : '0 7px';
  const sectionStyle = {
    display: 'grid',
    gap: sidebarSectionGap,
    paddingTop: sidebarSectionPaddingTop,
    borderTop: quietResults
      ? isLightTheme
        ? '1px solid color-mix(in srgb, var(--border) 86%, transparent)'
        : '1px solid color-mix(in srgb, var(--outline-strong) 12%, transparent)'
      : isLightTheme
        ? '1px solid color-mix(in srgb, var(--control-border) 18%, transparent)'
        : '1px solid color-mix(in srgb, var(--outline-strong) 10%, transparent)',
  };
  const menuButtonStyle = (active) => ({
    minHeight: sidebarMenuMinHeight,
    padding: '0 8px',
    borderRadius: sidebarMenuRadius,
    border: active
      ? '1px solid color-mix(in srgb, var(--brand) 18%, var(--control-border))'
      : quietResults
        ? isLightTheme
          ? '1px solid color-mix(in srgb, var(--control-border) 84%, transparent)'
          : '1px solid color-mix(in srgb, var(--outline-strong) 30%, var(--surface-tint))'
        : '1px solid transparent',
    background: active
      ? 'color-mix(in srgb, var(--brand-soft) 88%, var(--surface-elevated))'
      : quietResults
        ? isLightTheme
          ? 'var(--surface-elevated)'
          : 'color-mix(in srgb, var(--surface-elevated) 42%, var(--control-bg))'
        : isLightTheme
          ? 'color-mix(in srgb, var(--control-bg) 42%, transparent)'
          : 'color-mix(in srgb, var(--control-bg) 72%, var(--control-bg-muted))',
    color: active
      ? 'var(--brand-strong)'
      : quietResults
        ? isLightTheme
          ? 'color-mix(in srgb, var(--text-primary) 76%, var(--text-secondary))'
          : 'color-mix(in srgb, var(--text-secondary) 88%, transparent)'
        : 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: quietResults ? '8px' : '9px',
    fontSize: '12px',
    fontWeight: active ? 700 : quietResults ? 600 : 500,
    textAlign: 'left',
    boxShadow: active
      ? '0 4px 12px color-mix(in srgb, var(--brand) 10%, transparent)'
      : 'none',
  });
  const categoryRowStyle = (active) => ({
    minHeight: sidebarMenuMinHeight,
    padding: quietResults ? '0 7px 0 0' : '0 8px 0 0',
    border: active
      ? '1px solid color-mix(in srgb, var(--brand) 18%, var(--control-border))'
      : quietResults
        ? isLightTheme
          ? '1px solid color-mix(in srgb, var(--control-border) 84%, transparent)'
          : '1px solid color-mix(in srgb, var(--outline-strong) 30%, var(--surface-tint))'
        : '1px solid transparent',
    borderRadius: sidebarMenuRadius,
    background: active
      ? 'color-mix(in srgb, var(--brand-soft) 88%, var(--surface-elevated))'
      : quietResults
        ? isLightTheme
          ? 'var(--surface-elevated)'
          : 'color-mix(in srgb, var(--surface-elevated) 40%, var(--control-bg))'
        : 'transparent',
    color: active
      ? 'var(--brand-strong)'
      : isLightTheme
        ? quietResults
          ? 'color-mix(in srgb, var(--text-primary) 76%, var(--text-secondary))'
          : 'color-mix(in srgb, var(--text-primary) 82%, transparent)'
        : 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: quietResults ? '7px' : '8px',
    fontSize: '12px',
    fontWeight: active ? 700 : quietResults ? 600 : 500,
    textAlign: 'left',
    boxShadow: 'none',
  });
  const tagChipStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: sidebarChipMinHeight,
    padding: sidebarChipPadding,
    borderRadius: '999px',
    border: active
      ? '1px solid color-mix(in srgb, var(--brand) 18%, var(--control-border))'
      : quietResults
        ? isLightTheme
          ? '1px solid color-mix(in srgb, var(--control-border) 84%, transparent)'
          : '1px solid color-mix(in srgb, var(--outline-strong) 30%, var(--surface-tint))'
        : '1px solid transparent',
    background: active
      ? 'color-mix(in srgb, var(--brand-soft) 88%, var(--surface-elevated))'
      : quietResults
        ? isLightTheme
          ? 'var(--surface-muted)'
          : 'color-mix(in srgb, var(--surface-elevated) 40%, var(--control-bg))'
        : isLightTheme
          ? 'color-mix(in srgb, var(--control-bg) 34%, transparent)'
          : 'color-mix(in srgb, var(--control-bg) 62%, var(--control-bg-muted))',
    color: active ? 'var(--brand-strong)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: quietResults ? '9px' : '10px',
    fontWeight: active ? 700 : 500,
  });

  const handleQuickAccess = (filter) => {
    dispatch({ type: 'SET_QUICK_ACCESS_FILTER', filter });
    onNavigate?.();
  };

  const handleCategory = (categoryId) => {
    dispatch({ type: 'SET_CATEGORY', category: categoryId });
    onNavigate?.();
  };

  const quickAccessIconMap = { favorites: Heart, history: Clock, mine: FileText };

  return (
    <aside
      data-rh-home-sidebar={!isDrawer ? 'desktop' : undefined}
      data-rh-home-sidebar-visual-mode={visualMode}
      data-rh-home-sidebar-quiet={quietResults ? 'true' : 'false'}
      style={{
        position: isDrawer ? 'relative' : 'sticky',
        top: isDrawer ? 'auto' : 'var(--app-header-height, 78px)',
        alignSelf: 'start',
        width: '100%',
        maxHeight: isDrawer ? 'none' : 'calc(100vh - var(--app-header-height, 78px))',
        overflowY: 'auto',
        padding: 0,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 0,
          padding: isDrawer ? 0 : quietResults ? '8px' : '8px',
          borderRadius: isDrawer ? 0 : quietResults ? '18px' : '16px',
          ...sidebarShellSurfaceStyle,
        }}
      >
        <div data-rh-home-sidebar-section="categories" style={{ display: 'grid', gap: sidebarSectionGap, paddingTop: 0 }}>
          <div data-rh-home-category-title style={sectionTitleStyle}>类别过滤</div>
          <div style={{ display: 'grid', gap: sidebarSectionItemGap }}>
            {categoryList.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id === null ? 'all' : category.id}
                  type="button"
                  data-rh-home-category-item={category.id === null ? 'all' : String(category.id)}
                  data-rh-home-category-active={active ? 'true' : 'false'}
                  onClick={() => handleCategory(category.id)}
                  style={categoryRowStyle(active)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: quietResults ? '7px' : '8px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: '2px',
                        height: quietResults ? '14px' : '16px',
                        borderRadius: '999px',
                        background: active ? 'var(--brand)' : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.name}</span>
                  </span>
                  <span
                    style={{
                      minWidth: '28px',
                      padding: quietResults ? '0 5px' : '0 6px',
                      height: quietResults ? '18px' : '20px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: active
                        ? 'color-mix(in srgb, var(--brand-soft) 92%, var(--surface-elevated))'
                        : quietResults
                          ? 'var(--surface-muted)'
                          : isLightTheme
                            ? 'color-mix(in srgb, var(--surface-tint) 24%, var(--control-bg))'
                            : 'color-mix(in srgb, var(--surface-tint) 64%, transparent)',
                      color: active
                        ? 'var(--brand-strong)'
                        : quietResults
                          ? 'color-mix(in srgb, var(--text-secondary) 82%, transparent)'
                          : 'var(--text-secondary)',
                      fontSize: quietResults ? '9px' : '10px',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {category.resourceCount || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div data-rh-home-sidebar-section="tags" style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: quietResults ? '6px' : '7px', minWidth: 0 }}>
              <Tags size={13} style={{ color: 'var(--text-secondary)' }} />
              <span style={sectionTitleStyle}>标签筛选</span>
            </div>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => selectedTags.forEach((tag) => dispatch({ type: 'TOGGLE_TAG', tag }))}
                style={{
                  minHeight: quietResults ? '22px' : '24px',
                  padding: quietResults ? '0 8px' : '0 9px',
                  borderRadius: '999px',
                  border: '1px solid var(--control-border)',
                  background: isLightTheme ? 'var(--surface-elevated)' : 'var(--surface-muted)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: quietResults ? '9px' : '10px',
                  fontWeight: 600,
                }}
              >
                清空标签
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: sidebarActionGap }}>
            {visibleTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  data-rh-home-tag-item={tag}
                  data-rh-home-tag-active={active ? 'true' : 'false'}
                  onClick={() => dispatch({ type: 'TOGGLE_TAG', tag })}
                  style={tagChipStyle(active)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
          {hiddenTagCount > 0 && (
            <button
              type="button"
              data-rh-home-tags-toggle
              onClick={onToggleShowAllTags}
              style={{
                justifySelf: 'start',
                minHeight: quietResults ? '22px' : '24px',
                padding: quietResults ? '0 7px' : '0 8px',
                borderRadius: '999px',
                border: '1px solid var(--control-border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: quietResults ? '9px' : '10px',
                fontWeight: 600,
              }}
            >
              {showAllTags ? '收起标签' : `展开更多 (${hiddenTagCount})`}
            </button>
          )}
        </div>

        {currentUser && quickAccessItems.length > 0 && (
          <div data-rh-home-sidebar-section="quick-access" style={sectionStyle}>
            <div style={sectionTitleStyle}>快捷访问</div>
            <div style={{ display: 'grid', gap: sidebarActionGap }}>
              <button
                type="button"
                data-rh-quick-access-item="all"
                data-rh-quick-access-active={quickAccessFilter ? 'false' : 'true'}
                onClick={() => handleQuickAccess(null)}
                style={menuButtonStyle(!quickAccessFilter)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: quietResults ? '8px' : '10px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '2px',
                      height: quietResults ? '14px' : '16px',
                      borderRadius: '999px',
                      background: !quickAccessFilter ? 'var(--brand)' : 'transparent',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ width: 15, height: 15, flexShrink: 0, display: 'inline-block' }} aria-hidden="true" />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>全部资源</span>
                </span>
              </button>
              {quickAccessItems.map((item) => {
                const Icon = quickAccessIconMap[item.value] || item.Icon;
                const active = quickAccessFilter === item.key;
                return (
                  <button
                    key={item.value}
                    type="button"
                    data-rh-quick-access-item={item.value}
                    data-rh-quick-access-active={active ? 'true' : 'false'}
                    onClick={() => handleQuickAccess(active ? null : item.key)}
                    style={menuButtonStyle(active)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: quietResults ? '8px' : '10px', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: '2px',
                          height: quietResults ? '14px' : '16px',
                          borderRadius: '999px',
                          background: active ? 'var(--brand)' : 'transparent',
                          flexShrink: 0,
                        }}
                      />
                      <Icon size={15} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function HomeEmptyState({ title, description, primaryAction, secondaryAction }) {
  return (
    <div style={{
      display: 'grid',
      gap: '12px',
      padding: '22px',
      borderRadius: '14px',
      border: '1px dashed color-mix(in srgb, var(--border-strong) 76%, var(--border))',
      background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--surface-tint))',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto' }}>{description}</div>
      {(primaryAction || secondaryAction) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              style={{
                minHeight: '40px',
                padding: '0 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--brand)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                minHeight: '40px',
                padding: '0 18px',
                borderRadius: '12px',
                border: '1px solid var(--control-border)',
                background: 'color-mix(in srgb, var(--control-bg) 94%, var(--control-bg-muted))',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: 'var(--shadow-control)',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HomeSidebarDrawer({ isOpen, onClose, children }) {
  const CloseIcon = lucide.X;

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-rh-home-sidebar-drawer
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
      }}
    >
      <button
        type="button"
        aria-label="关闭导航遮罩"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(2, 6, 23, 0.42)',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 'min(88vw, 320px)',
          height: '100%',
          padding: '18px 16px 20px',
          background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--surface-muted))',
          borderRight: '1px solid color-mix(in srgb, var(--border-strong) 76%, var(--border))',
          boxShadow: 'var(--shadow-modal)',
          display: 'grid',
          gap: '18px',
          overflowY: 'auto',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>资源导航</div>
            <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              快捷访问、类别和标签筛选已收进左侧导航。
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              border: '1px solid color-mix(in srgb, var(--border-strong) 76%, var(--border))',
              background: 'var(--surface-muted)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

window.HomePage = HomePage;
