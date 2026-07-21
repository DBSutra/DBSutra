/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createError,
  logError,
  withErrorHandling,
  fireAndForget,
  safeJsonParse,
  getErrorLog,
  type ErrorContext,
} from './errors'

const CTX: ErrorContext = {
  module: 'TestModule',
  operation: 'testOperation',
}

describe('errors utilities', () => {
  beforeEach(() => {
    // Clear the global error log between tests
    getErrorLog().length = 0
  })

  describe('createError()', () => {
    it('creates an Error with module-prefixed message', () => {
      const error = createError('something broke', CTX)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('[TestModule] testOperation: something broke')
    })

    it('attaches context to the error', () => {
      const ctx: ErrorContext = {
        ...CTX,
        severity: 'high',
        details: { key: 'value' },
      }
      const error = createError('oops', ctx)

      expect(error.context).toEqual(ctx)
      expect(error.context.severity).toBe('high')
      expect(error.context.details).toEqual({ key: 'value' })
    })

    it('preserves the stack trace', () => {
      const error = createError('stack test', CTX)
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('stack test')
    })
  })

  describe('logError()', () => {
    it('adds the error to the global error log', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logError(new Error('logged'), CTX)

      const log = getErrorLog()
      expect(log).toHaveLength(1)
      expect(log[0].message).toBe('logged')
      expect(log[0].module).toBe('TestModule')
      expect(log[0].operation).toBe('testOperation')

      warnSpy.mockRestore()
    })

    it('defaults severity to "medium"', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logError(new Error('default severity'), CTX)

      expect(getErrorLog()[0].severity).toBe('medium')
      warnSpy.mockRestore()
    })

    it('uses console.error for critical and high severity', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logError(new Error('critical'), { ...CTX, severity: 'critical' })
      logError(new Error('high'), { ...CTX, severity: 'high' })

      // Both should use console.error
      expect(errorSpy).toHaveBeenCalledTimes(2)

      errorSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it('uses console.warn for low and medium severity', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      logError(new Error('low'), { ...CTX, severity: 'low' })
      logError(new Error('medium'), { ...CTX, severity: 'medium' })

      expect(warnSpy).toHaveBeenCalledTimes(2)

      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('handles string errors (non-Error objects)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logError('string error', CTX)

      expect(getErrorLog()[0].message).toBe('string error')
      warnSpy.mockRestore()
    })

    it('trims the log when it exceeds MAX_ERROR_LOG (200)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Add 210 errors
      for (let i = 0; i < 210; i++) {
        logError(new Error(`err-${i}`), CTX)
      }

      const log = getErrorLog()
      expect(log.length).toBeLessThanOrEqual(200)
      // The oldest entries should have been trimmed
      expect(log[0].message).toBe('err-10')

      warnSpy.mockRestore()
    })

    it('stores details in the log entry', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logError(new Error('with details'), {
        ...CTX,
        details: { table: 'users', row: 5 },
      })

      expect(getErrorLog()[0].details).toEqual({ table: 'users', row: 5 })
      warnSpy.mockRestore()
    })
  })

  describe('withErrorHandling()', () => {
    it('returns the result of the wrapped function on success', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const wrapped = withErrorHandling(fn, CTX)

      const result = await wrapped()
      expect(result).toBe('success')
    })

    it('logs and re-throws errors from the wrapped function', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = vi.fn().mockRejectedValue(new Error('wrapped fail'))
      const wrapped = withErrorHandling(fn, CTX)

      await expect(wrapped()).rejects.toThrow('[TestModule] testOperation: wrapped fail')
      expect(getErrorLog().length).toBeGreaterThan(0)
      warnSpy.mockRestore()
    })

    it('passes arguments through to the original function', async () => {
      const fn = vi.fn().mockResolvedValue('ok')
      const wrapped = withErrorHandling(fn, CTX)

      await wrapped('a', 'b', 42)

      expect(fn).toHaveBeenCalledWith('a', 'b', 42)
    })
  })

  describe('fireAndForget()', () => {
    it('executes the function', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)

      fireAndForget(fn, CTX)

      // Allow microtask to resolve
      await vi.waitFor(() => expect(fn).toHaveBeenCalled())
    })

    it('logs errors instead of throwing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = vi.fn().mockRejectedValue(new Error('fire-forget-fail'))

      fireAndForget(fn, CTX)

      // Wait for the promise to settle
      await vi.waitFor(() => expect(getErrorLog().length).toBeGreaterThan(0))

      // Should not have thrown
      warnSpy.mockRestore()
    })

    it('defaults severity to "low" when not specified', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = vi.fn().mockRejectedValue(new Error('low severity'))

      fireAndForget(fn, CTX)

      await vi.waitFor(() => expect(getErrorLog().length).toBeGreaterThan(0))
      expect(getErrorLog()[0].severity).toBe('low')
      warnSpy.mockRestore()
    })
  })

  describe('safeJsonParse()', () => {
    it('parses valid JSON', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = safeJsonParse<{ a: number }>('{"a":1}', CTX)

      expect(result).toEqual({ a: 1 })
      warnSpy.mockRestore()
    })

    it('returns null for invalid JSON', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = safeJsonParse('not json{{', CTX)

      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it('logs the parse error with low severity', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      safeJsonParse('bad', CTX)

      const log = getErrorLog()
      expect(log).toHaveLength(1)
      expect(log[0].severity).toBe('low')
      warnSpy.mockRestore()
    })

    it('includes a json preview in details on failure', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      safeJsonParse('invalid json data', CTX)

      expect(getErrorLog()[0].details).toHaveProperty('jsonPreview', 'invalid json data')
      warnSpy.mockRestore()
    })

    it('truncates long json preview to 200 chars', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const longJson = 'x'.repeat(500)

      safeJsonParse(longJson, CTX)

      const preview = getErrorLog()[0].details?.jsonPreview as string
      expect(preview.length).toBe(200)
      warnSpy.mockRestore()
    })
  })

  describe('getErrorLog()', () => {
    it('returns a reference to the global error log', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const logBefore = getErrorLog()
      logError(new Error('test'), CTX)
      const logAfter = getErrorLog()

      // Same reference
      expect(logBefore).toBe(logAfter)
      expect(logAfter).toHaveLength(1)
      warnSpy.mockRestore()
    })
  })
})
