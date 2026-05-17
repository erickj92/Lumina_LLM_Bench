import { openDB, type IDBPDatabase } from 'idb';
import type { TestResult } from '../types';

const DB_NAME = 'lumina-bench';
const DB_VERSION = 1;
const STORE_NAME = 'test-history';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('provider', 'provider');
          store.createIndex('model', 'model');
          store.createIndex('provider_model', ['provider', 'model']);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTestResult(result: TestResult): Promise<void> {
  const db = await getDb();
  await db.add(STORE_NAME, result);
}

export async function getAllResults(): Promise<TestResult[]> {
  const db = await getDb();
  const results = await db.getAll(STORE_NAME);
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getResultsByProvider(provider: string): Promise<TestResult[]> {
  const db = await getDb();
  const results = await db.getAllFromIndex(STORE_NAME, 'provider', provider);
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getResultsByModel(model: string): Promise<TestResult[]> {
  const db = await getDb();
  const results = await db.getAllFromIndex(STORE_NAME, 'model', model);
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getResultsByProviderModel(provider: string, model: string): Promise<TestResult[]> {
  const db = await getDb();
  const results = await db.getAllFromIndex(STORE_NAME, 'provider_model', [provider, model]);
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getRecentResults(limit = 50): Promise<TestResult[]> {
  const all = await getAllResults();
  return all.slice(0, limit);
}

export async function getFilteredResults(filters: {
  provider?: string;
  model?: string;
  startDate?: number;
  endDate?: number;
}): Promise<TestResult[]> {
  let results = await getAllResults();

  if (filters.provider) {
    results = results.filter(r => r.provider.toLowerCase().includes(filters.provider!.toLowerCase()));
  }
  if (filters.model) {
    results = results.filter(r => r.model.toLowerCase().includes(filters.model!.toLowerCase()));
  }
  if (filters.startDate) {
    results = results.filter(r => r.timestamp >= filters.startDate!);
  }
  if (filters.endDate) {
    results = results.filter(r => r.timestamp <= filters.endDate!);
  }

  return results;
}

export async function deleteResult(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllResults(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function exportResultsToJSON(): Promise<string> {
  const results = await getAllResults();
  return JSON.stringify(results, null, 2);
}

export async function getUniqueModels(): Promise<Array<{ provider: string; model: string }>> {
  const results = await getAllResults();
  const seen = new Set<string>();
  const unique: Array<{ provider: string; model: string }> = [];
  for (const r of results) {
    const key = `${r.provider}::${r.model}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ provider: r.provider, model: r.model });
    }
  }
  return unique;
}