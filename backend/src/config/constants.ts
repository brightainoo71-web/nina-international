export const APP_CONSTANTS = {
  APP_NAME: 'Nina International',
  VERSION: '1.0.0',
  ROLES: {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STAFF: 'staff',
    STUDENT: 'student',
  } as const,
  STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
  } as const,
  AUTH: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    EMAIL_OTP_EXPIRY_MINUTES: 10,
    PASSWORD_RESET_EXPIRY_MINUTES: 30,
    RECOVERY_CODE_COUNT: 8,
    MIN_PASSWORD_LENGTH: 10,
  },
  ARGON2: {
    VERSION: '19',
    ALGORITHM: 'argon2id',
    MEMORY_COST: 65536, // 64 MB
    TIME_COST: 3,
    PARALLELISM: 4,
    HASH_LENGTH: 32,
  },
  BACKUP: {
    DEFAULT_RETENTION_DAYS: 30,
    MAX_CONFIG_SNAPSHOTS: 50,
  },
};
