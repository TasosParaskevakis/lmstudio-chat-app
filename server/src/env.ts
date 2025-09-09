import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  LMSTUDIO_BASE_URL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
  MAX_CONTEXT_TOKENS: parseInt(process.env.MAX_CONTEXT_TOKENS || '4096', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  HISTORY_ENABLED: (process.env.HISTORY_ENABLED ?? 'true').toLowerCase() !== 'false'
};
