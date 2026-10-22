import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import type { State } from '../types';
import { runTransaction } from 'firebase/firestore';

const fake = vi.hoisted(() => ({
    effects: [] as Array<() => unknown>,
    authenticate: null as any,
    snapshot: null as any,
}));

vi.mock('react', () => ({
    useRef: (current: unknown) => ({ current }),
    useEffect: (effect: () => unknown) => { fake.effects.push(effect); },
}));
vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (_auth: unknown, callback: unknown) => {
        fake.authenticate = callback;
        return vi.fn();
    },
}));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(), query: vi.fn(), where: vi.fn(),
    doc: vi.fn(), runTransaction: vi.fn(), serverTimestamp: vi.fn(),
    onSnapshot: (_query: unknown, callback: unknown) => {
        fake.snapshot = callback;
        return vi.fn();
    },
}));

import { useProjectStorage } from '../services/useProjectStorage';

beforeEach(() => {
    vi.clearAllMocks();
    fake.effects = [];
    fake.authenticate = null;
    fake.snapshot = null;
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() });
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('powiadomienia o niezgodnych projektach chmurowych', () => {
    it('powtarzane snapshoty nie spamują, a nowe błędy i inne konta nadal są zgłaszane', () => {
        const dispatch = vi.fn();
        useProjectStorage({} as State, dispatch);
        fake.effects[0]();
        fake.authenticate({ uid: 'user-a' });

        const emit = (id: string, data = '{') => fake.snapshot({
            metadata: { hasPendingWrites: false, fromCache: false },
            docs: [{ id, data: () => ({ name: 'Niezgodny zapis', data }) }],
        });
        const errors = () => dispatch.mock.calls.filter(([action]) => action.type === 'ADD_TOAST' && action.payload.type === 'danger');

        emit('broken-1');
        emit('broken-1');
        emit('broken-1');
        expect(errors()).toHaveLength(1);

        emit('broken-2');
        expect(errors()).toHaveLength(2);
        emit('broken-2', '{}');
        expect(errors()).toHaveLength(3);

        fake.authenticate({ uid: 'user-b' });
        emit('broken-1');
        expect(errors()).toHaveLength(4);
    });

    it('projekt ze starym stropodachem pojawia się na liście bez komunikatu błędu i zapisu do Firebase', () => {
        const dispatch = vi.fn();
        useProjectStorage({} as State, dispatch);
        fake.effects[0]();
        fake.authenticate({ uid: 'user-a' });
        const room = createInitialRoomState();
        room.input.roomArea = '30';
        const data = {
            projectName: 'Stary dach', activeRoomId: room.id, systems: [],
            rooms: [{ ...room, walls: [{
                id: 1, type: 'stropodach_lekki_ocieplony', direction: 'S',
                u: 0.2, area: 30, material: 'paint_white',
            }] }],
        };
        const snapshot = {
            metadata: { hasPendingWrites: false, fromCache: false },
            docs: [{ id: 'old-roof', data: () => ({ name: 'Stary dach', date: '2026-08-03', data: JSON.stringify(data) }) }],
        };
        fake.snapshot(snapshot);
        fake.snapshot(snapshot);

        expect(dispatch.mock.calls.filter(([action]) => action.type === 'ADD_TOAST')).toEqual([]);
        const lists = dispatch.mock.calls.filter(([action]) => action.type === 'SET_SAVED_PROJECTS');
        expect(lists.at(-1)![0].payload).toMatchObject([{
            id: 'old-roof', data: { rooms: [{ walls: [{ type: 'dach_lekki_pir', tilt: 0 }] }] },
        }]);
        expect(vi.mocked(console.warn)).not.toHaveBeenCalled();
        expect(runTransaction).not.toHaveBeenCalled();
    });
});
