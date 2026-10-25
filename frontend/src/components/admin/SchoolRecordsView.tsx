import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import { School, BookOpen, Users, GraduationCap, Calendar } from 'lucide-react';
import { ClassRecord, SubjectRecord, StudentRecord, TeacherRecord } from '../../types/shared.js';

export const SchoolRecordsView: React.FC = () => {
  const [tab, setTab] = useState<'classes' | 'subjects' | 'teachers' | 'students'>('classes');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get<{ classes: ClassRecord[] }>('/school/classes'),
      ApiClient.get<{ subjects: SubjectRecord[] }>('/school/subjects'),
      ApiClient.get<{ teachers: TeacherRecord[] }>('/school/teachers'),
      ApiClient.get<{ students: StudentRecord[] }>('/school/students'),
    ])
      .then(([cls, sub, tea, stu]) => {
        setClasses(cls.classes || []);
        setSubjects(sub.subjects || []);
        setTeachers(tea.teachers || []);
        setStudents(stu.students || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <School className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">School Academic Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Classes, departments, subjects, faculty roster, and registered student body.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['classes', 'subjects', 'teachers', 'students'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Tab */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                  {c.gradeLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Class Teacher: <strong className="text-slate-700">{c.classTeacherName || 'Assigned Faculty'}</strong>
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Room: {c.roomNumber}</span>
                <span>Capacity: {c.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subjects Tab */}
      {tab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {s.code}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{s.description}</p>
              <div className="mt-3 text-[11px] text-blue-600 font-semibold uppercase tracking-wider">
                Dept: {s.department}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teachers Tab */}
      {tab === 'teachers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Specialization</th>
                <th className="py-3 px-4">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 px-4 font-bold text-slate-900">{t.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{t.employeeNumber}</td>
                  <td className="py-3 px-4 text-slate-700">{t.specialization}</td>
                  <td className="py-3 px-4 text-slate-500">{t.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4">Enrolment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st) => (
                <tr key={st.id}>
                  <td className="py-3 px-4 font-bold text-slate-900">{st.fullName}</td>
                  <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{st.studentNumber}</td>
                  <td className="py-3 px-4 text-slate-700">{st.className || 'Assigned Class'}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <div>{st.guardianName}</div>
                    <div className="text-[11px] text-slate-400">{st.guardianPhone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                      {st.enrolmentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
