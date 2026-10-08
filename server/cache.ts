export class TTLCache<T = any> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 600 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const duration = ttlMs ?? this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + duration,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const githubCache = new TTLCache(600 * 1000);
export const aiCache = new TTLCache(600 * 1000);
