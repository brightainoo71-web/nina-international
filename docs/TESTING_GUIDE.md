# Nina International: Testing & Security Verification Guide

## 1. Automated Test Suite Execution

The repository includes a comprehensive automated security test suite covering password cryptography, salt uniqueness, server-side pepper isolation, TOTP 2FA encryption, soft deletion, configuration restore points, and grade audit trails.

### Running the Test Suite
```bash
cd backend
npx tsx --test test/security.test.ts
```

### Automated Test Coverage Matrix
| Test Case | Objective | Cryptographic / Security Requirement Verified | Outcome |
| :--- | :--- | :--- | :--- |
| **1.1: Salt Uniqueness** | Verify salt randomness | Two identical passwords produce different 128-bit salts and distinct Argon2id hashes. | ✅ Pass |
| **1.2: Password Verification** | Test verification | Correct password verifies true; incorrect password verifies false. | ✅ Pass |
| **1.3: Pepper Isolation** | Test secret key dependency | Verification fails if the pepper key is unknown or altered. | ✅ Pass |
| **1.4: Zero Plaintext** | DB credential inspection | Credentials stored strictly as Argon2id strings; no plaintext password stored. | ✅ Pass |
| **2.1: TOTP Encryption** | 2FA secret at rest | Base32 TOTP secret is encrypted via AES-256-GCM (`iv:tag:cipher`). | ✅ Pass |
| **2.2: Recovery Codes** | 2FA disaster recovery | 8 single-use recovery codes generated; only SHA-256 hashes stored. | ✅ Pass |
| **2.3: Email OTP** | Ephemeral 2FA OTP | 6-digit cryptographic challenge expires in 10 minutes and verifies single use. | ✅ Pass |
| **3.1: Token Scope** | Privilege isolation | `2fa_pending` intermediate tokens cannot access protected data APIs. | ✅ Pass |
| **4.1: Soft Deletion** | Account lifecycle | Soft deletion sets `status: 'deleted'` and records actor/timestamp. | ✅ Pass |
| **5.1: Config Immutability** | Disaster recovery | Restoring configuration restores global settings without altering student grades. | ✅ Pass |
| **6.1: Grade Audit Trail** | Data modification history | Grade updates produce immutable `gradeAuditLogs` trail recording old/new scores and reason. | ✅ Pass |
| **7.1: Tamper-Evident Logs** | Audit log integrity | SHA-256 hash chaining links events and sanitizes/redacts password and OTP fields. | ✅ Pass |

---

## 2. Manual End-to-End Test Plan

### Test Scenario A: Authentication & Two-Factor Enforcement
1. Navigate to `http://localhost:5173`.
2. Click the quick-fill button for **Administrator** (`admin@ninainternational.edu`).
3. Click **Sign In Securely**.
4. Observe that the password succeeds and the system halts at the **Two-Factor Authentication Required** gate.
5. Select **Email OTP** and click **Send Verification Code to Email**.
6. The test challenge code is displayed (e.g. `726361`). Enter the code and click **Complete Authentication**.
7. Confirm that the dashboard loads with administrative permissions.

---

### Test Scenario B: Academic Credential Audit Dashboard
1. Log in as an **Administrator**.
2. Click **Credential Audit** in the top navigation bar.
3. Verify that the table displays:
   - Hashing Algorithm (`argon2id v19`)
   - Library Version (`@node-rs/argon2 v2.0.2`)
   - Memory Cost (`64 MB / 65536 KiB`)
   - Unique Salt Hex string
   - Stored Argon2id Hash string
   - Pepper Key status (`nina-pepper-v1: Protected Server-Side`)
4. In the **Controlled Academic Demonstration: Live Transformation Pipeline**:
   - Enter any sample password string (e.g. `DemonstrationStudentPassword2026!`).
   - Click **Run Transformation Pipeline**.
   - Observe live rendering of Stage 1 (Plaintext) -> Stage 2 (Keyed HMAC-SHA256 Pepper) -> Stage 3 (128-bit Salt) -> Stage 4 (Argon2id Hash).
   - Confirm that the actual pepper secret is never displayed in the UI.

---

### Test Scenario C: Soft Deletion & Restoration
1. In the Administrator portal, click **User Management**.
2. Locate a student account (e.g. `student_kofi`).
3. Click **Deactivate**.
4. Enter an administrative reason (e.g. `Temporary academic leave of absence`) and click **Confirm Action**.
5. Observe that the user's status updates to **Soft-Deleted**.
6. Open an incognito browser window and attempt to log in as `student.kofi@ninainternational.edu`.
7. Verify that login is immediately blocked: *"This account has been deactivated. Please contact the administrator."*
8. In the Administrator portal, click **Restore**.
9. Verify that the account returns to **Active** status and login succeeds again.

---

### Test Scenario D: Grade Modification & Audit Logging
1. Log in as a **Teacher** (`teacher.mensah@ninainternational.edu`).
2. Navigate to **Assessment & Grades**.
3. Select a student and click **Grade / Modify**.
4. Change the score from 92 to 95.
5. In the mandatory reason input, enter: `Dispute resolved after practical demonstration`.
6. Click **Commit Grade**.
7. Inspect the **Immutable Grade Modification History** table below:
   - Confirm that the timestamp, instructor name, previous score (`92`), new score (`95`), and reason are logged.

---

### Test Scenario E: Configuration Restore Point vs Student Record Immutability
1. In the Administrator portal, click **Restore Points**.
2. Observe the active system settings card.
3. Click **Create Restore Point** and save a snapshot labeled `Baseline Snapshot`.
4. Click **Preview & Restore** on an existing snapshot.
5. Inspect the diff preview displaying differences between current and target configuration.
6. Enter a reason and confirm restoration.
7. Navigate to **School Records** > **Students** and verify that no student records, attendance marks, or grades have changed.
