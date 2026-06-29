/**
 * Fail-fast environment validation, run by ConfigModule at boot. A misconfigured server should
 * refuse to start rather than run insecurely (e.g. with default JWT secrets in production).
 */
const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
const MIN_SECRET_LENGTH = 24;
const WEAK_MARKERS = ['change-me', 'dev-', 'not-for-production', 'secret'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  for (const key of REQUIRED) {
    if (!config[key] || String(config[key]).trim() === '') {
      throw new Error(`[config] Missing required environment variable: ${key}`);
    }
  }

  if (config.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      const value = String(config[key]);
      const looksWeak = value.length < MIN_SECRET_LENGTH || WEAK_MARKERS.some((m) => value.toLowerCase().includes(m));
      if (looksWeak) {
        throw new Error(
          `[config] ${key} is weak or a default value. In production set a strong secret (>= ${MIN_SECRET_LENGTH} chars), e.g. \`openssl rand -base64 48\`.`,
        );
      }
    }
    if (String(config.JWT_ACCESS_SECRET) === String(config.JWT_REFRESH_SECRET)) {
      throw new Error('[config] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
    }
  }

  return config;
}
