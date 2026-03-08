/**
 * Structured logger — replaces raw console.error across API routes.
 *
 * Dev: pretty-prints to console with structured context.
 * Prod: logs structured JSON (compatible with Vercel log drain / future Sentry).
 */

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  environment: string;
  context?: Record<string, unknown>;
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
}

function extractErrorContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack?.split('\n').slice(0, 5).join('\n'),
      };
    } else {
      result[key] = value;
    }
  }
  return result;
}

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error(message: string, context?: Record<string, unknown>) {
    const entry = formatEntry('error', message, extractErrorContext(context));
    if (isDev) {
      console.error(`[ERROR] ${entry.timestamp} ${message}`, context ?? '');
    } else {
      console.error(JSON.stringify(entry));
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry = formatEntry('warn', message, extractErrorContext(context));
    if (isDev) {
      console.warn(`[WARN] ${entry.timestamp} ${message}`, context ?? '');
    } else {
      console.warn(JSON.stringify(entry));
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    const entry = formatEntry('info', message, extractErrorContext(context));
    if (isDev) {
      console.log(`[INFO] ${entry.timestamp} ${message}`, context ?? '');
    } else {
      console.log(JSON.stringify(entry));
    }
  },
};
