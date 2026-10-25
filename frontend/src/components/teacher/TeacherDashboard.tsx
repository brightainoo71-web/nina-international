import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  School,
  CheckCircle,
  FileText,
  History,
  Edit,
  Save,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { ClassRecord, StudentRecord, AssessmentRecord, GradeRecord, GradeAuditLog } from '../../types/shared.js';

interface TeacherDashboardProps {
  currentTab: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab }) => {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [gradeAuditLogs, setGradeAuditLogs] = useState<GradeAuditLog[]>([]);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Grade Edit Modal state
  const [editingGrade, setEditingGrade] = useState<{
    student: StudentRecord;
    assessment: AssessmentRecord;
    currentScore?: number;
    gradeId?: string;
  } | null>(null);
  const [newScore, setNewScore] = useState<number>(0);
  const [gradeReason, setGradeReason] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    ApiClient.get<{ classes: ClassRecord[] }>('/school/classes').then((res) => {
      const cls = res.classes || [];
      setClasses(cls);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
    });

    ApiClient.get<{ assessments: AssessmentRecord[] }>('/school/assessments').then((res) => {
      setAssessments(res.assessments || []);
    });

    ApiClient.get<{ history: GradeAuditLog[] }>('/school/grades/audit-history').then((res) => {
      setGradeAuditLogs(res.history || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    ApiClient.get<{ students: StudentRecord[] }>(`/school/students?classId=${selectedClassId}`).then((res) => {
      const stu = res.students || [];
      setStudents(stu);
      // Init default attendance marks to 'present'
      const marks: Record<string, any> = {};
      stu.forEach((s) => {
        marks[s.id] = 'present';
      });
      setAttendanceMarks(marks);
    });
  }, [selectedClassId]);

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    const records = Object.entries(attendanceMarks).map(([studentId, status]) => ({
      studentId,
      classId: selectedClassId,
      date: attendanceDate,
      status,
    }));

    try {
      await ApiClient.post('/school/attendance', { records });
      alert('Attendance records successfully committed!');
    } catch (err: any) {
      alert('Attendance submission failed: ' + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!editingGrade) return;
    setSavingGrade(true);
    try {
      await ApiClient.post('/school/grades', {
        gradeId: editingGrade.gradeId,
        studentId: editingGrade.student.id,
        studentName: editingGrade.student.fullName,
        assessmentId: editingGrade.assessment.id,
        assessmentTitle: editingGrade.assessment.title,
        subjectId: editingGrade.assessment.subjectId,
        subjectName: editingGrade.assessment.subjectName,
        score: newScore,
        maxScore: editingGrade.assessment.maxScore,
        feedback: gradeFeedback,
        reason: gradeReason,
      });

      alert('Grade updated and audit trail logged!');
      setEditingGrade(null);

      // Refresh audit logs
      const historyRes = await ApiClient.get<{ history: GradeAuditLog[] }>('/school/grades/audit-history');
      setGradeAuditLogs(historyRes.history || []);
    } catch (err: any) {
      alert('Grade update failed: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <School className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Teacher Academic Portal</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Attendance recording, assessment grade entry, and controlled modification tracking.
          </p>
        </div>

        {/* Class Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-700">Class:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.gradeLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW: CLASS ATTENDANCE */}
      {currentTab === 'teacher-classes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Attendance Marker</h2>
              <p className="text-xs text-slate-500">Record and submit student attendance for today.</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAttendance ? 'Saving...' : 'Submit Attendance'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Student ID</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-600">{st.studentNumber}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{st.fullName}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center space-x-2">
                        {(['present', 'late', 'absent', 'excused'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setAttendanceMarks((prev) => ({ ...prev, [st.id]: status }))
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                              attendanceMarks[st.id] === status
                                ? status === 'present'
                                  ? 'bg-emerald-600 text-white'
                                  : status === 'late'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: ASSESSMENT & GRADES */}
      {currentTab === 'teacher-grades' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Student Grade Matrix</h2>
                <p className="text-xs text-slate-500">
                  Select a student to enter or update assessment scores. Every modification records an immutable audit log.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Assessment</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Max Score</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st) =>
                    assessments.map((asm) => (
                      <tr key={`${st.id}-${asm.id}`} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {st.fullName} ({st.studentNumber})
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">{asm.title}</td>
                        <td className="py-2.5 px-4 text-slate-500">{asm.subjectName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{asm.maxScore} pts</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingGrade({
                                student: st,
                                assessment: asm,
                                currentScore: 0,
                              });
                              setNewScore(85);
                              setGradeReason('');
                              setGradeFeedback('');
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 inline mr-1" />
                            Grade / Modify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grade Change Audit History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Immutable Grade Modification History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Instructor</th>
                    <th className="py-2 px-3">Old Score</th>
                    <th className="py-2 px-3">New Score</th>
                    <th className="py-2 px-3">Reason for Modification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{log.modifiedByName}</td>
                      <td className="py-2 px-3 font-mono text-rose-600 font-bold">{log.oldScore}</td>
                      <td className="py-2 px-3 font-mono text-emerald-600 font-bold">{log.newScore}</td>
                      <td className="py-2 px-3 text-slate-700">{log.reason}</td>
                    </tr>
                  ))}
                  {gradeAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No grade changes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GRADE EDIT MODAL */}
      {editingGrade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Record / Update Grade
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: <strong className="text-slate-800">{editingGrade.student.fullName}</strong> • Assessment: <strong className="text-slate-800">{editingGrade.assessment.title}</strong>
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Score (Out of {editingGrade.assessment.maxScore})
                </label>
                <input
                  type="number"
                  min={0}
                  max={editingGrade.assessment.maxScore}
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Mandatory Reason for Change (Security Requirement)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Completed rubric review / correction"
                  value={gradeReason}
                  onChange={(e) => setGradeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Instructor Feedback (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Feedback for student..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingGrade || !gradeReason}
                  onClick={handleSaveGrade}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md disabled:opacity-50"
                >
                  {savingGrade ? 'Committing...' : 'Commit Grade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
