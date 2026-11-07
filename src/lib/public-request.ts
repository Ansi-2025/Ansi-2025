export type PublicRequestScope = "landing_cta" | "order_submission";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const RATE_LIMITS: Record<PublicRequestScope, RateLimitConfig> = {
  landing_cta: { windowMs: 5 * 60 * 1000, maxRequests: 20 },
  order_submission: { windowMs: 10 * 60 * 1000, maxRequests: 5 },
};

const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

const resolveOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getClientFingerprint = (request: Request) => {
  const forwardedFor =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("true-client-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  return `${request.headers.get("host") ?? "unknown"}|${forwardedFor}`;
};

function assertRateLimit(request: Request, scope: PublicRequestScope) {
  const limit = RATE_LIMITS[scope];
  const fingerprint = getClientFingerprint(request);
  const now = Date.now();
  const bucket = RATE_LIMIT_STORE.get(`${scope}:${fingerprint}`);

  if (!bucket || bucket.resetAt <= now) {
    RATE_LIMIT_STORE.set(`${scope}:${fingerprint}`, {
      count: 1,
      resetAt: now + limit.windowMs,
    });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit.maxRequests) {
    throw new Error(`Muitas requisições em ${scope}. Tente novamente mais tarde.`);
  }

  RATE_LIMIT_STORE.set(`${scope}:${fingerprint}`, bucket);
}

export function assertPublicRequest(request: Request, { scope }: { scope: PublicRequestScope }) {
  const origin = resolveOrigin(request);
  const host = (request.headers.get("host") || new URL(request.url).host).toLowerCase();

  if (!origin) {
    throw new Error(`Origem ausente para ${scope}. Acesso público negado.`);
  }

  if (origin.host.toLowerCase() !== host) {
    throw new Error(`Origem não autorizada ou host e origem divergem para ${scope}.`);
  }

  assertRateLimit(request, scope);
  return request;
}
