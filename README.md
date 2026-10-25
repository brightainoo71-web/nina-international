# Nina International Secure School Management System

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Security Standard](https://img.shields.io/badge/security-Argon2id%20+%20HMAC%20Pepper-blue)
![2FA Compliance](https://img.shields.io/badge/2FA-RFC%206238%20TOTP%20+%20Email%20OTP-teal)
![Encryption](https://img.shields.io/badge/encryption-AES--256--GCM-indigo)
![Platform](https://img.shields.io/badge/clients-React%20Web%20+%20Expo%20Go%20Mobile-blueviolet)

**Nina International** is a secure, full-stack, enterprise-grade School Management System engineered as a real client application and an academic Computer and Information Security showcase. It demonstrates enterprise security principles through functioning code, rigorous cryptographic implementations, and dual-client support across Responsive Web and Android Expo Go Mobile.

---

## 🌟 Key Security & Engineering Features

1. **Academic Password Salt & Pepper Mechanism**:
   - Implementation using vetted `@node-rs/argon2` (Argon2id v19).
   - Parameters: Memory cost = 64 MB ($65,536\text{ KiB}$), Time iterations = 3, Parallelism = 4 threads.
   - **Keyed Server-Side Pepper**: Pre-hash keyed transformation $\text{HMAC-SHA256}(\text{Key}=\text{Pepper}, \text{Data}=\text{Password})$.
   - **Unique 128-bit Salt**: Cryptographically generated per credential via `crypto.randomBytes(16)`.
   - **Zero Plaintext Storage**: Plaintext passwords are never stored in the database or logged.
   - **Pepper Isolation**: Stored strictly in server-side secret management (AWS Secrets Manager in production), never beside hashes.
2. **Administrator Credential Security Audit Dashboard**:
   - Dedicated inspection view displaying hashing algorithm, library version, memory parameters, unique salt hex, stored hash, and pepper configuration status.
   - **Interactive Synthetic Lab**: Demonstrates the live step-by-step cryptographic pipeline using synthetic inputs without exposing actual user passwords or secret pepper contents.
3. **Two-Factor Authentication (2FA)**:
   - **Method 1**: RFC 6238 TOTP compatible with Google Authenticator, Microsoft Authenticator, etc. Secrets are encrypted at rest using AES-256-GCM. Includes 8 single-use hashed recovery codes.
   - **Method 2**: Short-lived, single-use, brute-force rate-limited Email OTP challenges.
4. **Role-Based Access Control (RBAC)**:
   - Four distinct roles: **Administrator**, **Teacher**, **School Staff**, and **Student**.
   - Enforced across backend API middlewares and Firestore Security Rules.
   - Students are cryptographically restricted to their own profiles, grades, and timetables (strict Insecure Direct Object Reference / IDOR prevention).
5. **Soft Deletion & Account Governance**:
   - Deleting an account sets `status: 'deleted'` and records `deletedAt` and `deletedBy`.
   - Preserves academic records and audit history while completely blocking login and revoking sessions.
   - Controlled restoration restores accounts with mandatory justification and audit logging.
6. **Configuration Restore Points**:
   - Configuration snapshots captured with SHA-256 integrity checksums.
   - Diff preview prior to restoration.
   - Automatic rollback checkpoint taken before applying changes.
   - **Student Record Immutability**: Restoring configuration snapshots strictly updates system settings and *never* modifies student records, attendance, or grades.
7. **Disaster Recovery & AWS S3 Backups**:
   - Scheduled and manual database archive orchestration.
   - Archives are encrypted at rest using authenticated AES-256-GCM encryption with SHA-256 payload checksums.
   - Staged locally and transferred to client-owned Amazon S3 buckets.
   - Integrated archive integrity test verifying checksum and document hierarchy.
8. **Security Centre & Tamper-Evident Audit Trails**:
   - Append-only audit logger capturing logins, 2FA challenges, role modifications, grade changes, and backup events.
   - Cryptographic SHA-256 hash chaining linking each event to prior log hashes.
   - Real-time search, multi-factor filtering, and JSON/CSV export.
   - Strict credential sanitization redacting passwords, tokens, and pepper values.
9. **Controlled Grade Modification Trail**:
   - Updating assessment grades requires a mandatory administrative reason and records instructor identity, old score, new score, and timestamp in an immutable `gradeAuditLogs` trail.

---

## 🏗️ Technology Stack

- **Web Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Mobile Frontend**: React Native, Expo SDK 52, Expo Go Android compatibility, Expo SecureStore.
- **Backend**: Node.js v24, TypeScript, Express, Helmet, CORS, Express-Rate-Limit.
- **Cryptography**: `@node-rs/argon2`, Node.js native `crypto` (HMAC-SHA256, AES-256-GCM, randomBytes), `otpauth` (RFC 6238), `qrcode`.
- **Database**: Cloud Firestore schema design with persistent JSON engine for zero-configuration local evaluation.
- **Cloud & Infrastructure**: Amazon S3 (protected backups), AWS Secrets Manager (pepper key), AWS KMS.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### 1. Start the Backend API Server
```bash
cd backend
npm install
npm run dev
```
The backend starts on `http://localhost:5050` and automatically populates the seed database with demo accounts, classes, subjects, attendance, and assessment grades.

### 2. Start the Responsive Web Application
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in any browser.

### 3. Start the Expo Go Mobile Application
```bash
cd mobile
npm start
```
Install **Expo Go** from the Google Play Store on your Android phone, ensure your phone is connected to the same local Wi-Fi network as your computer, and scan the terminal QR code.

---

## 👥 Built-In Demonstration Accounts

| Role | Email Address | Default Password | Initial 2FA State |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ninainternational.edu` | `NinaSecurePass2026!` | TOTP Enrolled |
| **Teacher** | `teacher.mensah@ninainternational.edu` | `NinaSecurePass2026!` | Email OTP |
| **School Staff** | `staff.akosua@ninainternational.edu` | `NinaSecurePass2026!` | Email OTP |
| **Student** | `student.kofi@ninainternational.edu` | `NinaSecurePass2026!` | Email OTP / Self TOTP |

*(Quick-login buttons on both web and mobile automatically fill these accounts for presentation convenience.)*

---

## 🧪 Running Automated Security Tests

Execute the automated cryptographic and authorization test suite:
```bash
cd backend
npx tsx --test test/security.test.ts
```
**Test Results: 12 passing, 0 failing**
- Salt uniqueness verification
- Password verification with keyed pepper
- Server-side pepper isolation check
- Zero plaintext in database assertion
- TOTP AES-256-GCM encryption at rest check
- Recovery codes generation & hashing test
- Email OTP expiration and verification
- Token scope enforcement
- Soft deletion governance test
- Config restore point student data immutability test
- Grade change audit history logging test
- Security Centre tamper-evident hash chaining test

---

## 📚 Project Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): System components, communication boundaries, and data flow.
- [SECURITY.md](docs/SECURITY.md): Salt & Pepper cryptographic specification, parameters, and threat analysis.
- [THREAT_MODEL.md](docs/THREAT_MODEL.md): STRIDE threat assessment and risk mitigation matrix.
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md): Complete Firestore collection architecture and rules.
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md): REST API endpoints and payload schemas.
- [AWS_BACKUP_GUIDE.md](docs/AWS_BACKUP_GUIDE.md): S3 backup orchestration and client account setup.
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md): Production deployment and domain configuration.
- [TESTING_GUIDE.md](docs/TESTING_GUIDE.md): Automated and manual security test execution.
- [DEMONSTRATION_SCRIPT.md](docs/DEMONSTRATION_SCRIPT.md): Step-by-step academic presentation guide for lecturers.
