/**
 * Dynamic API Host detection for SmartWarehouse Customer Web.
 * - On Localhost / 127.0.0.1: Returns http://localhost:<port>
 * - On Remote (EC2 Public IP, DuckDNS domain, or any production domain):
 *   Returns window.location.origin (e.g. http://smartwarehouse-kltn.duckdns.org)
 *   so that requests use standard port 80/443 proxied via Nginx reverse proxy.
 * - On Server-Side (Next.js SSR): Returns http://127.0.0.1:<port>
 */
export const getApiHost = (port: number): string => {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || `http://127.0.0.1:${port}`;
  }
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  return window.location.origin;
};

