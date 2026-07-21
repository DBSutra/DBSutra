/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Production-grade error handling utilities.
 * Every error gets structured context for debugging.
 */

/** Error severity levels. */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/** Structured error context for debugging. */
export interface ErrorContext {
  /** Which module/file produced the error */
  module: string
  /** What operation was being performed */
  operation: string
  /** Additional key-value context */
  details?: Record<string, unknown>
  /** Error severity */
  severity?: ErrorSeverity
}

interface ErrorEntry {
  timestamp: string
  severity: ErrorSeverity
  module: string
  operation: string
  message: string
  details?: Record<string, unknown>
  stack?: string
}

// Global error collector — accessible via (window as any).__clientdb_errors
const errorLog: ErrorEntry[] = []
const MAX_ERROR_LOG = 200

if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__clientdb_errors = errorLog
  ;(window as unknown as Record<string, unknown>).__clientdb_clearErrors = () => {
    errorLog.length = 0
    console.info('[errors] Error log cleared')
  }
}

/**
 * Creates a structured error with context.
 * Use this instead of `new Error()` for better debugging.
 */
export function createError(message: string, context: ErrorContext): Error & { context: ErrorContext } {
  const error = new Error(`[${context.module}] ${context.operation}: ${message}`) as Error & { context: ErrorContext }
  error.context = context
  return error
}

/**
 * Logs an error with structured context.
 * In development, logs to console. In production, could send to error tracking.
 */
export function logError(error: unknown, context: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  const severity = context.severity ?? 'medium'

  const logEntry: ErrorEntry = {
    timestamp: new Date().toISOString(),
    severity,
    module: context.module,
    operation: context.operation,
    message,
    details: context.details,
    stack,
  }

  // Store in global error collector
  errorLog.push(logEntry)
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.splice(0, errorLog.length - MAX_ERROR_LOG)
  }

  // Always log to console
  const logFn = severity === 'critical' || severity === 'high' ? console.error : console.warn
  logFn(`[${severity.toUpperCase()}] [${context.module}] ${context.operation}:`, {
    message,
    details: context.details,
    stack,
    timestamp: logEntry.timestamp,
  })
}

/**
 * Wraps an async function with structured error handling.
 * Returns a new function that catches errors, logs them, and re-throws.
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error, context)
      throw createError(
        error instanceof Error ? error.message : String(error),
        context
      )
    }
  }) as T
}

/**
 * Wraps an async function with fire-and-forget error handling.
 * Errors are logged but not thrown. Use for non-critical operations.
 */
export function fireAndForget(
  fn: () => Promise<unknown>,
  context: ErrorContext
): void {
  fn().catch((error) => {
    logError(error, { ...context, severity: context.severity ?? 'low' })
  })
}

/**
 * Safe JSON parse that returns null on failure instead of throwing.
 */
export function safeJsonParse<T>(json: string, context: ErrorContext): T | null {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    logError(error, {
      ...context,
      severity: 'low',
      details: { ...context.details, jsonPreview: json.substring(0, 200) },
    })
    return null
  }
}

/**
 * Get all collected errors (for debugging).
 * Accessible via console: `__clientdb_errors`
 */
export function getErrorLog(): readonly ErrorEntry[] {
  return errorLog
}
