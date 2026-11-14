/**
 * Dynamic API Host detection for SmartWarehouse Web Dashboard.
 * - On Localhost / 127.0.0.1: Returns http://localhost:<port>
 * - On Remote (EC2 Public IP or DuckDNS domain): Returns http://<hostname>:<port>
 * - If running under HTTPS (SSL): Returns https://<hostname>:<port>
 */
export const getApiHost = (port: number): string => {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  return `${window.location.protocol}//${hostname}:${port}`;
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
};

