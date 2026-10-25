# Nina International: REST API Specification

## 1. Global Conventions

- **Base URL**: `http://localhost:5050/api` (Local) or `https://[your-domain]/api` (Production).
- **Content-Type**: `application/json` (Payload limit: 1 MB).
- **Authentication**: Bearer Token in `Authorization` header (`Bearer <JWT_TOKEN>`).
- **Standard Error Format**:
  ```json
  {
    "error": "ErrorCategory",
    "message": "Human-readable descriptive explanation of the error."
  }
  ```

---

## 2. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new user account with unique salt + HMAC pepper Argon2id hashing.
- **Access**: Public
- **Rate Limit**: 10 requests / 15 minutes
- **Request Body**:
  ```json
  {
    "fullName": "Abena Frimpong",
    "username": "abena_f",
    "email": "abena.f@ninainternational.edu",
    "password": "Password12345!",
    "role": "student"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "message": "Registration successful. Please verify your email with the verification code.",
    "userId": "usr_...",
    "email": "abena.f@ninainternational.edu",
    "simulatedVerificationOtp": "837492"
  }
  ```

---

### `POST /api/auth/verify-email`
Validates the single-use OTP challenge sent to the user's email.
- **Request Body**: `{"userId": "usr_...", "code": "837492"}`
- **Response** (`200 OK`): `{"message": "Email address verified successfully."}`

---

### `POST /api/auth/login`
Step 1 of authentication. Verifies password against Argon2id hash using server pepper.
- **Request Body**: `{"identifier": "admin@ninainternational.edu", "password": "NinaSecurePass2026!"}`
- **Response A (2FA Required)**:
  ```json
  {
    "requires2FA": true,
    "twoFactorToken": "eyJhbGciOi...",
    "availableMethods": ["totp", "email"],
    "user": { "id": "...", "email": "...", "role": "admin" }
  }
  ```
- **Response B (Direct Access)**:
  ```json
  {
    "requires2FA": false,
    "accessToken": "eyJhbGciOi...",
    "user": { "id": "...", "role": "..." }
  }
  ```

---

### `POST /api/auth/2fa/send-email-otp`
Requests a short-lived Email OTP for 2FA login.
- **Request Body**: `{"twoFactorToken": "eyJhbGciOi..."}`
- **Response** (`200 OK`): `{"message": "Verification code sent to email.", "simulatedOtp": "648201"}`

---

### `POST /api/auth/2fa/verify`
Step 2 of authentication. Validates TOTP code or Email OTP and issues full access token.
- **Request Body**:
  ```json
  {
    "twoFactorToken": "eyJhbGciOi...",
    "method": "totp",
    "code": "123456"
  }
  ```
- **Response** (`200 OK`): `{"accessToken": "...", "user": {...}}`

---

### `POST /api/auth/2fa/setup`
Generates a new TOTP secret, QR code data URL, and 8 recovery codes.
- **Access**: Authenticated

---

### `POST /api/auth/2fa/confirm`
Verifies the initial code from the authenticator app and activates TOTP for the account.
- **Request Body**: `{"code": "123456"}`

---

## 3. Credential Security Audit (`/api/credential-audit`)

### `GET /api/credential-audit`
Returns credential metadata (salt, stored hash, hash parameters, pepper status) for authorized administrators.
- **Access**: Strictly Administrator (`role: admin`)
- **Audit**: Logged as `CREDENTIAL_AUDIT_ACCESSED`

---

### `POST /api/credential-audit/synthetic-lab`
Executes an interactive educational demonstration of the Salt + Pepper + Argon2id pipeline using synthetic input.
- **Request Body**: `{"syntheticInput": "SampleStudentPassword2026!"}`
- **Response** (`200 OK`):
  ```json
  {
    "stage1_plaintext": "SampleStudentPassword2026!",
    "stage2_pepperApplied": {
      "method": "HMAC-SHA256(Key=ServerPepper, Input=Password)",
      "pepperKeyId": "nina-pepper-v1",
      "prehashResult": "..."
    },
    "stage3_saltGeneration": { "saltHex": "...", "saltBytes": 16 },
    "stage4_argon2idHash": { "algorithm": "Argon2id (v19)", "finalStoredHash": "$argon2id$..." }
  }
  ```

---

## 4. User Governance (`/api/users`)

- `GET /api/users` (List users with role and status filters, Admin only).
- `POST /api/users/:userId/soft-delete` (Soft delete user, Admin only).
- `POST /api/users/:userId/restore` (Restore account, Admin only).
- `PATCH /api/users/:userId/role` (Update role, Admin only).

---

## 5. School Management (`/api/school`)

- `GET /api/school/dashboard` (Live data-driven analytics).
- `GET /api/school/students` (List students, Admin/Teacher/Staff).
- `POST /api/school/students` (Enrol student, Admin/Staff).
- `GET /api/school/attendance?classId=...` (Attendance records).
- `POST /api/school/attendance` (Record daily attendance, Teacher/Admin).
- `GET /api/school/grades/student/:studentId` (Student grades, Student self or Teacher/Admin).
- `POST /api/school/grades` (Record/modify grade with mandatory reason, logs `gradeAuditLogs`).
- `GET /api/school/grades/audit-history` (Inspect immutable grade change history).

---

## 6. Security Centre & Restore Points (`/api/security`)

- `GET /api/security/audit-logs` (Filterable, searchable append-only security logs).
- `GET /api/security/snapshots` (List configuration restore points).
- `POST /api/security/snapshots` (Capture new configuration checkpoint).
- `GET /api/security/snapshots/:id/preview` (Preview configuration diff).
- `POST /api/security/snapshots/:id/restore` (Restore configuration safely with rollback).

---

## 7. Disaster Recovery Backups (`/api/backup`)

- `GET /api/backup/jobs` (List backup jobs and AWS integration state).
- `POST /api/backup/jobs` (Execute automated/manual backup).
- `POST /api/backup/jobs/:id/verify` (Execute backup archive integrity test).
