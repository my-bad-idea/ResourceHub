// Hash router hook
import { useState, useEffect, useCallback } from 'react';

function useRouter() {
  const getHash = () => {
    const hash = window.location.hash || '#/';
    // Separate path and query string
    const [path, ...queryParts] = hash.slice(1).split('?');
    const queryString = queryParts.join('?');
    const params = {};
    if (queryString) {
      queryString.split('&').forEach(part => {
        const [key, val] = part.split('=');
        if (key) params[decodeURIComponent(key)] = decodeURIComponent(val || '');
      });
    }
    return { path: path || '/', params };
  };

  const [route, setRoute] = useState(getHash);

  useEffect(() => {
    const handler = () => setRoute(getHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((hash) => {
    window.location.hash = hash;
  }, []);

  return { route, navigate };
}

export { useRouter };
