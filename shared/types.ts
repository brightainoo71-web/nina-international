export type UserRole = 'admin' | 'teacher' | 'staff' | 'student';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  totpEnabled: boolean;
  twoFactorMethod: 'totp' | 'email' | 'none';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  lastLoginAt?: string | null;
}

export interface PrivateCredentialMetadata {
  userId: string;
  algorithm: string;
  libraryVersion: string;
  hashParams: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
    hashLength: number;
  };
  salt: string; // Hex representation (controlled for academic demonstration)
  storedHash: string; // Encoded Argon2id hash
  pepperConfigured: boolean;
  pepperVersion: string;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string | null;
  requiresRehash: boolean;
}

export interface StudentRecord {
  id: string;
  userId: string;
  studentNumber: string;
  fullName: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  enrolmentStatus: 'enrolled' | 'graduated' | 'withdrawn' | 'suspended';
  classId: string;
  className?: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  employeeNumber: string;
  specialization: string;
  assignedClassIds: string[];
  assignedSubjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  employeeNumber: string;
  department: string;
  position: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  gradeLevel: string;
  academicYearId: string;
  classTeacherId?: string;
  classTeacherName?: string;
  roomNumber?: string;
  capacity: number;
  enrolledCount?: number;
}

export interface SubjectRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
}

export interface AcademicYearRecord {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }[];
}

export interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  teacherName?: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string;
  endTime: string;
  roomNumber: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  notes?: string;
  recordedAt: string;
}

export interface AssessmentRecord {
  id: string;
  title: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  termId: string;
  maxScore: number;
  weightPercentage: number;
  dueDate: string;
  createdBy: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentNumber?: string;
  assessmentId: string;
  assessmentTitle?: string;
  subjectId: string;
  subjectName?: string;
  score: number;
  maxScore: number;
  feedback?: string;
  gradedBy: string;
  gradedByName?: string;
  gradedAt: string;
  updatedAt: string;
}

export interface GradeAuditLog {
  id: string;
  gradeId: string;
  studentId: string;
  subjectId: string;
  oldScore: number;
  newScore: number;
  modifiedBy: string;
  modifiedByName: string;
  reason: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'anonymous' | 'system';
  actorEmail?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfigurationSnapshot {
  id: string;
  version: string;
  description: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  categories: string[];
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
  integrityHash: string;
  restorationCount: number;
  lastRestoredAt?: string | null;
}

export interface BackupJobRecord {
  id: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  type: 'automatic' | 'manual';
  destination: 's3' | 'local_staging';
  s3Bucket?: string;
  s3Key?: string;
  sizeBytes?: number;
  collectionsIncluded: string[];
  checksumSha256?: string;
  initiatedBy: string;
  errorDetails?: string | null;
  retentionExpiry: string;
  verified: boolean;
  verifiedAt?: string | null;
}
