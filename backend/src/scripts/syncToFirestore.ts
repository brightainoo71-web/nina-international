import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function syncToFirestore() {
  const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    console.error('serviceAccountKey.json not found in', saPath);
    process.exit(1);
  }

  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const app = initializeApp({ credential: cert(sa) });
  const firestore = getFirestore(app);

  const dbPath = path.resolve(process.cwd(), '.data', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('.data/db.json not found in', dbPath);
    process.exit(1);
  }

  const localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const collections = Object.keys(localDb);

  console.log(`Starting migration to Firebase Firestore (${sa.project_id})...`);
  console.log(`Found ${collections.length} collections to synchronize.\n`);

  for (const colName of collections) {
    const docs = localDb[colName];
    const docIds = Object.keys(docs);
    if (docIds.length === 0) continue;

    console.log(`Uploading collection [${colName}] (${docIds.length} records)...`);
    
    // Firestore batch supports up to 500 operations
    const chunks = [];
    for (let i = 0; i < docIds.length; i += 400) {
      chunks.push(docIds.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = firestore.batch();
      for (const id of chunk) {
        const docRef = firestore.collection(colName).doc(id);
        batch.set(docRef, docs[id]);
      }
      await batch.commit();
    }

    console.log(`  ✓ Synced ${colName} successfully.`);
  }

  console.log('\n======================================================');
  console.log('🎉 Firebase Cloud Firestore synchronization complete!');
  console.log(`Project: ${sa.project_id}`);
  console.log('All collections, student records, RBAC profiles, and audit ledgers are live.');
  console.log('======================================================');
}

syncToFirestore().catch(err => {
  console.error('Firestore migration error:', err);
  process.exit(1);
});
