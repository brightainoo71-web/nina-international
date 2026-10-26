import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { GoogleAuth } from 'google-auth-library';

async function deployToFirebaseHosting() {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    console.error('serviceAccountKey.json not found in backend directory.');
    process.exit(1);
  }

  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const projectId = sa.project_id;
  const siteId = projectId; // default site

  console.log(`[Deploy] Initializing Google Cloud Auth for ${projectId}...`);
  const auth = new GoogleAuth({
    keyFile: saPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
  });
  const client = await auth.getClient();

  const distDir = path.resolve(process.cwd(), '..', 'frontend', 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('frontend/dist directory not found. Please build frontend first.');
    process.exit(1);
  }

  // 1. Create a new version
  console.log(`[Deploy] Step 1: Creating new Hosting version on ${siteId}...`);
  const versionRes = await client.request<any>({
    url: `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`,
    method: 'POST',
    data: {
      config: {
        rewrites: [{ glob: '**', path: '/index.html' }],
        headers: [
          {
            glob: '**',
            headers: {
              'X-Frame-Options': 'DENY',
              'X-Content-Type-Options': 'nosniff',
              'Referrer-Policy': 'strict-origin-when-cross-origin',
            },
          },
        ],
      },
    },
  });

  const versionName = versionRes.data.name;
  console.log(`[Deploy] Version created: ${versionName}`);

  // 2. Scan, gzip, and hash all files in dist/
  console.log(`[Deploy] Step 2: Indexing and gzipping build assets in ${distDir}...`);
  const filesMap: Record<string, string> = {}; // { "/index.html": "<sha256>" }
  const gzippedBuffers: Record<string, Buffer> = {}; // { "<sha256>": gzippedBuffer }

  function scanDir(dir: string, base: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, `${base}/${entry.name}`);
      } else {
        const fileContent = fs.readFileSync(fullPath);
        // Firebase Hosting upload requires gzip-compressed payloads
        const gzipped = zlib.gzipSync(fileContent, { level: 9 });
        const hash = crypto.createHash('sha256').update(gzipped).digest('hex');
        const relativeUrl = `${base}/${entry.name}`.replace(/\\/g, '/');
        filesMap[relativeUrl] = hash;
        gzippedBuffers[hash] = gzipped;
      }
    }
  }

  scanDir(distDir, '');
  console.log(`[Deploy] Scanned & gzipped ${Object.keys(filesMap).length} assets.`);

  // 3. Populate files
  console.log(`[Deploy] Step 3: Populating file inventory with Firebase...`);
  const populateRes = await client.request<any>({
    url: `https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`,
    method: 'POST',
    data: {
      files: filesMap,
    },
  });

  const uploadUrl = populateRes.data.uploadUrl;
  const requiredHashes: string[] = populateRes.data.uploadRequiredHashes || [];
  console.log(`[Deploy] Files to upload: ${requiredHashes.length} (Upload endpoint: ${uploadUrl})`);

  // 4. Upload files
  for (let i = 0; i < requiredHashes.length; i++) {
    const hash = requiredHashes[i];
    const content = gzippedBuffers[hash];
    console.log(`[Deploy] Uploading asset ${i + 1}/${requiredHashes.length} (${hash.slice(0, 10)}...)...`);
    
    await client.request({
      url: `${uploadUrl}/${hash}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });
  }

  // 5. Finalize version
  console.log(`[Deploy] Step 4: Finalizing version status to FINALIZED...`);
  await client.request({
    url: `https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`,
    method: 'PATCH',
    data: {
      status: 'FINALIZED',
    },
  });

  // 6. Release version to production
  console.log(`[Deploy] Step 5: Releasing version to production site...`);
  await client.request({
    url: `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/releases?versionName=${versionName}`,
    method: 'POST',
  });

  console.log('\n======================================================');
  console.log('🎉 FIREBASE HOSTING DEPLOYMENT SUCCESSFUL!');
  console.log('======================================================');
  console.log(`🌐 Primary URL:    https://${siteId}.web.app`);
  console.log(`🌐 Secondary URL:  https://${siteId}.firebaseapp.com`);
  console.log('======================================================');
}

deployToFirebaseHosting().catch(err => {
  console.error('[Deploy Error]:', err.response?.data || err.message || err);
  process.exit(1);
});
