import type { ErrorCode } from '@orbit/config'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tenés permiso para realizar esta acción') {
    super('FORBIDDEN', message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(entity = 'Recurso') {
    super('NOT_FOUND', `${entity} no encontrado`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class ApprovalBlockedError extends AppError {
  constructor(code: ErrorCode, details?: unknown) {
    super(code, getApprovalMessage(code), 422, details)
  }
}

function getApprovalMessage(code: ErrorCode): string {
  const messages: Partial<Record<ErrorCode, string>> = {
    APPROVAL_BLOCKED_UNRESOLVED_COMMENTS:
      'Hay comentarios sin resolver. Resuélvelos antes de aprobar.',
    APPROVAL_BLOCKED_CRITICAL_AI_FINDINGS:
      'Hay hallazgos críticos de IA sin validar. Copy debe validarlos primero.',
    MISSING_REQUIRED_COMMENT:
      'Debés dejar al menos un comentario antes de solicitar cambios.',
    INVALID_TRANSITION: 'Esta acción no es válida en el estado actual de la solicitud.',
  }
  return messages[code] ?? 'Acción no permitida.'
}
