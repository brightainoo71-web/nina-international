# Nina International: Firestore Database Schema & Data Dictionary

## 1. Overview

The Nina International database is structured into distinct, non-overlapping collections adhering to least-privilege principles. Sensitive credential records are completely isolated from public user profiles.

---

## 2. Collection Schemas

### `userProfiles`
Stores public identity and account metadata.
```typescript
interface UserProfile {
  id: string;                      // Unique user ID (e.g. usr_admin_001)
  email: string;                   // Normalized unique email address
  username: string;                // Normalized unique username
  fullName: string;                // Full legal name
  role: 'admin' | 'teacher' | 'staff' | 'student';
  status: 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  totpEnabled: boolean;
  twoFactorMethod: 'totp' | 'email' | 'none';
  createdAt: string;               // ISO 8601 timestamp
  updatedAt: string;
  deletedAt?: string | null;       // Soft deletion timestamp
  deletedBy?: string | null;       // Admin user ID who performed soft delete
  restoredAt?: string | null;      // Account restoration timestamp
  restoredBy?: string | null;
  lastLoginAt?: string | null;
}
```

---

### `privateCredentials`
Stores cryptographic hashes, salts, and encrypted authenticator seeds. **Strictly inaccessible to ordinary frontend queries; only readable/writable by backend services.**
```typescript
interface PrivateCredentialRecord {
  id: string;                      // Matches userProfiles.id
  userId: string;
  algorithm: 'argon2id';
  libraryVersion: string;          // e.g. @node-rs/argon2 v2.0.2
  hashParams: {
    memoryCost: number;            // 65536 KiB (64 MB)
    timeCost: number;              // 3 iterations
    parallelism: number;           // 4 threads
    hashLength: number;            // 32 bytes
  };
  salt: string;                    // Hex string of 16-byte random salt
  storedHash: string;              // Encoded Argon2id hash string
  pepperConfigured: boolean;
  pepperVersion: string;           // Key identifier (e.g. nina-pepper-v1)
  totpSecretEncrypted?: string;    // iv:authTag:ciphertext (AES-256-GCM)
  recoveryCodesHashed?: string[];  // Array of SHA-256 hashed recovery codes
  failedLoginAttempts: number;
  lockoutUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string | null;
  requiresRehash: boolean;
}
```

---

### `students`
Student academic records, contact info, and guardian assignments.
```typescript
interface StudentRecord {
  id: string;                      // Matches userId
  userId: string;
  studentNumber: string;           // Official school ID (e.g. NINA-2026-0001)
  fullName: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  enrolmentStatus: 'enrolled' | 'graduated' | 'withdrawn' | 'suspended';
  classId: string;                 // References classes.id
  className?: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### `teachers` & `staff`
Faculty and administrative staff profiles.
```typescript
interface TeacherRecord {
  id: string;                      // Matches userId
  userId: string;
  fullName: string;
  email: string;
  employeeNumber: string;          // e.g. TEA-2026-042
  specialization: string;
  assignedClassIds: string[];
  assignedSubjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface StaffRecord {
  id: string;                      // Matches userId
  userId: string;
  fullName: string;
  email: string;
  employeeNumber: string;          // e.g. STF-2026-015
  department: string;
  position: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### `classes`, `subjects`, `academicYears`, `timetables`
Core academic structures.
- `classes`: `id`, `name`, `gradeLevel`, `academicYearId`, `classTeacherId`, `capacity`, `roomNumber`.
- `subjects`: `id`, `code`, `name`, `department`, `description`.
- `academicYears`: `id`, `name`, `startDate`, `endDate`, `isCurrent`, `terms`.
- `timetables`: `id`, `classId`, `subjectId`, `teacherId`, `dayOfWeek`, `startTime`, `endTime`, `roomNumber`.

---

### `attendance`
Daily attendance records per student.
```typescript
interface AttendanceRecord {
  id: string;                      // att_{studentId}_{date}
  studentId: string;
  classId: string;
  date: string;                    // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;                // Teacher / Admin user ID
  notes?: string;
  recordedAt: string;
}
```

---

### `assessments`, `grades`, `gradeAuditLogs`
Student grading with mandatory change history.
```typescript
interface AssessmentRecord {
  id: string;                      // asm_{timestamp}
  title: string;
  subjectId: string;
  classId: string;
  termId: string;
  maxScore: number;
  weightPercentage: number;
  dueDate: string;
  createdBy: string;
}

interface GradeRecord {
  id: string;                      // grd_{studentId}_{assessmentId}
  studentId: string;
  assessmentId: string;
  subjectId: string;
  score: number;
  maxScore: number;
  feedback?: string;
  gradedBy: string;
  gradedByName: string;
  gradedAt: string;
  updatedAt: string;
}

interface GradeAuditLog {
  id: string;                      // grd_audit_{timestamp}_{random}
  gradeId: string;
  studentId: string;
  subjectId: string;
  oldScore: number;
  newScore: number;
  modifiedBy: string;
  modifiedByName: string;
  reason: string;                  // Mandatory explanation for change
  timestamp: string;
}
```

---

### `auditLogs`
Append-only tamper-evident security activity logs.
```typescript
interface AuditLogEntry {
  id: string;                      // audit_{timestamp}_{random}
  timestamp: string;
  actorId: string;
  actorRole: 'admin' | 'teacher' | 'staff' | 'student' | 'anonymous' | 'system';
  actorEmail?: string;
  action: string;                  // e.g. LOGIN_SUCCESS, GRADE_MODIFIED, BACKUP_COMPLETED
  resource: string;                // e.g. userProfiles/usr_001
  outcome: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;   // Redacted of any credential data
  ipAddress?: string;
  userAgent?: string;
  integrityHash: string;           // SHA-256 chaining hash
  prevHash: string;
}
```

---

### `configurationSnapshots`
Tamper-evident restore points capturing system configuration without modifying student records.
```typescript
interface ConfigurationSnapshot {
  id: string;                      // cfg_snap_{timestamp}
  version: string;                 // e.g. v102026
  description: string;
  createdAt: string;
  createdBy: string;
  settings: {
    schoolName: string;
    academicYear: string;
    allowRegistration: boolean;
    requireTwoFactor: boolean;
    sessionTimeoutMinutes: number;
    passwordPolicy: {
      minLength: number;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
  integrityHash: string;           // SHA-256 checksum of version and settings
  restorationCount: number;
  lastRestoredAt?: string | null;
}
```

---

### `backupJobs`
Metadata for scheduled and manual disaster recovery exports.
```typescript
interface BackupJobRecord {
  id: string;                      // backup_{timestamp}
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  type: 'automatic' | 'manual';
  destination: 's3' | 'local_staging';
  s3Bucket?: string;
  s3Key?: string;
  sizeBytes?: number;
  collectionsIncluded: string[];
  checksumSha256?: string;         // SHA-256 payload checksum
  initiatedBy: string;
  retentionExpiry: string;
  verified: boolean;
  verifiedAt?: string | null;
}
```
