// useApi hook - wraps fetch with auth header and emailPreview detection
const { useCallback } = React;

function useApi() {
  const state = window.useAppState?.();
  const locale = state?.locale || window.i18n?.getCurrentLocale?.() || window.i18n?.detectBrowserLocale?.() || 'zh-Hans';

  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem('rh_token');
    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      'Accept-Language': locale,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }, [locale]);

  return { request };
}

window.useApi = useApi;
