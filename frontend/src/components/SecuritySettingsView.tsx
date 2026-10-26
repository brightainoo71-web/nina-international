import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ApiClient } from '../api/client.js';
import {
  ShieldCheck,
  QrCode,
  Mail,
  CheckCircle2,
  AlertCircle,
  Copy,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export const SecuritySettingsView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [totpData, setTotpData] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
    recoveryCodes: string[];
  } | null>(null);

  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleStartTotpEnrollment = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await ApiClient.post<any>('/auth/2fa/setup');
      setTotpData(data);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to initialize TOTP setup', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await ApiClient.post('/auth/2fa/confirm', { code: verifyCode });
      setMessage({ text: 'Authenticator app successfully activated as your primary 2FA method!', type: 'success' });
      setTotpData(null);
      setVerifyCode('');
      await refreshUser();
    } catch (err: any) {
      setMessage({ text: err.message || 'Verification failed. Please check the code.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToEmail2FA = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await ApiClient.patch(`/users/${user?.id}/2fa`, {
        enabled: true,
        method: 'email',
      });
      setMessage({ text: 'Two-Factor Authentication set to Email OTP successfully.', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update 2FA method', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Two-Factor Authentication & Account Security</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your secondary authentication factors: RFC 6238 TOTP App and Encrypted Email OTP.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
          Current Security Posture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 text-xs">Email Two-Factor Authentication</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dispatches a single-use 6-digit cryptographic challenge to <span className="font-mono text-slate-700">{user?.email}</span>.
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active by Default
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
            <QrCode className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 text-xs">Mobile Authenticator App (TOTP)</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                RFC 6238 time-based codes via Google Authenticator, Microsoft Authenticator, or Authy.
              </p>
              <div className="mt-2">
                {user?.totpEnabled ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Enrolled & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                    Not Yet Enrolled
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap gap-3">
          {!totpData && (
            <button
              onClick={handleStartTotpEnrollment}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>{user?.totpEnabled ? 'Re-enroll Authenticator App' : 'Enroll Authenticator App (Google / Authy)'}</span>
            </button>
          )}

          {user?.totpEnabled && (
            <button
              onClick={handleSwitchToEmail2FA}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 flex items-center space-x-2 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Reset 2FA to Email OTP</span>
            </button>
          )}
        </div>
      </div>

      {/* TOTP Setup Card */}
      {totpData && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Scan QR Code into Authenticator App</h2>
            </div>
            <button
              onClick={() => setTotpData(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-3 bg-white rounded-xl shadow-inner shrink-0">
              <img
                src={totpData.qrCodeDataUrl}
                alt="Authenticator QR Code"
                className="w-44 h-44"
              />
            </div>

            <div className="space-y-3 flex-1 text-xs">
              <p className="text-slate-300 leading-relaxed">
                1. Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your smartphone.
              </p>
              <p className="text-slate-300 leading-relaxed">
                2. Tap <strong>Scan QR code</strong> and point your camera at the screen.
              </p>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Or Enter Secret Key Manually:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-300 text-xs tracking-wider break-all select-all">
                    {totpData.manualEntryKey}
                  </span>
                  <button
                    onClick={() => copyToClipboard(totpData.manualEntryKey)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 ml-2 shrink-0"
                    title="Copy Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedKey && <span className="text-[10px] text-emerald-400 block">Key copied to clipboard!</span>}
              </div>
            </div>
          </div>

          {/* Confirm OTP Form */}
          <form onSubmit={handleConfirmTotp} className="pt-4 border-t border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Enter 6-digit code shown in your Authenticator app to activate:
            </label>
            <div className="flex items-center space-x-3 max-w-sm">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className="w-40 text-center tracking-widest text-lg font-mono py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={loading || verifyCode.length < 6}
                className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Confirm & Activate TOTP</span>
              </button>
            </div>
          </form>

          {/* Recovery Codes */}
          {totpData.recoveryCodes && (
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-1.5 mb-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Single-Use Backup Recovery Codes</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Save these codes in a safe place. If you ever lose access to your device, each code can be used once.
              </p>
              <div className="grid grid-cols-4 gap-2 bg-slate-800/80 p-3 rounded-lg border border-slate-700 font-mono text-center text-xs text-slate-200">
                {totpData.recoveryCodes.map((code, idx) => (
                  <span key={idx} className="p-1 bg-slate-900/60 rounded border border-slate-700/60">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
