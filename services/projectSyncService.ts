import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { SavedProject } from '../types';
import { sanitizeSavedProject, MAX_PROJECT_JSON_LENGTH } from './projectDataService';

export const newProjectId = () => crypto.randomUUID();
export const projectStorageKey = (owner?: string) => `hvac_saved_projects_v2:${owner || 'local'}`;
export const projectContent = (project: SavedProject) => {
    const { syncRevision, ...data } = project.data;
    return JSON.stringify(data);
};

export function cloudProject(id: string, value: any): SavedProject {
    const project = sanitizeSavedProject({ ...value, id }, 'cloud');
    const revision = project.data.syncRevision || `legacy:${value.updatedAt?.seconds ?? ''}:${value.updatedAt?.nanoseconds ?? ''}:${value.date}`;
    return { ...project, id, revision, baseRevision: revision, ownerId: value.userId, syncStatus: 'synced' };
}

/** A cloud snapshot can acknowledge a revision, but never silently replace unsent local work. */
export function mergeProjects(local: SavedProject[], cloud: SavedProject[]): SavedProject[] {
    const result = new Map(cloud.map(p => [p.id, p]));
    for (const saved of local) {
        let remote = result.get(saved.id);
        // One-time migration: exact names only. New project IDs never depend on names.
        if (!remote && saved.id.startsWith('legacy-')) {
            const matches = cloud.filter(p => p.name === saved.name);
            if (matches.length === 1) remote = matches[0];
        }
        const p = { ...saved, id: remote?.id ?? saved.id, isLocal: true };
        if (!remote) {
            result.set(p.id, { ...p, isCloud: false });
        } else if (p.revision === remote.revision || projectContent(p) === projectContent(remote)) {
            result.set(p.id, { ...remote, isLocal: true });
        } else if (p.syncStatus === 'synced' && p.baseRevision === p.revision) {
            result.set(p.id, { ...remote, isLocal: true });
        } else if (p.baseRevision === remote.revision) {
            result.set(p.id, { ...p, isCloud: true, cloudCopy: undefined });
        } else {
            result.set(p.id, { ...p, isCloud: true, syncStatus: 'conflict', cloudCopy: remote });
        }
    }
    return [...result.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function acknowledgeSave(current: SavedProject, sent: SavedProject): SavedProject {
    return {
        ...current, isCloud: true, baseRevision: sent.revision,
        syncStatus: current.revision === sent.revision ? 'synced' : 'pending',
        syncError: undefined, cloudCopy: undefined,
    };
}

export class ProjectConflictError extends Error {
    constructor(public remote: SavedProject | null) { super('Wersja w chmurze zmieniła się. Zachowano kopię lokalną.'); }
}

/** The revision is inside data to remain compatible with the existing six-field Firestore rules. */
export async function writeCloudProject(db: Firestore, uid: string, project: SavedProject): Promise<void> {
    const serialized = JSON.stringify({ ...project.data, syncRevision: project.revision });
    if (new TextEncoder().encode(serialized).length > MAX_PROJECT_JSON_LENGTH) throw new Error('Projekt przekracza limit wielkości zapisu w chmurze.');
    const ref = doc(db, 'users', uid, 'projects', project.id);
    await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const remote = snapshot.exists() ? cloudProject(snapshot.id, snapshot.data()) : null;
        if ((remote?.revision ?? null) !== (project.baseRevision ?? null)) {
            if (remote?.revision === project.revision) return; // idempotent retry after an uncertain acknowledgement
            throw new ProjectConflictError(remote);
        }
        transaction.set(ref, {
            name: project.name, date: project.date, data: serialized, userId: uid,
            createdAt: snapshot.exists() ? snapshot.data().createdAt : serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });
}

export async function deleteCloudProject(db: Firestore, uid: string, project: SavedProject): Promise<void> {
    await runTransaction(db, async transaction => {
        const ref = doc(db, 'users', uid, 'projects', project.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return;
        const remote = cloudProject(snapshot.id, snapshot.data());
        if (remote.revision !== (project.baseRevision ?? project.revision)) throw new ProjectConflictError(remote);
        transaction.delete(ref);
    });
}

export const SYNC_LABELS: Record<NonNullable<SavedProject['syncStatus']>, string> = {
    local: 'Zapisano lokalnie', pending: 'Zapisano lokalnie — oczekuje na synchronizację',
    synced: 'Zsynchronizowano', error: 'Błąd synchronizacji — kopia lokalna zachowana',
    conflict: 'Konflikt wersji — kopia lokalna zachowana',
};
