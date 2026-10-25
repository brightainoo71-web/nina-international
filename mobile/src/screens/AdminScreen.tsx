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

type AdminTab =
  | 'overview'
  | 'audit'
  | 'security'
  | 'users'
  | 'records'
  | 'snapshots'
  | 'backups';

export const AdminScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Tab 1: Overview
  const [metrics, setMetrics] = useState<any>(null);

  // Tab 2: Credential Audit & Synthetic Lab
  const [auditList, setAuditList] = useState<any[]>([]);
  const [systemPepper, setSystemPepper] = useState<any>(null);
  const [syntheticInput, setSyntheticInput] = useState('NinaAcademicDemonstration2026!');
  const [labRunning, setLabRunning] = useState(false);
  const [labResult, setLabResult] = useState<any>(null);

  // Tab 3: Security Centre
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');

  // Tab 4: User Management
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'teacher' | 'staff' | 'student'>('student');
  const [creatingUser, setCreatingUser] = useState(false);

  // Tab 5: School Records
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Tab 6: Configuration Snapshots
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  // Tab 7: AWS Backups
  const [backups, setBackups] = useState<any[]>([]);
  const [awsStatus, setAwsStatus] = useState<any>(null);
  const [runningBackup, setRunningBackup] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, a, l, u, c, s, sn, b] = await Promise.all([
        MobileApiClient.get('/school/dashboard').catch(() => null),
        MobileApiClient.get('/credential-audit').catch(() => null),
        MobileApiClient.get('/security/audit-logs').catch(() => null),
        MobileApiClient.get('/users').catch(() => null),
        MobileApiClient.get('/school/classes').catch(() => null),
        MobileApiClient.get('/school/subjects').catch(() => null),
        MobileApiClient.get('/security/snapshots').catch(() => null),
        MobileApiClient.get('/backup/jobs').catch(() => null),
      ]);

      if (m) setMetrics(m);
      if (a) {
        setAuditList(a.auditList || []);
        setSystemPepper(a.systemPepperStatus || {});
      }
      if (l) setLogs(l.logs || []);
      if (u) setUsers(u.users || []);
      if (c) setClasses(c.classes || []);
      if (s) setSubjects(s.subjects || []);
      if (sn) setSnapshots(sn.snapshots || []);
      if (b) {
        setBackups(b.jobs || []);
        setAwsStatus(b.awsIntegrationStatus || {});
      }
    } catch (err: any) {
      console.warn('Data load warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // -------------------------------------------------------------
  // TAB 2: Run Synthetic Lab
  // -------------------------------------------------------------
  const handleRunSyntheticLab = async () => {
    if (!syntheticInput) {
      Alert.alert('Validation', 'Please enter a test password.');
      return;
    }
    setLabRunning(true);
    try {
      const res = await MobileApiClient.post('/credential-audit/synthetic-lab', {
        syntheticInput,
      });
      setLabResult(res);
    } catch (err: any) {
      Alert.alert('Lab Execution Error', err.message);
    } finally {
      setLabRunning(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: User Management Actions
  // -------------------------------------------------------------
  const handleCreateUser = async () => {
    if (!newUsername || !newEmail || !newPassword) {
      Alert.alert('Validation', 'Username, email and password are required.');
      return;
    }
    setCreatingUser(true);
    try {
      await MobileApiClient.post('/users', {
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      Alert.alert('Success', `User ${newUsername} (${newRole}) registered successfully.`);
      setShowCreateUser(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadAllData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSoftDeleteUser = (user: any) => {
    Alert.alert(
      'Confirm Soft Delete',
      `Soft delete ${user.username}? The account will be immediately deactivated and retained for audit/restoration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Soft Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MobileApiClient.post(`/users/${user.id}/soft-delete`, {
                reason: 'Administrative deactivation via mobile security console',
              });
              Alert.alert('Deactivated', `User ${user.username} is now soft-deleted.`);
              loadAllData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleRestoreUser = (user: any) => {
    Alert.alert(
      'Confirm Restore',
      `Restore account for ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await MobileApiClient.post(`/users/${user.id}/restore`, {
                reason: 'Administrative restoration via mobile security console',
              });
              Alert.alert('Restored', `User ${user.username} account has been restored.`);
              loadAllData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // TAB 6: Configuration Snapshots Actions
  // -------------------------------------------------------------
  const handleCreateSnapshot = async () => {
    if (!snapshotDesc) {
      Alert.alert('Required', 'Please enter a description for the snapshot.');
      return;
    }
    setCreatingSnapshot(true);
    try {
      await MobileApiClient.post('/security/snapshots', {
        description: snapshotDesc,
      });
      Alert.alert('Snapshot Created', 'Configuration restore point created with SHA-256 integrity checksum.');
      setSnapshotDesc('');
      loadAllData();
    } catch (err: any) {
      Alert.alert('Snapshot Error', err.message);
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = (snap: any) => {
    Alert.alert(
      'Restore Configuration',
      `Revert system settings to snapshot "${snap.description}"?\n\nACADEMIC GUARANTEE: Student grades and records are strictly IMMUTABLE and will NOT be modified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Restore Point',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await MobileApiClient.post(`/security/snapshots/${snap.id}/restore`, {
                reason: 'Mobile administrator restore invocation',
              });
              Alert.alert('Configuration Restored', res.message || 'System settings reverted successfully.');
              loadAllData();
            } catch (err: any) {
              Alert.alert('Restore Failed', err.message);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // TAB 7: AWS Backup Actions
  // -------------------------------------------------------------
  const handleTriggerBackup = async () => {
    setRunningBackup(true);
    try {
      const res = await MobileApiClient.post('/backup/jobs');
      Alert.alert('Encrypted Archive Created', res.message || 'Encrypted AES-256-GCM backup staged.');
      loadAllData();
    } catch (err: any) {
      Alert.alert('Backup Error', err.message);
    } finally {
      setRunningBackup(false);
    }
  };

  const handleVerifyBackup = async (jobId: string) => {
    try {
      const res = await MobileApiClient.post(`/backup/jobs/${jobId}/verify`);
      Alert.alert('Integrity Verified', `Archive ${jobId} passed SHA-256 checksum and AES-256-GCM authentication verification.`);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Security Suite...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.roleBadge}>Security Administrator</Text>
          <Text style={styles.headerTitle}>Nina International</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Tab Navigation */}
      <View style={styles.navBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabNavContainer}
        >
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'audit', label: 'Audit & Lab' },
              { key: 'security', label: 'Security Centre' },
              { key: 'users', label: 'Users' },
              { key: 'records', label: 'Records' },
              { key: 'snapshots', label: 'Snapshots' },
              { key: 'backups', label: 'AWS Backups' },
            ] as { key: AdminTab; label: string }[]
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Tab Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW                                           */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <View>
            <Text style={styles.sectionHeading}>System Health & Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Students</Text>
                <Text style={styles.metricValue}>{metrics?.activeStudents ?? 0}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Faculty Staff</Text>
                <Text style={styles.metricValue}>{metrics?.totalTeachers ?? 0}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Attendance</Text>
                <Text style={[styles.metricValue, { color: '#10b981' }]}>
                  {metrics?.attendanceRate ?? 100}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Grade Average</Text>
                <Text style={[styles.metricValue, { color: '#a855f7' }]}>
                  {metrics?.averageScore ?? 0}%
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cryptographic Safeguards Active</Text>
              <Text style={styles.cardSubtitle}>
                Server-side Argon2id password hashing, unique 128-bit salts, keyed HMAC-SHA256 pepper isolation, AES-256-GCM 2FA vault, and append-only hash-chained audit trails.
              </Text>
              <View style={styles.pillRow}>
                <View style={styles.greenPill}>
                  <Text style={styles.greenPillText}>Argon2id Memory: 64 MiB</Text>
                </View>
                <View style={styles.greenPill}>
                  <Text style={styles.greenPillText}>Pepper: Keyed HMAC</Text>
                </View>
                <View style={styles.greenPill}>
                  <Text style={styles.greenPillText}>2FA: RFC 6238 TOTP</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CREDENTIAL AUDIT & SYNTHETIC LAB                   */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <View>
            <Text style={styles.sectionHeading}>Academic Credential Audit</Text>
            <Text style={styles.sectionSubtitle}>
              Live demonstration of Argon2id password parameters, unique salts, and isolated pepper identifiers.
            </Text>

            {/* Interactive Synthetic Lab */}
            <View style={[styles.card, { borderColor: '#3b82f6' }]}>
              <Text style={[styles.cardTitle, { color: '#60a5fa' }]}>Interactive Synthetic Password Lab</Text>
              <Text style={styles.cardSubtitle}>
                Test any input to verify how the server hashes passwords using unique salts and the secret server pepper.
              </Text>

              <TextInput
                style={styles.input}
                value={syntheticInput}
                onChangeText={setSyntheticInput}
                placeholder="Enter sample test password"
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, labRunning && styles.btnDisabled]}
                onPress={handleRunSyntheticLab}
                disabled={labRunning}
              >
                {labRunning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Run Argon2id Simulation</Text>
                )}
              </TouchableOpacity>

              {labResult && (
                <View style={styles.labResultBox}>
                  <Text style={styles.labResultTitle}>Simulation Results:</Text>
                  <Text style={styles.labText}>Algorithm: {labResult.algorithm}</Text>
                  <Text style={styles.labText}>Execution Time: {labResult.computationTimeMs} ms</Text>
                  <Text style={styles.labText}>
                    Pepper Key: <Text style={styles.mono}>{labResult.pepperKeyId}</Text>
                  </Text>
                  <Text style={styles.labText}>
                    Generated Salt: <Text style={styles.mono}>{labResult.generatedSalt?.substring(0, 24)}...</Text>
                  </Text>
                  <Text style={styles.labText}>
                    Argon2id Hash: <Text style={styles.mono}>{labResult.outputHash?.substring(0, 30)}...</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Real Accounts Audit List */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Active Account Hash Metadata</Text>
            {auditList.map((cred) => (
              <View key={cred.userId} style={styles.credCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.credUser}>{cred.username}</Text>
                  <Text style={styles.roleTag}>{cred.role}</Text>
                </View>
                <Text style={styles.credParam}>
                  Params: m={cred.hashParams?.memoryCost} KiB, t={cred.hashParams?.timeCost}, p={cred.hashParams?.parallelism}
                </Text>
                <Text style={styles.credParam}>
                  Salt: <Text style={styles.mono}>{cred.salt?.substring(0, 24)}...</Text>
                </Text>
                <Text style={styles.credParam}>
                  Hash: <Text style={styles.mono}>{cred.storedHash?.substring(0, 28)}...</Text>
                </Text>
                <Text style={styles.credPepper}>Pepper ID: {cred.pepperKeyId} (Protected Server-Side)</Text>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SECURITY CENTRE (AUDIT LOGS)                       */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <View>
            <Text style={styles.sectionHeading}>Append-Only Security Audit Trail</Text>
            <Text style={styles.sectionSubtitle}>
              Cryptographically chained SHA-256 audit events ensuring tamper-evidence.
            </Text>

            {logs.slice(0, 15).map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.logEvent}>{log.eventType}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>SHA-256 Chained</Text>
                  </View>
                </View>
                <Text style={styles.logMeta}>
                  Actor: {log.userId || log.actorRole || 'System'} • {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logDetail}>
                  {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                </Text>
                <Text style={styles.logHash}>
                  Hash: {log.currentHash?.substring(0, 28)}...
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 4: USER MANAGEMENT                                    */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeading}>User Accounts</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowCreateUser(!showCreateUser)}
              >
                <Text style={styles.actionBtnText}>{showCreateUser ? 'Cancel' : '+ New User'}</Text>
              </TouchableOpacity>
            </View>

            {/* Create User Form */}
            {showCreateUser && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Register New User</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Username (e.g. jdoe)"
                  placeholderTextColor="#64748b"
                  value={newUsername}
                  onChangeText={setNewUsername}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#64748b"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <View style={styles.rolePickerRow}>
                  {(['student', 'teacher', 'staff', 'admin'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectBtn, newRole === r && styles.roleSelectBtnActive]}
                      onPress={() => setNewRole(r)}
                    >
                      <Text style={[styles.roleSelectText, newRole === r && styles.roleSelectTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, creatingUser && styles.btnDisabled]}
                  onPress={handleCreateUser}
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Users List */}
            {users.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.userName}>{u.fullName || u.username}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, u.status === 'deleted' && styles.statusBadgeDeleted]}>
                    <Text style={styles.statusBadgeText}>
                      {u.status === 'deleted' ? 'Soft Deleted' : 'Active'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.rowBetween, { marginTop: 10 }]}>
                  <Text style={styles.userRole}>Role: {u.role}</Text>
                  {u.status === 'deleted' ? (
                    <TouchableOpacity
                      style={styles.restoreBtn}
                      onPress={() => handleRestoreUser(u)}
                    >
                      <Text style={styles.restoreBtnText}>Restore</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.softDeleteBtn}
                      onPress={() => handleSoftDeleteUser(u)}
                    >
                      <Text style={styles.softDeleteBtnText}>Soft Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SCHOOL RECORDS                                     */}
        {/* ========================================================= */}
        {activeTab === 'records' && (
          <View>
            <Text style={styles.sectionHeading}>Academic Classes & Roster</Text>
            {classes.map((cls) => (
              <View key={cls.id} style={styles.card}>
                <Text style={styles.cardTitle}>{cls.name}</Text>
                <Text style={styles.cardSubtitle}>
                  Grade Level: {cls.gradeLevel} • Room: {cls.room || 'Main Hall'}
                </Text>
                <Text style={styles.credParam}>Capacity: {cls.capacity || 30} Students</Text>
              </View>
            ))}

            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Curriculum Subjects</Text>
            {subjects.map((sub) => (
              <View key={sub.id} style={styles.card}>
                <Text style={styles.cardTitle}>{sub.name}</Text>
                <Text style={styles.cardSubtitle}>Code: {sub.code} • Department: Academic</Text>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CONFIGURATION RESTORE POINTS                       */}
        {/* ========================================================= */}
        {activeTab === 'snapshots' && (
          <View>
            <Text style={styles.sectionHeading}>Configuration Restore Points</Text>
            <Text style={styles.sectionSubtitle}>
              Revert system configuration without modifying student records, attendance, or assessment grades.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create New Snapshot</Text>
              <TextInput
                style={styles.input}
                placeholder="Description (e.g. Pre-term config)"
                placeholderTextColor="#64748b"
                value={snapshotDesc}
                onChangeText={setSnapshotDesc}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, creatingSnapshot && styles.btnDisabled]}
                onPress={handleCreateSnapshot}
                disabled={creatingSnapshot}
              >
                {creatingSnapshot ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Configuration Snapshot</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Stored Restore Points</Text>
            {snapshots.map((snap) => (
              <View key={snap.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{snap.description}</Text>
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleRestoreSnapshot(snap)}
                  >
                    <Text style={styles.restoreBtnText}>Restore</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>
                  Created: {new Date(snap.createdAt).toLocaleString()}
                </Text>
                <Text style={styles.credParam}>
                  Checksum: <Text style={styles.mono}>{snap.checksum?.substring(0, 24)}...</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 7: AWS DISASTER RECOVERY BACKUPS                      */}
        {/* ========================================================= */}
        {activeTab === 'backups' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionHeading}>AWS Disaster Recovery</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, runningBackup && styles.btnDisabled]}
                onPress={handleTriggerBackup}
                disabled={runningBackup}
              >
                <Text style={styles.primaryBtnText}>{runningBackup ? 'Archiving...' : 'Trigger Backup'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Client-owned AWS S3 integration with AES-256-GCM encryption and SHA-256 validation.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>S3 Target Bucket Status</Text>
              <Text style={styles.cardSubtitle}>
                Bucket: {awsStatus?.bucket || 'nina-international-backups-secure (Client Account)'}
              </Text>
              <Text style={styles.credParam}>KMS Key ID: {awsStatus?.kmsKeyId || 'arn:aws:kms:eu-west-1:placeholder:key'}</Text>
            </View>

            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Encrypted Backup Archives</Text>
            {backups.map((job) => (
              <View key={job.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{job.id}</Text>
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleVerifyBackup(job.id)}
                  >
                    <Text style={styles.restoreBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>
                  {new Date(job.timestamp).toLocaleString()} • Size: {Math.round((job.sizeBytes || 1024) / 1024)} KiB
                </Text>
                <Text style={styles.credParam}>Encryption: AES-256-GCM</Text>
                <Text style={styles.credParam}>
                  SHA-256: <Text style={styles.mono}>{job.sha256?.substring(0, 24)}...</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  roleBadge: {
    color: '#38bdf8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  navBarWrapper: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabNavContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#1e293b',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  metricValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  greenPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  labResultBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  labResultTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  labText: {
    color: '#e2e8f0',
    fontSize: 12,
    marginBottom: 4,
  },
  mono: {
    fontFamily: 'monospace',
    color: '#a5f3fc',
  },
  credCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  credUser: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  roleTag: {
    color: '#38bdf8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  credParam: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  credPepper: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  logEvent: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  logDetail: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 4,
  },
  logHash: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#64748b',
    fontSize: 12,
  },
  userRole: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  statusBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeDeleted: {
    backgroundColor: '#7f1d1d',
  },
  statusBadgeText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: 'bold',
  },
  softDeleteBtn: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  softDeleteBtnText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  restoreBtn: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  restoreBtnText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  roleSelectBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSelectBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  roleSelectText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  roleSelectTextActive: {
    color: '#ffffff',
  },
});
