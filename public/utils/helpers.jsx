// Helper utilities
const COLOR_POOL = ['#4F46E5', '#8B5CF6', '#F59E0B', '#14B8A6', '#F43F5E'];
const CATEGORY_TONES = [
  { key: 'development', accent: '#4F46E5', soft: '#EEF2FF', softStrong: '#DCE4FF', border: '#D5DCFF' },
  { key: 'design', accent: '#8B5CF6', soft: '#F3EDFF', softStrong: '#E9DEFF', border: '#E6D8FF' },
  { key: 'productivity', accent: '#F59E0B', soft: '#FFF6E7', softStrong: '#FDECCB', border: '#F4DEB2' },
  { key: 'knowledge', accent: '#14B8A6', soft: '#E9FBF8', softStrong: '#D5F5F1', border: '#BFEDE6' },
  { key: 'ai', accent: '#F43F5E', soft: '#FFF0F4', softStrong: '#FFDDE7', border: '#FFD3DE' },
];
const CATEGORY_KEYWORDS = {
  development: ['开发', '编程', '代码', '前端', '后端', '工程', 'api', 'dev', 'code', 'github', 'vscode', 'postman'],
  design: ['设计', '视觉', 'ui', 'ux', 'figma', 'dribbble', 'sketch'],
  productivity: ['效率', '办公', '协作', '笔记', 'notion', 'obsidian', 'calendar'],
  knowledge: ['文档', '知识', '学习', '教程', '资料', 'docs', 'mdn', 'wiki'],
  ai: ['ai', '智能', '模型', 'gpt', 'chatgpt', 'llm'],
};

function hashSeed(seed) {
  const value = String(seed || 'resourcehub');
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function matchCategoryToneKey(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return null;

  return Object.entries(CATEGORY_KEYWORDS)
    .find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword.toLowerCase())))?.[0] || null;
}

function getCategoryTone(category, fallbackSeed = '') {
  if (category && typeof category === 'object' && category.tone?.accent) {
    return category.tone;
  }

  const categoryName = typeof category === 'string' ? category : category?.name || '';
  const toneKey = matchCategoryToneKey(categoryName);

  if (toneKey) {
    return CATEGORY_TONES.find((tone) => tone.key === toneKey) || CATEGORY_TONES[0];
  }

  const seed = typeof category === 'object'
    ? `${category?.id ?? ''}:${categoryName}:${fallbackSeed}`
    : `${categoryName}:${fallbackSeed}`;

  return CATEGORY_TONES[hashSeed(seed) % CATEGORY_TONES.length];
}

function getCategoryAccent(category, fallbackSeed = '') {
  return getCategoryTone(category, fallbackSeed).accent;
}

function getLogoFallbackColor(name, category) {
  return getCategoryAccent(category, name);
}

function formatDate(timestamp) {
  if (!timestamp) return '';

  let seconds = timestamp;
  if (seconds > 1e12) {
    seconds = Math.floor(seconds / 1000);
  }

  const date = new Date(seconds * 1000);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return '今天';
  }

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMonth(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\u2026';
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function recordResourceVisit({ resource, request, dispatch }) {
  if (!resource?.id || typeof request !== 'function') return Promise.resolve();

  return request(`/api/resources/${resource.id}/visit`, { method: 'POST' })
    .then(({ ok, data }) => {
      if (!ok) return;

      const nextVisitCount = data?.data?.visitCount;
      if (typeof nextVisitCount === 'number' && dispatch) {
        dispatch({
          type: 'SET_RESOURCE_VISIT_COUNT',
          id: resource.id,
          visitCount: nextVisitCount,
        });
      }

      window.dispatchEvent(new CustomEvent('rh:analytics-invalidated'));
    })
    .catch(() => {});
}

function useViewportWidth() {
  const [width, setWidth] = React.useState(() => window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

window.helpers = {
  COLOR_POOL,
  CATEGORY_TONES,
  getCategoryTone,
  getCategoryAccent,
  getLogoFallbackColor,
  formatDate,
  formatMonth,
  truncate,
  getDomain,
  recordResourceVisit,
  useViewportWidth,
};
window.useViewportWidth = useViewportWidth;
