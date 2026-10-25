# Nina International: Cryptographic & Security Architecture Specification

## 1. Academic Password Hashing: Salt and Pepper Architecture

This project implements a custom credential service that demonstrates modern cryptographic standards for password storage, satisfying the explicit academic requirements of Computer and Information Security.

### A. Threat Model Addressed
1. **Precomputed Rainbow Table Attacks**: Attackers cannot precalculate hashes because each credential uses a distinct 128-bit random salt.
2. **GPU / ASIC Mass Parallel Cracking**: Attackers cannot efficiently parallelize attacks due to Argon2id's memory-hard algorithm.
3. **Database Exfiltration / Offline Attacks**: If the database is compromised, the attacker still cannot crack the hashes because the keyed pepper is held exclusively in a separate security perimeter (AWS Secrets Manager).
4. **Side-Channel Timing Attacks**: Argon2id combines Argon2d (data-dependent memory access) and Argon2i (data-independent memory access) to provide maximum defense against both GPU cracking and side-channel cache attacks.

---

### B. Mathematical Specification

$$\text{Prehash} = \text{HMAC-SHA256}(\text{Key} = \text{Pepper}, \text{Message} = \text{Password})$$

$$\text{FinalHash} = \text{Argon2id}(\text{Password} = \text{Prehash}, \text{Salt} = \text{UniqueSalt}, m = 65536, t = 3, p = 4)$$

Where:
- **Pepper**: A high-entropy 256-bit secret stored in AWS Secrets Manager or server-side environment variables (`PEPPER_SECRET`). It is never stored in the database record alongside the hash.
- **Prehash**: A 64-character hexadecimal digest resulting from keyed HMAC-SHA256. This normalizes input length and binds the password to the secret pepper.
- **Salt**: 16 bytes (128 bits) of cryptographically secure pseudo-random bytes generated per password creation or change via `crypto.randomBytes(16)`.
- **Memory Cost ($m$)**: $65,536\text{ KiB}$ (64 MB of RAM per hash operation).
- **Time Cost ($t$)**: $3$ iterations.
- **Parallelism ($p$)**: $4$ concurrent threads.
- **Hash Length**: 32 bytes (256 bits).

---

### C. Pepper Rotation & Rehash Strategy

The system records `pepperVersion` (e.g. `nina-pepper-v1`) in each user's credential metadata. When a security policy triggers pepper rotation:
1. A new pepper version (`nina-pepper-v2`) is introduced in the key manager.
2. The credential service keeps the previous pepper in a secure lookup table for verification.
3. When a user with an older pepper version successfully logs in, the `needsRehash` method detects the version mismatch and automatically re-hashes the user's password using the new pepper and a fresh salt, seamlessly migrating credentials without forcing a global password reset.

---

## 2. Two-Factor Authentication (2FA)

Nina International enforces two distinct second-factor mechanisms:

### A. Method 1: Google Authenticator-Compatible TOTP (RFC 6238)
- **Algorithm**: HMAC-SHA1
- **Period**: 30 seconds
- **Digits**: 6 numeric digits
- **Window Tolerance**: $\pm 1$ step (permits 30-second clock drift)
- **Storage Protection**: The Base32 TOTP secret is **never stored in plaintext**. It is encrypted at rest using **AES-256-GCM** with an ephemeral 12-byte initialization vector (IV) and a 16-byte authentication tag:
  $$\text{Payload} = \text{IV}_{\text{hex}} : \text{Tag}_{\text{hex}} : \text{Ciphertext}_{\text{hex}}$$
- **Recovery Codes**: During enrollment, 8 single-use cryptographically random recovery codes are issued. Only their SHA-256 hashes are stored in the database.

### B. Method 2: Cryptographic Email OTP
- **Algorithm**: Cryptographically secure 6-digit random number generated via `crypto.randomInt(100000, 999999)`.
- **Lifecycle**: Valid for 10 minutes.
- **Brute-Force Limit**: Maximum 3 verification attempts per challenge.
- **Storage**: Only the SHA-256 hash of the OTP is retained in `authenticationChallenges`.
- **Single-Use Consumption**: Challenges are immediately flagged as `used: true` upon successful verification, preventing replay attacks.

---

## 3. Data Protection in Transit & At Rest

1. **Data in Transit**:
   - Enforced HTTPS / TLS 1.3 in production.
   - HTTP Strict Transport Security (`HSTS`) header enabled with `max-age=31536000; includeSubDomains`.
   - Helmet middleware applies strict security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Cross-Origin-Opener-Policy`.
2. **Data at Rest**:
   - Private credential records stored in separate, isolated Firestore collection (`privateCredentials`).
   - Backup archives encrypted using authenticated AES-256-GCM before transfer to AWS S3.
   - SHA-256 integrity checksums computed for every configuration restore point and backup archive.

---

## 4. Tamper-Evident Audit Logging

Security events in `auditLogs` are linked through a cryptographic SHA-256 hash chaining mechanism:

$$\text{LogHash}_n = \text{SHA-256}(\text{EventID} + \text{Timestamp} + \text{ActorID} + \text{Action} + \text{Resource} + \text{Outcome} + \text{LogHash}_{n-1})$$

This creates a forward-integrity blockchain-like structure where retroactively altering or deleting any audit log entry invalidates the cryptographic checksums of all subsequent entries.

---

## 5. Defense Against Common Vulnerabilities

| Threat Category | Specific Attack | Defense Mechanism Implemented in Nina International |
| :--- | :--- | :--- |
| **Authentication** | Credential Stuffing / Brute-Force | Rate-limiting (10 attempts / 15 min), account lockout, Argon2id computational cost, mandatory 2FA. |
| **Authorization** | IDOR / Privilege Escalation | Explicit backend RBAC middleware and Firestore Security Rules verifying that `request.auth.uid == userId`. |
| **Session** | Session Hijacking / Fixation | Scoped JWT tokens with short lifetimes, distinct `2fa_pending` token type that cannot access API resources. |
| **Data Integrity** | Malicious Grade Alteration | Mandatory administrative justification logged to an immutable `gradeAuditLogs` trail recording old/new values and instructor identity. |
| **Disaster Recovery** | Ransomware / Data Loss | Automated AES-256-GCM encrypted backup archives staged for immutable AWS S3 storage with SHA-256 validation. |
