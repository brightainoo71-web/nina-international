import crypto from 'crypto';
import { DatabaseService } from './database.service.js';
import { AuditService } from './audit.service.js';
import {
  StudentRecord,
  TeacherRecord,
  StaffRecord,
  ClassRecord,
  SubjectRecord,
  AcademicYearRecord,
  TimetableEntry,
  AttendanceRecord,
  AssessmentRecord,
  GradeRecord,
  GradeAuditLog,
  UserProfile,
} from '../types/shared.js';

export class SchoolService {
  // ==========================================
  // DASHBOARD ANALYTICS (100% Data-Driven)
  // ==========================================
  public static async getDashboardMetrics(userRole: string, userId: string) {
    const userProfiles = await DatabaseService.getCollection<UserProfile>('userProfiles');
    const students = await DatabaseService.getCollection<StudentRecord>('students');
    const teachers = await DatabaseService.getCollection<TeacherRecord>('teachers');
    const staff = await DatabaseService.getCollection<StaffRecord>('staff');
    const classes = await DatabaseService.getCollection<ClassRecord>('classes');
    const attendance = await DatabaseService.getCollection<AttendanceRecord>('attendance');
    const grades = await DatabaseService.getCollection<GradeRecord>('grades');

    const totalUsers = userProfiles.length;
    const activeUsers = userProfiles.filter(u => u.status === 'active').length;
    const totalAdmins = userProfiles.filter(u => u.role === 'admin' && u.status !== 'deleted').length;
    const totalTeachers = Math.max(teachers.length, userProfiles.filter(u => u.role === 'teacher' && u.status !== 'deleted').length);
    const totalStaff = Math.max(staff.length, userProfiles.filter(u => u.role === 'staff' && u.status !== 'deleted').length);
    const totalStudents = Math.max(students.length, userProfiles.filter(u => u.role === 'student' && u.status !== 'deleted').length);
    const activeStudents = totalStudents;
    const totalClasses = classes.length;

    // Calculate attendance rate
    const recentAttendance = attendance.slice(-100);
    const presentCount = recentAttendance.filter(a => a.status === 'present').length;
    const attendanceRate =
      recentAttendance.length > 0
        ? Math.round((presentCount / recentAttendance.length) * 100)
        : 100;

    // Calculate grade average
    const totalScores = grades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
    const averageScore = grades.length > 0 ? Math.round(totalScores / grades.length) : 0;

    return {
      totalUsers,
      activeUsers,
      totalAdmins,
      totalStudents,
      activeStudents,
      totalTeachers,
      totalStaff,
      totalClasses,
      attendanceRate,
      averageScore,
      totalAssessmentsRecorded: grades.length,
    };
  }

  // ==========================================
  // STUDENTS
  // ==========================================
  public static async listStudents(filters?: { classId?: string; search?: string }) {
    let students = await DatabaseService.getCollection<StudentRecord>('students');
    if (filters?.classId) {
      students = students.filter(s => s.classId === filters.classId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      students = students.filter(
        s =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    return students;
  }

  public static async getStudentById(studentId: string): Promise<StudentRecord | null> {
    return await DatabaseService.getDocument<StudentRecord>('students', studentId);
  }

  public static async getStudentByUserId(userId: string): Promise<StudentRecord | null> {
    const students = await DatabaseService.getCollection<StudentRecord>('students', {
      where: [{ field: 'userId', op: '==', value: userId }],
    });
    return students[0] || null;
  }

  // ==========================================
  // TEACHERS & STAFF
  // ==========================================
  public static async listTeachers() {
    return await DatabaseService.getCollection<TeacherRecord>('teachers');
  }

  public static async getTeacherByUserId(userId: string): Promise<TeacherRecord | null> {
    const teachers = await DatabaseService.getCollection<TeacherRecord>('teachers', {
      where: [{ field: 'userId', op: '==', value: userId }],
    });
    return teachers[0] || null;
  }

  public static async listStaff() {
    return await DatabaseService.getCollection<StaffRecord>('staff');
  }

  // ==========================================
  // CLASSES & SUBJECTS
  // ==========================================
  public static async listClasses() {
    return await DatabaseService.getCollection<ClassRecord>('classes');
  }

  public static async listSubjects() {
    return await DatabaseService.getCollection<SubjectRecord>('subjects');
  }

  public static async listAcademicYears() {
    return await DatabaseService.getCollection<AcademicYearRecord>('academicYears');
  }

  public static async listTimetable(classId?: string) {
    if (classId) {
      return await DatabaseService.getCollection<TimetableEntry>('timetables', {
        where: [{ field: 'classId', op: '==', value: classId }],
      });
    }
    return await DatabaseService.getCollection<TimetableEntry>('timetables');
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================
  public static async getAttendance(classId: string, date?: string) {
    const options: any = { where: [{ field: 'classId', op: '==', value: classId }] };
    if (date) {
      options.where.push({ field: 'date', op: '==', value: date });
    }
    return await DatabaseService.getCollection<AttendanceRecord>('attendance', options);
  }

  public static async recordAttendance(
    records: { studentId: string; classId: string; date: string; status: AttendanceRecord['status']; notes?: string }[],
    actorId: string
  ) {
    const savedRecords: AttendanceRecord[] = [];
    for (const r of records) {
      const id = `att_${r.studentId}_${r.date}`;
      const record: AttendanceRecord = {
        id,
        studentId: r.studentId,
        classId: r.classId,
        date: r.date,
        status: r.status,
        markedBy: actorId,
        notes: r.notes,
        recordedAt: new Date().toISOString(),
      };
      await DatabaseService.setDocument('attendance', id, record);
      savedRecords.push(record);
    }
    return savedRecords;
  }

  // ==========================================
  // ASSESSMENTS & GRADES (With Immutable Audit Trail)
  // ==========================================
  public static async listAssessments(classId?: string, subjectId?: string) {
    let list = await DatabaseService.getCollection<AssessmentRecord>('assessments');
    if (classId) list = list.filter(a => a.classId === classId);
    if (subjectId) list = list.filter(a => a.subjectId === subjectId);
    return list;
  }

  public static async createAssessment(data: Omit<AssessmentRecord, 'id'>, actorId: string) {
    const id = `asm_${Date.now()}`;
    const record: AssessmentRecord = { ...data, id, createdBy: actorId };
    await DatabaseService.setDocument('assessments', id, record);
    return record;
  }

  public static async getStudentGrades(studentId: string) {
    return await DatabaseService.getCollection<GradeRecord>('grades', {
      where: [{ field: 'studentId', op: '==', value: studentId }],
    });
  }

  public static async getClassGrades(assessmentId: string) {
    return await DatabaseService.getCollection<GradeRecord>('grades', {
      where: [{ field: 'assessmentId', op: '==', value: assessmentId }],
    });
  }

  /**
   * Records or updates a student grade with a mandatory audit log entry
   */
  public static async updateGrade(params: {
    gradeId?: string;
    studentId: string;
    studentName?: string;
    assessmentId: string;
    assessmentTitle?: string;
    subjectId: string;
    subjectName?: string;
    score: number;
    maxScore: number;
    feedback?: string;
    actorId: string;
    actorName: string;
    reason: string;
  }): Promise<GradeRecord> {
    let id = params.gradeId;
    let existing: GradeRecord | null = null;

    if (id) {
      existing = await DatabaseService.getDocument<GradeRecord>('grades', id);
    } else {
      const allGrades = await DatabaseService.getCollection<GradeRecord>('grades');
      existing = allGrades.find(g => g.studentId === params.studentId && g.assessmentId === params.assessmentId) || null;
      id = existing ? existing.id : `grd_${params.studentId}_${params.assessmentId}`;
    }
    const now = new Date().toISOString();

    const oldScore = existing ? existing.score : 0;
    const record: GradeRecord = {
      id,
      studentId: params.studentId,
      studentName: params.studentName || existing?.studentName,
      assessmentId: params.assessmentId,
      assessmentTitle: params.assessmentTitle || existing?.assessmentTitle,
      subjectId: params.subjectId,
      subjectName: params.subjectName || existing?.subjectName,
      score: params.score,
      maxScore: params.maxScore,
      feedback: params.feedback,
      gradedBy: params.actorId,
      gradedByName: params.actorName,
      gradedAt: existing ? existing.gradedAt : now,
      updatedAt: now,
    };

    await DatabaseService.setDocument('grades', id, record);

    // If updating an existing grade, create immutable GradeAuditLog
    if (existing && existing.score !== params.score) {
      const auditLogId = `grd_audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const gradeAudit: GradeAuditLog = {
        id: auditLogId,
        gradeId: id,
        studentId: params.studentId,
        subjectId: params.subjectId,
        oldScore,
        newScore: params.score,
        modifiedBy: params.actorId,
        modifiedByName: params.actorName,
        reason: params.reason || 'Routine correction/re-assessment',
        timestamp: now,
      };
      await DatabaseService.setDocument('gradeAuditLogs', auditLogId, gradeAudit);

      await AuditService.logEvent({
        actorId: params.actorId,
        actorRole: 'teacher',
        action: 'GRADE_MODIFIED',
        resource: `grades/${id}`,
        outcome: 'success',
        details: {
          studentId: params.studentId,
          oldScore,
          newScore: params.score,
          reason: params.reason,
        },
      });
    }

    return record;
  }

  public static async getGradeAuditHistory(gradeId?: string, studentId?: string) {
    let logs = await DatabaseService.getCollection<GradeAuditLog>('gradeAuditLogs');
    if (gradeId) logs = logs.filter(l => l.gradeId === gradeId);
    if (studentId) logs = logs.filter(l => l.studentId === studentId);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }
}
