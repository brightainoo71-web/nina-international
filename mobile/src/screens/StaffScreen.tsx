import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MobileApiClient } from '../services/api.service';

export const StaffScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration inputs
  const [fullName, setFullName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [classId, setClassId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        MobileApiClient.get('/school/students'),
        MobileApiClient.get('/school/classes'),
      ]);
      setStudents(sRes.students || []);
      const cls = cRes.classes || [];
      setClasses(cls);
      if (cls.length > 0 && !classId) setClassId(cls[0].id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleEnrollStudent = async () => {
    if (!fullName || !guardianPhone) {
      Alert.alert('Required', 'Student name and guardian phone are required.');
      return;
    }

    setEnrolling(true);
    try {
      const res = await MobileApiClient.post('/school/students', {
        fullName,
        guardianName: guardianName || 'Guardian',
        guardianPhone,
        classId,
        dateOfBirth: '2012-06-15',
      });

      Alert.alert('Student Enrolled', `Assigned Student Number:\n${res.student.studentNumber}`);
      setFullName('');
      setGuardianName('');
      setGuardianPhone('');
      fetchStaffData();
    } catch (err: any) {
      Alert.alert('Enrolment Error', err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.roleBadge}>School Staff</Text>
          <Text style={styles.headerTitle}>Admissions & Roster</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Enrolment Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Register New Student</Text>
        <Text style={styles.cardSubtitle}>
          Enrolment registers student and generates official student number.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name (e.g. Yaw Asante)"
          placeholderTextColor="#64748b"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Guardian Full Name"
          placeholderTextColor="#64748b"
          value={guardianName}
          onChangeText={setGuardianName}
        />

        <TextInput
          style={styles.input}
          placeholder="Guardian Phone (+233 24 000 0000)"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={guardianPhone}
          onChangeText={setGuardianPhone}
        />

        <TouchableOpacity
          style={styles.enrollBtn}
          disabled={enrolling}
          onPress={handleEnrollStudent}
        >
          <Text style={styles.enrollBtnText}>{enrolling ? 'Enrolling...' : 'Submit Enrolment'}</Text>
        </TouchableOpacity>
      </View>

      {/* Student Roster Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Student Roster ({students.length})</Text>

        {students.map((st) => (
          <View key={st.id} style={styles.rosterRow}>
            <View>
              <Text style={styles.rosterName}>{st.fullName}</Text>
              <Text style={styles.rosterId}>{st.studentNumber}</Text>
              <Text style={styles.rosterGuardian}>Guardian: {st.guardianName}</Text>
            </View>
            <View style={styles.rosterClassBadge}>
              <Text style={styles.rosterClassText}>{st.className || 'Assigned'}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#090d16',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a855f7',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  enrollBtn: {
    backgroundColor: '#a855f7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  enrollBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rosterName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  rosterId: {
    color: '#38bdf8',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  rosterGuardian: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  rosterClassBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  rosterClassText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
  },
});
