/**
 * Glue between WorkflowEngine TransitionResults and the Next.js route layer.
 *
 * The engine never throws — it returns { success, error, errorCode }. Routes
 * surface those failures as HttpError instances so handleRoute() in
 * lib/utils/api.ts maps them to JSON error responses with the right HTTP code.
 */

import { ErrorCode, HttpError } from '@/lib/utils/api';
import type { TransitionResult, WorkflowErrorCode } from './engine';

const STATUS_BY_CODE: Record<WorkflowErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

const API_CODE_BY_CODE: Record<WorkflowErrorCode, ErrorCode> = {
  NOT_FOUND: ErrorCode.NOT_FOUND,
  FORBIDDEN: ErrorCode.FORBIDDEN,
  VALIDATION_ERROR: ErrorCode.VALIDATION_ERROR,
  CONFLICT: ErrorCode.VALIDATION_ERROR,
  INTERNAL_ERROR: ErrorCode.INTERNAL_ERROR,
};

export function unwrap<T extends TransitionResult>(result: T): T & { success: true } {
  if (result.success) return result as T & { success: true };
  const code = result.errorCode ?? 'INTERNAL_ERROR';
  throw new HttpError(
    STATUS_BY_CODE[code],
    result.error ?? 'Workflow transition failed',
    API_CODE_BY_CODE[code]
  );
}
