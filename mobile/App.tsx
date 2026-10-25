import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { LoginScreen } from './src/screens/LoginScreen';
import { TwoFactorScreen } from './src/screens/TwoFactorScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { TeacherScreen } from './src/screens/TeacherScreen';
import { StaffScreen } from './src/screens/StaffScreen';
import { StudentScreen } from './src/screens/StudentScreen';

import { StorageService } from './src/services/storage.service';
import { MobileApiClient } from './src/services/api.service';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 2FA pending state
  const [twoFactorData, setTwoFactorData] = useState<{
    token: string;
    methods: string[];
    user: any;
  } | null>(null);

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const token = await StorageService.getItem('nina_mobile_token');
      if (token) {
        const res = await MobileApiClient.get('/auth/me');
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.warn('Session verification error, clearing stored token:', err);
      await StorageService.deleteItem('nina_mobile_token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await StorageService.deleteItem('nina_mobile_token');
    setCurrentUser(null);
    setTwoFactorData(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {twoFactorData ? (
        <TwoFactorScreen
          twoFactorToken={twoFactorData.token}
          availableMethods={twoFactorData.methods}
          user={twoFactorData.user}
          onSuccess={(user) => {
            setCurrentUser(user);
            setTwoFactorData(null);
          }}
          onCancel={() => setTwoFactorData(null)}
        />
      ) : !currentUser ? (
        <LoginScreen
          onRequires2FA={(data) => setTwoFactorData(data)}
          onLoginSuccess={(user) => setCurrentUser(user)}
        />
      ) : currentUser.role === 'admin' ? (
        <AdminScreen onLogout={handleLogout} />
      ) : currentUser.role === 'teacher' ? (
        <TeacherScreen onLogout={handleLogout} />
      ) : currentUser.role === 'staff' ? (
        <StaffScreen onLogout={handleLogout} />
      ) : (
        <StudentScreen user={currentUser} onLogout={handleLogout} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  center: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
