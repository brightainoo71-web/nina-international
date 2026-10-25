import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  GraduationCap,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  QrCode,
  Lock,
  User,
} from 'lucide-react';
import { StudentRecord, TimetableEntry, GradeRecord, AttendanceRecord } from '../../types/shared.js';

interface StudentDashboardProps {
  currentTab: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentTab }) => {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA Setup state
  const [totpData, setTotpData] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [totpEnrolling, setTotpEnrolling] = useState(false);
  const [totpSuccess, setTotpSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      ApiClient.get<{ students: StudentRecord[] }>('/school/students'),
      ApiClient.get<{ timetable: TimetableEntry[] }>('/school/timetables'),
    ])
      .then(async ([stuRes, ttRes]) => {
        const studentProfile =
          stuRes.students?.find((s) => s.userId === user.id || s.email === user.email) ||
          stuRes.students?.[0] ||
          null;

        setStudent(studentProfile);
        setTimetable(ttRes.timetable || []);

        if (studentProfile) {
          const [grdRes, attRes] = await Promise.all([
            ApiClient.get<{ grades: GradeRecord[] }>(`/school/grades/student/${studentProfile.id}`),
            ApiClient.get<{ attendance: AttendanceRecord[] }>(
              `/school/attendance?classId=${studentProfile.classId}`
            ),
          ]);
          setGrades(grdRes.grades || []);
          // Filter own attendance
          setAttendance(
            (attRes.attendance || []).filter((a) => a.studentId === studentProfile.id)
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleStartTotpEnrollment = async () => {
    setTotpEnrolling(true);
    try {
      const data = await ApiClient.post<any>('/auth/2fa/setup');
      setTotpData(data);
    } catch (err: any) {
      alert('Failed to start 2FA enrollment: ' + err.message);
      setTotpEnrolling(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/auth/2fa/confirm', { code: verifyCode });
      setTotpSuccess(true);
      setTotpData(null);
      alert('Two-factor authenticator activated successfully!');
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
        Loading student record...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-teal-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
              Student ID: {student?.studentNumber || 'NINA-2026-0001'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{student?.fullName || user?.fullName}</h1>
            <p className="text-xs text-teal-200/80 mt-1">
              Class: <strong className="text-white">{student?.className || 'JHS 1 Gold'}</strong> • Status: <span className="capitalize">{student?.enrolmentStatus || 'Enrolled'}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase">Guardian</span>
              <span className="font-semibold text-slate-200">{student?.guardianName || 'Dr. Ernest Owusu'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: OVERVIEW & GRADES */}
      {currentTab === 'student-overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Recorded Assessments
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{grades.length}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Average Mark
              </span>
              <div className="text-2xl font-bold text-teal-600 mt-1">
                {grades.length > 0
                  ? `${Math.round(
                      grades.reduce((a, g) => a + (g.score / g.maxScore) * 100, 0) / grades.length
                    )}%`
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Attendance Recorded
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{attendance.length} days</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Security Factor
              </span>
              <div className="text-sm font-bold text-emerald-600 mt-2 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 inline" />
                {user?.totpEnabled ? 'TOTP Enabled' : 'Email 2FA Active'}
              </div>
            </div>
          </div>

          {/* Academic Report Card Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Term Academic Assessment Report</h2>
              </div>
              <span className="text-xs text-slate-500">Academic Year 2026/2027</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Assessment Title</th>
                    <th className="py-2.5 px-3">Score Achieved</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Instructor Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g) => {
                    const percentage = Math.round((g.score / g.maxScore) * 100);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{g.subjectName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{g.assessmentTitle}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {g.score} / {g.maxScore}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono font-semibold text-[11px] ${
                              percentage >= 80
                                ? 'bg-emerald-50 text-emerald-700'
                                : percentage >= 50
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 italic">
                          {g.feedback || 'Good performance.'}
                        </td>
                      </tr>
                    );
                  })}
                  {grades.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No graded assessments posted yet for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TIMETABLE */}
      {currentTab === 'student-timetable' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Weekly Class Schedule</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timetable.map((t) => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-700 uppercase tracking-wide">
                    {t.dayOfWeek}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {t.startTime} - {t.endTime}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.subjectName}</h3>
                <p className="text-xs text-slate-500 mt-1">Instructor: {t.teacherName}</p>
                <div className="mt-3 text-[11px] font-mono text-slate-400">Room: {t.roomNumber}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: 2FA & SECURITY SETTINGS */}
      {currentTab === 'student-security' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Two-Factor Authentication Setup</h2>
          </div>

          <p className="text-xs text-slate-600">
            Protect your student account by enrolling Google Authenticator or any RFC 6238-compliant TOTP authenticator application.
          </p>

          {!totpData ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {user?.totpEnabled ? 'TOTP Authenticator Active' : 'Enroll Authenticator App'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate a high-entropy secret key and scan the QR code.
                </p>
              </div>

              <button
                onClick={handleStartTotpEnrollment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <QrCode className="w-4 h-4" />
                <span>{user?.totpEnabled ? 'Re-enroll Authenticator' : 'Setup Authenticator App'}</span>
              </button>
            </div>
          ) : (
            <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-teal-400">
                Scan QR Code with Google Authenticator
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="p-2 bg-white rounded-xl shadow-lg">
                  <img
                    src={totpData.qrCodeDataUrl}
                    alt="TOTP Setup QR Code"
                    className="w-40 h-40"
                  />
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <span className="text-slate-400 text-[10px] block uppercase">Manual Secret Key:</span>
                  <div className="p-2 bg-slate-800 rounded border border-slate-700 text-amber-300 break-all">
                    {totpData.manualEntryKey}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-sans">
                    Issuer: Nina International • Algorithm: SHA1 • Period: 30s
                  </span>
                </div>
              </div>

              {/* Confirm Code Input */}
              <form onSubmit={handleConfirmTotp} className="pt-4 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Enter 6-digit code from your app to activate:
                </label>
                <div className="flex items-center space-x-2 max-w-xs">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md whitespace-nowrap"
                  >
                    Activate
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
