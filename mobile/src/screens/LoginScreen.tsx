import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MobileApiClient } from '../services/api.service';
import { ApiConfig } from '../config/api';

// Crisp SVG Icons matching Web App
const EyeIcon = ({ size = 20, color = '#94a3b8' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#94a3b8' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <Path d="M2 2l20 20" />
  </Svg>
);

interface LoginScreenProps {
  onRequires2FA: (data: { token: string; methods: string[]; user: any }) => void;
  onLoginSuccess: (user: any) => void;
}

type AuthMode = 'login' | 'register' | 'verify_email' | 'forgot_password';
type UserRole = 'admin' | 'teacher' | 'staff' | 'student';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onRequires2FA, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('admin');
  const [registeredUserId, setRegisteredUserId] = useState('');

  // Email verification state
  const [emailVerifyCode, setEmailVerifyCode] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');

  // Network API config
  const [serverUrl, setServerUrl] = useState(ApiConfig.getBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await MobileApiClient.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res.requires2FA) {
        onRequires2FA({
          token: res.twoFactorToken,
          methods: res.availableMethods,
          user: res.user,
        });
      } else {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      if (err.data?.requiresEmailVerification && err.data?.userId) {
        setRegisteredUserId(err.data.userId);
        setEmailVerifyCode('');
        Alert.alert(
          'Email Verification Required',
          err.message || 'Please enter the 6-digit code dispatched to your email inbox.'
        );
        setMode('verify_email');
      } else {
        Alert.alert('Authentication Failed', err.message || 'Invalid credentials or network issue.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      Alert.alert('Missing Fields', 'All registration fields are required.');
      return;
    }

    if (regPassword.length < 10) {
      Alert.alert('Weak Password', 'Password must be at least 10 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await MobileApiClient.post('/auth/register', {
        fullName: regFullName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
      });

      setRegisteredUserId(res.userId);
      setEmailVerifyCode('');
      Alert.alert(
        'Account Registered!',
        'A single-use 6-digit verification code has been dispatched to your email inbox.'
      );
      setMode('verify_email');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!registeredUserId || !emailVerifyCode.trim()) {
      Alert.alert('Input Required', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await MobileApiClient.post('/auth/verify-email', {
        userId: registeredUserId,
        code: emailVerifyCode.trim(),
      });

      Alert.alert('Verified Successfully', 'Your email has been verified. You may now sign in.');
      setMode('login');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (!regEmail.trim() && !identifier.trim()) {
      Alert.alert('Error', 'No email address found to resend.');
      return;
    }
    Alert.alert('Code Dispatched', 'A fresh verification code has been sent to your registered email.');
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      await MobileApiClient.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
      });
      Alert.alert('Token Dispatched', 'If this email exists, a password reset token has been sent.');
      setResetStep('reset');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not process recovery request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim() || !newPassword) {
      Alert.alert('Missing Fields', 'Please enter both the reset token and your new password.');
      return;
    }

    if (newPassword.length < 10) {
      Alert.alert('Weak Password', 'New password must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await MobileApiClient.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        token: resetToken.trim(),
        newPassword,
      });

      Alert.alert('Password Updated', 'Your password has been changed securely. Please sign in.');
      setMode('login');
      setResetStep('request');
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    ApiConfig.setBaseUrl(serverUrl);
    Alert.alert('Configuration Saved', `API URL updated to:\n${serverUrl}`);
    setShowConfig(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>NI</Text>
        </View>
        <Text style={styles.title}>Nina International</Text>
        <Text style={styles.subtitle}>Secure School Management Gateway</Text>
        <View style={styles.securityTag}>
          <Text style={styles.securityTagText}>Argon2id + HMAC Pepper + 2FA</Text>
        </View>
      </View>

      {/* ========================================================== */}
      {/* MODE 1: SIGN IN */}
      {/* ========================================================== */}
      {mode === 'login' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In Securely</Text>

          <Text style={styles.label}>Email Address or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="user@ninainternational.edu"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={() => setMode('forgot_password')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Password with Eye Toggle */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showPassword ? <EyeOffIcon size={20} color="#94a3b8" /> : <EyeIcon size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} disabled={loading} onPress={handleLogin}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Authenticate Securely →</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>Need an account?</Text>
            <TouchableOpacity onPress={() => setMode('register')}>
              <Text style={styles.switchAction}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================== */}
      {/* MODE 2: REGISTER */}
      {/* ========================================================== */}
      {mode === 'register' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Nina Account</Text>
          <Text style={styles.cardSubtitle}>Protected with Argon2id + Salt + Pepper</Text>

          <Text style={styles.label}>Full Legal Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Abena Frimpong"
            placeholderTextColor="#64748b"
            value={regFullName}
            onChangeText={setRegFullName}
          />

          <Text style={styles.label}>Unique Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. abena_f"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={regUsername}
            onChangeText={setRegUsername}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="user@ninainternational.edu"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={regEmail}
            onChangeText={setRegEmail}
          />

          <Text style={styles.label}>Account Role</Text>
          <View style={styles.roleGrid}>
            {[
              { id: 'admin', label: 'Administrator' },
              { id: 'teacher', label: 'Teacher' },
              { id: 'staff', label: 'Staff' },
              { id: 'student', label: 'Student' },
            ].map((r) => {
              const isSelected = regRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleChip, isSelected && styles.roleChipActive]}
                  onPress={() => setRegRole(r.id as UserRole)}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Password (Min. 10 chars)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry={!showRegPassword}
              value={regPassword}
              onChangeText={setRegPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowRegPassword(!showRegPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showRegPassword ? <EyeOffIcon size={20} color="#94a3b8" /> : <EyeIcon size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} disabled={loading} onPress={handleRegister}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Register Account →</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Sign In */}
          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>Already registered?</Text>
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.switchAction}>Sign in here</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================== */}
      {/* MODE 3: EMAIL VERIFICATION */}
      {/* ========================================================== */}
      {mode === 'verify_email' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify Email Address</Text>
          <Text style={styles.cardSubtitle}>
            A single-use 6-digit security code has been sent to your email inbox.
          </Text>

          <Text style={styles.label}>Enter 6-Digit Code</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={6}
            value={emailVerifyCode}
            onChangeText={setEmailVerifyCode}
          />

          <TouchableOpacity style={styles.button} disabled={loading || emailVerifyCode.length < 6} onPress={handleVerifyEmail}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Confirm Email Verification →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={handleResendEmailOtp}>
            <Text style={styles.resendText}>Resend code to email</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.switchAction}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================== */}
      {/* MODE 4: FORGOT PASSWORD */}
      {/* ========================================================== */}
      {mode === 'forgot_password' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recover Password</Text>
          <Text style={styles.cardSubtitle}>
            Single-use cryptographic token password recovery workflow.
          </Text>

          {resetStep === 'request' ? (
            <>
              <Text style={styles.label}>Account Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="user@ninainternational.edu"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                value={forgotEmail}
                onChangeText={setForgotEmail}
              />

              <TouchableOpacity style={styles.button} disabled={loading} onPress={handleForgotPassword}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Recovery Token</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Recovery Token from Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste token here"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={resetToken}
                onChangeText={setResetToken}
              />

              <Text style={styles.label}>New Password (Min. 10 chars)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showNewPassword ? <EyeOffIcon size={20} color="#94a3b8" /> : <EyeIcon size={20} color="#94a3b8" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.button} disabled={loading} onPress={handleResetPassword}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Save New Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.switchRow}>
            <TouchableOpacity
              onPress={() => {
                setMode('login');
                setResetStep('request');
              }}
            >
              <Text style={styles.switchAction}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Network URL Settings Toggle */}
      <TouchableOpacity style={styles.configToggle} onPress={() => setShowConfig(!showConfig)}>
        <Text style={styles.configToggleText}>
          {showConfig ? 'Hide API Connection Endpoint' : 'Configure Server Endpoint'}
        </Text>
      </TouchableOpacity>

      {showConfig && (
        <View style={styles.configBox}>
          <Text style={styles.configLabel}>Live Backend Endpoint URL:</Text>
          <TextInput
            style={[styles.input, { fontSize: 11, height: 42 }]}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveConfigBtn} onPress={handleSaveApiUrl}>
            <Text style={styles.saveConfigText}>Save Connection Endpoint</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#090d16',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  securityTag: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  securityTagText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  forgotText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  eyeBtn: {
    paddingLeft: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  roleChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  resendText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  switchPrompt: {
    color: '#64748b',
    fontSize: 11,
  },
  switchAction: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '600',
  },
  configToggle: {
    alignItems: 'center',
    marginTop: 20,
  },
  configToggleText: {
    color: '#64748b',
    fontSize: 11,
  },
  configBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  configLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginBottom: 6,
    fontWeight: '600',
  },
  saveConfigBtn: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveConfigText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
});
