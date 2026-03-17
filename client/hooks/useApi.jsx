// useApi hook - wraps fetch with auth header and emailPreview detection
import { useCallback } from 'react';
import { useAppState } from '../context/AppContext';
import { getCurrentLocale, detectBrowserLocale } from '../utils/i18n';

function useApi() {
  const state = useAppState?.();
  const locale = state?.locale || getCurrentLocale() || detectBrowserLocale() || 'zh-Hans';

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
    const text = await response.text();
    let data = {};
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { data: null };
      }
    }
    return { ok: response.ok, status: response.status, data };
  }, [locale]);

  return { request };
}

export { useApi };
