import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import { Users, UserPlus, School, CheckCircle, Search } from 'lucide-react';
import { StudentRecord, ClassRecord } from '../../types/shared.js';

interface StaffDashboardProps {
  currentTab: string;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentTab }) => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Student Registration Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [classId, setClassId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2012-05-10');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes] = await Promise.all([
        ApiClient.get<{ students: StudentRecord[] }>('/school/students'),
        ApiClient.get<{ classes: ClassRecord[] }>('/school/classes'),
      ]);
      setStudents(stuRes.students || []);
      const cls = clsRes.classes || [];
      setClasses(cls);
      if (cls.length > 0 && !classId) setClassId(cls[0].id);
    } catch (err: any) {
      console.error('Failed to load staff records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ApiClient.post('/school/students', {
        fullName,
        email,
        guardianName,
        guardianPhone,
        guardianEmail,
        classId,
        dateOfBirth,
      });

      alert(`Student enrolled successfully! Student Number: ${res.student.studentNumber}`);
      setFullName('');
      setEmail('');
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      fetchRecords();
    } catch (err: any) {
      alert('Registration error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Registrar & Student Affairs</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Authorized enrolment management, guardian profile maintenance, and class roster oversight.
        </p>
      </div>

      {/* Enrolment Form & Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">New Student Enrolment</h2>
          </div>

          <form onSubmit={handleRegisterStudent} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Student Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Kwame Osei"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Class Assignment</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Guardian Name</label>
              <input
                type="text"
                required
                placeholder="Guardian Full Name"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Guardian Phone Number</label>
              <input
                type="tel"
                required
                placeholder="+233 24 000 0000"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center space-x-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{submitting ? 'Enrolling...' : 'Register Student'}</span>
            </button>
          </form>
        </div>

        {/* Student Enrolment List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Current Student Roster</h2>
              <p className="text-xs text-slate-500">{students.length} students currently registered.</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search roster..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Student Number</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Guardian</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{st.studentNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{st.className || 'Class Enrolled'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{st.guardianName}</div>
                      <div className="text-[10px] text-slate-400">{st.guardianPhone}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        {st.enrolmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
