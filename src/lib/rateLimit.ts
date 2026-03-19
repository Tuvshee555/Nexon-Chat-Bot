type Bucket = { hits: number; reset: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.reset <= now) {
    const reset = now + windowMs;
    buckets.set(key, { hits: 1, reset });
    return { allowed: true, remaining: limit - 1, reset };
  }

  if (bucket.hits >= limit) {
    return { allowed: false, remaining: 0, reset: bucket.reset };
  }

  bucket.hits += 1;
  return {
    allowed: true,
    remaining: limit - bucket.hits,
    reset: bucket.reset,
  };
}

type ClientLike = {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
};

export function getClientKey(req: ClientLike) {
  const fwd = (req.headers?.["x-forwarded-for"] as string | undefined) || "";
  const ip = fwd.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  return ip;
}
