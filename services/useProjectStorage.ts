import { useEffect, useRef, type Dispatch } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Action, SavedProject, State } from '../types';
import { createProjectSnapshot, sanitizeSavedProject } from './projectDataService';
import { acknowledgeSave, deleteCloudProject, mergeProjects, newProjectId, parseCloudProjects, ProjectConflictError, projectStorageKey, writeCloudProject } from './projectSyncService';

export function useProjectStorage(state: State, dispatch: Dispatch<Action>) {
    const currentState = useRef(state);
    currentState.current = state;
    const projects = useRef<SavedProject[]>([]);
    const owner = useRef<string | undefined>(undefined);
    const initialized = useRef(false);
    const storageReadable = useRef(true);
    const busy = useRef(new Set<string>());
    const toast = (message: string, type: 'info' | 'danger' | 'success' = 'info') => dispatch({ type: 'ADD_TOAST', payload: { message, type } });

    const publish = (next: SavedProject[], persist = true) => {
        if (persist) {
            if (!storageReadable.current) throw new Error('Nie można nadpisać nieodczytanego magazynu lokalnego. Zachowano oryginalne dane.');
            // setItem is atomic. On quota failure do not claim the new list was saved.
            localStorage.setItem(projectStorageKey(owner.current), JSON.stringify(next.filter(p => p.isLocal).map(({ cloudCopy, ...p }) => p)));
        }
        projects.current = next;
        dispatch({ type: 'SET_SAVED_PROJECTS', payload: next });
    };

    const sync = async (id: string) => {
        const uid = auth?.currentUser?.uid;
        const p = projects.current.find(p => p.id === id);
        if (!p || !uid || !db || owner.current !== uid || busy.current.has(uid + id)) return;
        if (p.syncStatus === 'conflict') return;
        if (!p.isCloud && projects.current.filter(p => p.isCloud).length >= 100) {
            toast('Osiągnięto limit 100 projektów w chmurze. Kopia lokalna zachowana.', 'danger'); return;
        }
        if (!navigator.onLine) {
            toast('Zapisano lokalnie. Synchronizacja nastąpi po odzyskaniu połączenia.'); return;
        }
        const sent = { ...p, ownerId: uid, syncStatus: 'pending' as const };
        try {
            publish(projects.current.map(item => item.id === id ? sent : item));
            busy.current.add(uid + id);
            await writeCloudProject(db, uid, sent);
            if (owner.current !== uid) return;
            publish(projects.current.map(item => item.id === id ? acknowledgeSave(item, sent) : item));
        } catch (error) {
            if (owner.current !== uid) return;
            const message = error instanceof Error ? error.message : 'Nie udało się zapisać w chmurze.';
            const next = projects.current.map(item => item.id !== id ? item : {
                ...item, syncStatus: error instanceof ProjectConflictError ? 'conflict' as const : 'error' as const,
                syncError: message, cloudCopy: error instanceof ProjectConflictError ? error.remote ?? undefined : undefined,
            });
            try { publish(next); } catch { publish(next, false); }
            toast(message, 'danger');
        } finally {
            busy.current.delete(uid + id);
            const latest = projects.current.find(item => item.id === id);
            if (owner.current === uid && latest?.syncStatus === 'pending' && latest.revision !== sent.revision) void sync(id);
        }
    };
    const syncRef = useRef(sync); syncRef.current = sync;

    useEffect(() => {
        let unsubscribeCloud: (() => void) | undefined;
        const load = (uid?: string) => {
            unsubscribeCloud?.();
            const previousOwner = owner.current;
            owner.current = uid;
            if (initialized.current && previousOwner !== uid) dispatch({ type: 'SET_STATE', payload: { savedProjectId: undefined } });
            initialized.current = true;
            try {
                storageReadable.current = true;
                const raw = localStorage.getItem(projectStorageKey(uid));
                // Retain the old storage untouched as a migration backup.
                const legacy = raw === null ? localStorage.getItem('hvac_saved_projects') : null;
                const parsed = JSON.parse(raw ?? legacy ?? '[]');
                if (!Array.isArray(parsed)) throw new Error('Niepoprawna lista zapisanych projektów.');
                const local = parsed.map(value => ({ ...sanitizeSavedProject(value, 'local'), ownerId: uid }));
                publish(local);
            } catch (error) {
                storageReadable.current = false;
                publish([], false);
                toast('Nie udało się odczytać listy lokalnej. Oryginalny zapis pozostaje w przeglądarce.', 'danger');
            }
            if (!uid || !db) return;
            unsubscribeCloud = onSnapshot(query(collection(db, 'users', uid, 'projects'), where('userId', '==', uid)), snapshot => {
                if (owner.current !== uid || snapshot.metadata.hasPendingWrites) return;
                try {
                    const { projects: cloud, rejected } = parseCloudProjects(snapshot.docs);
                    const merged = mergeProjects(projects.current.filter(p => p.isLocal), cloud);
                    try { publish(merged); } catch { publish(merged, false); toast('Brak miejsca na aktualizację kopii lokalnej.', 'danger'); }
                    if (rejected.length) {
                        console.warn('Pominięte niezgodne projekty chmurowe:', rejected);
                        const message = rejected.length === 1
                            ? `Nie udało się odczytać projektu „${rejected[0].name}”: ${rejected[0].reason} Pozostałe projekty wczytano.`
                            : `Nie udało się odczytać ${rejected.length} projektów chmurowych (${rejected.slice(0, 3).map(item => item.name).join(', ')}${rejected.length > 3 ? ', …' : ''}). Pozostałe projekty wczytano.`;
                        toast(message, 'danger');
                    }
                    if (!snapshot.metadata.fromCache) merged.filter(p => p.syncStatus === 'pending').forEach(p => void syncRef.current(p.id));
                } catch {
                    toast('Nie udało się odczytać części danych chmurowych. Zachowano bieżącą listę.', 'danger');
                }
            }, () => toast('Błąd odczytu chmury. Projekty lokalne zachowane.', 'danger'));
        };
        const unsubscribeAuth = auth ? onAuthStateChanged(auth, user => load(user?.uid)) : (load(), undefined);
        const online = () => projects.current.filter(p => ['pending', 'error'].includes(p.syncStatus ?? '')).forEach(p => void syncRef.current(p.id));
        window.addEventListener('online', online);
        return () => { unsubscribeAuth?.(); unsubscribeCloud?.(); window.removeEventListener('online', online); };
    }, []);

    const save = (name: string) => {
        name = name.trim();
        if (!name || name.length > 100) throw new Error('Nazwa projektu musi mieć od 1 do 100 znaków.');
        const state = currentState.current;
        const sameName = projects.current.filter(p => p.name === name);
        const existing = projects.current.find(p => p.id === state.savedProjectId && p.name === name)
            ?? (sameName.length === 1 ? sameName[0] : undefined);
        if (!existing && sameName.length > 1) throw new Error('Istnieje kilka projektów o tej nazwie. Wczytaj wybrany projekt albo podaj inną nazwę.');
        const data = createProjectSnapshot({ ...state, projectName: name });
        const revision = newProjectId();
        const saved: SavedProject = {
            ...existing, id: existing?.id.startsWith('legacy-') ? newProjectId() : existing?.id ?? newProjectId(),
            ownerId: owner.current, name, date: new Date().toISOString(), data: { ...data, syncRevision: revision }, revision,
            baseRevision: existing?.baseRevision ?? null, isLocal: true,
            syncStatus: existing?.syncStatus === 'conflict' ? 'conflict' : owner.current ? 'pending' : 'local',
        };
        publish([...projects.current.filter(p => p.id !== existing?.id), saved]);
        // Only project metadata changes here. A later network response never writes room inputs.
        dispatch({ type: 'SET_STATE', payload: { projectName: name, savedProjectId: saved.id } });
        toast(data.draft ? 'Szkic zapisany lokalnie — wymaga uzupełnienia.' : 'Projekt zapisany lokalnie.', 'success');
        void sync(saved.id);
    };

    const remove = async (id: string) => {
        const p = projects.current.find(p => p.id === id);
        if (!p) return;
        const uid = owner.current;
        if (busy.current.has((uid ?? '') + id)) throw new Error('Poczekaj na zakończenie synchronizacji przed usunięciem.');
        if (p.isCloud) {
            if (!uid || !db || auth?.currentUser?.uid !== uid) throw new Error('Zaloguj się, aby usunąć projekt z chmury.');
            await deleteCloudProject(db, uid, p);
        }
        if (owner.current !== uid) return;
        publish(projects.current.filter(item => item.id !== id));
        if (currentState.current.savedProjectId === id) dispatch({ type: 'SET_STATE', payload: { savedProjectId: undefined } });
        toast('Projekt usunięty.');
    };

    const resolve = (id: string, choice: 'local' | 'cloud' | 'both') => {
        const p = projects.current.find(p => p.id === id);
        if (!p || p.syncStatus !== 'conflict') return;
        const remote = p.cloudCopy;
        if (!remote && choice === 'cloud') throw new Error('Nie ma dostępnej kopii chmurowej. Zachowaj lokalną.');
        let next: SavedProject[];
        if (choice === 'cloud') next = projects.current.map(item => item.id === id ? { ...remote!, isLocal: true } : item);
        else if (choice === 'both' && remote) {
            const copy = { ...p, id: newProjectId(), name: (p.name.slice(0, 80) + ' (kopia lokalna)'), data: { ...p.data, projectName: p.name.slice(0, 80) + ' (kopia lokalna)' }, baseRevision: null, isCloud: false, cloudCopy: undefined, syncStatus: 'pending' as const };
            next = [...projects.current.filter(item => item.id !== id), { ...remote, isLocal: true }, copy];
            publish(next); void sync(copy.id); return;
        } else next = projects.current.map(item => item.id === id ? { ...p, baseRevision: remote?.revision ?? null, cloudCopy: undefined, syncStatus: 'pending' as const } : item);
        publish(next);
        if (choice === 'local') void sync(id);
    };

    return { save, sync, remove, resolve, find: (id: string) => projects.current.find(p => p.id === id) };
}
