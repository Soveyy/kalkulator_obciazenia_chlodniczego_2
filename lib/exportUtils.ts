import { State, HVACExportPayload, RoomState, HVACSystem, RoomCoolingRequirement, SystemConfig } from '../types';

// Standardne typoszeregi mocy (w kW) dostępne na rynku.
const STANDARD_CAPACITIES = [2.0, 2.5, 3.5, 5.0, 7.1, 10.0, 12.5, 14.0];

// Funkcja dobierająca jednostkę – wybiera pierwszą pojemność, która jest >= zapotrzebowaniu.
// Jeżeli maksymalne obciążenie przewyższa największą, bierzemy największą (ostatecznie użytkownik może potrzebować kilku i rozdzieli to sam).
export function getRecommendedUnitCapacity(loadW: number): number {
    const loadKW = loadW / 1000;
    // Współczynnik dla bezpieczeństwa +10% albo zakładamy po prostu w górę z zaokrągleniami
    // w tym wypadku używamy w górę.
    for (const cap of STANDARD_CAPACITIES) {
        if (cap >= loadKW) {
            return cap;
        }
    }
    return STANDARD_CAPACITIES[STANDARD_CAPACITIES.length - 1];
}

export function generateHVACExportPayload(state: State): HVACExportPayload {
    const assignedRoomIds = new Set<string>();

    const systems: SystemConfig[] = state.systems.map(sys => {
        let totalLoadW = 0;
        const indoorUnits: RoomCoolingRequirement[] = [];

        sys.indoorUnits.forEach(unitRef => {
            const room = state.rooms.find(r => r.id === unitRef.roomId);
            if (!room) return;

            assignedRoomIds.add(room.id);
            
            const floorArea = parseFloat(room.input.roomArea) || 0;
            // Szukamy max obciążenia - np z podsumowania lub peak dla room. 
            // Możemy sprawdzić room.monthlyPeaks żeby znaleźć maksymalny peak.
            let maxCoolingLoadW = 0;
            let sensibleHeatRatio = 0.8; // wartość domyślna

            if (room.results && room.results.withShading) {
                // bierzemy sumę total loads i znajdujemy peak roczny dla tego pokoju.
                // albo prościej - room.monthlyPeaks - znajdujemy max
                const peaks = room.monthlyPeaks;
                if (peaks && peaks.length > 0) {
                    const maxPeak = Math.max(...peaks.map(p => p.peak));
                    maxCoolingLoadW = maxPeak;
                }
                
                // Mamy tylko całkowite zapotrzebowanie. Sensible ratio będzie przybliżeniem lub z wyliczeń
                // ale tu zostawimy 0.8 dla prostoty (albo ewentualnie dodamy logikę)
            }

            // Zaokrąglenie piku do "wyższych okrągłych wartości" też można zrobić, ale bierzemy wprost:
            maxCoolingLoadW = Math.round(maxCoolingLoadW);

            totalLoadW += maxCoolingLoadW;

            indoorUnits.push({
                id: room.id,
                roomName: room.name,
                floorArea,
                maxCoolingLoadW,
                sensibleHeatRatio,
                recommendedUnitCapacity: getRecommendedUnitCapacity(maxCoolingLoadW)
            });
        });

        // Sumaryczna moc agregatu to suma max obciążeń pokoi, zaokrąglona do wyższego typoszeregu?
        // Zgodnie z wytycznymi na razie po prostu zsumowana. (lub pomniejszona o wsp jednoczesności - tu pomijam na razie).
        const requiredOutdoorCapacity = parseFloat((totalLoadW / 1000).toFixed(1)); 
        
        let type: 'SINGLE_SPLIT' | 'MULTI_SPLIT' | 'VRF' = 'SINGLE_SPLIT';
        if (sys.type === 'split') {
             type = indoorUnits.length > 1 ? 'MULTI_SPLIT' : 'SINGLE_SPLIT';
        } else {
             type = 'MULTI_SPLIT';
             if (indoorUnits.length > 5) type = 'VRF'; 
        }

        return {
            id: sys.id,
            type: type,
            requiredOutdoorCapacity,
            indoorUnits
        };
    });

    const unassignedRooms: RoomCoolingRequirement[] = [];

    state.rooms.forEach(room => {
        if (!assignedRoomIds.has(room.id)) {
            const floorArea = parseFloat(room.input.roomArea) || 0;
            let maxCoolingLoadW = 0;
            let sensibleHeatRatio = 0.8;

            if (room.results && room.results.withShading) {
                const peaks = room.monthlyPeaks;
                if (peaks && peaks.length > 0) {
                    const maxPeak = Math.max(...peaks.map(p => p.peak));
                    maxCoolingLoadW = maxPeak;
                }
            }
            
            maxCoolingLoadW = Math.round(maxCoolingLoadW);

            unassignedRooms.push({
                id: room.id,
                roomName: room.name,
                floorArea,
                maxCoolingLoadW,
                sensibleHeatRatio,
                recommendedUnitCapacity: getRecommendedUnitCapacity(maxCoolingLoadW)
            });
        }
    });

    return {
        version: "1.0",
        projectName: state.projectName || "Projekt bez nazwy",
        exportDate: new Date().toISOString(),
        systems,
        unassignedRooms
    };
}

export function exportRoomsToExcel(rooms: RoomState[], projectName: string) {
    const validRooms = rooms.filter(r => r.monthlyPeaks && r.monthlyPeaks.length > 0);
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
                <td style="text-align: left; border: 1px solid #cbd5e1; padding: 10px 14px;">${room.name}</td>
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
        <th colspan="9" style="background-color: #1e293b; color: #ffffff; font-size: 14pt; font-weight: bold; text-align: center; padding: 15px; border: 1px solid #475569;">PROJEKT: ${projectName || "Bez nazwy (Zestawienie Excel)"}</th>
      </tr>
      <tr>
        <th colspan="9" style="background-color: #f8fafc; color: #475569; font-size: 10pt; font-weight: normal; text-align: left; padding: 10px; border: 1px solid #cbd5e1;">Wygenerowano: ${formattedDate} | Kalkulator Obciążenia Chłodniczego ASHRAE</th>
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
        <td style="text-align: left; border: 1px solid #cbd5e1; padding: 10px 14px;">SUMA</td>
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
