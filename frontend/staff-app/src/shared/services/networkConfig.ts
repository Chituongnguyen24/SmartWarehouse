const STORAGE_KEY = 'sfwms_backend_host';

export const DEFAULT_LAN_IP = '192.168.2.147';

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
 * Priority:
 * 1. Saved in localStorage ('sfwms_backend_host')
 * 2. Environment variable VITE_BACKEND_HOST
 * 3. window.location.hostname (if not localhost on web browser)
 * 4. Capacitor native: DEFAULT_LAN_IP (phone can't reach localhost of dev machine)
 * 5. Default fallback: 'localhost'
 */
export const getBackendHost = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim() !== '') {
      return saved.trim();
    }
  }

  const envHost = (import.meta as any).env?.VITE_BACKEND_HOST;
  if (envHost && envHost.trim() !== '') {
    return envHost.trim();
  }

  // On web browser, use the hostname that served the page (e.g. 192.168.2.147 from Vite dev server)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
      return host;
    }
  }

  // On Capacitor native (physical device), localhost points to the phone itself.
  // Default to LAN IP so the app can reach the dev machine over Wi-Fi.
  if (isCapacitorNative()) {
    return DEFAULT_LAN_IP;
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
