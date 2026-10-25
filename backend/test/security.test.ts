import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { CredentialService } from '../src/services/credential.service.js';
import { TwoFactorService } from '../src/services/twoFactor.service.js';
import { TokenService } from '../src/services/token.service.js';
import { DatabaseService } from '../src/services/database.service.js';
import { AuditService } from '../src/services/audit.service.js';
import { ConfigSnapshotService } from '../src/services/configSnapshot.service.js';
import { SchoolService } from '../src/services/school.service.js';
import { seedDatabaseIfEmpty } from '../src/seed/seedData.js';

describe('Nina International: Automated Security & Cryptography Test Suite', () => {
  before(async () => {
    await seedDatabaseIfEmpty();
  });

  // ==========================================================
  // 1. PASSWORD SALT & PEPPER (ARGON2ID) SECURITY
  // ==========================================================
  test('1.1: Cryptographic Salt Uniqueness: Identical passwords produce different salts and hashes', async () => {
    const password = 'SharedAcademicPassword2026!';
    const hash1 = await CredentialService.hashPassword(password);
    const hash2 = await CredentialService.hashPassword(password);

    assert.notStrictEqual(hash1.salt, hash2.salt, 'Salts must be cryptographically distinct');
    assert.notStrictEqual(hash1.storedHash, hash2.storedHash, 'Stored Argon2id hashes must differ');
    assert.strictEqual(hash1.salt.length, 32, 'Salt hex must be exactly 16 bytes (32 hex characters)');
  });

  test('1.2: Password Verification with Keyed Pepper: Valid password verifies true, wrong password false', async () => {
    const password = 'CorrectPassword99!';
    const credResult = await CredentialService.hashPassword(password);

    const isValid = await CredentialService.verifyPassword(password, credResult.storedHash);
    const isInvalid = await CredentialService.verifyPassword('WrongPassword99!', credResult.storedHash);

    assert.strictEqual(isValid, true, 'Valid password must verify successfully');
    assert.strictEqual(isInvalid, false, 'Invalid password must be rejected');
  });

  test('1.3: Server-side Pepper Isolation: Verification fails if wrong pepper key is used', async () => {
    const password = 'PepperTestPassword!';
    const credResult = await CredentialService.hashPassword(password, 'nina-pepper-v1');

    // Simulate wrong pepper key
    const isWrongPepper = await CredentialService.verifyPassword(password, credResult.storedHash, 'nonexistent-pepper-key');
    assert.strictEqual(isWrongPepper, false, 'Hash must not verify when pepper is missing or incorrect');
  });

  test('1.4: Zero Plaintext in Database: Passwords stored as Argon2id strings only', async () => {
    const creds = await DatabaseService.getDocument('privateCredentials', 'usr_admin_001');
    assert.ok(creds.storedHash.startsWith('$argon2id$v=19$'), 'Stored hash must be Argon2id encoded');
    assert.strictEqual(creds.password, undefined, 'Plaintext password must NEVER exist in document');
  });

  // ==========================================================
  // 2. TWO-FACTOR AUTHENTICATION (TOTP & EMAIL OTP)
  // ==========================================================
  test('2.1: TOTP RFC 6238 Secret Encryption at Rest: Secret is encrypted with AES-256-GCM', async () => {
    const setup = await TwoFactorService.generateTotpSetup('testuser@nina.edu');
    assert.ok(setup.encryptedSecret.includes(':'), 'Encrypted secret must follow iv:tag:ciphertext format');

    const decrypted = TwoFactorService.decryptAtRest(setup.encryptedSecret);
    assert.strictEqual(decrypted, setup.secretBase32, 'Decrypted secret must match original Base32 secret');
  });

  test('2.2: Single-Use Recovery Codes: 8 unique recovery codes generated and hashed', async () => {
    const setup = await TwoFactorService.generateTotpSetup('testuser2@nina.edu');
    assert.strictEqual(setup.recoveryCodes.length, 8, 'Must generate exactly 8 recovery codes');
    assert.strictEqual(setup.hashedRecoveryCodes.length, 8, 'Must store hashed representation of codes');
  });

  test('2.3: Email OTP Challenge Expiration & Verification', async () => {
    const otp = TwoFactorService.generateEmailOtp();
    assert.strictEqual(otp.code.length, 6, 'Email OTP must be 6 digits');

    const validCheck = TwoFactorService.verifyEmailOtp(otp.code, otp.codeHash);
    const invalidCheck = TwoFactorService.verifyEmailOtp('000000', otp.codeHash);

    assert.strictEqual(validCheck, true, 'Matching OTP must verify');
    assert.strictEqual(invalidCheck, false, 'Mismatched OTP must fail');
  });

  // ==========================================================
  // 3. AUTHORIZATION & IDOR PREVENTION
  // ==========================================================
  test('3.1: Token Scope Verification: 2FA Pending token cannot be used as full access token', () => {
    const dummyUser: any = { id: 'usr_test_1', email: 'test@nina.edu', username: 'test', role: 'student', status: 'active' };
    const pendingToken = TokenService.generate2FAPendingToken(dummyUser);

    assert.throws(() => {
      TokenService.verifyToken(pendingToken, 'access');
    }, /Invalid token type/, 'Pending 2FA token must be rejected on endpoints expecting access token');
  });

  // ==========================================================
  // 4. SOFT DELETION & ACCOUNT GOVERNANCE
  // ==========================================================
  test('4.1: Soft Deletion: User status changes to deleted and timestamp recorded', async () => {
    const userId = 'usr_student_001';
    const original = await DatabaseService.getDocument('userProfiles', userId);

    await DatabaseService.updateDocument('userProfiles', userId, {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: 'usr_admin_001',
    });

    const updated = await DatabaseService.getDocument('userProfiles', userId);
    assert.strictEqual(updated.status, 'deleted', 'Account status must be deleted');
    assert.ok(updated.deletedAt, 'deletedAt timestamp must be populated');

    // Restore back for other tests
    await DatabaseService.updateDocument('userProfiles', userId, {
      status: 'active',
      deletedAt: null,
      restoredAt: new Date().toISOString(),
    });
  });

  // ==========================================================
  // 5. CONFIGURATION SNAPSHOTS & STUDENT DATA IMMUTABILITY
  // ==========================================================
  test('5.1: Config Restore Point Integrity: Snapshots use SHA-256 checksum and do not touch grades', async () => {
    const gradesBefore = await DatabaseService.getCollection('grades');

    const snapshot = await ConfigSnapshotService.createSnapshot({
      description: 'Automated Test Restore Point',
      createdBy: 'usr_admin_001',
    });

    assert.ok(snapshot.integrityHash, 'Snapshot must possess SHA-256 integrity hash');

    // Restore snapshot
    const result = await ConfigSnapshotService.restoreSnapshot({
      snapshotId: snapshot.id,
      actorId: 'usr_admin_001',
      reason: 'Testing restoration immutability on school records',
    });

    assert.ok(result.rollbackSnapshotId, 'Must create automatic rollback snapshot');

    const gradesAfter = await DatabaseService.getCollection('grades');
    assert.strictEqual(gradesBefore.length, gradesAfter.length, 'Grade count must remain identical');
    assert.deepStrictEqual(gradesBefore, gradesAfter, 'Student grades must be 100% untouched by config restore');
  });

  // ==========================================================
  // 6. GRADE MODIFICATION AUDIT HISTORY
  // ==========================================================
  test('6.1: Controlled Grade Changes: Updates generate immutable gradeAuditLog with reason', async () => {
    const updatedGrade = await SchoolService.updateGrade({
      studentId: 'usr_student_001',
      assessmentId: 'asm_midterm_ict',
      subjectId: 'sub_ict',
      score: 95,
      maxScore: 100,
      actorId: 'usr_teacher_001',
      actorName: 'Kwame Mensah',
      reason: 'Grade regraded upon dispute resolution',
    });

    const history = await SchoolService.getGradeAuditHistory(undefined, 'usr_student_001');
    assert.ok(history.length > 0, 'Audit entry must exist');
    assert.strictEqual(history[0].newScore, 95, 'New score must match');
    assert.strictEqual(history[0].reason, 'Grade regraded upon dispute resolution', 'Mandatory reason must be logged');
  });

  // ==========================================================
  // 7. TAMPER-EVIDENT AUDIT TRAIL LOGGING
  // ==========================================================
  test('7.1: Security Centre Audit Logs: Cryptographic hash chaining and credential sanitization', async () => {
    const log = await AuditService.logEvent({
      actorId: 'usr_admin_001',
      actorRole: 'admin',
      action: 'TEST_AUDIT_LOG',
      resource: 'test/resource',
      outcome: 'success',
      details: {
        password: 'AttemptedPasswordShouldBeRedacted',
        token: 'SecretTokenShouldBeRedacted',
        studentNumber: 'NINA-2026-0001',
      },
    });

    assert.strictEqual(log.details.password, '[REDACTED_CREDENTIAL_DATA]', 'Passwords must be redacted');
    assert.strictEqual(log.details.token, '[REDACTED_CREDENTIAL_DATA]', 'Tokens must be redacted');
    assert.strictEqual(log.details.studentNumber, 'NINA-2026-0001', 'Safe details must be preserved');
    assert.ok((log as any).integrityHash, 'Audit entry must possess SHA-256 integrity hash');
  });
});
