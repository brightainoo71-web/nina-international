import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  History,
  RotateCcw,
  Plus,
  ShieldCheck,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { ConfigurationSnapshot } from '../../types/shared.js';

export const ConfigRestoreView: React.FC = () => {
  const [snapshots, setSnapshots] = useState<ConfigurationSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSettings, setActiveSettings] = useState<any>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoring, setRestoring] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<{ snapshots: ConfigurationSnapshot[] }>('/security/snapshots');
      setSnapshots(data.snapshots || []);

      const settingsData = await ApiClient.get<{ settings: any }>('/security/settings');
      setActiveSettings(settingsData.settings);
    } catch (err: any) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription) return;

    try {
      await ApiClient.post('/security/snapshots', { description: newDescription });
      setCreateModalOpen(false);
      setNewDescription('');
      fetchSnapshots();
    } catch (err: any) {
      alert('Failed to create snapshot: ' + err.message);
    }
  };

  const handleOpenPreview = async (id: string) => {
    setSelectedSnapshotId(id);
    try {
      const preview = await ApiClient.get(`/security/snapshots/${id}/preview`);
      setPreviewData(preview);
      setRestoreReason('');
      setPreviewModalOpen(true);
    } catch (err: any) {
      alert('Preview failed: ' + err.message);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedSnapshotId || !restoreReason) return;
    setRestoring(true);
    try {
      const res = await ApiClient.post(`/security/snapshots/${selectedSnapshotId}/restore`, {
        reason: restoreReason,
      });
      alert(res.message);
      setPreviewModalOpen(false);
      fetchSnapshots();
    } catch (err: any) {
      alert('Restoration error: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Configuration Restore Points
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System configuration snapshots with integrity hashing. Restoration applies strictly to global settings and will <strong className="text-slate-800">never modify student records or grades</strong>.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Restore Point</span>
        </button>
      </div>

      {/* Active System Configuration Card */}
      {activeSettings && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Active Live System Configuration
              </h3>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Active State
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">School Name</span>
              <span className="font-semibold text-slate-200">{activeSettings.schoolName}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Academic Year</span>
              <span className="font-semibold text-slate-200">{activeSettings.academicYear}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">2FA Mandatory</span>
              <span className="font-semibold text-emerald-400">
                {activeSettings.requireTwoFactor ? 'Enforced' : 'Optional'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Session Timeout</span>
              <span className="font-semibold text-slate-200">{activeSettings.sessionTimeoutMinutes} min</span>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recorded Restore Points</h2>
          <span className="text-xs text-slate-500">{snapshots.length} available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Version & Timestamp</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4">Integrity Checksum (SHA-256)</th>
                <th className="py-3 px-4">Restored</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.map((snap) => (
                <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-blue-700 block">{snap.version}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(snap.createdAt).toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-800 max-w-xs">
                    {snap.description}
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    {snap.createdByName || snap.createdBy}
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[140px] truncate" title={snap.integrityHash}>
                    {snap.integrityHash}
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    {snap.restorationCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        {snap.restorationCount} time(s)
                      </span>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenPreview(snap.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1" />
                      Preview & Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SNAPSHOT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Create Configuration Snapshot
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Captures a cryptographic checkpoint of all system settings and policy definitions.
            </p>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Purpose of Restore Point
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Pre-term policy update checkpoint..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW DIFF & RESTORE MODAL */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-amber-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Configuration Change Preview
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Inspect below proposed setting modifications. An automatic rollback snapshot will be captured before changes are committed.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono mb-4 max-h-60 overflow-y-auto">
              {Object.keys(previewData.diff || {}).length === 0 ? (
                <div className="text-slate-500 text-center py-2">
                  No differences found. Current configuration matches this snapshot.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(previewData.diff).map(([key, diff]: any) => (
                    <div key={key} className="border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-800 uppercase block">{key}:</span>
                      <div className="text-rose-600 text-[11px]">
                        - Current: {JSON.stringify(diff.current)}
                      </div>
                      <div className="text-emerald-600 text-[11px]">
                        + Target: {JSON.stringify(diff.target)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Restoration (Required for Security Audit)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reverting accidental policy change..."
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={restoring || !restoreReason}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50 flex items-center space-x-1"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
                  <span>{restoring ? 'Restoring...' : 'Confirm Configuration Restore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
