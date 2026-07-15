export const ERR = {
  UNAUTHORIZED: { error: 'Unauthorized', code: 'UNAUTHORIZED', status: 401 },
  NOT_FOUND: { error: 'Not found', code: 'NOT_FOUND', status: 404 },
  FORBIDDEN: { error: 'Forbidden', code: 'FORBIDDEN', status: 403 },
  VALIDATION: { error: 'Validation error', code: 'VALIDATION', status: 400 },
  INTERNAL: { error: 'Internal server error', code: 'INTERNAL', status: 500 },
  RATE_LIMIT: { error: 'Too many requests', code: 'RATE_LIMIT', status: 429 },
  CONFLICT: { error: 'Already exists', code: 'CONFLICT', status: 409 },
} as const

export type ErrorCode = keyof typeof ERR
