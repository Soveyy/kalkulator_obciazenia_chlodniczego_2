import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import type { SavedProject } from '../types';
const fake = vi.hoisted(() => ({ snapshot: null as any, set: vi.fn(), delete: vi.fn() }));
vi.mock('firebase/firestore', () => ({
    doc: (_db: unknown, ...path: string[]) => path.join('/'),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    runTransaction: (_db: unknown, fn: any) => fn({ get: async () => fake.snapshot, set: fake.set, delete: fake.delete }),
}));
import { deleteCloudProject, ProjectConflictError, writeCloudProject } from '../services/projectSyncService';
const project = (revision = 'new', baseRevision: string | null = null): SavedProject => {
    const room = createInitialRoomState(); room.input.roomArea = '20';
    return { id: 'project-uuid', name: 'Test', date: '2026-09-17', revision, baseRevision, data: { projectName: 'Test', activeRoomId: room.id, rooms: [room], systems: [] } };
};
const remote = (revision: string) => {
    const p = project(revision);
    return { exists: () => true, id: p.id, data: () => ({ name: p.name, date: p.date, data: JSON.stringify({ ...p.data, syncRevision: revision }), userId: 'test-user', createdAt: 'ORIGINAL_TIMESTAMP' }) };
};
beforeEach(() => { vi.clearAllMocks(); fake.snapshot = { exists: () => false }; });
describe('transakcje zapisu i usuwania — bez sieci', () => {
    it('tworzy nowy projekt w ścieżce właściciela z sześcioma dozwolonymi polami', async () => {
        await writeCloudProject({} as any, 'test-user', project());
        const [path, data] = fake.set.mock.calls[0];
        expect(path).toBe('users/test-user/projects/project-uuid');
        expect(Object.keys(data).sort()).toEqual(['createdAt', 'data', 'date', 'name', 'updatedAt', 'userId']);
        expect(JSON.parse(data.data).syncRevision).toBe('new');
        expect(data.createdAt).toBe('SERVER_TIMESTAMP');
    });
    it('zachowuje datę utworzenia przy aktualizacji oczekiwanej rewizji', async () => {
        fake.snapshot = remote('base');
        await writeCloudProject({} as any, 'test-user', project('new', 'base'));
        expect(fake.set.mock.calls[0][1].createdAt).toBe('ORIGINAL_TIMESTAMP');
    });
    it('nie zapisuje w razie zmiany chmury lub jej usunięcia', async () => {
        fake.snapshot = remote('other');
        await expect(writeCloudProject({} as any, 'test-user', project('new', 'base'))).rejects.toBeInstanceOf(ProjectConflictError);
        fake.snapshot = { exists: () => false };
        await expect(writeCloudProject({} as any, 'test-user', project('new', 'base'))).rejects.toBeInstanceOf(ProjectConflictError);
        expect(fake.set).not.toHaveBeenCalled();
    });
    it('ponowienie już przyjętej rewizji jest bezpieczne', async () => {
        fake.snapshot = remote('new');
        await writeCloudProject({} as any, 'test-user', project('new', 'base'));
        expect(fake.set).not.toHaveBeenCalled();
    });
    it('nie usuwa projektu zmienionego od ostatniego odczytu', async () => {
        fake.snapshot = remote('other');
        await expect(deleteCloudProject({} as any, 'test-user', project('new', 'base'))).rejects.toBeInstanceOf(ProjectConflictError);
        expect(fake.delete).not.toHaveBeenCalled();
        fake.snapshot = remote('base');
        await deleteCloudProject({} as any, 'test-user', project('new', 'base'));
        expect(fake.delete).toHaveBeenCalledOnce();
    });
});
