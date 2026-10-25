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

export const TeacherScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attendance state
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Grade edit state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    Promise.all([
      MobileApiClient.get('/school/classes'),
      MobileApiClient.get('/school/assessments'),
    ])
      .then(([cRes, aRes]) => {
        const cls = cRes.classes || [];
        setClasses(cls);
        setAssessments(aRes.assessments || []);
        if (cls.length > 0) setSelectedClass(cls[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    MobileApiClient.get(`/school/students?classId=${selectedClass}`).then((res) => {
      const stu = res.students || [];
      setStudents(stu);
      const initMarks: Record<string, string> = {};
      stu.forEach((s: any) => {
        initMarks[s.id] = 'present';
      });
      setMarks(initMarks);
    });
  }, [selectedClass]);

  const handleSubmitAttendance = async () => {
    setSubmitting(true);
    const records = Object.entries(marks).map(([studentId, status]) => ({
      studentId,
      classId: selectedClass,
      date: new Date().toISOString().split('T')[0],
      status,
    }));

    try {
      await MobileApiClient.post('/school/attendance', { records });
      Alert.alert('Attendance Submitted', 'Class attendance successfully saved!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommitGrade = async () => {
    if (!selectedStudent || !selectedAssessment || !reasonInput) {
      Alert.alert('Required', 'Score and mandatory change reason are required.');
      return;
    }

    try {
      await MobileApiClient.post('/school/grades', {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        assessmentId: selectedAssessment.id,
        assessmentTitle: selectedAssessment.title,
        subjectId: selectedAssessment.subjectId,
        subjectName: selectedAssessment.subjectName,
        score: Number(scoreInput),
        maxScore: selectedAssessment.maxScore,
        reason: reasonInput,
      });

      Alert.alert('Success', 'Grade recorded and change audit logged.');
      setSelectedStudent(null);
      setScoreInput('');
      setReasonInput('');
    } catch (err: any) {
      Alert.alert('Grade Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.roleBadge}>Academic Faculty</Text>
          <Text style={styles.headerTitle}>Classroom Manager</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Class Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Classes</Text>
        <View style={styles.classChips}>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedClass === c.id && styles.chipActive]}
              onPress={() => setSelectedClass(c.id)}
            >
              <Text style={[styles.chipText, selectedClass === c.id && styles.chipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Daily Attendance Sheet */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Today's Attendance</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            disabled={submitting}
            onPress={handleSubmitAttendance}
          >
            <Text style={styles.actionBtnText}>{submitting ? 'Saving...' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>

        {students.map((st) => (
          <View key={st.id} style={styles.studentRow}>
            <View>
              <Text style={styles.studentName}>{st.fullName}</Text>
              <Text style={styles.studentId}>{st.studentNumber}</Text>
            </View>

            <View style={styles.statusButtons}>
              {['present', 'late', 'absent'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    marks[st.id] === status &&
                      (status === 'present'
                        ? styles.btnPresent
                        : status === 'late'
                        ? styles.btnLate
                        : styles.btnAbsent),
                  ]}
                  onPress={() => setMarks((prev) => ({ ...prev, [st.id]: status }))}
                >
                  <Text style={styles.statusBtnText}>{status[0].toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Grade Entry Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter / Modify Student Grade</Text>
        <Text style={styles.cardSubtitle}>
          Mandatory reason required for audit tracking.
        </Text>

        {students.slice(0, 3).map((st) => (
          <TouchableOpacity
            key={st.id}
            style={styles.gradeItemBtn}
            onPress={() => {
              setSelectedStudent(st);
              setSelectedAssessment(assessments[0]);
              setScoreInput('88');
            }}
          >
            <Text style={styles.studentName}>{st.fullName}</Text>
            <Text style={styles.gradeBtnAction}>Select for Grading →</Text>
          </TouchableOpacity>
        ))}

        {selectedStudent && (
          <View style={styles.gradeForm}>
            <Text style={styles.gradeFormHeader}>
              Grading: {selectedStudent.fullName}
            </Text>
            <Text style={styles.label}>Assessment: {selectedAssessment?.title}</Text>

            <TextInput
              style={styles.input}
              placeholder="Score (e.g. 90)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={scoreInput}
              onChangeText={setScoreInput}
            />

            <TextInput
              style={styles.input}
              placeholder="Reason for change (Required)"
              placeholderTextColor="#64748b"
              value={reasonInput}
              onChangeText={setReasonInput}
            />

            <TouchableOpacity style={styles.commitBtn} onPress={handleCommitGrade}>
              <Text style={styles.commitBtnText}>Commit Grade to Database</Text>
            </TouchableOpacity>
          </View>
        )}
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
    color: '#10b981',
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
    marginBottom: 10,
    marginTop: 2,
  },
  classChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  chipActive: {
    backgroundColor: '#10b981',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  studentName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  studentId: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPresent: {
    backgroundColor: '#10b981',
  },
  btnLate: {
    backgroundColor: '#f59e0b',
  },
  btnAbsent: {
    backgroundColor: '#ef4444',
  },
  statusBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  gradeItemBtn: {
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeBtnAction: {
    color: '#38bdf8',
    fontSize: 11,
  },
  gradeForm: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 10,
  },
  gradeFormHeader: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 11,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  commitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  commitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
