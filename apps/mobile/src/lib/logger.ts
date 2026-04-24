/**
 * Central logger. In development, logs to console. In production,
 * no-ops (strip via babel-plugin-transform-remove-console would also work).
 *
 * Never use console.log directly in app code. Always:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('foo', bar);
 */

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function noop(): void {
  /* no-op */
}

export const logger = {
  debug: isDev ? console.log.bind(console, '[debug]') : noop,
  info: isDev ? console.info.bind(console, '[info]') : noop,
  warn: isDev ? console.warn.bind(console, '[warn]') : noop,
  // errors are ALWAYS logged — production needs visibility (and they'll be
  // forwarded to crash reporting if wired up later)
  error: console.error.bind(console, '[error]'),
};
