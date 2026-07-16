import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { isProduction } from "@/lib/env";
import { Prisma } from "@prisma/client";

const DEFAULT_MAX_BODY_BYTES = 100 * 1024; // 100 KB
export const IMPORT_MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

type Handler<T> = (request: Request, context: T) => Promise<NextResponse>;

/**
 * Envelope padrão de resposta e tratamento global de exceções.
 * Erros internos nunca vazam detalhes para o cliente.
 */
export function apiHandler<T>(handler: Handler<T>): Handler<T> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: { message: error.message, code: error.code } },
      {
        status: error.status,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Dados inválidos.",
          code: "VALIDATION_ERROR",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: { message: "Registro duplicado.", code: "CONFLICT" } },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: { message: "Recurso não encontrado.", code: "NOT_FOUND" } },
        { status: 404 },
      );
    }
  }

  // Erro inesperado: logar internamente, responder genérico.
  console.error("[api] erro não tratado:", isProduction ? String(error) : error);
  return NextResponse.json(
    { error: { message: "Erro interno do servidor.", code: "INTERNAL" } },
    { status: 500 },
  );
}

/**
 * Lê e valida o corpo JSON com limite de tamanho (proteção contra
 * payload excessivo) e schema Zod (validação e sanitização).
 */
export async function parseBody<S extends ZodSchema>(
  request: Request,
  schema: S,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<S["_output"]> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new AppError("Payload excede o tamanho máximo.", 413, "PAYLOAD_TOO_LARGE");
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw new ValidationError();
  }
  if (raw.length > maxBytes) {
    throw new AppError("Payload excede o tamanho máximo.", 413, "PAYLOAD_TOO_LARGE");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ValidationError({ body: ["JSON inválido"] });
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}

/** Valida parâmetros de query string com Zod. */
export function parseQuery<S extends ZodSchema>(
  request: Request,
  schema: S,
): S["_output"] {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}
