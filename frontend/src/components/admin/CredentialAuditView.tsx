import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  Lock,
  Key,
  ShieldAlert,
  Server,
  Play,
  CheckCircle,
  HelpCircle,
  Hash,
  Layers,
  Cpu,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const CredentialAuditView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditList, setAuditList] = useState<any[]>([]);
  const [systemPepper, setSystemPepper] = useState<any>(null);

  // Synthetic Lab state
  const [syntheticInput, setSyntheticInput] = useState('NinaAcademicDemonstration2026!');
  const [labRunning, setLabRunning] = useState(false);
  const [labResult, setLabResult] = useState<any>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.get<any>('/credential-audit');
      setAuditList(data.auditList || []);
      setSystemPepper(data.systemPepperStatus || {});
    } catch (err: any) {
      setError(err.message || 'Failed to fetch credential audit records');
    } finally {
      setLoading(false);
    }
  };

  const runSyntheticLab = async () => {
    setLabRunning(true);
    try {
      const data = await ApiClient.post<any>('/credential-audit/synthetic-lab', {
        syntheticInput,
      });
      setLabResult(data);
    } catch (err: any) {
      alert('Lab execution failed: ' + err.message);
    } finally {
      setLabRunning(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
    runSyntheticLab();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl border border-blue-900/50 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Academic Cryptographic Audit
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Argon2id v19 + HMAC-SHA256 Pepper
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-2">
              Credential Security Audit Dashboard
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Demonstrates real-time salt isolation, Argon2id parameter enforcement, and keyed server-side pepper mechanics. This interface allows security auditing without ever disclosing raw user passwords or secret pepper contents.
            </p>
          </div>

          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Records</span>
          </button>
        </div>
      </div>

      {/* Conceptual Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Key className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Unique Salt (128-bit)
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Generated with <code className="text-blue-600">crypto.randomBytes(16)</code>. Defeats precomputed Rainbow Tables and ensures two identical passwords result in distinct hashes.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <Server className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Server-Side Pepper
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Applied via HMAC-SHA256 before hashing. Kept exclusively in AWS Secrets Manager / server environment, isolated from the database record.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Argon2id Memory Cost
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Configured to 64 MB (65,536 KiB) with 3 iterations and 4 threads. Enforces memory hardness to resist parallelized GPU/ASIC attacks.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Offline Attack Defense
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Even if an attacker exfiltrates the entire database with all salts and hashes, they cannot test candidates without the separate server-side pepper key.
          </p>
        </div>
      </div>

      {/* ========================================================== */}
      {/* INTERACTIVE EDUCATIONAL SYNTHETIC LAB */}
      {/* ========================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Controlled Academic Demonstration: Live Transformation Pipeline
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Isolated Synthetic Execution
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Synthetic Input Password (Test String)
              </label>
              <input
                type="text"
                value={syntheticInput}
                onChange={(e) => setSyntheticInput(e.target.value)}
                placeholder="Enter sample text..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                * Safely executed on the backend to demonstrate the live cryptographic transformation.
              </span>
            </div>

            <button
              onClick={runSyntheticLab}
              disabled={labRunning}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{labRunning ? 'Computing Transformation...' : 'Run Transformation Pipeline'}</span>
            </button>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] space-y-1.5 text-slate-300">
              <span className="font-bold text-blue-400 block mb-1">Academic Principles Explained:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Salt is public metadata stored in the credential record.</li>
                <li>Pepper is confidential server state never stored in the database.</li>
                <li>Pre-hash ensures input is normalized to 32 bytes before Argon2id.</li>
                <li>One-way function: raw password cannot be mathematically reversed.</li>
              </ul>
            </div>
          </div>

          {/* Transformation Stages */}
          {labResult && (
            <div className="lg:col-span-2 space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Stage 1 — Input Plaintext
                </div>
                <div className="text-amber-300 break-all">{labResult.stage1_plaintext}</div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase font-bold text-teal-400">
                    Stage 2 — Keyed Server Pepper HMAC Transformation
                  </div>
                  <span className="text-[10px] text-teal-300">
                    Key: {labResult.stage2_pepperApplied.pepperKeyId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mb-1">
                  Formula: {labResult.stage2_pepperApplied.method}
                </div>
                <div className="text-emerald-400 break-all">
                  {labResult.stage2_pepperApplied.prehashResult}
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">
                  Stage 3 — Cryptographic Unique Salt (128-bit)
                </div>
                <div className="text-blue-300 break-all">
                  {labResult.stage3_saltGeneration.saltHex}
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 rounded-xl border border-blue-900/60 bg-blue-950/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase font-bold text-purple-400">
                    Stage 4 — Final Stored Argon2id Encoded Hash
                  </div>
                  <span className="text-[10px] text-purple-300">
                    m={labResult.stage4_argon2idHash.memoryCostKiB} KiB, t={labResult.stage4_argon2idHash.timeCostIterations}, p={labResult.stage4_argon2idHash.parallelismThreads}
                  </span>
                </div>
                <div className="text-purple-300 break-all text-[11px]">
                  {labResult.stage4_argon2idHash.finalStoredHash}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* PRODUCTION CREDENTIAL METADATA AUDIT TABLE */}
      {/* ========================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Authorized Account Credential Records & Hash Metadata
            </h2>
            <p className="text-xs text-slate-500">
              Live audit view of real system user accounts. Plaintext passwords and pepper secret contents are strictly excluded.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            Total Audited: {auditList.length}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 text-xs border-b border-rose-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Algorithm & Params</th>
                <th className="py-3 px-4">Unique Salt (Hex)</th>
                <th className="py-3 px-4">Stored Argon2id Hash</th>
                <th className="py-3 px-4">Pepper Key ID</th>
                <th className="py-3 px-4">2FA Enrolled</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditList.map((item) => (
                <tr key={item.userId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{item.username}</div>
                    <div className="text-[11px] text-slate-500">{item.email}</div>
                    <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-700">
                      {item.role}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                    <div className="font-bold text-blue-700">{item.algorithm}</div>
                    <div className="text-[10px] text-slate-500">
                      m={item.hashParams?.memoryCost} KiB (64MB)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      t={item.hashParams?.timeCost}, p={item.hashParams?.parallelism}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-[140px] truncate" title={item.salt}>
                    {item.salt}
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-slate-800 max-w-[220px] truncate" title={item.storedHash}>
                    {item.storedHash}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-semibold text-teal-700 block">
                      {item.pepperKeyId}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Isolated Server-Side
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    {item.twoFactorEnabled ? (
                      <span className="inline-flex items-center text-emerald-600 text-[11px] font-medium">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        TOTP Enrolled
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Email OTP Only</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
