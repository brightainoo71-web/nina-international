import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ApiClient } from '../api/client.js';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, verify2FA } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify_email'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 2FA state
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'email'>('email');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [simulatedEmailOtp, setSimulatedEmailOtp] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<'admin' | 'student' | 'teacher' | 'staff'>('admin');
  const [registeredUserId, setRegisteredUserId] = useState('');

  // Email verification state
  const [emailVerifyCode, setEmailVerifyCode] = useState('');

  // Password reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');

  const handleQuickLogin = (email: string) => {
    setIdentifier(email);
    setPassword('NinaSecurePass2026!');
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.requires2FA && res.twoFactorToken) {
        setIs2FAPending(true);
        setTwoFactorToken(res.twoFactorToken);
        setAvailableMethods(res.availableMethods || ['email']);
        setSelectedMethod(res.availableMethods?.includes('totp') ? 'totp' : 'email');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await ApiClient.post<any>('/auth/2fa/send-email-otp', { twoFactorToken });
      setSimulatedEmailOtp(res.simulatedOtp);
      setSuccessMsg(`Verification code dispatched! For presentation/testing: ${res.simulatedOtp}`);
    } catch (err: any) {
      setError(err.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verify2FA(twoFactorToken, selectedMethod, twoFactorCode);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.post<any>('/auth/register', {
        fullName: regFullName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });
      setRegisteredUserId(res.userId);
      setEmailVerifyCode(res.simulatedVerificationOtp || '');
      setSuccessMsg('Account registered! Please complete email verification.');
      setMode('verify_email');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ApiClient.post('/auth/verify-email', {
        userId: registeredUserId,
        code: emailVerifyCode,
      });
      setSuccessMsg('Email successfully verified! You may now log in.');
      setMode('login');
      setIdentifier(regEmail);
    } catch (err: any) {
      setError(err.message || 'Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.post<any>('/auth/forgot-password', { email: forgotEmail });
      setResetToken(res.simulatedResetToken || '');
      setSuccessMsg('Password recovery challenge dispatched.');
      setResetStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ApiClient.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });
      setSuccessMsg('Password has been securely reset! Please log in.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-teal-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4 border border-blue-400/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Nina International
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Secure School Management & Authentication Gateway
          </p>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-6 bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {/* ========================================================== */}
          {/* 2FA VERIFICATION STEP */}
          {/* ========================================================== */}
          {is2FAPending ? (
            <div>
              <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold text-white">
                  Two-Factor Authentication Required
                </h3>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Password verified. Please authenticate using your configured second factor.
              </p>

              {/* 2FA Method Selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {availableMethods.includes('totp') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('totp')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center space-x-1.5 transition-all ${
                      selectedMethod === 'totp'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Authenticator App</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('email')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center space-x-1.5 transition-all ${
                    selectedMethod === 'email'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email OTP</span>
                </button>
              </div>

              {selectedMethod === 'email' && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleRequestEmailOtp}
                    disabled={loading}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center space-x-2 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Send Verification Code to Email</span>
                  </button>
                  {simulatedEmailOtp && (
                    <div className="mt-2 p-2 bg-blue-950/60 border border-blue-800/50 rounded text-center">
                      <span className="text-[11px] text-blue-300 block">Demonstration OTP Token:</span>
                      <span className="text-sm font-mono font-bold text-amber-300 tracking-wider">
                        {simulatedEmailOtp}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {selectedMethod === 'totp'
                      ? 'Enter 6-digit Authenticator Code'
                      : 'Enter 6-digit Email Verification Code'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono py-2.5 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length < 6}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Verifying...' : 'Complete Authentication'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIs2FAPending(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-300 pt-1"
                >
                  Cancel and Return to Login
                </button>
              </form>
            </div>
          ) : mode === 'login' ? (
            /* ========================================================== */
            /* LOGIN SCREEN */
            /* ========================================================== */
            <div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="admin@ninainternational.edu"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-blue-400 hover:text-blue-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                      tabIndex={-1}
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In Securely'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* DEMO / TEST ACCOUNT QUICK-FILL BUTTONS */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="flex items-center space-x-1 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-slate-300">
                    Fast Academic Demonstration Accounts:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@ninainternational.edu')}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-bold text-blue-400 block">Administrator</span>
                    <span className="text-slate-400 text-[9px] truncate block">admin@ninainternational.edu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('teacher.mensah@ninainternational.edu')}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-bold text-emerald-400 block">Teacher</span>
                    <span className="text-slate-400 text-[9px] truncate block">teacher.mensah@...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('staff.akosua@ninainternational.edu')}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-bold text-purple-400 block">School Staff</span>
                    <span className="text-slate-400 text-[9px] truncate block">staff.akosua@...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('student.kofi@ninainternational.edu')}
                    className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-bold text-teal-400 block">Student</span>
                    <span className="text-slate-400 text-[9px] truncate block">student.kofi@...</span>
                  </button>
                </div>
                <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
                  Default Demo Password: <span className="text-slate-300">NinaSecurePass2026!</span>
                </div>
              </div>

              {/* Mode switch */}
              <div className="mt-5 text-center text-xs text-slate-400">
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Register here
                </button>
              </div>
            </div>
          ) : mode === 'register' ? (
            /* ========================================================== */
            /* REGISTRATION SCREEN */
            /* ========================================================== */
            <div>
              <div className="mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Create Nina Account</h3>
                <p className="text-[11px] text-slate-400">
                  Password protected with HMAC Pepper + Argon2id.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abena Frimpong"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Unique Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. abena_f"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@ninainternational.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Account Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Administrator (Security / System Management)</option>
                    <option value="teacher">Teacher (Instructor)</option>
                    <option value="staff">School Staff (Registrar)</option>
                    <option value="student">Student (Standard Enrolment)</option>
                  </select>
                  <span className="text-[10px] text-blue-400/90 mt-0.5 block">
                    * Full role-based access control enabled for all roles.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Password (Min. 10 chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                      tabIndex={-1}
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in here
                </button>
              </div>
            </div>
          ) : mode === 'verify_email' ? (
            /* ========================================================== */
            /* EMAIL VERIFICATION SCREEN */
            /* ========================================================== */
            <div>
              <div className="mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Verify Email Address</h3>
                <p className="text-[11px] text-slate-400">
                  Please confirm email ownership before accessing school records.
                </p>
              </div>

              <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000000"
                    value={emailVerifyCode}
                    onChange={(e) => setEmailVerifyCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify and Activate Account'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-300"
                >
                  Back to Login
                </button>
              </form>
            </div>
          ) : (
            /* ========================================================== */
            /* FORGOT & RESET PASSWORD */
            /* ========================================================== */
            <div>
              <div className="mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Recover Password</h3>
                <p className="text-[11px] text-slate-400">
                  Single-use cryptographic token recovery workflow.
                </p>
              </div>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Account Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@ninainternational.edu"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    {loading ? 'Dispatched...' : 'Send Recovery Token'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      New Password (Min 10 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                        tabIndex={-1}
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    {loading ? 'Resetting...' : 'Save New Password & Invalidate Old Tokens'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetStep('request');
                  setError(null);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-300 mt-4 block"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
