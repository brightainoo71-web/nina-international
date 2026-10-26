import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  Users,
  GraduationCap,
  School,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Lock,
  Database,
  ArrowRight,
} from 'lucide-react';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.get('/school/dashboard')
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800/40">
        <div className="relative z-10 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
            System Operational • Nina International
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Secure Administration & Operations Portal
          </h1>
          <p className="text-xs sm:text-sm text-blue-200/80 mt-2">
            Integrated identity access management, live Argon2id password security audit, configuration restore checkpoints, and AWS disaster recovery backups.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('credential-audit')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/30 flex items-center space-x-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Inspect Credential Hashes</span>
            </button>

            <button
              onClick={() => onNavigate('security-centre')}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>View Audit Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Data-Driven Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Registered Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : metrics?.totalUsers ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active in system: <span className="font-semibold text-emerald-600">{metrics?.activeUsers ?? 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Administrators & Faculty
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : (metrics?.totalAdmins ?? 0) + (metrics?.totalTeachers ?? 0) + (metrics?.totalStaff ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Admins: <span className="font-semibold text-blue-600">{metrics?.totalAdmins ?? 0}</span> • Faculty: <span className="font-semibold text-slate-700">{(metrics?.totalTeachers ?? 0) + (metrics?.totalStaff ?? 0)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : `${metrics?.attendanceRate ?? 100}%`}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Live attendance tracking
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Class Grade Average
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : `${metrics?.averageScore ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across recorded assessments
          </div>
        </div>
      </div>

      {/* Security Principles Quick Guide for Academic Evaluators */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">
            Security Principles Implemented in Nina International
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <h3 className="font-bold text-amber-400 text-xs mb-1">
              1. Password Salt & Server Pepper
            </h3>
            <p className="text-slate-300">
              Argon2id (64MB memory, 3 iterations, 4 threads) combined with a cryptographically unique 128-bit salt per account, plus a server-side HMAC-SHA256 pepper managed separately from the database records.
            </p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <h3 className="font-bold text-teal-400 text-xs mb-1">
              2. Two-Factor Authentication (2FA)
            </h3>
            <p className="text-slate-300">
              RFC 6238 TOTP (Google Authenticator compatible) with secrets encrypted at rest using AES-256-GCM, alongside short-lived, single-use, brute-force-protected Email OTP.
            </p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <h3 className="font-bold text-blue-400 text-xs mb-1">
              3. Data Integrity & Disaster Recovery
            </h3>
            <p className="text-slate-300">
              Configuration snapshots with SHA-256 checksums, automated AES-256-GCM encrypted backup exports to AWS S3, and strict separation between config restoration and student records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
