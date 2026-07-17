import { z } from "zod";

/**
 * Validação das variáveis de ambiente na inicialização.
 * A aplicação não sobe com segredos ausentes ou fracos.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: "DATABASE_URL inválida" }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("AutistasTips <no-reply@localhost>"),
});

/**
 * Durante o build (Next.js define NEXT_PHASE) ou quando SKIP_ENV_VALIDATION
 * está ativo, a validação não derruba o processo — os segredos podem ainda
 * não estar disponíveis no ambiente de build de plataformas como a Netlify.
 * A validação estrita continua valendo em runtime (primeira requisição).
 */
const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" ||
  process.env.NEXT_PHASE === "phase-production-build";

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  if (skipValidation) {
    // Placeholders válidos apenas para o build passar; nunca usados em runtime
    // real, pois lá as variáveis verdadeiras estão presentes.
    return envSchema.parse({
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://user:password@localhost:5432/placeholder",
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ||
        "build-time-placeholder-secret-value-000",
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ||
        "build-time-placeholder-secret-value-111",
    });
  }

  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
