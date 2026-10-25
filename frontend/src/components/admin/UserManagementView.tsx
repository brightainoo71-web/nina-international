import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client.js';
import {
  Users,
  Search,
  Filter,
  UserX,
  RotateCcw,
  Shield,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/shared.js';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'soft_delete' | 'restore' | 'role_change' | null>(null);
  const [reason, setReason] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (roleFilter) q.set('role', roleFilter);
      if (statusFilter) q.set('status', statusFilter);

      const data = await ApiClient.get<{ users: UserProfile[] }>(`/users?${q.toString()}`);
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleActionConfirm = async () => {
    if (!targetUser) return;
    setSubmitting(true);
    try {
      if (actionType === 'soft_delete') {
        await ApiClient.post(`/users/${targetUser.id}/soft-delete`, { reason });
      } else if (actionType === 'restore') {
        await ApiClient.post(`/users/${targetUser.id}/restore`, { reason });
      } else if (actionType === 'role_change') {
        await ApiClient.patch(`/users/${targetUser.id}/role`, { role: newRole });
      }
      setActionType(null);
      setTargetUser(null);
      setReason('');
      fetchUsers();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              User & Identity Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Soft-deletion, account restoration, and role-based privilege management with immutable audit logging.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deleted">Soft-Deleted</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Email Verified</th>
                <th className="py-3 px-4">2FA Enrolled</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isDeleted = u.status === 'deleted';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                      <span className="text-[10px] font-mono text-slate-400">@{u.username}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isDeleted
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.emailVerified ? (
                        <span className="text-emerald-600 font-medium">Verified</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.totpEnabled ? (
                        <span className="text-emerald-600 font-medium">TOTP Active</span>
                      ) : (
                        <span className="text-slate-400">Email OTP</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setTargetUser(u);
                          setNewRole(u.role);
                          setActionType('role_change');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Change Role
                      </button>

                      {isDeleted ? (
                        <button
                          onClick={() => {
                            setTargetUser(u);
                            setReason('');
                            setActionType('restore');
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setTargetUser(u);
                            setReason('');
                            setActionType('soft_delete');
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold"
                        >
                          <UserX className="w-3 h-3 inline mr-1" />
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {actionType && targetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {actionType === 'soft_delete'
                ? 'Soft-Delete User Account'
                : actionType === 'restore'
                ? 'Restore User Account'
                : 'Modify User Role'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Target account: <strong className="text-slate-800">{targetUser.fullName}</strong> (@{targetUser.username})
            </p>

            {actionType === 'role_change' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Administrative Reason (Logged to Audit Trail)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide justification..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setTargetUser(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (actionType !== 'role_change' && !reason)}
                onClick={handleActionConfirm}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
