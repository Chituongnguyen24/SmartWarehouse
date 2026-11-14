const STORAGE_KEY = 'sfwms_backend_host';

export const DEPLOYED_HOST = 'smartwarehouse-kltn.duckdns.org';
export const DEFAULT_LAN_IP = DEPLOYED_HOST;

/**
 * Detect if app is running inside Capacitor native shell (Android/iOS).
 * In Capacitor, the WebView loads from a local HTTP server (not a remote URL),
 * so window.location.hostname is typically 'localhost' but the device itself
 * cannot reach the dev machine at 'localhost' without adb reverse.
 */
const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Capacitor injects window.Capacitor on native platforms
  const cap = (window as any).Capacitor;
  return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
};

/**
 * Returns the current backend host (IP or domain, without protocol or port).
 */
export const getBackendHost = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim() !== '') {
      const trimmed = saved.trim();
      // Loại bỏ các IP nội bộ cũ / localhost còn sót lại trong localStorage của WebView
      if (
        !trimmed.startsWith('192.168.') &&
        !trimmed.startsWith('10.0.') &&
        trimmed !== 'localhost' &&
        trimmed !== '127.0.0.1'
      ) {
        return trimmed;
      }
    }
  }

  const envHost = (import.meta as any).env?.VITE_BACKEND_HOST;
  if (envHost && envHost.trim() !== '') {
    return envHost.trim();
  }

  // On web browser, use the hostname that served the page
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
      return host;
    }
  }

  // Mặc định kết nối máy chủ Cloud EC2 chính thức
  return DEPLOYED_HOST;
};

/**
 * Resolves the full base URL for a microservice port.
 * When pointing to the deployed domain (smartwarehouse-kltn.duckdns.org), all APIs
 * are proxied via Nginx port 80 without port numbers.
 * When pointing to a local LAN IP (e.g. 192.168.x.x), ports are retained.
 */
export const getServiceBaseUrl = (port: number): string => {
  const host = getBackendHost();
  if (host.includes('duckdns.org') || host.includes('amazonaws.com') || host.includes('.com') || host.includes('.vn')) {
    const clean = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `http://${clean}`;
  }
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `http://${cleanHost}:${port}`;
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
