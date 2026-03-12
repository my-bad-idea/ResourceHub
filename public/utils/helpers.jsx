// Helper utilities
const COLOR_POOL = ['#5856D6', '#FF9500', '#34C759', '#FF3B30', '#0071E3', '#FF2D55', '#AF52DE', '#00C7BE'];

function getLogoFallbackColor(name) {
  if (!name) return COLOR_POOL[0];
  return COLOR_POOL[name.charCodeAt(0) % COLOR_POOL.length];
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

window.helpers = { COLOR_POOL, getLogoFallbackColor, formatDate, formatMonth, truncate, getDomain, recordResourceVisit, useViewportWidth };
window.useViewportWidth = useViewportWidth;
