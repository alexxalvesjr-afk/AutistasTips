import { RateLimitError } from "@/lib/errors";

/**
 * Rate limiter de janela deslizante em memória.
 *
 * Adequado para instância única. Em deploy horizontal, substituir o
 * armazenamento por Redis (mesma interface) — ver SECURITY.md.
 */
type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

// Limpeza periódica para evitar crescimento sem limite.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of store) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) store.delete(key);
  }
}

export type RateLimitRule = {
  /** Máximo de requisições dentro da janela */
  limit: number;
  /** Janela em milissegundos */
  windowMs: number;
};

export const rateLimitRules = {
  login: { limit: 5, windowMs: 60_000 },
  register: { limit: 5, windowMs: 10 * 60_000 },
  forgotPassword: { limit: 3, windowMs: 10 * 60_000 },
  resetPassword: { limit: 5, windowMs: 10 * 60_000 },
  changePassword: { limit: 5, windowMs: 10 * 60_000 },
  refresh: { limit: 30, windowMs: 60_000 },
  importData: { limit: 10, windowMs: 60_000 },
  api: { limit: 240, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

/**
 * Lança RateLimitError quando o limite da chave é excedido.
 * A chave deve combinar escopo + identificador (IP ou userId).
 */
export function enforceRateLimit(key: string, rule: RateLimitRule): void {
  const now = Date.now();
  cleanup(rule.windowMs);

  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);

  if (bucket.timestamps.length >= rule.limit) {
    const oldest = bucket.timestamps[0];
    const retryAfter = Math.ceil((oldest + rule.windowMs - now) / 1000);
    throw new RateLimitError(Math.max(retryAfter, 1));
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
}

/** Extrai o IP do cliente considerando proxies confiáveis. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 45);
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 45);
  return "unknown";
}
