# Nina International: Production Deployment & Setup Guide

## 1. Client-Owned Firebase Setup

Follow these steps to establish the client's production Firebase environment:

1. Visit [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `nina-international-prod`).
2. Navigate to **Build** > **Firestore Database** and click **Create Database**.
3. Choose production mode and select the desired cloud location.
4. Deploy the production security rules from the repository root:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use nina-international-prod
   firebase deploy --only firestore:rules
   ```
5. Navigate to **Project Settings** > **Service accounts** > **Generate new private key**.
6. Populate the downloaded service account details into `backend/.env`:
   ```bash
   FIREBASE_PROJECT_ID=nina-international-prod
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

---

## 2. Backend API Deployment

The backend can be containerized or hosted on any Node.js 20+ runtime (e.g., Google Cloud Run, AWS App Runner, DigitalOcean, or an Ubuntu VPS).

### Example Production Start (PM2 / Systemd)
```bash
cd backend
npm install --production
npm run build
NODE_ENV=production PORT=5050 node dist/index.js
```

### Production Security Checklist
- [x] Set `NODE_ENV=production` in `.env`.
- [x] Replace `JWT_SECRET` and `JWT_REFRESH_SECRET` with 64-character random hex strings generated via `openssl rand -hex 64`.
- [x] Replace `PEPPER_SECRET` with a secure key stored in AWS Secrets Manager.
- [x] Restrict `ALLOWED_ORIGINS` to the client's verified domain (e.g. `https://portal.ninainternational.edu`).
- [x] Configure SSL/TLS certificates via Let's Encrypt / Certbot or an AWS ALB.

---

## 3. Web Frontend Deployment

Build the static frontend bundle:
```bash
cd frontend
npm install
npm run build
```
The optimized production output is generated in `frontend/dist/`.
Deploy the `dist/` folder to Firebase Hosting, Vercel, Cloudflare Pages, or an Nginx web server:

```nginx
server {
    listen 443 ssl http2;
    server_name portal.ninainternational.edu;

    ssl_certificate /etc/letsencrypt/live/portal.ninainternational.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.ninainternational.edu/privkey.pem;

    root /var/www/nina-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5050/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Mobile Application Expo Go Execution

1. Ensure the backend server is reachable over your network (e.g. `http://[your-lan-ip]:5050/api` or `https://portal.ninainternational.edu/api`).
2. In `mobile/src/config/api.ts`, configure your backend endpoint or use the in-app network configuration toggle on the sign-in screen.
3. Start the Expo development server:
   ```bash
   cd mobile
   npm start
   ```
4. Open the **Expo Go** application on your Android phone (available on Google Play Store).
5. Scan the terminal QR code.
6. The app loads instantly and authenticates against your backend.
