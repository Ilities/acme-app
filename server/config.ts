const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? 'data/acme.db',
  sessionSecret: process.env.SESSION_SECRET ?? 'local-development-secret',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
};

if (config.isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}
