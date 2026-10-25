import { Router } from 'express';
import { SchoolController } from '../controllers/school.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, requireStudentSelfOrStaff } from '../middleware/rbac.middleware.js';

const router = Router();

// Dashboard analytics
router.get('/dashboard', authenticate, SchoolController.getDashboardMetrics);

// Students
router.get('/students', authenticate, requireRole(['admin', 'teacher', 'staff']), SchoolController.listStudents);
router.get('/students/:id', authenticate, SchoolController.getStudent);
router.post('/students', authenticate, requireRole(['admin', 'staff']), SchoolController.createStudent);

// Teachers & Staff
router.get('/teachers', authenticate, SchoolController.listTeachers);
router.get('/staff', authenticate, requireRole(['admin', 'staff']), SchoolController.listStaff);

// Classes & Subjects
router.get('/classes', authenticate, SchoolController.listClasses);
router.get('/subjects', authenticate, SchoolController.listSubjects);
router.get('/academic-years', authenticate, SchoolController.listAcademicYears);
router.get('/timetables', authenticate, SchoolController.listTimetable);

// Attendance
router.get('/attendance', authenticate, SchoolController.getAttendance);
router.post('/attendance', authenticate, requireRole(['admin', 'teacher']), SchoolController.recordAttendance);

// Assessments & Grades
router.get('/assessments', authenticate, SchoolController.listAssessments);
router.post('/assessments', authenticate, requireRole(['admin', 'teacher']), SchoolController.createAssessment);
router.get('/grades/student/:studentId', authenticate, requireStudentSelfOrStaff, SchoolController.getStudentGrades);
router.post('/grades', authenticate, requireRole(['admin', 'teacher']), SchoolController.updateGrade);
router.get('/grades/audit-history', authenticate, requireRole(['admin', 'teacher']), SchoolController.getGradeAuditHistory);

export default router;
