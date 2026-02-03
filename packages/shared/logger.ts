type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Check for Bun environment vs Browser/Vite environment
const isProd = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'production'
  // @ts-ignore - import.meta.env is Vite specific
  : (typeof import.meta !== 'undefined' && import.meta.env?.PROD);

let currentLevel: LogLevel = isProd ? 'warn' : 'debug';

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },
  debug(...args: unknown[]) {
    if (LEVELS[currentLevel] <= 0) console.log('[DEBUG]', ...args);
  },
  info(...args: unknown[]) {
    if (LEVELS[currentLevel] <= 1) console.log('[INFO]', ...args);
  },
  warn(...args: unknown[]) {
    if (LEVELS[currentLevel] <= 2) console.warn('[WARN]', ...args);
  },
  error(...args: unknown[]) {
    if (LEVELS[currentLevel] <= 3) console.error('[ERROR]', ...args);
  },
};
