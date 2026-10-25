import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ENV } from '../config/env.js';

export interface QueryFilter {
  field: string;
  op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'array-contains';
  value: any;
}

export interface QueryOptions {
  where?: QueryFilter[];
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export class DatabaseService {
  private static storePath = path.resolve(process.cwd(), '.data', 'db.json');
  private static memoryStore: Record<string, Record<string, any>> = {};
  private static isInitialized = false;
  private static firestore: Firestore | null = null;
  private static firebaseApp: App | null = null;

  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const dataDir = path.dirname(this.storePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.storePath)) {
      try {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        this.memoryStore = JSON.parse(raw);
      } catch (err) {
        console.warn('Could not parse local database file, initializing empty store.');
        this.memoryStore = {};
      }
    } else {
      this.memoryStore = {};
      this.persist();
    }

    // Initialize Firebase Cloud Firestore if serviceAccountKey exists
    const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(saPath)) {
      try {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        if (getApps().length === 0) {
          this.firebaseApp = initializeApp({ credential: cert(sa) });
        } else {
          this.firebaseApp = getApps()[0];
        }
        this.firestore = getFirestore(this.firebaseApp);
        this.firestore.settings({ ignoreUndefinedProperties: true });
        console.log(`[DatabaseService] Successfully connected to live Google Cloud Firestore (${sa.project_id}).`);
      } catch (fbErr: any) {
        console.warn('[DatabaseService] Firebase initialization warning:', fbErr?.message || fbErr);
        this.firestore = null;
      }
    } else {
      console.log('[DatabaseService] Running in local persistent mode (serviceAccountKey.json not present).');
    }

    this.isInitialized = true;
    console.log('DatabaseService initialized (Persistent Store ready).');
  }

  public static getFirestoreInstance(): Firestore | null {
    return this.firestore;
  }

  private static persist(): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.error('DatabaseService persist error:', err);
    }
  }

  public static async getCollection<T = any>(
    collectionName: string,
    options?: QueryOptions
  ): Promise<T[]> {
    await this.initialize();
    const col = this.memoryStore[collectionName] || {};
    let records = Object.values(col);

    // Apply where filters
    if (options?.where) {
      for (const filter of options.where) {
        records = records.filter(item => {
          const val = item[filter.field];
          switch (filter.op) {
            case '==':
              return val === filter.value;
            case '!=':
              return val !== filter.value;
            case '>':
              return val > filter.value;
            case '>=':
              return val >= filter.value;
            case '<':
              return val < filter.value;
            case '<=':
              return val <= filter.value;
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(val);
            case 'array-contains':
              return Array.isArray(val) && val.includes(filter.value);
            default:
              return true;
          }
        });
      }
    }

    // Apply ordering
    if (options?.orderBy) {
      const { field, direction = 'asc' } = options.orderBy;
      records.sort((a, b) => {
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Offset & limit
    if (options?.offset) {
      records = records.slice(options.offset);
    }
    if (options?.limit) {
      records = records.slice(0, options.limit);
    }

    return records as T[];
  }

  public static async getDocument<T = any>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    await this.initialize();
    const col = this.memoryStore[collectionName] || {};
    return (col[documentId] as T) || null;
  }

  public static async setDocument<T = any>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<T> {
    await this.initialize();
    if (!this.memoryStore[collectionName]) {
      this.memoryStore[collectionName] = {};
    }
    const record = { ...data, id: documentId };
    this.memoryStore[collectionName][documentId] = record;
    this.persist();

    // Asynchronously synchronize to Google Cloud Firestore if connected
    if (this.firestore) {
      this.firestore.collection(collectionName).doc(documentId).set(record).catch(err => {
        console.warn(`[Firestore-Sync] Failed to sync setDocument ${collectionName}/${documentId}:`, err?.message || err);
      });
    }

    return record as T;
  }

  public static async updateDocument<T = any>(
    collectionName: string,
    documentId: string,
    updates: Partial<T>
  ): Promise<T | null> {
    await this.initialize();
    const col = this.memoryStore[collectionName] || {};
    if (!col[documentId]) return null;

    col[documentId] = { ...col[documentId], ...updates, id: documentId };
    this.persist();

    // Asynchronously synchronize to Google Cloud Firestore if connected
    if (this.firestore) {
      this.firestore.collection(collectionName).doc(documentId).update(updates as any).catch(err => {
        console.warn(`[Firestore-Sync] Failed to sync updateDocument ${collectionName}/${documentId}:`, err?.message || err);
      });
    }

    return col[documentId] as T;
  }

  public static async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    await this.initialize();
    const col = this.memoryStore[collectionName];
    if (!col || !col[documentId]) return false;

    delete col[documentId];
    this.persist();

    // Asynchronously synchronize to Google Cloud Firestore if connected
    if (this.firestore) {
      this.firestore.collection(collectionName).doc(documentId).delete().catch(err => {
        console.warn(`[Firestore-Sync] Failed to sync deleteDocument ${collectionName}/${documentId}:`, err?.message || err);
      });
    }

    return true;
  }

  /**
   * Complete database export for backup creation
   */
  public static async exportAllData(): Promise<Record<string, Record<string, any>>> {
    await this.initialize();
    return JSON.parse(JSON.stringify(this.memoryStore));
  }

  /**
   * Disaster recovery import
   */
  public static async importAllData(data: Record<string, Record<string, any>>): Promise<void> {
    this.memoryStore = JSON.parse(JSON.stringify(data));
    this.persist();

    // Synchronize imported data to Cloud Firestore if connected
    if (this.firestore) {
      for (const colName of Object.keys(data)) {
        const docs = data[colName];
        for (const id of Object.keys(docs)) {
          this.firestore.collection(colName).doc(id).set(docs[id]).catch(() => {});
        }
      }
    }
  }
}
