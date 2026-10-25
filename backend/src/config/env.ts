import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5050', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5050',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,exp://localhost:8081')
    .split(',')
    .map(o => o.trim()),

  JWT_SECRET: process.env.JWT_SECRET || 'dev-fallback-secret-key-nina-secure-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-fallback-refresh-secret-nina-2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Salt & Pepper
  PEPPER_KEY_ID: process.env.PEPPER_KEY_ID || 'nina-pepper-v1',
  PEPPER_SECRET: process.env.PEPPER_SECRET || 'synthetic-local-dev-pepper-secret-do-not-use-in-production',
  ARGON2_MEMORY_COST: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
  ARGON2_TIME_COST: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
  ARGON2_PARALLELISM: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),

  // Encryption at rest
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json',

  // AWS
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BACKUP_BUCKET: process.env.AWS_S3_BACKUP_BUCKET || '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID || '',

  // Email & SMTP
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'simulated',
  EMAIL_FROM: process.env.EMAIL_FROM || '"Nina International Security" <no-reply@ninainternational.edu>',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
};
