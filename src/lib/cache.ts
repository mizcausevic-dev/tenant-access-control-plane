type CacheEnvelope<T> = {
  value: T;
  expiresAt: number;
};

type CacheMode = "redis" | "memory";

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  const { default: Redis } = await import("ioredis");
  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    await client.connect();
    return client;
  } catch {
    await client.quit();
    return null;
  }
}

export async function getCacheMode(): Promise<CacheMode> {
  const client = await getRedisClient();

  if (client) {
    await client.quit();
    return "redis";
  }

  return "memory";
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();

  if (client) {
    const raw = await client.get(key);
    await client.quit();
    return raw ? (JSON.parse(raw) as T) : null;
  }

  const hit = memoryCache.get(key);

  if (!hit || hit.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return hit.value as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const client = await getRedisClient();

  if (client) {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    await client.quit();
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  const client = await getRedisClient();

  if (client) {
    const keys = await client.keys(`${prefix}*`);

    if (keys.length > 0) {
      await client.del(...keys);
    }

    await client.quit();
    return;
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
