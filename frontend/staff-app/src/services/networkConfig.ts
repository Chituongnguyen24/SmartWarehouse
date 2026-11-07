import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'sfwms_backend_host';

export const DEFAULT_LAN_IP = '192.168.2.147';

/**
 * Returns the current backend host (IP or domain, without protocol or port).
 * Priority:
 * 1. Saved in localStorage ('sfwms_backend_host')
 * 2. Environment variable VITE_BACKEND_HOST
 * 3. window.location.hostname (if not localhost on web browser)
 * 4. Real phone default: '192.168.2.147' (or 'localhost' if USB adb reverse)
 * 5. Default fallback: 'localhost'
 */
export const getBackendHost = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Tự động dọn dẹp các IP LAN cũ (như 192.168.x.x) để đảm bảo luôn dùng 'localhost' qua USB adb reverse
    if (saved && (saved.startsWith('192.168.') || saved === '10.0.2.2')) {
      localStorage.removeItem(STORAGE_KEY);
    } else if (saved && saved.trim() !== '') {
      return saved.trim();
    }
  }

  const envHost = (import.meta as any).env?.VITE_BACKEND_HOST;
  if (envHost && envHost.trim() !== '') {
    return envHost.trim();
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
      return host;
    }
  }

  return 'localhost';
};

export const setBackendHost = (newHost: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, newHost.trim());
  }
};

export const resetBackendHost = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
};
