import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import { exportRoomsToExcel } from '../lib/exportUtils';
import { roomInputKey } from '../services/validationService';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('zestawienie zbiorcze Excel', () => {
    it('zapisuje 15 nazw jako tekst bez zmiany treści, zachowując liczby i sumy', async () => {
        const names = [
            '1-2', '1.02', '01/02', '001', '2026-10-22', '=1+2',
            'Pokój <A> & "B"', ...Array.from({ length: 8 }, (_, i) => `2-${i + 1}`),
        ];
        const rooms = names.map((name, i) => {
            const room = createInitialRoomState(`room-${i}`, name);
            room.input.roomArea = '20';
            room.monthlyPeaks = ['4', '5', '6', '7', '8', '9'].map(month => ({ month, peak: 2500 }));
            room.activeResults = {} as any;
            room.calculatedInputKey = roomInputKey(room);
            return room;
        });
        let downloaded: Blob | undefined;
        vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
            downloaded = blob as Blob;
            return 'blob:test';
        });
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const link = { href: '', download: '', click: vi.fn() };
        vi.stubGlobal('document', { createElement: vi.fn(() => link) });

        exportRoomsToExcel(rooms, 'Test');

        expect(link.click).toHaveBeenCalledOnce();
        expect(link.download).toBe('zestawienie_obciazenia_Test.xls');
        const html = await downloaded!.text();
        const cells = [...html.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)];
        const nameCells = cells.filter(cell => /\bx:str\b/.test(cell[1]));
        expect(nameCells.map(cell => cell[2])).toEqual(names.map(name => name
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')));
        expect(nameCells.every(cell => cell[1].includes("mso-number-format:'\\@'"))).toBe(true);
        const numberCells = cells.filter(cell => cell[1].includes("mso-number-format:'0.00'"));
        expect(numberCells.every(cell => /^\d+\.\d+$/.test(cell[2]))).toBe(true);
        expect(numberCells.slice(-8).map(cell => Number(cell[2]))).toEqual([300, 37.5, 37.5, 37.5, 37.5, 37.5, 37.5, 37.5]);
    });
});
