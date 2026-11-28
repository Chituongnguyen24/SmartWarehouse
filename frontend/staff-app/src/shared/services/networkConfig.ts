const STORAGE_KEY = 'sfwms_backend_host';

export const DEPLOYED_HOST = 'smartwarehouse-kltn.duckdns.org';
export const DEFAULT_LAN_IP = DEPLOYED_HOST;

export type BackendEnvironment = 'LOCAL_USB' | 'LOCAL_LAN' | 'PRODUCTION_CLOUD';

/**
 * Detect if app is running inside Capacitor native shell (Android/iOS).
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
};

/**
 * Returns the current backend host (IP or domain, without protocol or port).
 * Fully honors user runtime selection in localStorage without hardcoded overrides.
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

  // On web browser, use current host if not empty (including localhost for local dev/testing)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== '') {
      if ((host === 'localhost' || host === '127.0.0.1') && !isCapacitorNative()) {
        return 'localhost';
      }
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  }

  // Default to Deployed EC2 Host
  return DEPLOYED_HOST;
};

/**
 * Resolves the full base URL for a microservice port.
 * When pointing to a deployed domain, APIs are proxied via Nginx port 80.
 * When pointing to localhost or local LAN IP, microservice ports are retained.
 */
export const getServiceBaseUrl = (port: number): string => {
  const host = getBackendHost();
  if (
    host.includes('duckdns.org') ||
    host.includes('amazonaws.com') ||
    host.includes('.com') ||
    host.includes('.vn')
  ) {
    const clean = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${clean}`;
  }
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `http://${cleanHost}:${port}`;
};

/**
 * Sets the backend host directly.
 */
export const setBackendHost = (newHost: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, newHost.trim());
  }
};

/**
 * Resets backend host to default.
 */
export const resetBackendHost = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Switch environment with strict session and connection management (Rule 5):
 * Clears old session tokens, user info, active locks, and triggers clean reload.
 */
export const switchEnvironmentAndResetSession = (newHost: string) => {
  if (typeof window === 'undefined') return;

  const targetHost = newHost.trim();
  localStorage.setItem(STORAGE_KEY, targetHost);

  // Clear auth session and caches to prevent token leaking between Local and Production
  localStorage.removeItem('sfwms_staff_token');
  localStorage.removeItem('sfwms_staff_user');
  localStorage.removeItem('sfwms_staff_session_time');

  // Clear transient lock states
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('citymart_') || key.startsWith('sfwms_lock_')) {
      localStorage.removeItem(key);
    }
  });

  // Emit event for real-time subscribers
  window.dispatchEvent(new CustomEvent('sfwms_environment_changed', { detail: { host: targetHost } }));

  // Hard reload to guarantee clean socket & fetch teardown
  window.location.reload();
};

/**
 * Quick ping health check for a microservice port.
 * Useful for verifying if Local backend / adb reverse is active.
 */
export const checkPortHealth = async (port: number, timeoutMs = 2500): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const url = getServiceBaseUrl(port);

    const res = await fetch(`${url}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch (e) {
    return false;
  }
};

/**
 * Check if the active connection is Local (USB or LAN).
 */
export const isLocalEnvironment = (): boolean => {
  const host = getBackendHost();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.0.')
  );
};
