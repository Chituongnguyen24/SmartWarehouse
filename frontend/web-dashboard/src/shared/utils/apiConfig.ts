/**
 * Dynamic API Host detection for SmartWarehouse Web Dashboard.
 * - On Localhost / 127.0.0.1: Returns http://localhost:<port>
 * - On Remote (EC2 Public IP, DuckDNS domain, or any production domain):
 *   Returns window.location.origin (e.g. http://smartwarehouse-kltn.duckdns.org)
 *   so that requests use standard port 80/443 proxied via Nginx reverse proxy.
 *   This eliminates CORS errors, loopback restrictions, and avoids opening microservice ports.
 */
export const getApiHost = (port: number): string => {
  if (typeof window === 'undefined') return `http://localhost:${port}`;

  // 1. Cho phép tùy biến máy chủ nhanh qua localStorage (dễ dàng đổi IP/Domain khi cần)
  try {
    const customServer = localStorage.getItem('smartwarehouse_server_url');
    if (customServer && customServer.trim()) {
      return customServer.trim().replace(/\/$/, '');
    }
  } catch {}

  // 2. Môi trường Desktop App (Electron): Mặc định kết nối máy chủ Cloud EC2
  if (
    (window as any).isElectron ||
    (typeof navigator !== 'undefined' && /SmartWarehouseDesktop/i.test(navigator.userAgent))
  ) {
    return 'http://smartwarehouse-kltn.duckdns.org';
  }

  // 3. Môi trường Web thông thường
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  // In production (EC2 / DuckDNS), route directly through Nginx reverse proxy on the same origin:
  return window.location.origin;
};

export const API_HOSTS = {
  get ORDER() { return getApiHost(3004); },
  get WAREHOUSE() { return getApiHost(3005); },
  get INBOUND() { return getApiHost(3006); },
  get OUTBOUND() { return getApiHost(3007); },
  get REPORT() { return getApiHost(3008); },
  get PRODUCT() { return getApiHost(3010); },
  get INVENTORY() { return getApiHost(3011); },
  get USER() { return getApiHost(3012); },
  get TRANSPORT() { return getApiHost(3013); },
  get IOT() { return getApiHost(3002); },
};
