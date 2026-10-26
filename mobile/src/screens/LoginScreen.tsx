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
import { MobileApiClient } from '../services/api.service';
import { ApiConfig } from '../config/api';

interface LoginScreenProps {
  onRequires2FA: (data: { token: string; methods: string[]; user: any }) => void;
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onRequires2FA, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiConfig.getBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await MobileApiClient.post('/auth/login', {
        identifier,
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
      Alert.alert('Authentication Failed', err.message);
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
    <ScrollView contentContainerStyle={styles.container}>
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

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>

        <Text style={styles.label}>Email or Username</Text>
        <TextInput
          style={styles.input}
          placeholder="user@ninainternational.edu"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          value={identifier}
          onChangeText={setIdentifier}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          disabled={loading}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Authenticate Securely</Text>
          )}
        </TouchableOpacity>

        {/* Network URL Settings Toggle */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configToggleText}>
            {showConfig ? 'Hide API Connection Settings' : 'Configure Server IP for Expo Go'}
          </Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configLabel}>Backend API Base URL (LAN IP):</Text>
            <TextInput
              style={[styles.input, { fontSize: 12, height: 40 }]}
              value={serverUrl}
              onChangeText={setServerUrl}
            />
            <TouchableOpacity style={styles.saveConfigBtn} onPress={handleSaveApiUrl}>
              <Text style={styles.saveConfigText}>Save Connection Endpoint</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  securityTag: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
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
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#ffffff',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1f2937',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  demoBtnRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  demoBtnEmail: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  configToggle: {
    marginTop: 16,
    alignItems: 'center',
  },
  configToggleText: {
    color: '#60a5fa',
    fontSize: 11,
  },
  configBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  configLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 6,
  },
  saveConfigBtn: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveConfigText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
