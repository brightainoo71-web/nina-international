import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { seedDatabaseIfEmpty } from './seed/seedData.js';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';

import authRoutes from './routes/auth.routes.js';
import credentialAuditRoutes from './routes/credentialAudit.routes.js';
import userRoutes from './routes/user.routes.js';
import schoolRoutes from './routes/school.routes.js';
import securityRoutes from './routes/security.routes.js';
import backupRoutes from './routes/backup.routes.js';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Policy
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps (no origin), localhost, firebase domains, or configured origins
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('.web.app') ||
        origin.endsWith('.firebaseapp.com') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.lhr.life') ||
        origin.endsWith('.trycloudflare.com') ||
        ENV.ALLOWED_ORIGINS.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS security policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Payload size limit to prevent buffer exhaustion attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General API rate limiting
app.use('/api', apiRateLimiter);

// Route Bindings
app.use('/api/auth', authRoutes);
app.use('/api/credential-audit', credentialAuditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/backup', backupRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Nina International Secure School API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    cryptography: {
      argon2id: true,
      hmacPepper: true,
      totpRFC6238: true,
      aesGcmEncryptionAtRest: true,
    },
  });
});

// Central 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} does not exist.` });
});

// Central Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Application Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: ENV.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  });
});

// Boot Server
async function startServer() {
  try {
    await seedDatabaseIfEmpty();
    app.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Nina International Secure Backend API running on port ${ENV.PORT}`);
      console.log(`🔒 Argon2id + HMAC Pepper Credential Service Active`);
      console.log(`🔑 Key ID: ${ENV.PEPPER_KEY_ID}`);
      console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
