import { describe, it, expect } from 'vitest';
import { TitanError, createError, logError } from './errors';

/**
 * Unit tests for the custom error handling utilities.
 *
 * Covers:
 * - TitanError class construction and properties
 * - createError() factory: correct codes, messages, and userMessages
 * - logError() runs without throwing
 */

describe('TitanError', () => {
  it('should construct with the correct properties', () => {
    const err = new TitanError(
      'IMAGE_BLURRY',
      'Image sharpness check failed',
      'Image Unclear. Please retake the photo.',
      new Error('original')
    );

    expect(err.name).toBe('TitanError');
    expect(err.code).toBe('IMAGE_BLURRY');
    expect(err.message).toBe('Image sharpness check failed');
    expect(err.userMessage).toBe('Image Unclear. Please retake the photo.');
    expect(err.originalError).toBeInstanceOf(Error);
  });

  it('should be an instance of Error', () => {
    const err = new TitanError('UNKNOWN_ERROR', 'msg', 'user msg');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('createError()', () => {
  it('returns IMAGE_BLURRY error with correct userMessage', () => {
    const err = createError('IMAGE_BLURRY');
    expect(err.code).toBe('IMAGE_BLURRY');
    expect(err.userMessage).toContain('blurry');
  });

  it('returns NETWORK_TIMEOUT error with correct userMessage', () => {
    const err = createError('NETWORK_TIMEOUT');
    expect(err.code).toBe('NETWORK_TIMEOUT');
    expect(err.userMessage).toContain('Connection');
  });

  it('returns API_QUOTA_EXCEEDED error with correct userMessage', () => {
    const err = createError('API_QUOTA_EXCEEDED');
    expect(err.code).toBe('API_QUOTA_EXCEEDED');
    expect(err.userMessage).toContain('capacity');
  });

  it('returns NO_DEVICE_FOUND error with correct userMessage', () => {
    const err = createError('NO_DEVICE_FOUND');
    expect(err.code).toBe('NO_DEVICE_FOUND');
    expect(err.userMessage).toContain('No Hardware');
  });

  it('returns UNKNOWN_ERROR for unrecognised codes', () => {
    const err = createError('UNKNOWN_ERROR');
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.userMessage).toBeTruthy();
  });

  it('attaches originalError when provided', () => {
    const original = new Error('api failed');
    const err = createError('NETWORK_TIMEOUT', original);
    expect(err.originalError).toBe(original);
  });
});

describe('logError()', () => {
  it('does not throw when given a TitanError', () => {
    const err = new TitanError('IMAGE_BLURRY', 'msg', 'user');
    expect(() => logError(err, 'test-context')).not.toThrow();
  });

  it('does not throw when given a generic Error', () => {
    expect(() => logError(new Error('generic'), 'test-context')).not.toThrow();
  });

  it('does not throw when given a non-Error value', () => {
    expect(() => logError('just a string', 'test-context')).not.toThrow();
  });
});
