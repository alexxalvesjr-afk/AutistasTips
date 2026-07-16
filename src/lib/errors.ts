/**
 * Erros de aplicação com código HTTP e mensagem segura para o cliente.
 * Nunca expor stack trace ou detalhes internos nas respostas.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status = 400,
    code = "BAD_REQUEST",
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) {
    super("Dados inválidos.", 422, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados.") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      "Muitas requisições. Tente novamente em instantes.",
      429,
      "RATE_LIMITED",
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
