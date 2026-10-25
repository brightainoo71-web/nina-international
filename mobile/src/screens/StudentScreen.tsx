import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MobileApiClient } from '../services/api.service';

export const StudentScreen: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      MobileApiClient.get('/school/students'),
      MobileApiClient.get('/school/timetables'),
    ])
      .then(async ([sRes, tRes]) => {
        const myProfile =
          sRes.students?.find((s: any) => s.userId === user?.id || s.email === user?.email) ||
          sRes.students?.[0];

        setStudent(myProfile);
        setTimetable(tRes.timetable || []);

        if (myProfile) {
          const gRes = await MobileApiClient.get(`/school/grades/student/${myProfile.id}`);
          setGrades(gRes.grades || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.roleBadge}>Enrolled Student</Text>
          <Text style={styles.headerTitle}>My Academic Portal</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Student ID Digital Badge */}
      <View style={styles.badgeCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.schoolTag}>Nina International</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{student?.enrolmentStatus ?? 'Active'}</Text>
          </View>
        </View>

        <Text style={styles.studentName}>{student?.fullName || user?.fullName}</Text>
        <Text style={styles.studentNumber}>ID: {student?.studentNumber || 'NINA-2026-0001'}</Text>

        <View style={styles.badgeFooter}>
          <Text style={styles.badgeDetail}>Class: {student?.className || 'JHS 1 Gold'}</Text>
          <Text style={styles.badgeDetail}>Guardian: {student?.guardianName || 'Dr. Owusu'}</Text>
        </View>
      </View>

      {/* Academic Grades */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Term Academic Performance</Text>
        <Text style={styles.cardSubtitle}>Verified instructor assessment scores.</Text>

        {grades.map((g) => (
          <View key={g.id} style={styles.gradeRow}>
            <View>
              <Text style={styles.subjectTitle}>{g.subjectName}</Text>
              <Text style={styles.assessmentTitle}>{g.assessmentTitle}</Text>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>
                {g.score} / {g.maxScore}
              </Text>
              <Text style={styles.percentText}>
                {Math.round((g.score / g.maxScore) * 100)}%
              </Text>
            </View>
          </View>
        ))}

        {grades.length === 0 && (
          <Text style={styles.emptyText}>No graded assessments recorded yet.</Text>
        )}
      </View>

      {/* Weekly Schedule */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Class Schedule</Text>

        {timetable.map((t) => (
          <View key={t.id} style={styles.timeRow}>
            <View>
              <Text style={styles.timeDay}>{t.dayOfWeek}</Text>
              <Text style={styles.timeSubject}>{t.subjectName}</Text>
              <Text style={styles.timeRoom}>{t.roomNumber}</Text>
            </View>
            <Text style={styles.timeSlot}>
              {t.startTime} - {t.endTime}
            </Text>
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
    color: '#14b8a6',
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
  badgeCard: {
    backgroundColor: '#0f2922',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#115e59',
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schoolTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2dd4bf',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusPill: {
    backgroundColor: 'rgba(45, 212, 191, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#5eead4',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
  },
  studentNumber: {
    fontSize: 12,
    color: '#a7f3d0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  badgeFooter: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#134e4a',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeDetail: {
    fontSize: 11,
    color: '#99f6e4',
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
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  subjectTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  assessmentTitle: {
    color: '#94a3b8',
    fontSize: 10,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  percentText: {
    color: '#14b8a6',
    fontSize: 10,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  timeDay: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  timeSubject: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeRoom: {
    color: '#64748b',
    fontSize: 10,
  },
  timeSlot: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 12,
  },
});
