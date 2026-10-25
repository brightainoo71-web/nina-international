import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Calendar,
} from 'lucide-react';
import { AuditLogEntry } from '../../types/shared.js';

export const SecurityCentreView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (roleFilter) queryParams.set('role', roleFilter);
      if (outcomeFilter) queryParams.set('outcome', outcomeFilter);

      const data = await ApiClient.get<{ logs: AuditLogEntry[]; total: number }>(
        `/security/audit-logs?${queryParams.toString()}`
      );
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [roleFilter, outcomeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nina_security_audit_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Security Centre & Cryptographic Audit Trails
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident append-only event logging with SHA-256 hash chaining.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportAsJson}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, resource, actor email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
            <option value="anonymous">Anonymous</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="denied">Access Denied</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Timestamp & ID</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Cryptographic Checksum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isSuccess = log.outcome === 'success';
                const isDenied = log.outcome === 'denied';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[100px]">
                        {log.id}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {log.actorEmail || log.actorId}
                      </div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-600">
                        {log.actorRole}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {log.action}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.resource}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isDenied
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {log.outcome.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 font-mono text-[9px] text-slate-400 max-w-[120px] truncate" title={(log as any).integrityHash}>
                      {(log as any).integrityHash ? `SHA256: ${(log as any).integrityHash}` : 'TAMPER_CHECKED'}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    No security audit logs found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
