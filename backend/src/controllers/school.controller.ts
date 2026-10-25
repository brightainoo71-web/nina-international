import { Response } from 'express';
import { SchoolService } from '../services/school.service.js';
import { DatabaseService } from '../services/database.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { StudentRecord } from '../types/shared.js';

export class SchoolController {
  public static async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    const metrics = await SchoolService.getDashboardMetrics(req.userProfile!.role, req.userProfile!.id);
    return res.json(metrics);
  }

  public static async listStudents(req: AuthenticatedRequest, res: Response) {
    const { classId, search } = req.query;
    const students = await SchoolService.listStudents({
      classId: classId as string,
      search: search as string,
    });
    return res.json({ students });
  }

  public static async getStudent(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const student = await SchoolService.getStudentById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    return res.json({ student });
  }

  public static async createStudent(req: AuthenticatedRequest, res: Response) {
    const { fullName, email, guardianName, guardianPhone, guardianEmail, classId, dateOfBirth } = req.body;
    if (!fullName || !guardianPhone || !classId) {
      return res.status(400).json({ error: 'Full name, guardian phone, and class are required.' });
    }

    const id = `stu_${Date.now()}`;
    const studentNumber = `NINA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newStudent: StudentRecord = {
      id,
      userId: id,
      studentNumber,
      fullName: fullName.trim(),
      email: email || `${studentNumber.toLowerCase()}@students.ninainternational.edu`,
      guardianName: guardianName || 'Guardian',
      guardianPhone,
      guardianEmail: guardianEmail || 'guardian@example.com',
      enrolmentStatus: 'enrolled',
      classId,
      dateOfBirth: dateOfBirth || '2012-01-01',
      createdAt: now,
      updatedAt: now,
    };

    await DatabaseService.setDocument('students', id, newStudent);
    return res.status(201).json({ student: newStudent });
  }

  public static async listTeachers(req: AuthenticatedRequest, res: Response) {
    const teachers = await SchoolService.listTeachers();
    return res.json({ teachers });
  }

  public static async listStaff(req: AuthenticatedRequest, res: Response) {
    const staff = await SchoolService.listStaff();
    return res.json({ staff });
  }

  public static async listClasses(req: AuthenticatedRequest, res: Response) {
    const classes = await SchoolService.listClasses();
    return res.json({ classes });
  }

  public static async listSubjects(req: AuthenticatedRequest, res: Response) {
    const subjects = await SchoolService.listSubjects();
    return res.json({ subjects });
  }

  public static async listAcademicYears(req: AuthenticatedRequest, res: Response) {
    const years = await SchoolService.listAcademicYears();
    return res.json({ academicYears: years });
  }

  public static async listTimetable(req: AuthenticatedRequest, res: Response) {
    const { classId } = req.query;
    const timetable = await SchoolService.listTimetable(classId as string);
    return res.json({ timetable });
  }

  public static async getAttendance(req: AuthenticatedRequest, res: Response) {
    const { classId, date } = req.query;
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }
    const attendance = await SchoolService.getAttendance(classId as string, date as string);
    return res.json({ attendance });
  }

  public static async recordAttendance(req: AuthenticatedRequest, res: Response) {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }
    const saved = await SchoolService.recordAttendance(records, req.userProfile!.id);
    return res.json({ message: 'Attendance recorded successfully', records: saved });
  }

  public static async listAssessments(req: AuthenticatedRequest, res: Response) {
    const { classId, subjectId } = req.query;
    const assessments = await SchoolService.listAssessments(classId as string, subjectId as string);
    return res.json({ assessments });
  }

  public static async createAssessment(req: AuthenticatedRequest, res: Response) {
    const assessment = await SchoolService.createAssessment(req.body, req.userProfile!.id);
    return res.status(201).json({ assessment });
  }

  public static async getStudentGrades(req: AuthenticatedRequest, res: Response) {
    const { studentId } = req.params;
    const grades = await SchoolService.getStudentGrades(studentId);
    return res.json({ grades });
  }

  public static async updateGrade(req: AuthenticatedRequest, res: Response) {
    const { gradeId, studentId, studentName, assessmentId, assessmentTitle, subjectId, subjectName, score, maxScore, feedback, reason } = req.body;
    if (!studentId || !assessmentId || score === undefined) {
      return res.status(400).json({ error: 'studentId, assessmentId, and score are required.' });
    }

    const updated = await SchoolService.updateGrade({
      gradeId,
      studentId,
      studentName,
      assessmentId,
      assessmentTitle,
      subjectId,
      subjectName,
      score: Number(score),
      maxScore: Number(maxScore || 100),
      feedback,
      actorId: req.userProfile!.id,
      actorName: req.userProfile!.fullName,
      reason: reason || 'Grading entry / routine assessment update',
    });

    return res.json({ grade: updated });
  }

  public static async getGradeAuditHistory(req: AuthenticatedRequest, res: Response) {
    const { gradeId, studentId } = req.query;
    const history = await SchoolService.getGradeAuditHistory(gradeId as string, studentId as string);
    return res.json({ history });
  }
}
