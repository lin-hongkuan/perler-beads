import { ProjectDocument, ProjectSummary, SavedPalettePreset } from '../types/project';

const DB_NAME = 'perler-beads-projects';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const PALETTE_STORE = 'palettePresets';
const META_STORE = 'meta';
const LAST_PROJECT_KEY = 'lastOpenedProjectId';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB。'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PALETTE_STORE)) {
        db.createObjectStore(PALETTE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开项目数据库。'));
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('项目数据库事务失败。'));
    };
  }));
}

function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error('无法读取本地数据。'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('读取本地数据失败。'));
    };
  }));
}

export async function saveProject(project: ProjectDocument): Promise<void> {
  await withStore(PROJECT_STORE, 'readwrite', store => store.put(project));
  await setLastOpenedProjectId(project.id);
}

export async function loadProject(projectId: string): Promise<ProjectDocument | null> {
  const project = await withStore<ProjectDocument>(PROJECT_STORE, 'readonly', store => store.get(projectId));
  return project ?? null;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const projects = await getAllFromStore<ProjectDocument>(PROJECT_STORE);
  return projects
    .map(project => project.summary)
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
}

export async function deleteProject(projectId: string): Promise<void> {
  await withStore(PROJECT_STORE, 'readwrite', store => store.delete(projectId));
}

export async function toggleFavoriteProject(projectId: string): Promise<ProjectDocument | null> {
  const project = await loadProject(projectId);
  if (!project) return null;

  const updated: ProjectDocument = {
    ...project,
    summary: {
      ...project.summary,
      isFavorite: !project.summary.isFavorite,
      updatedAt: new Date().toISOString()
    }
  };
  await saveProject(updated);
  return updated;
}

export async function savePalettePreset(preset: SavedPalettePreset): Promise<void> {
  await withStore(PALETTE_STORE, 'readwrite', store => store.put(preset));
}

export async function listPalettePresets(): Promise<SavedPalettePreset[]> {
  const presets = await getAllFromStore<SavedPalettePreset>(PALETTE_STORE);
  return presets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function deletePalettePreset(presetId: string): Promise<void> {
  await withStore(PALETTE_STORE, 'readwrite', store => store.delete(presetId));
}

export async function setLastOpenedProjectId(projectId: string): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }
  await withStore(META_STORE, 'readwrite', store => store.put({ key: LAST_PROJECT_KEY, value: projectId }));
}

export async function getLastOpenedProjectId(): Promise<string | null> {
  if (typeof localStorage !== 'undefined') {
    const localValue = localStorage.getItem(LAST_PROJECT_KEY);
    if (localValue) return localValue;
  }

  const record = await withStore<{ key: string; value: string }>(META_STORE, 'readonly', store => store.get(LAST_PROJECT_KEY));
  return record?.value ?? null;
}

export async function getLastOpenedProject(): Promise<ProjectDocument | null> {
  const projectId = await getLastOpenedProjectId();
  return projectId ? loadProject(projectId) : null;
}
