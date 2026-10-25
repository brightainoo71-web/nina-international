# Nina International: Client Handover & Security Administration Guide

## 1. System Overview

**Nina International** is an enterprise-grade, security-focused School Management System built to satisfy real client operational needs and rigorous academic Computer and Information Security requirements.

- **Responsive Web Application**: React 19, TypeScript, Vite, Tailwind CSS.
- **Android Mobile Application**: React Native, Expo SDK 57, Expo Go & Standalone APK support.
- **Backend API**: Node.js, Express, TypeScript, Helmet, Rate-Limiting.
- **Core Cryptography**: Argon2id v19 (64MB memory cost, 3 iterations, 4 parallelism threads), 128-bit unique salts, HMAC-SHA256 server-side pepper, AES-256-GCM encryption at rest, SHA-256 cryptographic hash chaining.
- **Disaster Recovery**: Automated and on-demand AES-256-GCM encrypted database dumps synchronized directly to Amazon S3.
- **Email Delivery**: High-integrity transactional SMTP with responsive security HTML templates.

---

## 2. Configured Credentials & Cloud Assets

| Service | Setting | Configured Value / Location |
| :--- | :--- | :--- |
| **AWS S3 Backup Bucket** | `AWS_S3_BACKUP_BUCKET` | `nina--securebackups` |
| **AWS Region** | `AWS_REGION` | `eu-north-1` (Stockholm) |
| **AWS Access Key ID** | `AWS_ACCESS_KEY_ID` | Configured in `backend/.env` |
| **SMTP Host** | `SMTP_HOST` | `smtp.gmail.com` |
| **SMTP Port** | `SMTP_PORT` | `587` (STARTTLS) |
| **SMTP User** | `SMTP_USER` | `brightainoo71@gmail.com` |
| **Email Sender** | `EMAIL_FROM` | `"Nina International Security" <brightainoo71@gmail.com>` |
| **Server-Side Pepper Key** | `PEPPER_KEY_ID` | `nina-pepper-v1` (HMAC-SHA256) |
| **Data Encryption Key** | `DATA_ENCRYPTION_KEY` | 256-bit AES-GCM Key in `backend/.env` |

---

## 3. Account Ownership & Ongoing Maintenance

### A. AWS S3 Bucket Management
- Backups are automatically staged and encrypted locally in `backend/.staging_backups/` and streamed to `s3://nina--securebackups/backups/`.
- **Retention Policy**: Default retention is set to 30 days. To modify retention, configure an **S3 Lifecycle Rule** on the `nina--securebackups` bucket to automatically expire objects after 30 or 90 days.
- **Bucket Versioning & MFA Delete**: We recommend enabling S3 Bucket Versioning in the AWS Console to protect backups against accidental deletion or ransomware.

### B. Changing Email Credentials
If the school transitions to an official school domain (e.g. `security@ninainternational.edu` via Google Workspace or Microsoft 365):
1. Open `backend/.env`.
2. Update `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`.
3. Restart the backend server.
4. Test delivery via `POST http://localhost:5050/api/auth/test-smtp`.

### C. Building Standalone Mobile APK for Android
To distribute the mobile app to staff and teachers as a standalone `.apk` installable without Expo Go:
```bash
cd mobile
npx eas login
npx eas build -p android --profile preview
```
This builds in the cloud and provides a direct QR code / download URL to download `nina-international.apk`.

---

## 4. Key Security Controls & Audit Procedures

### 1. Password Salt & Pepper
- **Where is it?**: [backend/src/services/credential.service.ts](file:///c:/Users/Ainoo%20Bright%20Takyi/Desktop/Nina%20International/backend/src/services/credential.service.ts).
- Every password hash in the database is generated with a unique 128-bit cryptographic salt and pre-transformed with an HMAC pepper. Even identical user passwords generate radically distinct hashes.
- In production, ensure the `PEPPER_SECRET` is kept in AWS Secrets Manager, isolated from database dumps.

### 2. Administrator Credential Security Audit & Lab
- Access via the **Audit & Lab** tab on web or mobile.
- Allows examiners and auditors to inspect salt lengths, parameter costs ($65,536\text{ KiB}$), and algorithm versions without disclosing secrets.
- Run the **Interactive Synthetic Password Lab** to test live password transformation step-by-step.

### 3. Security Centre & Cryptographic Hash Chaining
- Access via the **Security Centre** tab.
- Every administrative action, login event, role adjustment, and backup job is appended to the audit ledger.
- Each entry contains a `chainHash` linking it to the previous event's hash ($\text{SHA256}(\text{prevHash} + \text{data})$), rendering manual database tampering immediately detectable.

### 4. Configuration Restore Points vs Disaster Recovery
- **Configuration Restore Points**: Captures system policies, class schedules, and settings with a SHA-256 integrity checksum. Restoring a configuration point **never modifies or overwrites student grades or attendance records**.
- **Disaster Recovery (AWS S3)**: Full database archive encrypted with authenticated AES-256-GCM. Backups can be tested for integrity directly from the web or mobile interface with single-click cryptographic verification.

---

## 5. Daily Launch Instructions

To start the complete environment in three separate windows with one double-click:
- Simply double-click **`start-all.bat`** in the project root folder.
- To stop all services, double-click **`stop-all.bat`**.

---
*Nina International Secure School Management System — Certified for Client Delivery and Academic Defense.*
