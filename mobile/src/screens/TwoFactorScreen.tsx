import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MobileApiClient } from '../services/api.service';
import { StorageService } from '../services/storage.service';

interface TwoFactorScreenProps {
  twoFactorToken: string;
  availableMethods: string[];
  user: any;
  onSuccess: (fullUser: any) => void;
  onCancel: () => void;
}

export const TwoFactorScreen: React.FC<TwoFactorScreenProps> = ({
  twoFactorToken,
  availableMethods,
  user,
  onSuccess,
  onCancel,
}) => {
  const [method, setMethod] = useState<'totp' | 'email'>(
    availableMethods.includes('totp') ? 'totp' : 'email'
  );
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmailOtp = async () => {
    setLoading(true);
    try {
      await MobileApiClient.post('/auth/2fa/send-email-otp', {
        twoFactorToken,
      });
      Alert.alert('Verification Code Sent', 'A single-use 6-digit verification code has been dispatched to your registered email.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await MobileApiClient.post('/auth/2fa/verify', {
        twoFactorToken,
        method,
        code,
      });

      // Save session token in Expo SecureStore
      await StorageService.setItem('nina_mobile_token', res.accessToken);
      onSuccess(res.user);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Password verified for {user?.email}. Enter your secondary challenge code.
        </Text>

        {/* Method Toggle */}
        <View style={styles.methodToggle}>
          {availableMethods.includes('totp') && (
            <TouchableOpacity
              style={[styles.toggleBtn, method === 'totp' && styles.toggleBtnActive]}
              onPress={() => setMethod('totp')}
            >
              <Text style={[styles.toggleText, method === 'totp' && styles.toggleTextActive]}>
                Authenticator (TOTP)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
            onPress={() => setMethod('email')}
          >
            <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>
              Email Verification
            </Text>
          </TouchableOpacity>
        </View>

        {method === 'email' && (
          <TouchableOpacity
            style={styles.sendEmailBtn}
            disabled={loading}
            onPress={handleSendEmailOtp}
          >
            <Text style={styles.sendEmailText}>Resend Email OTP Code</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.inputLabel}>
          {method === 'totp' ? '6-digit Authenticator Code:' : '6-digit Email OTP:'}
        </Text>
        <TextInput
          style={styles.codeInput}
          maxLength={6}
          keyboardType="numeric"
          placeholder="000000"
          placeholderTextColor="#64748b"
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          style={styles.verifyBtn}
          disabled={loading || code.length < 6}
          onPress={handleVerify}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify & Authorize Session</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  toggleText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  sendEmailBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sendEmailText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  otpBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  otpBannerLabel: {
    color: '#93c5fd',
    fontSize: 10,
  },
  otpBannerCode: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 6,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
    height: 52,
    marginBottom: 16,
  },
  verifyBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
