# Nina International: STRIDE Threat Model & Risk Assessment

## 1. Executive Summary

This document presents the formal security threat model for the **Nina International Secure School Management System**. The model utilizes the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to evaluate potential vulnerabilities across all software layers (Web, Mobile, Backend REST API, Database, and Cloud Storage).

---

## 2. Asset Inventory

| Asset Classification | Description | Sensitivity | Protection Mechanisms |
| :--- | :--- | :--- | :--- |
| **Password Hashes & Salts** | Argon2id stored hashes and 128-bit unique salts | High | Separate `privateCredentials` collection, isolated from frontend queries. |
| **Server-Side Pepper** | Secret key used for HMAC pre-hashing | Critical | Held exclusively in AWS Secrets Manager / environment; never in DB. |
| **TOTP Secrets** | Base32 seeds for RFC 6238 authenticators | Critical | Encrypted at rest via AES-256-GCM using `DATA_ENCRYPTION_KEY`. |
| **Student Academic Records** | Grades, transcripts, disciplinary notes | High | RBAC authorization, immutable `gradeAuditLogs` change history. |
| **Audit Trails** | Security logs, authentication history | High | Append-only write restrictions, SHA-256 hash chaining. |
| **Disaster Recovery Archives** | Full database backup payloads | Critical | Client-side AES-256-GCM encryption, SHA-256 checksum, S3 Object Lock. |

---

## 3. STRIDE Threat Analysis

### A. Spoofing Identity
* **Threat**: An adversary attempts to log in as an administrator or teacher using brute-forced credentials.
* **Mitigation**:
  1. Rate limiting on `/api/auth/login` (10 requests per 15 minutes per IP).
  2. Account lockout after 5 consecutive failed attempts.
  3. Two-Factor Authentication (TOTP or Email OTP) is mandatory before a session token is issued.
  4. Scoped JWT tokens: `2fa_pending` tokens cannot invoke protected data APIs.

### B. Tampering with Data
* **Threat 1**: A rogue teacher or compromised account alters student grades maliciously.
* **Mitigation**: The `SchoolService.updateGrade` method records the previous score, new score, actor ID, and mandatory change reason in `gradeAuditLogs`.
* **Threat 2**: An attacker tampers with an export backup archive or configuration snapshot.
* **Mitigation**: Snapshots and backup archives compute SHA-256 integrity checksums. Restoration verifies the payload before applying changes.

### C. Repudiation
* **Threat**: A user denies performing a destructive action (such as soft-deleting a student account or restoring a configuration snapshot).
* **Mitigation**: All state-changing administrative operations emit structured audit logs recording `actorId`, `actorRole`, `timestamp`, `ipAddress`, and `userAgent` with forward cryptographic hash chaining.

### D. Information Disclosure
* **Threat 1**: Password hashes or salts leaked through public APIs.
* **Mitigation**: `userProfiles` contains no credential data. Credential records are confined to `privateCredentials`, accessible solely by authorized administrators inside the Credential Audit interface after re-authentication.
* **Threat 2**: Pepper secret leakage.
* **Mitigation**: The pepper key is never transmitted across the network, never logged, and never included in API responses. The audit dashboard displays only the key identifier (`nina-pepper-v1`).

### E. Denial of Service (DoS)
* **Threat**: An attacker floods authentication endpoints or exports to exhaust server CPU and memory.
* **Mitigation**:
  1. Express rate limiters applied globally (`apiRateLimiter`) and specifically on auth routes (`authRateLimiter`).
  2. Express payload body limits strictly enforced at 1 MB to prevent buffer overflow attacks.
  3. Argon2id resource parameters tuned to prevent worker thread saturation.

### F. Elevation of Privilege
* **Threat 1**: A student modifies a request parameter (e.g. `/school/grades/student/other_student_id`) to view or edit another student's grades (IDOR).
* **Mitigation**: `requireStudentSelfOrStaff` middleware and Firestore Security Rules compare `request.auth.uid` against the target document ID.
* **Threat 2**: Public registration creating an administrator account.
* **Mitigation**: Public `/api/auth/register` explicitly forces `student` role; admin privileges cannot be self-assigned.

---

## 4. Residual Risks & Operational Assumptions

1. **Host Compromise**: If an attacker gains root/administrator shell access to the host machine running the backend server, they could extract environment variables (`PEPPER_SECRET`). Mitigation in production relies on AWS IAM role-based authentication with temporary credentials fetched directly from AWS Secrets Manager.
2. **Client Email Security**: Email OTP is recognized as inherently weaker than authenticator-based TOTP due to potential email account compromise or SIM swapping. The system explicitly displays this warning and encourages TOTP enrollment.
