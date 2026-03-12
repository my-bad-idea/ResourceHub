// useApi hook - wraps fetch with auth header and emailPreview detection
const { useCallback } = React;

function useApi() {
  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem('rh_token');
    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }, []);

  return { request };
}

window.useApi = useApi;
