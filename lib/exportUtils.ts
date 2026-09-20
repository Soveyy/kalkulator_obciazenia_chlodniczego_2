import { assertRoomValid, isRoomResultCurrent, parseNumber } from '../services/validationService';
import { summarizeResult } from '../services/resultModel';
import { calculateGainsForMonth, generateTemperatureProfile } from '../services/calculationService';
import { State, HVACExportPayload, RoomState, HVACSystem, RoomCoolingRequirement, SystemConfig } from '../types';

const STANDARD_CAPACITIES = [2.0, 2.5, 3.5, 5.0, 7.1, 10.0, 12.5, 14.0];
export function getRecommendedUnitCapacity(loadW: number): number | null {
    if (!Number.isFinite(loadW) || loadW < 0) throw new Error('Nieprawidłowe obciążenie do doboru.');
    return loadW === 0 ? 0 : STANDARD_CAPACITIES.find(cap => cap >= loadW / 1000) ?? null;
}

export function generateHVACExportPayload(state: State): HVACExportPayload {
    if (!state.allData || !state.rooms.every(isRoomResultCurrent)) throw new Error('Najpierw przelicz wszystkie pomieszczenia.');
    const requirements = new Map<string, RoomCoolingRequirement>();
    for (const room of state.rooms) {
        assertRoomValid(room);
        const critical = room.monthlyPeaks.reduce((best, p) => p.peak > best.peak ? p : best);
        const result = calculateGainsForMonth(room.windows, room.walls, room.input, generateTemperatureProfile(critical.month, state.allData), critical.month, state.allData, room.accumulation, room.internalGains, !state.isShadingViewActive);
        const summary = summarizeResult(result.finalGains.clearSky);
        requirements.set(room.id, { id: room.id, roomName: room.name, floorArea: parseNumber(room.input.roomArea)!, maxCoolingLoadW: summary.peak, sensibleHeatRatio: summary.peak > 0 ? summary.sensible / summary.peak : null, recommendedUnitCapacity: getRecommendedUnitCapacity(summary.peak) });
    }
    const assigned = new Set<string>();
    const month = Number(state.rooms[0].currentMonth);
    const systems: SystemConfig[] = state.systems.map(system => {
        const ids = system.indoorUnits.map(u => u.roomId);
        if (new Set(ids).size !== ids.length || ids.some(id => !requirements.has(id))) throw new Error('Nieprawidłowe przypisanie pomieszczeń do układu.');
        const rooms = state.rooms.filter(room => ids.includes(room.id));
        const hourly = Array.from({ length: 24 }, (_, h) => rooms.reduce((sum, room) => sum + room.yearlyMatrix![month - 1][h], 0));
        ids.forEach(id => assigned.add(id));
        return { id: system.id, type: system.type === 'split' ? 'SINGLE_SPLIT' : 'MULTI_SPLIT', requiredOutdoorCapacity: Math.max(...hourly) / 1000, analysisMonth: month, peakHourUTC: hourly.indexOf(Math.max(...hourly)), indoorUnits: ids.map(id => requirements.get(id)!) };
    });
    return { version: '1.0', projectName: state.projectName, exportDate: new Date().toISOString(), systems, unassignedRooms: [...requirements.values()].filter(r => !assigned.has(r.id)) };
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function exportRoomsToExcel(rooms: RoomState[], projectName: string) {
    if (!rooms.every(isRoomResultCurrent)) throw new Error('Nieaktualne wyniki — przelicz wszystkie pomieszczenia.');
    const validRooms = rooms;
    if (validRooms.length === 0) return;

    const months = ['4', '5', '6', '7', '8', '9'];

    // Compute sums for the total row
    let totalArea = 0;
    const monthlyTotals: Record<string, number> = { '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
    let sumOfMaxPeakKw = 0;

    const rowsHtml = validRooms.map(room => {
        const areaVal = parseFloat(room.input.roomArea) || 0;
        totalArea += areaVal;

        // Get value for each month and find the max
        const roomValues = months.map(m => {
            const found = room.monthlyPeaks.find(p => p.month === m);
            const peakWatts = found ? found.peak : 0;
            const peakKw = peakWatts / 1000;
            monthlyTotals[m] += peakWatts;
            return { month: m, peakKw };
        });

        const maxPeakKw = Math.max(...roomValues.map(v => v.peakKw));
        sumOfMaxPeakKw += maxPeakKw;

        const cellsHtml = roomValues.map(v => {
            const isMax = Math.abs(v.peakKw - maxPeakKw) < 0.001 && maxPeakKw > 0;
            // mso-number-format enforces that Excel formats it as a decimal number (preventing date auto-conversion)
            const style = isMax 
                ? 'mso-number-format:\'0.00\'; font-weight: bold; background-color: #ccfbf1; color: #0f766e; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;' 
                : 'mso-number-format:\'0.00\'; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;';
            return `<td style="${style}">${v.peakKw.toFixed(2)}</td>`;
        }).join('');

        return `
            <tr>
                <td style="text-align: left; border: 1px solid #cbd5e1; padding: 10px 14px;">${escapeHtml(room.name)}</td>
                <td style="mso-number-format:'0.00'; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">${areaVal.toFixed(1)}</td>
                ${cellsHtml}
                <td style="mso-number-format:\'0.00\'; font-weight: bold; background-color: #fef3c7; color: #92400e; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">${maxPeakKw.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const footerCellsHtml = months.map(m => {
        const totalKw = monthlyTotals[m] / 1000;
        return `<td style="mso-number-format:\'0.00\'; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">${totalKw.toFixed(2)}</td>`;
    }).join('');

    const formattedDate = new Date().toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlString = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Zestawienie Obciążeń</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
  table { border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 10pt; }
</style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th colspan="9" style="background-color: #1e293b; color: #ffffff; font-size: 14pt; font-weight: bold; text-align: center; padding: 15px; border: 1px solid #475569;">PROJEKT: ${escapeHtml(projectName || "Bez nazwy (Zestawienie Excel)")}</th>
      </tr>
      <tr>
        <th colspan="9" style="background-color: #f8fafc; color: #475569; font-size: 10pt; font-weight: normal; text-align: left; padding: 10px; border: 1px solid #cbd5e1;">Wygenerowano: ${formattedDate} | Kalkulator HVAC RTS</th>
      </tr>
      <tr>
        <th rowspan="2" style="width: 250px; background-color: #475569; color: #ffffff; font-weight: bold; text-align: left; border: 1px solid #475569; padding: 10px 14px;">Pomieszczenie</th>
        <th rowspan="2" style="width: 150px; background-color: #475569; color: #ffffff; font-weight: bold; text-align: right; border: 1px solid #475569; padding: 10px 14px;">Powierzchnia [m²]</th>
        <th colspan="6" style="background-color: #0f766e; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #0f766e; padding: 10px 14px;">Obciążenie chłodnicze [kW]</th>
        <th rowspan="2" style="width: 130px; background-color: #b45309; color: #ffffff; font-weight: bold; text-align: right; border: 1px solid #b45309; padding: 10px 14px;">MAX [kW]</th>
      </tr>
      <tr>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Kwiecień</th>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Maj</th>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Czerwiec</th>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Lipiec</th>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Sierpień</th>
        <th style="width: 110px; background-color: #f1f5f9; color: #0f766e; font-weight: bold; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">Wrzesień</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="background-color: #fef9c3; font-weight: bold; color: #0f172a; border-top: 2px solid #94a3b8;">
        <td style="text-align: left; border: 1px solid #cbd5e1; padding: 10px 14px;">SUMA INDYWIDUALNYCH MAKSIMÓW</td>
        <td style="mso-number-format:'0.00'; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px;">${totalArea.toFixed(1)}</td>
        ${footerCellsHtml}
        <td style="mso-number-format:\'0.00\'; text-align: right; border: 1px solid #cbd5e1; padding: 10px 14px; background-color: #fde047; color: #78350f;">${sumOfMaxPeakKw.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

    const blob = new Blob(['\uFEFF' + htmlString], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeProjectName = (projectName || 'Obciazenie_zbiorcze').replace(/[^a-zA-Z0-9_\u0100-\u017F-]/g, '_');
    link.href = url;
    link.download = `zestawienie_obciazenia_${safeProjectName}.xls`;
    link.click();
    URL.revokeObjectURL(url);
}
