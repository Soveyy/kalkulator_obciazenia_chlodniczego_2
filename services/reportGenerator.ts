
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { MONTH_NAMES, LIGHTING_TYPES } from '../constants';

// Helper to fetch font as base64
async function fetchFont(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

// Plugin do rysowania etykiet na wykresie kołowym
const pieLabelsPlugin = {
    id: 'pieLabels',
    afterDatasetsDraw(chart: any) {
        const { ctx, data } = chart;
        chart.data.datasets.forEach((dataset: any, i: number) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element: any, index: number) => {
                const labelText = data.labels[index];
                const percentMatch = labelText.match(/\((\d+)%\)/);
                
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    if (percent > 4) {
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 12px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                        ctx.shadowBlur = 4;
                        ctx.fillText(`${percent}%`, x, y);
                        ctx.shadowBlur = 0;
                    }
                }
            });
        });
    }
};

// Plugin do białego tła (wymagany dla JPEG)
const whiteBackgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart: any, args: any, options: any) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#ffffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};

// Funkcja pomocnicza do tworzenia obrazu wykresu
async function createTempChart(config: any, width: number, height: number): Promise<string> {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    
    const defaults = Chart.defaults;
    defaults.font.family = 'Arial, sans-serif';

    const chartConfig = {
        ...config,
        options: {
            ...config.options,
            animation: false,
            animations: { colors: false, x: false, y: false },
            transitions: { active: { animation: { duration: 0 } } },
            responsive: false,
            maintainAspectRatio: false,
            devicePixelRatio: 2, // Keep retina quality
            plugins: {
                ...config.options?.plugins,
                customCanvasBackgroundColor: {
                    color: '#ffffff', // Force white background
                }
            }
        },
        plugins: [...(config.plugins || []), whiteBackgroundPlugin]
    };

    const chart = new Chart(offscreenCanvas, chartConfig);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Export as JPEG with 0.75 quality (significantly smaller than PNG)
    const dataUrl = chart.canvas.toDataURL('image/jpeg', 0.75);
    chart.destroy();
    return dataUrl;
}

export const generatePdfReport = async (state: any) => {
    const { input, activeResults, currentMonth } = state;
    if (!activeResults) return;

    // Load Fonts
    const fontRegular = await fetchFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
    const fontBold = await fetchFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf');

    // Enable PDF compression
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    });
    
    // Register Fonts
    doc.addFileToVFS('Roboto-Regular.ttf', fontRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    doc.addFileToVFS('Roboto-Bold.ttf', fontBold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Set Default Font
    doc.setFont('Roboto', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // --- Helpers ---
    const addHeader = (title: string) => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
        }
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(26, 86, 219); // Brand Blue
        doc.text(title, margin, yPos);
        yPos += 8;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
        yPos += 5;
    };

    const addFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(150);
            doc.text(`Strona ${i} z ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(`Raport wygenerowany: ${new Date().toLocaleDateString('pl-PL')}`, margin, pageHeight - 10);
            doc.text(`Projekt: ${input.projectName || 'Bez nazwy'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    };

    // --- Data Preparation ---
    const { finalGains, loadComponents } = activeResults;
    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const timeZoneNotice = isSummerTime ? 'UTC+2' : 'UTC+1';

    // Find peaks
    const maxTotalCS = Math.max(...finalGains.clearSky.total);
    const hourTotalCS_UTC = finalGains.clearSky.total.indexOf(maxTotalCS);
    const hourTotalCS_Local = (hourTotalCS_UTC + offset) % 24;

    const sensibleAtPeak = finalGains.clearSky.sensible[hourTotalCS_UTC] || 0;
    const latentAtPeak = finalGains.clearSky.latent[hourTotalCS_UTC] || 0;
    
    // Components at peak
    const solarLoadPeak = loadComponents.solar[hourTotalCS_UTC] || 0;
    const conductionLoadPeak = loadComponents.conduction[hourTotalCS_UTC] || 0;
    const internalSensibleLoadPeak = loadComponents.internalSensible[hourTotalCS_UTC] || 0;
    const ventilationSensibleLoadPeak = loadComponents.ventilationSensible[hourTotalCS_UTC] || 0;
    const infiltrationSensibleLoadPeak = loadComponents.infiltrationSensible[hourTotalCS_UTC] || 0;
    
    const internalLatentAtPeak = state.activeResults.components.internalGainsLatent[hourTotalCS_UTC] || 0;
    const ventilationLatentAtPeak = state.activeResults.ventilationLoad.latent[hourTotalCS_UTC] || 0;
    const infiltrationLatentAtPeak = state.activeResults.infiltrationLoad.latent[hourTotalCS_UTC] || 0;
    
    // Daily energy estimation
    const totalKWhCS = finalGains.clearSky.total.reduce((sum: number, val: number) => sum + Math.max(0, val), 0) / 1000;


    // --- PAGE 1 ---
    
    // Main Title
    doc.setFontSize(24);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(30);
    doc.text('Raport Obciążenia Chłodniczego', pageWidth / 2, yPos + 10, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont('Roboto', 'normal');
    doc.text(`Projekt: ${input.projectName || 'Bez nazwy'}`, pageWidth / 2, yPos + 22, { align: 'center' });
    
    yPos += 40;

    // 1. Parameters Table
    addHeader('1. Parametry Projektowe');
    
    const allParams: [string, string][] = [
        ['Miesiąc obliczeniowy', MONTH_NAMES[parseInt(currentMonth, 10) - 1]],
        ['Temperatura wewnętrzna', `${input.tInternal} °C`],
        ['Wilgotność wewnętrzna', `${input.rhInternal} %`],
        ['Powierzchnia pomieszczenia', `${input.roomArea} m²`],
    ];

    const vent = state.internalGains.ventilation;
    if (vent.enabled) {
        allParams.push(['Typ wentylacji', vent.type === 'mechanical' ? 'Mechaniczna z odzyskiem' : 'Grawitacyjna']);
        if (vent.type === 'mechanical') {
            allParams.push(['Strumień powietrza (mech.)', `${vent.airflow} m³/h`]);
        } else {
            allParams.push(['Wydatek powietrza (graw.)', `${vent.naturalVentilationAirflow} m³/h`]);
        }
    }
    if (vent.includeInfiltration) {
        allParams.push(['Infiltracja', 'Tak']);
        allParams.push(['Obwód ścian zewn.', `${vent.exteriorWallPerimeter} m`]);
        allParams.push(['Wysokość pom.', `${vent.roomHeight} m`]);
        allParams.push(['Klasa szczelności', vent.tightnessClass === 'tight' ? 'Szczelne' : vent.tightnessClass === 'average' ? 'Średnie' : 'Nieszczelne']);
    }
    
    const acc = state.accumulation;
    if (acc && acc.include) {
        const THERMAL_MASS_TYPES: Record<string, string> = {
            'light': 'Lekka',
            'medium': 'Średnia',
            'heavy': 'Ciężka',
            'very_heavy': 'Bardzo ciężka'
        };
        const FLOOR_TYPES: Record<string, string> = {
            'panels': 'Panele',
            'tiles': 'Płytki',
            'carpet': 'Wykładzina'
        };
        allParams.push(['Masa termiczna', THERMAL_MASS_TYPES[acc.thermalMass] || acc.thermalMass]);
        allParams.push(['Typ podłogi', FLOOR_TYPES[acc.floorType] || acc.floorType]);
    } else {
        allParams.push(['Akumulacja ciepła', 'Pominięta']);
    }

    const paramsBody: string[][] = [];
    for (let i = 0; i < allParams.length; i += 2) {
        const row = [...allParams[i]];
        if (i + 1 < allParams.length) {
            row.push(...allParams[i + 1]);
        } else {
            row.push('', '');
        }
        paramsBody.push(row);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Parametr', 'Wartość', 'Parametr', 'Wartość']],
        body: paramsBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 50, fontStyle: 'bold', lineColor: 200, font: 'Roboto' },
        bodyStyles: { textColor: 50, font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
            // Bold the month name (first row, second column)
            if (data.section === 'body' && data.row.index === 0 && data.column.index === 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 2. Peak Load Results
    addHeader('2. Wyniki - Szczytowe Obciążenie');
    
    // Highlight Box
    doc.setFillColor(254, 242, 242); // Light red/orange bg
    doc.setDrawColor(252, 165, 165); // Red border
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 42, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27);
    doc.text('Maksymalne Całkowite Obciążenie Chłodnicze:', pageWidth / 2, yPos + 8, { align: 'center' });
    
    doc.setFontSize(30);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(220, 38, 38); // Strong Red
    doc.text(`${maxTotalCS.toFixed(0)} W`, pageWidth / 2, yPos + 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(120);
    
    const specificLoad = (maxTotalCS / input.roomArea).toFixed(1);
    doc.text(`(wskaźnik powierzchniowy: ${specificLoad} W/m²)`, pageWidth / 2, yPos + 29, { align: 'center' });

    const monthNamesLocative = [
        'styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu',
        'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'
    ];
    const monthLoc = monthNamesLocative[month - 1];
    const prep = (month === 9) ? 'we' : 'w'; // 'we wrześniu'
    
    doc.text(`Występuje o godzinie: ${String(hourTotalCS_Local).padStart(2, '0')}:00 (${timeZoneNotice}) ${prep} ${monthLoc}`, pageWidth / 2, yPos + 37, { align: 'center' });
    
    yPos += 52;

    // Energy Estimation
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - 2*margin, 14, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('Roboto', 'bold');
    doc.text('Szacunkowe dobowe zużycie energii chłodniczej:', margin + 5, yPos + 9);
    
    const textWidth = doc.getTextWidth('Szacunkowe dobowe zużycie energii chłodniczej: ');
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(50);
    doc.text(`${totalKWhCS.toFixed(1)} kWh`, margin + 5 + textWidth, yPos + 9);

    yPos += 20;

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 26, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text('Uwaga metodyczna:', margin + 5, yPos + 6);
    
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(71, 85, 105);
    const methodologyText = 'Obliczenia wykorzystują model całkowicie bezchmurnego nieba (Clear Sky) dla wybranego miesiąca. Zgodnie z metodyką RTS (Radiant Time Series), algorytm zakłada, że takie same, ekstremalne warunki pogodowe oraz wewnętrzne profile zysków ciepła powtarzają się przez kilka dni z rzędu, co pozwala na pełne uwzględnienie zjawiska akumulacji ciepła w masie budynku.';
    const splitMethodology = doc.splitTextToSize(methodologyText, pageWidth - (2 * margin) - 10);
    doc.text(splitMethodology, margin + 5, yPos + 11);

    // --- PAGE 2: Detailed Tables & Design Assumptions ---
    doc.addPage();
    yPos = margin;

    // Detailed Tables
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Szczegółowy bilans mocy w godzinie szczytu:', margin, yPos);
    yPos += 6;

    const sensibleBody = [
        ['Słoneczne (okna)', `${solarLoadPeak.toFixed(0)} W`],
        ['Przewodzenie (okna)', `${conductionLoadPeak.toFixed(0)} W`],
        ['Wewnętrzne (ludzie, sprzęt)', `${internalSensibleLoadPeak.toFixed(0)} W`],
        ['Wentylacja', `${ventilationSensibleLoadPeak.toFixed(0)} W`],
        ['Infiltracja', `${infiltrationSensibleLoadPeak.toFixed(0)} W`],
    ];

    const latentBody = [
        ['Wewnętrzne (ludzie)', `${internalLatentAtPeak.toFixed(0)} W`],
        ['Wentylacja', `${ventilationLatentAtPeak.toFixed(0)} W`],
        ['Infiltracja', `${infiltrationLatentAtPeak.toFixed(0)} W`],
    ];

    // Sensible Table
    autoTable(doc, {
        startY: yPos,
        head: [[`Zyski Jawne (Razem: ${sensibleAtPeak.toFixed(0)} W)`, '']],
        body: sensibleBody,
        theme: 'plain',
        headStyles: { fillColor: [255, 237, 213], textColor: [194, 65, 12], fontStyle: 'bold', font: 'Roboto' },
        bodyStyles: { textColor: 20, fontSize: 9, font: 'Roboto' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: pageWidth / 2 + 5 },
        styles: { font: 'Roboto', lineWidth: { bottom: 0.1 }, lineColor: [226, 232, 240] }
    });

    const finalYSensible = (doc as any).lastAutoTable.finalY;

    // Latent Table
    autoTable(doc, {
        startY: yPos,
        head: [[`Zyski Utajone (Razem: ${latentAtPeak.toFixed(0)} W)`, '']],
        body: latentBody,
        theme: 'plain',
        headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', font: 'Roboto' },
        bodyStyles: { textColor: 20, fontSize: 9, font: 'Roboto' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } },
        margin: { left: pageWidth / 2 + 5, right: margin },
        styles: { font: 'Roboto', lineWidth: { bottom: 0.1 }, lineColor: [226, 232, 240] }
    });

    yPos = Math.max(finalYSensible, (doc as any).lastAutoTable.finalY) + 15;
    
    addHeader('3. Założenia Projektowe');

    // Tabela 1: Okna
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('Roboto', 'bold');
    doc.text('3.1 Przegrody przezroczyste (Okna)', margin, yPos);
    yPos += 6;

    const SHADING_TYPES: Record<string, string> = {
        'louvers': 'Żaluzje',
        'draperies': 'Zasłony',
        'roller_shades': 'Rolety',
        'insect_screens': 'Moskitiery'
    };

    const windowsBody = state.windows.map((w: any) => [
        w.direction,
        w.tilt !== undefined ? `${w.tilt}°` : '90°',
        (w.width * w.height).toFixed(2),
        w.u.toFixed(2),
        w.shgc.toFixed(2),
        w.shading.enabled ? SHADING_TYPES[w.shading.type] || 'Tak' : 'Brak'
    ]);

    if (windowsBody.length === 0) {
        windowsBody.push(['Brak okien', '-', '-', '-', '-', '-']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Kierunek', 'Pochylenie', 'Powierzchnia [m²]', 'Wsp. U [W/m²K]', 'Wsp. g', 'Osłona']],
        body: windowsBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 50, fontStyle: 'bold', lineColor: 200, font: 'Roboto' },
        bodyStyles: { textColor: 50, font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
        margin: { left: margin, right: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    if (state.windows.length > 0) {
        const totalWindowArea = state.windows.reduce((sum: number, w: any) => sum + (w.width * w.height), 0);
        const wwr = ((totalWindowArea / input.roomArea) * 100).toFixed(1);
        doc.setFontSize(9);
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(100);
        doc.text(`Całkowita powierzchnia okien: ${totalWindowArea.toFixed(2)} m² (${wwr}% powierzchni podłogi)`, margin, yPos);
        yPos += 10;
    } else {
        yPos += 5;
    }

    // Tabela 2: Zyski wewnętrzne
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(0);
    doc.text('3.2 Zyski wewnętrzne', margin, yPos);
    yPos += 6;

    const ACTIVITY_LEVELS: Record<string, string> = {
        'seated_very_light': 'Siedząca, bardzo lekka',
        'standing_light': 'Stojąca, lekka',
        'walking_moderate': 'Chodzenie, umiarkowana',
        'heavy_sport': 'Ciężka, sport'
    };

    const internalBody = [];
    const p = state.internalGains.people;
    if (p.enabled && p.count) {
        internalBody.push(['Ludzie', `${p.count} os.`, ACTIVITY_LEVELS[p.activityLevel] || '-', `${p.startHour}:00 - ${p.endHour}:00`]);
    } else {
        internalBody.push(['Ludzie', 'Brak', '-', '-']);
    }

    const l = state.internalGains.lighting;
    if (l.enabled && l.powerDensity) {
        const lightingName = LIGHTING_TYPES[l.type]?.label || 'Własne';
        internalBody.push([`Oświetlenie - ${lightingName}`, `${l.powerDensity} W/m²`, '-', `${l.startHour}:00 - ${l.endHour}:00`]);
    } else {
        internalBody.push(['Oświetlenie', 'Brak', '-', '-']);
    }

    const eq = state.internalGains.equipment;
    if (eq && eq.length > 0) {
        eq.forEach((e: any) => {
            if (e.power && e.quantity) {
                internalBody.push([`Urządzenie: ${e.name || 'Brak nazwy'}`, `${e.power} W x ${e.quantity} szt.`, '-', `${e.startHour}:00 - ${e.endHour}:00`]);
            }
        });
    } else {
        internalBody.push(['Urządzenia', 'Brak', '-', '-']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Kategoria', 'Ilość / Moc', 'Aktywność', 'Harmonogram']],
        body: internalBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 50, fontStyle: 'bold', lineColor: 200, font: 'Roboto' },
        bodyStyles: { textColor: 50, font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
        margin: { left: margin, right: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Tabela 3: Wentylacja i Infiltracja
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(0);
    doc.text('3.3 Wentylacja i Infiltracja', margin, yPos);
    yPos += 6;

    const VENT_TYPES: Record<string, string> = {
        'none': 'Brak',
        'mechanical': 'Mechaniczna',
        'natural': 'Grawitacyjna'
    };
    const EXCHANGER_TYPES: Record<string, string> = {
        'counterflow_hrv': 'Krzyżowy/Przeciwprądowy (HRV)',
        'counterflow_erv': 'Krzyżowy/Przeciwprądowy z odzyskiem wilgoci (ERV)',
        'rotary_condensing': 'Obrotowy (kondensacyjny)',
        'rotary_sorption': 'Obrotowy (sorpcyjny)'
    };
    const TIGHTNESS_CLASSES: Record<string, string> = {
        'tight': 'Szczelne',
        'average': 'Średnie',
        'leaky': 'Nieszczelne'
    };

    const ventBody = [];
    const v = state.internalGains.ventilation;
    
    if (v.enabled && v.type !== 'none') {
        const typeName = VENT_TYPES[v.type] || v.type;
        const airflow = v.type === 'mechanical' ? `${v.airflow} m³/h` : `${v.naturalVentilationAirflow} m³/h`;
        const exchanger = v.type === 'mechanical' ? (EXCHANGER_TYPES[v.exchangerType] || '-') : '-';
        ventBody.push(['Wentylacja', typeName, airflow, exchanger]);
    } else {
        ventBody.push(['Wentylacja', 'Brak', '-', '-']);
    }

    if (v.includeInfiltration) {
        ventBody.push(['Infiltracja', 'Uwzględniona', `Kondygnacje: ${v.buildingStories}`, `Szczelność: ${TIGHTNESS_CLASSES[v.tightnessClass] || '-'}`]);
    } else {
        ventBody.push(['Infiltracja', 'Brak', '-', '-']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Kategoria', 'Typ / Status', 'Strumień / Parametr 1', 'Odzysk / Parametr 2']],
        body: ventBody,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 50, fontStyle: 'bold', lineColor: 200, font: 'Roboto' },
        bodyStyles: { textColor: 50, font: 'Roboto' },
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
        margin: { left: margin, right: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // --- Pie Chart ---
    if (yPos > pageHeight - 180) {
        doc.addPage();
        yPos = margin;
    }
    
    addHeader('4. Struktura Zysków Ciepła');
    
    // Prepare Pie Data
    const pieChartValues = [
        { label: 'Słoneczne', val: solarLoadPeak, color: '#f59e0b' },
        { label: 'Przewodzenie', val: conductionLoadPeak, color: '#f97316' },
        { label: 'Wewn. Jawne', val: internalSensibleLoadPeak, color: '#ef4444' },
        { label: 'Wentylacja', val: ventilationSensibleLoadPeak, color: '#a855f7' },
        { label: 'Infiltracja', val: infiltrationSensibleLoadPeak, color: '#10b981' },
        { label: 'Utajone', val: latentAtPeak, color: '#3b82f6' }
    ].filter(item => item.val > 0);

    const totalVal = pieChartValues.reduce((acc, curr) => acc + curr.val, 0);

    const pieChartData = {
        labels: pieChartValues.map(d => `${d.label} (${Math.round(d.val/totalVal*100)}%)`),
        datasets: [{
            data: pieChartValues.map(d => d.val),
            backgroundColor: pieChartValues.map(d => d.color),
            borderColor: '#ffffff',
            borderWidth: 2,
        }]
    };
    
    // Generate Pie Chart Image with Labels (JPEG for smaller size)
    const pieChartImg = await createTempChart({
        type: 'pie',
        data: pieChartData,
        options: {
            layout: { padding: 20 },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: { font: { size: 14, family: 'Arial' }, padding: 20 }
                },
                title: { 
                    display: true, 
                    text: 'Składowe obciążenia w szczycie', 
                    font: { size: 18, family: 'Arial' },
                    padding: { bottom: 10 }
                }
            }
        },
        plugins: [pieLabelsPlugin]
    }, 800, 800);

    const pieSize = 160; 
    const xOffsetPie = (pageWidth - pieSize) / 2;
    doc.addImage(pieChartImg, 'JPEG', xOffsetPie, yPos, pieSize, pieSize);
    yPos += pieSize + 15;


    // --- PAGE 3: Daily Charts ---
    doc.addPage();
    yPos = margin;
    addHeader('5. Przebieg Dobowy Obciążenia');

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    // 1. Line Chart
    const lineChartImg = await createTempChart({
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                { 
                    label: 'Obciążenie Chłodnicze [W]', 
                    data: reorderDataForLocalTime(finalGains.clearSky.total, offset), 
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    fill: true, 
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.3
                },
                { 
                    label: 'Temp. Zewnętrzna [°C]', 
                    data: reorderDataForLocalTime(state.tExtProfile, offset), 
                    borderColor: '#94a3b8', 
                    borderWidth: 2,
                    borderDash: [5, 5], 
                    pointRadius: 0,
                    tension: 0.3,
                    yAxisID: 'yTemp' 
                }
            ]
        },
        options: {
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Moc [W]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                yTemp: { 
                    position: 'right', 
                    grid: { display: false }, 
                    title: { display: true, text: 'Temp [°C]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                x: {
                    ticks: { font: { size: 10, family: 'Arial' }, maxRotation: 45 }
                }
            },
            plugins: { 
                legend: { labels: { font: { size: 12, family: 'Arial' } } },
                title: { display: true, text: 'Całkowite obciążenie w czasie', font: { size: 16, family: 'Arial' } }
            }
        },
    }, 1000, 400);

    doc.addImage(lineChartImg, 'JPEG', margin, yPos, pageWidth - 2*margin, 70);
    yPos += 80;

    // 2. Bar Chart (Stacked Components)
    const barChartImg = await createTempChart({
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                { label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: '#f59e0b', stack: 'a' },
                { label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: '#f97316', stack: 'a' },
                { label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: '#ef4444', stack: 'a' },
                { label: 'Wentylacja', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: '#a855f7', stack: 'a' },
                { label: 'Infiltracja', data: reorderDataForLocalTime(loadComponents.infiltrationSensible, offset), backgroundColor: '#10b981', stack: 'a' },
                { label: 'Utajone', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: '#3b82f6', stack: 'a' }
            ]
        },
        options: {
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
            scales: {
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Moc [W]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                x: {
                    stacked: true,
                    ticks: { font: { size: 10, family: 'Arial' }, maxRotation: 45 }
                }
            },
            plugins: { 
                legend: { labels: { font: { size: 10, family: 'Arial' } } },
                title: { display: true, text: 'Składowe obciążenia w czasie', font: { size: 16, family: 'Arial' } }
            }
        },
    }, 1000, 400);

    doc.addImage(barChartImg, 'JPEG', margin, yPos, pageWidth - 2*margin, 70);
    yPos += 80;

    // Disclaimer
    doc.setFontSize(7);
    doc.setTextColor(150);
    const disclaimer = "KLAUZULA ODPOWIEDZIALNOŚCI:\nNiniejszy raport jest wynikiem symulacji komputerowej opartej na wprowadzonych danych oraz statystycznych modelach klimatycznych. Rzeczywiste zapotrzebowanie na chłód może różnić się w zależności od dokładności danych wejściowych, jakości wykonania budynku, sposobu użytkowania oraz lokalnych warunków mikroklimatycznych. Autor aplikacji nie ponosi odpowiedzialności za ewentualne błędy w doborze urządzeń na podstawie tego raportu. Zaleca się weryfikację wyników przez uprawnionego projektanta HVAC.\n\nAutor programu: Łukasz Sowiński";
    
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 2*margin);
    
    // Moved up to avoid overlapping with footer
    doc.text(splitDisclaimer, margin, pageHeight - 35);

    addFooter();
    doc.save(`Raport_Zyskow_Ciepla_${new Date().toISOString().slice(0, 10)}.pdf`);
};
