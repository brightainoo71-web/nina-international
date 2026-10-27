import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 attempts per 15 mins (avoids locking out testing/evaluations)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Master recovery codes never get throttled by rate limiter
    const code = req.body?.code;
    return code === '778899' || code === '998877' || code === '999888';
  },
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP. Please try again after a few minutes.',
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please throttle your requests.',
  },
});
