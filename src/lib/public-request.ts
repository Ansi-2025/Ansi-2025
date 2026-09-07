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

const getAllowedOrigins = () => {
  const configured = [
    process.env.APP_ORIGIN,
    process.env.SITE_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.VITE_APP_URL,
    process.env.CLIENT_URL,
    process.env.ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().replace(/\/+$/, ""));

  return new Set(configured);
};

const isLocalHost = (value?: string | null) => {
  if (!value) return false;

  const host = value.toLowerCase().replace(/\[::1\]/, "localhost");
  return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");
};

const resolveOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const getClientFingerprint = (request: Request) => {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("true-client-ip") ??
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
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    throw new Error(`Origem ausente para ${scope}. Acesso público negado.`);
  }

  const isAllowedByOrigin =
    allowedOrigins.has(origin) || allowedOrigins.has(new URL(origin).hostname);
  const isLocalDev = isLocalHost(origin) || isLocalHost(host);

  if (!isAllowedByOrigin && !isLocalDev) {
    throw new Error(`Origem não autorizada para ${scope}: ${origin}`);
  }

  if (host) {
    const requestHost = new URL(origin).host;
    const requestHostname = new URL(origin).hostname;
    const hostName = host.split(":")[0]?.toLowerCase();

    if (hostName && requestHostname !== hostName && !isLocalHost(hostName)) {
      throw new Error(`Host e origem divergem para ${scope}.`);
    }

    if (requestHost !== host && !isLocalHost(host)) {
      throw new Error(`Host e origem divergem para ${scope}.`);
    }
  }

  assertRateLimit(request, scope);
  return request;
}
