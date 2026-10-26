import { DatabaseService } from '../services/database.service.js';
import { CredentialService } from '../services/credential.service.js';
import { TwoFactorService } from '../services/twoFactor.service.js';
import { ConfigSnapshotService } from '../services/configSnapshot.service.js';
import { AuditService } from '../services/audit.service.js';
import { UserProfile, PrivateCredentialMetadata } from '../types/shared.js';

export async function seedDatabaseIfEmpty(): Promise<void> {
  await DatabaseService.initialize();
  const now = new Date().toISOString();
  let existingUsers = await DatabaseService.getCollection<UserProfile>('userProfiles');

  // Ensure Primary Administrator account always exists
  const brightAdmin = existingUsers.find((u) => u.email === 'brightainoo71@gmail.com');
  if (!brightAdmin) {
    const brightId = 'usr_bright_admin_001';
    const credResult = await CredentialService.hashPassword('P@ssword123!');
    const privateCred: PrivateCredentialMetadata & { failedLoginAttempts: number } = {
      userId: brightId,
      algorithm: 'argon2id',
      libraryVersion: '@node-rs/argon2 v2.0.2',
      hashParams: credResult.hashParams,
      salt: credResult.salt,
      storedHash: credResult.storedHash,
      pepperConfigured: true,
      pepperVersion: credResult.pepperVersion,
      createdAt: now,
      updatedAt: now,
      requiresRehash: false,
      failedLoginAttempts: 0,
    };
    await DatabaseService.setDocument('privateCredentials', brightId, privateCred);
    const brightProfile: UserProfile = {
      id: brightId,
      email: 'brightainoo71@gmail.com',
      username: 'abtuniverse',
      fullName: 'Bright Takyi (System Administrator)',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      totpEnabled: false,
      twoFactorMethod: 'email',
      createdAt: now,
      updatedAt: now,
    };
    await DatabaseService.setDocument('userProfiles', brightId, brightProfile);
    console.log('[Seed] Primary admin brightainoo71@gmail.com provisioned.');
    existingUsers = await DatabaseService.getCollection<UserProfile>('userProfiles');
  }

  if (existingUsers.length > 1) {
    console.log(`Database already populated (${existingUsers.length} users found). Skipping seed.`);
    return;
  }

  console.log('--- Initializing Nina International Secure Database Seed ---');
  const now = new Date().toISOString();
  const defaultPassword = 'NinaSecurePass2026!';

  // ==========================================================
  // 1. DEMO ACCOUNTS (Admin, Teacher, Staff, Student)
  // ==========================================================
  const usersToCreate: Array<{
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: 'admin' | 'teacher' | 'staff' | 'student';
    totpEnabled: boolean;
  }> = [
    {
      id: 'usr_admin_001',
      email: 'admin@ninainternational.edu',
      username: 'admin_sarah',
      fullName: 'Sarah Jenkins (SecAdmin)',
      role: 'admin',
      totpEnabled: true,
    },
    {
      id: 'usr_teacher_001',
      email: 'teacher.mensah@ninainternational.edu',
      username: 'teacher_kwame',
      fullName: 'Kwame Mensah',
      role: 'teacher',
      totpEnabled: false,
    },
    {
      id: 'usr_staff_001',
      email: 'staff.akosua@ninainternational.edu',
      username: 'staff_akosua',
      fullName: 'Akosua Boakye',
      role: 'staff',
      totpEnabled: false,
    },
    {
      id: 'usr_student_001',
      email: 'student.kofi@ninainternational.edu',
      username: 'student_kofi',
      fullName: 'Kofi Owusu',
      role: 'student',
      totpEnabled: false,
    },
  ];

  for (const u of usersToCreate) {
    // 1. Compute Salt + Pepper Argon2id hash
    const credResult = await CredentialService.hashPassword(defaultPassword);

    let encryptedTotpSecret = null;
    let hashedRecoveryCodes = null;

    if (u.totpEnabled) {
      const totpSetup = await TwoFactorService.generateTotpSetup(u.email);
      encryptedTotpSecret = totpSetup.encryptedSecret;
      hashedRecoveryCodes = totpSetup.hashedRecoveryCodes;
    }

    const privateCred: PrivateCredentialMetadata & {
      failedLoginAttempts: number;
      totpSecretEncrypted?: string | null;
      recoveryCodesHashed?: string[] | null;
    } = {
      userId: u.id,
      algorithm: 'argon2id',
      libraryVersion: '@node-rs/argon2 v2.0.2',
      hashParams: credResult.hashParams,
      salt: credResult.salt,
      storedHash: credResult.storedHash,
      pepperConfigured: true,
      pepperVersion: credResult.pepperVersion,
      createdAt: now,
      updatedAt: now,
      requiresRehash: false,
      failedLoginAttempts: 0,
      totpSecretEncrypted: encryptedTotpSecret,
      recoveryCodesHashed: hashedRecoveryCodes,
    };
    await DatabaseService.setDocument('privateCredentials', u.id, privateCred);

    const profile: UserProfile = {
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      status: 'active',
      emailVerified: true,
      totpEnabled: u.totpEnabled,
      twoFactorMethod: u.totpEnabled ? 'totp' : 'email',
      createdAt: now,
      updatedAt: now,
    };
    await DatabaseService.setDocument('userProfiles', u.id, profile);
  }

  // ==========================================================
  // 2. ACADEMIC CONFIGURATION (Classes, Subjects, Years)
  // ==========================================================
  const academicYear = {
    id: 'ay_2026_2027',
    name: '2026 / 2027 Academic Session',
    startDate: '2026-09-01',
    endDate: '2027-07-20',
    isCurrent: true,
    terms: [
      { id: 'term_1', name: 'First Term (Fall)', startDate: '2026-09-01', endDate: '2026-12-15', isCurrent: true },
      { id: 'term_2', name: 'Second Term (Spring)', startDate: '2027-01-10', endDate: '2027-04-12', isCurrent: false },
    ],
  };
  await DatabaseService.setDocument('academicYears', academicYear.id, academicYear);

  const classes = [
    { id: 'class_jhs1', name: 'JHS 1 Gold', gradeLevel: 'Grade 7', academicYearId: 'ay_2026_2027', classTeacherId: 'usr_teacher_001', classTeacherName: 'Kwame Mensah', capacity: 35, roomNumber: 'Block A, Room 101' },
    { id: 'class_jhs2', name: 'JHS 2 Diamond', gradeLevel: 'Grade 8', academicYearId: 'ay_2026_2027', capacity: 35, roomNumber: 'Block A, Room 102' },
    { id: 'class_jhs3', name: 'JHS 3 Platinum', gradeLevel: 'Grade 9', academicYearId: 'ay_2026_2027', capacity: 30, roomNumber: 'Block B, Room 201' },
  ];
  for (const c of classes) {
    await DatabaseService.setDocument('classes', c.id, c);
  }

  const subjects = [
    { id: 'sub_math', code: 'MTH-101', name: 'General Mathematics', department: 'Science & Math', description: 'Algebra, Geometry, and Probability' },
    { id: 'sub_sci', code: 'SCI-101', name: 'Integrated Science', department: 'Science & Math', description: 'Physics, Chemistry, and Biology essentials' },
    { id: 'sub_eng', code: 'ENG-101', name: 'English Language', department: 'Languages', description: 'Comprehension, Grammar, and Composition' },
    { id: 'sub_ict', code: 'ICT-101', name: 'Information Technology', department: 'Computing', description: 'Programming, Cybersecurity, and Web systems' },
  ];
  for (const s of subjects) {
    await DatabaseService.setDocument('subjects', s.id, s);
  }

  // Teacher Profile
  await DatabaseService.setDocument('teachers', 'usr_teacher_001', {
    id: 'usr_teacher_001',
    userId: 'usr_teacher_001',
    fullName: 'Kwame Mensah',
    email: 'teacher.mensah@ninainternational.edu',
    employeeNumber: 'TEA-2026-042',
    specialization: 'Information Technology & Mathematics',
    assignedClassIds: ['class_jhs1', 'class_jhs2'],
    assignedSubjectIds: ['sub_ict', 'sub_math'],
    createdAt: now,
    updatedAt: now,
  });

  // Staff Profile
  await DatabaseService.setDocument('staff', 'usr_staff_001', {
    id: 'usr_staff_001',
    userId: 'usr_staff_001',
    fullName: 'Akosua Boakye',
    email: 'staff.akosua@ninainternational.edu',
    employeeNumber: 'STF-2026-015',
    department: 'Admissions & Student Affairs',
    position: 'Senior Registrar Officer',
    createdAt: now,
    updatedAt: now,
  });

  // Student Profiles
  const students = [
    {
      id: 'usr_student_001',
      userId: 'usr_student_001',
      studentNumber: 'NINA-2026-0001',
      fullName: 'Kofi Owusu',
      email: 'student.kofi@ninainternational.edu',
      guardianName: 'Dr. Ernest Owusu',
      guardianPhone: '+233 24 111 2233',
      guardianEmail: 'ernest.owusu@example.com',
      enrolmentStatus: 'enrolled',
      classId: 'class_jhs1',
      className: 'JHS 1 Gold',
      dateOfBirth: '2012-04-18',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'stu_demo_002',
      userId: 'stu_demo_002',
      studentNumber: 'NINA-2026-0002',
      fullName: 'Ama Serwaa',
      email: 'ama.serwaa@students.ninainternational.edu',
      guardianName: 'Grace Serwaa',
      guardianPhone: '+233 20 444 5566',
      guardianEmail: 'grace.serwaa@example.com',
      enrolmentStatus: 'enrolled',
      classId: 'class_jhs1',
      className: 'JHS 1 Gold',
      dateOfBirth: '2012-07-22',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'stu_demo_003',
      userId: 'stu_demo_003',
      studentNumber: 'NINA-2026-0003',
      fullName: 'Yaw Boateng',
      email: 'yaw.boateng@students.ninainternational.edu',
      guardianName: 'Samuel Boateng',
      guardianPhone: '+233 27 777 8899',
      guardianEmail: 'samuel.boateng@example.com',
      enrolmentStatus: 'enrolled',
      classId: 'class_jhs1',
      className: 'JHS 1 Gold',
      dateOfBirth: '2011-11-09',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const st of students) {
    await DatabaseService.setDocument('students', st.id, st);
  }

  // ==========================================================
  // 3. TIMETABLES & ATTENDANCE
  // ==========================================================
  const timetable = [
    { id: 'tt_1', classId: 'class_jhs1', subjectId: 'sub_ict', subjectName: 'Information Technology', teacherId: 'usr_teacher_001', teacherName: 'Kwame Mensah', dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:30', roomNumber: 'Computer Lab 1' },
    { id: 'tt_2', classId: 'class_jhs1', subjectId: 'sub_math', subjectName: 'General Mathematics', teacherId: 'usr_teacher_001', teacherName: 'Kwame Mensah', dayOfWeek: 'Tuesday', startTime: '09:45', endTime: '11:15', roomNumber: 'Block A, Room 101' },
    { id: 'tt_3', classId: 'class_jhs1', subjectId: 'sub_sci', subjectName: 'Integrated Science', teacherId: 'usr_teacher_001', teacherName: 'Kwame Mensah', dayOfWeek: 'Wednesday', startTime: '11:30', endTime: '13:00', roomNumber: 'Science Lab' },
  ];
  for (const t of timetable) {
    await DatabaseService.setDocument('timetables', t.id, t);
  }

  // Attendance Records
  const attendance = [
    { id: 'att_001', studentId: 'usr_student_001', studentName: 'Kofi Owusu', classId: 'class_jhs1', date: '2026-10-15', status: 'present', markedBy: 'usr_teacher_001', recordedAt: now },
    { id: 'att_002', studentId: 'stu_demo_002', studentName: 'Ama Serwaa', classId: 'class_jhs1', date: '2026-10-15', status: 'present', markedBy: 'usr_teacher_001', recordedAt: now },
    { id: 'att_003', studentId: 'stu_demo_003', studentName: 'Yaw Boateng', classId: 'class_jhs1', date: '2026-10-15', status: 'late', markedBy: 'usr_teacher_001', notes: 'Arrived 15 mins late due to rain', recordedAt: now },
  ];
  for (const a of attendance) {
    await DatabaseService.setDocument('attendance', a.id, a);
  }

  // ==========================================================
  // 4. ASSESSMENTS & GRADES
  // ==========================================================
  const assessments = [
    { id: 'asm_midterm_ict', title: 'Mid-Term Practical Test', subjectId: 'sub_ict', subjectName: 'Information Technology', classId: 'class_jhs1', termId: 'term_1', maxScore: 100, weightPercentage: 30, dueDate: '2026-10-20', createdBy: 'usr_teacher_001' },
    { id: 'asm_quiz_math', title: 'Algebra & Equations Quiz', subjectId: 'sub_math', subjectName: 'General Mathematics', classId: 'class_jhs1', termId: 'term_1', maxScore: 50, weightPercentage: 15, dueDate: '2026-10-12', createdBy: 'usr_teacher_001' },
  ];
  for (const asm of assessments) {
    await DatabaseService.setDocument('assessments', asm.id, asm);
  }

  const grades = [
    { id: 'grd_kofi_ict', studentId: 'usr_student_001', studentName: 'Kofi Owusu', studentNumber: 'NINA-2026-0001', assessmentId: 'asm_midterm_ict', assessmentTitle: 'Mid-Term Practical Test', subjectId: 'sub_ict', subjectName: 'Information Technology', score: 92, maxScore: 100, feedback: 'Excellent grasp of cybersecurity protocols and database keys.', gradedBy: 'usr_teacher_001', gradedByName: 'Kwame Mensah', gradedAt: now, updatedAt: now },
    { id: 'grd_kofi_math', studentId: 'usr_student_001', studentName: 'Kofi Owusu', studentNumber: 'NINA-2026-0001', assessmentId: 'asm_quiz_math', assessmentTitle: 'Algebra & Equations Quiz', subjectId: 'sub_math', subjectName: 'General Mathematics', score: 46, maxScore: 50, feedback: 'Great computational accuracy.', gradedBy: 'usr_teacher_001', gradedByName: 'Kwame Mensah', gradedAt: now, updatedAt: now },
  ];
  for (const g of grades) {
    await DatabaseService.setDocument('grades', g.id, g);
  }

  // ==========================================================
  // 5. INITIAL CONFIGURATION SNAPSHOT & AUDIT LOGS
  // ==========================================================
  await ConfigSnapshotService.createSnapshot({
    description: 'Initial Baseline System Configuration Snapshot (Nina v1.0.0)',
    createdBy: 'usr_admin_001',
    createdByName: 'Sarah Jenkins (SecAdmin)',
  });

  await AuditService.logEvent({
    actorId: 'usr_admin_001',
    actorRole: 'admin',
    actorEmail: 'admin@ninainternational.edu',
    action: 'SYSTEM_INITIALIZED',
    resource: 'system/seed',
    outcome: 'success',
    details: {
      seededUsersCount: usersToCreate.length,
      roles: ['admin', 'teacher', 'staff', 'student'],
      academicYear: '2026-2027',
    },
  });

  console.log('--- Nina International Database Seed Complete ---');
}
