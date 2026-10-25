import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  Database,
  Cloud,
  CheckCircle,
  AlertCircle,
  Play,
  ShieldCheck,
  RefreshCw,
  FileText,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { BackupJobRecord } from '../../types/shared.js';

export const AwsBackupsView: React.FC = () => {
  const [jobs, setJobs] = useState<BackupJobRecord[]>([]);
  const [awsStatus, setAwsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [verifyingJobId, setVerifyingJobId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<{ jobs: BackupJobRecord[]; awsIntegrationStatus: any }>(
        '/backup/jobs'
      );
      setJobs(data.jobs || []);
      setAwsStatus(data.awsIntegrationStatus || {});
    } catch (err: any) {
      console.error('Failed to load backup records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setRunningBackup(true);
    try {
      const res = await ApiClient.post('/backup/jobs');
      alert(res.message);
      fetchBackups();
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setRunningBackup(false);
    }
  };

  const handleVerifyIntegrity = async (jobId: string) => {
    setVerifyingJobId(jobId);
    try {
      const res = await ApiClient.post(`/backup/jobs/${jobId}/verify`);
      setVerificationResult(res);
    } catch (err: any) {
      alert('Verification test failed: ' + err.message);
    } finally {
      setVerifyingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Disaster Recovery & AWS S3 Backups
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Encrypted database archives protected with AES-256-GCM and SHA-256 integrity verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleTriggerBackup}
            disabled={runningBackup}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${runningBackup ? 'animate-spin' : 'fill-current'}`} />
            <span>{runningBackup ? 'Archiving & Encrypting...' : 'Run Scheduled/Manual Backup'}</span>
          </button>
        </div>
      </div>

      {/* AWS Integration Status Card */}
      {awsStatus && (
        <div
          className={`p-6 rounded-2xl border shadow-md transition-all ${
            awsStatus.configured
              ? 'bg-slate-900 border-emerald-500/30 text-slate-100'
              : 'bg-slate-900 border-amber-500/30 text-slate-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/25">
                <Cloud className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Amazon Web Services (AWS) Integration State
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {awsStatus.statusMessage}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${
                awsStatus.configured
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
              }`}
            >
              ● {awsStatus.configured ? 'AWS S3 Connected' : 'Awaiting Client AWS S3 Setup'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-sans mb-1 font-semibold">
                AWS Region
              </span>
              <span className="font-semibold text-white text-sm">{awsStatus.region}</span>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-sans mb-1 font-semibold">
                Target S3 Bucket
              </span>
              <span className="font-bold text-amber-300 break-all text-sm">{awsStatus.s3Bucket}</span>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-sans mb-1 font-semibold">
                AES-256-GCM / KMS Encryption
              </span>
              <span className="font-semibold text-emerald-400 text-sm">Enforced on all exports</span>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result Drawer */}
      {verificationResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center space-x-2 text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Archive Integrity Verification Succeeded</span>
          </div>
          <p className="text-emerald-700">
            The archive was decrypted, the SHA-256 payload checksum was re-calculated, and collections were structurally verified.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {Object.entries(verificationResult.recordCounts || {}).map(([col, count]: any) => (
              <div key={col} className="bg-white p-2 rounded border border-emerald-200">
                <span className="text-[10px] text-slate-500 uppercase block">{col}:</span>
                <span className="font-bold text-slate-800">{count} documents</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recorded Backup Archives</h2>
          <span className="text-xs text-slate-500">{jobs.length} completed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Job ID & Timestamp</th>
                <th className="py-3 px-4">Type & Destination</th>
                <th className="py-3 px-4">Size & Encryption</th>
                <th className="py-3 px-4">Integrity Checksum (SHA-256)</th>
                <th className="py-3 px-4">Retention Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-blue-700 block">{job.id}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(job.timestamp).toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="capitalize font-semibold text-slate-800 block">
                      {job.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {job.destination === 's3' ? 'AWS S3 Cloud' : 'Local AES Staging'}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="font-bold text-slate-700">
                      {job.sizeBytes ? `${Math.round(job.sizeBytes / 1024)} KB` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-emerald-600 block">AES-256-GCM</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[140px] truncate" title={job.checksumSha256}>
                    {job.checksumSha256}
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(job.retentionExpiry).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleVerifyIntegrity(job.id)}
                      disabled={verifyingJobId === job.id}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                      {verifyingJobId === job.id ? 'Testing...' : 'Test Integrity'}
                    </button>
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
