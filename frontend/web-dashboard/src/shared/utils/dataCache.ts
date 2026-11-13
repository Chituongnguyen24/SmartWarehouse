/**
 * In-memory client-side cache for instant page switching without re-fetching
 * Giúp giao diện chuyển tab/trang không phải load lại từ đầu (0ms latency),
 * chỉ tải lại khi có thay đổi (Create/Update/Delete hoặc chủ động Refresh).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class ClientDataCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  invalidate(keyOrPrefix: string): void {
    if (this.cache.has(keyOrPrefix)) {
      this.cache.delete(keyOrPrefix);
      return;
    }

    // Invalidate keys that start with prefix
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyOrPrefix) || key.includes(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const globalDataCache = new ClientDataCache();

