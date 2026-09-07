import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import {
    createProjectSnapshot,
    parseProjectDataJson,
    sanitizeProjectData,
} from '../services/projectDataService';

describe('bezpieczne wczytywanie projektu', () => {
    it('zachowuje dane wejściowe, ale usuwa zapisane wyniki i HTML komunikatu', () => {
        const room = createInitialRoomState();
        room.name = 'Salon';
        room.resultMessage = '<img src=x onerror=alert(1)>';
        room.tExtProfile = [30, 31];
        room.monthlyPeaks = [{ month: '7', peak: 1234 }];
        room.yearlyMatrix = [[1234]];

        const project = createProjectSnapshot({
            projectName: 'Dom',
            rooms: [room],
            activeRoomId: room.id,
            systems: [],
        });

        expect(project.projectName).toBe('Dom');
        expect(project.rooms[0].name).toBe('Salon');
        expect(project.rooms[0].resultMessage).toBe('');
        expect(project.rooms[0].tExtProfile).toEqual([]);
        expect(project.rooms[0].monthlyPeaks).toEqual([]);
        expect(project.rooms[0].yearlyMatrix).toBeNull();
        expect(project.rooms[0].results).toBeNull();
    });

    it('obsługuje stary, płaski format i zachowuje historyczny typ okna custom', () => {
        const project = sanitizeProjectData({
            input: { projectName: 'Stary projekt', tInternal: '23', rhInternal: '45', roomArea: '18' },
            windows: [{
                id: 1,
                type: 'custom',
                direction: 'S',
                tilt: 90,
                u: 1.1,
                shgc: 0.55,
                width: 2,
                height: 1.5,
                shading: { enabled: false },
            }],
            walls: [],
        });

        expect(project.projectName).toBe('Stary projekt');
        expect(project.rooms).toHaveLength(1);
        expect(project.rooms[0].windows[0].type).toBe('custom');
        expect(project.rooms[0].input.tInternal).toBe('23');
    });

    it('odrzuca niedozwolone klucze i projekt bez pomieszczeń', () => {
        expect(() => parseProjectDataJson('{"projectName":"X","rooms":[],"__proto__":{"polluted":true}}'))
            .toThrow(/niedozwolone pole/i);
        expect(() => sanitizeProjectData({ projectName: 'X', rooms: [] }))
            .toThrow(/żadnego pomieszczenia/i);
    });
});
